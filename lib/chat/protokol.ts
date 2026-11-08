// Protokol aliran POST /api/dokumen/[id]/chat (FT-06). Aman untuk klien & server.
//
//   Respons sukses: 200, Content-Type text/plain; charset=utf-8, isi =
//     <potongan teks jawaban …> + "\u001E" + <JSON MetaJawaban>
//   - Teks jawaban dikirim bertahap (NF-02). Karakter pemisah RS (U+001E) dibuang dari teks
//     model, jadi kemunculan pertamanya selalu menandai awal metadata.
//   - Metadata dikirim SETELAH jawaban disimpan (fn_simpan_chat): rujukan, id chat, kuota baru.
//   - Aliran berakhir tanpa metadata = koneksi putus di tengah → klien menandai terputus (B9).
//   Respons gagal (sebelum ada teks): JSON `{ error: { kode, pesan, detail? } }` dengan status
//   4xx/5xx (429 KUOTA_PENUH, 502 AI_GAGAL, dst.) — klien membedakan lewat `res.ok`.

import type { KuotaTanyaAi, MetaJawaban, RujukanChat, StatusJawaban } from "./tipe";

export const PEMISAH_META = "\u001E";

/** Buang karakter pemisah dari teks model agar tidak merusak framing. */
export function bersihkanPotongan(teks: string): string {
  return teks.includes(PEMISAH_META) ? teks.split(PEMISAH_META).join("") : teks;
}

/** Bagian penutup aliran: pemisah + JSON metadata. */
export function kodekanMeta(meta: MetaJawaban): string {
  return PEMISAH_META + JSON.stringify(meta);
}

/** Pengurai bertahap di klien: tambah potongan → teks jawaban sejauh ini; akhiri → teks + meta. */
export class PenguraiAliran {
  private buffer = "";

  /** Tambah potongan teks hasil TextDecoder; mengembalikan teks jawaban (tanpa metadata) sejauh ini. */
  tambah(potongan: string): string {
    this.buffer += potongan;
    return this.teks;
  }

  get teks(): string {
    const i = this.buffer.indexOf(PEMISAH_META);
    return i === -1 ? this.buffer : this.buffer.slice(0, i);
  }

  /** Dipanggil setelah aliran habis. `meta` null bila pemisah tidak ada / JSON rusak. */
  akhiri(): { teks: string; meta: MetaJawaban | null } {
    const i = this.buffer.indexOf(PEMISAH_META);
    if (i === -1) return { teks: this.buffer, meta: null };
    return { teks: this.buffer.slice(0, i), meta: uraiMeta(this.buffer.slice(i + 1)) };
  }
}

const STATUS_VALID: readonly StatusJawaban[] = ["selesai", "terputus", "gagal_simpan"];

function angkaAtauNull(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function uraiKuota(v: unknown): KuotaTanyaAi | null {
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  const terpakai = angkaAtauNull(o.terpakai);
  const maks = angkaAtauNull(o.maks);
  const sisa = angkaAtauNull(o.sisa);
  if (terpakai === null || maks === null || sisa === null || typeof o.resetAt !== "string") return null;
  return { terpakai, maks, sisa, resetAt: o.resetAt };
}

function uraiRujukan(v: unknown): RujukanChat[] {
  if (!Array.isArray(v)) return [];
  return v.flatMap((r): RujukanChat[] => {
    if (!r || typeof r !== "object") return [];
    const o = r as Record<string, unknown>;
    const halaman = angkaAtauNull(o.halaman);
    return halaman !== null && typeof o.kutipan === "string" ? [{ halaman, kutipan: o.kutipan }] : [];
  });
}

/** JSON metadata → MetaJawaban tervalidasi (toleran: kolom salah → nilai aman). */
export function uraiMeta(json: string): MetaJawaban | null {
  let mentah: unknown;
  try {
    mentah = JSON.parse(json);
  } catch {
    return null;
  }
  if (!mentah || typeof mentah !== "object") return null;
  const o = mentah as Record<string, unknown>;
  const status = STATUS_VALID.find((s) => s === o.status);
  if (!status) return null;
  return {
    status,
    chatUserId: angkaAtauNull(o.chatUserId),
    chatAiId: angkaAtauNull(o.chatAiId),
    isTidakDitemukan: o.isTidakDitemukan === true,
    isTerputus: o.isTerputus === true,
    rujukan: uraiRujukan(o.rujukan),
    kuota: uraiKuota(o.kuota),
    createdAt: typeof o.createdAt === "string" ? o.createdAt : new Date().toISOString(),
  };
}

/** Rujukan untuk chip: urut halaman, satu chip per halaman (FT-06 ui-ux K-06). */
export function rujukanUnik(rujukan: readonly RujukanChat[]): RujukanChat[] {
  const per = new Map<number, RujukanChat>();
  for (const r of rujukan) if (!per.has(r.halaman)) per.set(r.halaman, r);
  return [...per.values()].sort((a, b) => a.halaman - b.halaman);
}

import "server-only";
import { z } from "zod";

// Parser JSON toleran untuk keluaran model (BR-32: keluaran rusak dianggap kegagalan panggilan
// dan dicoba ulang oleh pemanggil). Model kadang membungkus JSON dengan ```json, menambah
// kalimat pembuka, koma berlebih, atau terpotong karena batas token.

export type JenisJson = "object" | "array";

/** Keluaran AI tidak bisa diurai atau tidak sesuai skema. */
export class AiFormatError extends Error {
  readonly detail: string;
  constructor(pesan: string, detail = "") {
    super(pesan);
    this.name = "AiFormatError";
    this.detail = detail;
  }
}

function pesanIssue(issue: { code?: string; minimum?: unknown; maximum?: unknown; expected?: unknown }): string {
  switch (issue.code) {
    case "too_small":
      return `terlalu sedikit/pendek (minimal ${String(issue.minimum)})`;
    case "too_big":
      return `terlalu banyak/panjang (maksimal ${String(issue.maximum)})`;
    case "invalid_type":
      return `tipe salah (harus ${String(issue.expected)})`;
    default:
      return `tidak valid (${issue.code ?? "?"})`;
  }
}

/**
 * Mengurai teks mentah AI menjadi JSON lalu memvalidasi dengan skema Zod.
 * @throws AiFormatError bila tidak ada JSON yang bisa diurai atau skema tidak cocok.
 */
export function parseJsonAI<S extends z.ZodType>(raw: string, jenis: JenisJson, skema: S): z.infer<S> {
  const nilai = uraiJsonToleran(raw, jenis);
  // Pesan galat dibuat sendiri: koreksi untuk model tidak butuh terjemahan locale Zod, dan
  // locale bawaan bisa melempar saat issue tidak lengkap (mis. batas min/maks tak terdefinisi).
  const hasil = skema.safeParse(nilai, { error: pesanIssue });
  if (!hasil.success) {
    const detail = hasil.error.issues.map((i) => `${i.path.join(".") || "(akar)"}: ${i.message}`).join("; ");
    throw new AiFormatError("Keluaran AI tidak sesuai format yang diminta.", detail);
  }
  return hasil.data;
}

/**
 * Tahapan perbaikan: (1) buang pagar kode, (2) ambil blok dari kurung buka pertama s.d. kurung
 * tutup terakhir, (3) buang koma sebelum } / ], (4) tutup string & kurung yang terpotong.
 * @throws AiFormatError
 */
export function uraiJsonToleran(raw: string, jenis: JenisJson): unknown {
  const teks = (raw ?? "").replace(/```(?:json)?/gi, "").trim();
  const buka = jenis === "array" ? "[" : "{";
  const tutup = jenis === "array" ? "]" : "}";
  const awal = teks.indexOf(buka);
  if (awal === -1) throw new AiFormatError(`Keluaran AI tidak berisi JSON ${jenis}.`);
  const akhir = teks.lastIndexOf(tutup);
  const kandidat = akhir > awal ? teks.slice(awal, akhir + 1) : teks.slice(awal);

  const coba = (s: string): { ok: true; nilai: unknown } | { ok: false } => {
    try {
      return { ok: true, nilai: JSON.parse(s) };
    } catch {
      return { ok: false };
    }
  };

  const r1 = coba(kandidat);
  if (r1.ok) return r1.nilai;
  const tanpaKoma = kandidat.replace(/,\s*([}\]])/g, "$1");
  const r2 = coba(tanpaKoma);
  if (r2.ok) return r2.nilai;
  // Keluaran terpotong: ambil dari kurung buka sampai akhir teks (bukan s.d. kurung tutup
  // terakhir, yang bisa berada di tengah objek) lalu seimbangkan.
  const r3 = coba(tutupStrukturTerpotong(teks.slice(awal)));
  if (r3.ok) return r3.nilai;
  throw new AiFormatError("JSON dari AI tidak dapat diurai.");
}

function tutupStrukturTerpotong(s: string): string {
  const tumpukan: string[] = [];
  let dalamString = false;
  let escape = false;
  for (const ch of s) {
    if (escape) {
      escape = false;
      continue;
    }
    if (ch === "\\") {
      escape = true;
      continue;
    }
    if (ch === '"') {
      dalamString = !dalamString;
      continue;
    }
    if (dalamString) continue;
    if (ch === "{" || ch === "[") tumpukan.push(ch);
    else if (ch === "}" || ch === "]") tumpukan.pop();
  }
  let hasil = s;
  if (dalamString) hasil += '"';
  // Buang sisa yang menggantung: koma, titik dua, atau kunci tanpa nilai.
  hasil = hasil.replace(/,\s*$/, "").replace(/,\s*"[^"]*"\s*:?\s*$/, "").replace(/:\s*$/, ": null");
  hasil = hasil.replace(/,\s*([}\]])/g, "$1");
  while (tumpukan.length) hasil += tumpukan.pop() === "{" ? "}" : "]";
  return hasil.replace(/,\s*([}\]])/g, "$1");
}

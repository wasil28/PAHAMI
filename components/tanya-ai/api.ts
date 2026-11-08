// Pemanggil API Tanya AI dari browser (komponen tidak memanggil Supabase langsung).
import { PenguraiAliran } from "@/lib/chat/protokol";
import type { HalamanRiwayatChat, KuotaTanyaAi, MetaJawaban } from "@/lib/chat/tipe";
import { PESAN } from "@/lib/pesan";

export type HasilKirim =
  /** meta null = aliran berhenti tanpa metadata (koneksi putus) → tandai terputus (B9). */
  | { jenis: "jawaban"; teks: string; meta: MetaJawaban | null }
  /** Pengguna menekan Hentikan. */
  | { jenis: "dibatalkan"; teks: string }
  | { jenis: "galat"; status: number; kode: string; pesan: string; kuota: KuotaTanyaAi | null };

interface ErrorJson {
  error?: { kode?: string; pesan?: string; detail?: { kuota?: KuotaTanyaAi } };
}

async function bacaError(res: Response): Promise<Extract<HasilKirim, { jenis: "galat" }>> {
  let body: ErrorJson = {};
  try {
    body = (await res.json()) as ErrorJson;
  } catch {
    // bukan JSON (mis. halaman error proxy)
  }
  return {
    jenis: "galat",
    status: res.status,
    kode: body.error?.kode ?? "SERVER_ERROR",
    pesan: body.error?.pesan ?? (res.status >= 500 ? PESAN["MSG-C04"] : PESAN["MSG-G01"]),
    kuota: body.error?.detail?.kuota ?? null,
  };
}

const urlChat = (dokumenId: number) => `/api/dokumen/${dokumenId}/chat`;

export async function ambilRiwayat(
  dokumenId: number,
  kursor?: { sebelum: string; sebelumId: number },
  signal?: AbortSignal,
): Promise<HalamanRiwayatChat> {
  const qs = kursor ? `?${new URLSearchParams({ sebelum: kursor.sebelum, sebelumId: String(kursor.sebelumId) })}` : "";
  const res = await fetch(urlChat(dokumenId) + qs, { cache: "no-store", signal });
  if (!res.ok) throw new Error((await bacaError(res)).pesan);
  const body = (await res.json()) as { data: HalamanRiwayatChat };
  return body.data;
}

/** POST pertanyaan; `onTeks` dipanggil setiap teks jawaban bertambah (streaming, NF-02). */
export async function kirimPertanyaan(
  dokumenId: number,
  data: { pertanyaan: string; topikId?: number },
  signal: AbortSignal,
  onTeks: (teks: string) => void,
): Promise<HasilKirim> {
  const pengurai = new PenguraiAliran();
  try {
    const res = await fetch(urlChat(dokumenId), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
      signal,
    });
    if (!res.ok || !res.body) return await bacaError(res);

    const pembaca = res.body.pipeThrough(new TextDecoderStream()).getReader();
    for (;;) {
      const r = await pembaca.read();
      if (r.done) break;
      onTeks(pengurai.tambah(r.value));
    }
    const akhir = pengurai.akhiri();
    return { jenis: "jawaban", teks: akhir.teks, meta: akhir.meta };
  } catch {
    if (signal.aborted) return { jenis: "dibatalkan", teks: pengurai.teks };
    const teks = pengurai.teks;
    if (teks) return { jenis: "jawaban", teks, meta: null };
    return { jenis: "galat", status: 0, kode: "JARINGAN", pesan: PESAN["MSG-C04"], kuota: null };
  }
}

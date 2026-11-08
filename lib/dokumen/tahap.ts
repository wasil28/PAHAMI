// Urutan tahap pengolahan (CHECK ck_dokumen_tahap + trigger fn_cek_transisi_dokumen) dan
// rute halaman terkait dokumen. Aman untuk klien.

import { TAHAP_DOKUMEN, type StatusDokumen, type TahapDokumen } from "@/lib/pesan";

export const URUTAN_TAHAP = Object.keys(TAHAP_DOKUMEN) as TahapDokumen[];
export const JUMLAH_TAHAP = URUTAN_TAHAP.length;

/** Jeda polling status dokumen (KEPUTUSAN §3: browser memantau lewat GET /api/dokumen/[id]). */
export const INTERVAL_POLLING_MS = 2_000;
/**
 * Dokumen masih `diproses`/`membaca` selama ini → pemicu POST /api/dokumen/[id]/proses dianggap
 * hilang di jaringan dan dikirim ulang (idempoten). Tanpa ini dokumen menunggu A8 (15 menit).
 */
export const JEDA_PICU_ULANG_PROSES_MS = 10_000;
export const MAKS_PICU_ULANG_PROSES = 3;

/** Indeks 0-based tahap; null (belum ada tahap) dianggap tahap pertama. */
export function indeksTahap(tahap: TahapDokumen | null): number {
  const i = tahap ? URUTAN_TAHAP.indexOf(tahap) : 0;
  return i < 0 ? 0 : i;
}

/** Persen bar pemrosesan = tahap selesai ÷ jumlah tahap (FT-02 K-11). */
export function persenTahap(status: StatusDokumen, tahap: TahapDokumen | null): number {
  if (status === "siap") return 100;
  return Math.round((indeksTahap(tahap) / JUMLAH_TAHAP) * 100);
}

// ── Rute (satu tempat agar mudah diselaraskan dengan agent fitur lain) ──
export const rute = {
  beranda: "/beranda",
  upload: "/upload",
  progres: "/progres",
  /** S-11 membuka panel pemrosesan dokumen tertentu. */
  uploadPantau: (id: number) => `/upload?dokumen=${id}`,
  dokumen: (id: number) => `/dokumen/${id}`,
  topik: (id: number, topikId: number) => `/dokumen/${id}/topik/${topikId}`,
  /** KEPUTUSAN B7: Tanya AI dibuka di S-08 topik disarankan dengan tab Tanya AI aktif. */
  tanyaAi: (id: number, topikId: number) => `/dokumen/${id}/topik/${topikId}?tab=tanya`,
  latihan: (id: number, topikId: number) => `/dokumen/${id}/topik/${topikId}/latihan`,
} as const;

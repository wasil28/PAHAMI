// Kontrak bersama (server + klien) fitur Laporan QC: anggota tim yang ditandai "penguji"
// mengirim temuan dari halaman mana pun; admin memilah & menindaklanjuti. KEPUTUSAN §4 "Laporan QC".

export const KATEGORI_QC = {
  bug: "Bug / error",
  tampilan: "Tampilan",
  konten_ai: "Isi AI keliru",
  teks: "Teks / typo",
  saran: "Saran",
} as const;
export type KategoriQc = keyof typeof KATEGORI_QC;

export const PRIORITAS_QC = {
  rendah: "Rendah",
  sedang: "Sedang",
  tinggi: "Tinggi",
  kritis: "Kritis",
} as const;
export type PrioritasQc = keyof typeof PRIORITAS_QC;

export const STATUS_QC = {
  baru: "Baru",
  dikerjakan: "Dikerjakan",
  selesai: "Selesai",
  ditolak: "Ditolak",
} as const;
export type StatusQc = keyof typeof STATUS_QC;

export const JUDUL_QC_MIN = 5;
export const JUDUL_QC_MAX = 120;
export const DESKRIPSI_QC_MAX = 4000;
export const CATATAN_QC_MAX = 2000;
export const LAMPIRAN_QC_MAKS_BYTE = 5 * 1024 * 1024;
export const LAMPIRAN_QC_TIPE = ["image/png", "image/jpeg", "image/webp"] as const;

/** Info perangkat yang direkam otomatis saat melapor. */
export interface InfoPerangkat {
  userAgent: string;
  lebarLayar: number;
  tinggiLayar: number;
  tema: "terang" | "gelap";
}

/** Satu laporan (untuk daftar admin & "Laporan saya"). */
export interface LaporanQc {
  id: number;
  /** "QC-0012" */
  kode: string;
  judul: string;
  deskripsi: string;
  kategori: KategoriQc;
  prioritas: PrioritasQc;
  status: StatusQc;
  urlHalaman: string;
  infoPerangkat: InfoPerangkat | null;
  /** Signed URL screenshot (berlaku 1 jam) atau null. */
  lampiranUrl: string | null;
  catatanTim: string | null;
  pelapor: { id: number; nama: string; email: string };
  ditanganiOleh: string | null;
  createdAt: string;
  updatedAt: string;
  selesaiAt: string | null;
}

export interface RingkasanStatusQc {
  baru: number;
  dikerjakan: number;
  selesai: number;
  ditolak: number;
}

export interface Penguji {
  id: number;
  nama: string;
  email: string;
  peran: "mahasiswa" | "admin";
  jumlahLaporan: number;
}

// ── API ──────────────────────────────────────────────────────────
// POST  /api/qc            multipart/form-data: judul, deskripsi, kategori, prioritas, urlHalaman,
//                          infoPerangkat (JSON string), lampiran (File, opsional)
//                          → 201 { data: { id, kode } } · 400 INPUT_TIDAK_VALID · 403 BUKAN_PENGUJI
// PATCH /api/qc/[id]       admin, JSON { status?, prioritas?, catatanTim? } → 200 { data: LaporanQc }
// GET   /api/qc/ekspor     admin, CSV semua laporan (sesuai filter ?status=&kategori=)
// POST  /api/admin/penguji admin, JSON { email, penguji: boolean } → 200 { data: Penguji | null }
//                          404 TIDAK_DITEMUKAN (email belum terdaftar)

export function kodeQc(id: number): string {
  return `QC-${String(id).padStart(4, "0")}`;
}

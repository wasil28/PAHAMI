// Konstanta aplikasi. Nilai kuota yang bisa diubah admin (BR-02/03/04/17) disimpan di
// m_pengaturan_sistem; angka di sini hanya nilai default/cadangan bila pengaturan belum terbaca.

export const NAMA_APLIKASI = "Pahami";
export const TAGLINE = "Belajar mandiri dari PDF-mu, dibantu AI.";

export const ZONA_WAKTU = "Asia/Jakarta"; // reset kuota harian 00.00 WIB (BR-17)

// ── Unggah dokumen (BR-01..05, BR-21) ──────────────────────────
export const TIPE_FILE_DIIZINKAN = "application/pdf";
export const DEFAULT_MAX_UKURAN_MB = 20;
export const DEFAULT_MAX_HALAMAN = 500;
export const DEFAULT_MAX_DOKUMEN = 5;
export const MIN_KARAKTER_HALAMAN_TEKS = 50; // halaman dianggap kosong bila < 50 karakter (BR-05)
export const RASIO_HALAMAN_SCAN = 0.5; // > 50% halaman kosong → dianggap hasil scan (BR-05)
export const JUDUL_DOKUMEN_MIN = 3;
export const JUDUL_DOKUMEN_MAX = 100;
export const BATAS_WAKTU_PROSES_MENIT = 15; // dokumen macet → gagal (KEPUTUSAN A8)
export const HAPUS_DOKUMEN_GAGAL_HARI = 7; // KEPUTUSAN A9
export const BUCKET_DOKUMEN = "dokumen"; // path: {auth.uid()}/{kode}.pdf

// ── Chunk & topik (BR-08, BR-09) ───────────────────────────────
export const KATA_PER_CHUNK = 500;
export const MIN_TOPIK = 4;
export const MAX_TOPIK = 15;
export const JUDUL_TOPIK_MAX = 120;

// ── Latihan (BR-11..15) ────────────────────────────────────────
export const JUMLAH_SOAL = 5;
export const JUMLAH_PILIHAN = 4;
export const SKOR_SELESAI = 70; // pernah ≥ 70 …
export const SKOR_PERTAHANKAN = 60; // … dan skor terakhir ≥ 60 (BR-13)

// ── Tanya AI (BR-16..18) ───────────────────────────────────────
export const DEFAULT_MAX_PERTANYAAN_HARIAN = 30;
export const PERTANYAAN_MIN = 3;
export const PERTANYAAN_MAX = 500;
export const JUMLAH_CHUNK_KONTEKS = 5;
export const DEFAULT_AMBANG_RELEVANSI = 0.5; // 0,75 terlalu ketat untuk text-embedding-3-small; kalibrasi lewat t_chat.skor_relevansi
export const PERINGATAN_KUOTA_PERSEN = 80; // MSG-Q01

// ── Akun (BR-22) ───────────────────────────────────────────────
export const NAMA_MIN = 3;
export const NAMA_MAX = 60;
export const SANDI_MIN = 8;

// ── AI (BR-32) ─────────────────────────────────────────────────
export const AI_MAKS_COBA_ULANG = 2;
export const AI_BATAS_WAKTU_MS = 60_000;
/**
 * Tenggat internal pengolahan dokumen (maxDuration /proses = 300 dtk). Sisa ±30 dtk menjamin
 * fn_gagalkan_dokumen sempat jalan sebelum fungsi dibunuh — dokumen tidak tertahan `diproses`.
 */
export const TENGGAT_PIPELINE_MS = 270_000;
/** Tenggat internal Tanya AI (maxDuration chat = 90 dtk). Sisa ±15 dtk untuk fn_simpan_chat (B9). */
export const TENGGAT_CHAT_MS = 75_000;

// ── Peran & arah setelah login (BR-25, BR-31) ──────────────────
export const PERAN = { MAHASISWA: "mahasiswa", ADMIN: "admin" } as const;
export type Peran = (typeof PERAN)[keyof typeof PERAN];
export const RUTE_AWAL: Record<Peran, string> = { mahasiswa: "/beranda", admin: "/admin" };

// Katalog pesan sistem (MSG-xx) — satu-satunya sumber teks error/sukses/konfirmasi di UI & API.
// Sumber: Breakdown §6 (verbatim), ditambah katalog baru KEPUTUSAN-TERBUKA §D dan
// MSG-L05 yang diubah sesuai KEPUTUSAN A3. Teks baru wajib ditambahkan di sini dulu (Panduan §2).
// Placeholder memakai gaya {nama}; isi lewat pesan(kode, { nama: "…" }).
//
// Angka batas (3–60, 3–100, 3–500, 8) diambil dari lib/config.ts agar teks selalu sama dengan validasi.

import {
  JUDUL_DOKUMEN_MAX,
  JUDUL_DOKUMEN_MIN,
  NAMA_MAX,
  NAMA_MIN,
  PERTANYAAN_MAX,
  PERTANYAAN_MIN,
  SANDI_MIN,
} from "@/lib/config";

export const PESAN = {
  // ── Validasi umum (BR-22) ─────────────────────────────────────
  "MSG-V01": "{kolom} wajib diisi.",
  "MSG-V02": "Format email belum benar, contoh: nama@ecampus.ut.ac.id.",
  "MSG-V03": `Nama harus ${NAMA_MIN}–${NAMA_MAX} karakter.`,
  "MSG-V04": `Kata sandi minimal ${SANDI_MIN} karakter dan berisi huruf serta angka.`,
  "MSG-V05": "Konfirmasi kata sandi tidak sama.",
  // Tambahan implementasi: isian API yang tidak sesuai format (bukan dari form biasa).
  "MSG-V06": "Data yang dikirim tidak valid. Muat ulang halaman lalu coba lagi.",

  // ── Akun & autentikasi (BP-01, BP-02) ─────────────────────────
  "MSG-A01": "Email atau kata sandi salah.",
  "MSG-A02": "Akun kamu sedang dinonaktifkan. Hubungi admin untuk informasi lebih lanjut.",
  "MSG-A03": "Sesi kamu telah berakhir. Silakan masuk lagi.", // §D: sesi habis biasa (bukan nonaktif)
  "MSG-A04": "Tunggu {detik} detik lagi sebelum meminta tautan baru.", // §D: kirim ulang terlalu cepat (S-04)
  "MSG-A05": "Email ini sudah terdaftar. Silakan masuk atau gunakan email lain.",
  "MSG-A06":
    "Jika email terdaftar, tautan atur ulang kata sandi telah dikirim. Periksa juga folder spam.",
  "MSG-A07": "Kata sandi berhasil diubah. Silakan masuk dengan kata sandi baru.",
  "MSG-A08": "Tautan sudah kedaluwarsa atau sudah dipakai. Minta tautan baru.",

  // ── Unggah & pengolahan dokumen (BR-01..05, BR-21) ────────────
  "MSG-U01": "Hanya file PDF yang dapat diunggah.",
  "MSG-U02": "Ukuran file melebihi batas {max_ukuran_mb} MB.",
  "MSG-U03":
    "Kuota dokumen kamu sudah penuh ({maks} dokumen). Hapus dokumen lama untuk mengunggah yang baru.",
  "MSG-U04": `Judul harus ${JUDUL_DOKUMEN_MIN}–${JUDUL_DOKUMEN_MAX} karakter.`, // §D (BR-21)
  "MSG-U05": "Unggahan terputus. Periksa koneksi lalu coba lagi.",
  "MSG-U06": "Dokumen memiliki {n} halaman, melebihi batas {max_halaman} halaman.",
  "MSG-U07":
    "PDF ini berupa hasil scan (gambar) sehingga teksnya tidak dapat dibaca. Unggah PDF berbasis teks.",
  "MSG-U08": '"{judul}" siap dipelajari! Ada {jumlah} topik untukmu.',
  "MSG-U09": "Dokumen gagal diproses karena gangguan sistem. Silakan unggah ulang.",

  // ── Belajar topik (BR-10) ─────────────────────────────────────
  "MSG-B01": "Materi belum bisa disiapkan. Coba lagi sebentar lagi.",
  "MSG-B02": "Menyiapkan materi dari buku… (hanya sekali untuk topik ini)",

  // ── Latihan (BR-11..13, BR-33) ────────────────────────────────
  "MSG-L01": "Menyiapkan soal latihan dari buku…",
  "MSG-L02": "Soal belum bisa dibuat. Coba lagi.",
  "MSG-L03": "Keluar dari latihan? Jawabanmu belum disimpan.",
  "MSG-L04": "Topik selesai! Pemahamanmu sudah baik.",
  // KEPUTUSAN A3: skor 60–69 bisa berstatus "Selesai" (pernah ≥ 70) atau "Perlu diulang",
  // jadi teks tidak boleh menyiratkan salah satunya ("Hampir!" dihapus).
  "MSG-L05": "Skormu cukup baik. Pelajari lagi bagian yang salah agar pemahamanmu makin kuat.",
  "MSG-L06": "Topik ini perlu diulang. Baca kembali materinya, kamu pasti bisa.",
  "MSG-L07": "Jawab semua soal sebelum melihat hasil.", // §D: JAWABAN_BELUM_LENGKAP (BR-33)
  "MSG-L08": "Hasil latihan belum tersimpan. Periksa koneksi lalu coba lagi.", // §D

  // ── Tanya AI (BR-16..18) ──────────────────────────────────────
  "MSG-C01": `Pertanyaan harus ${PERTANYAAN_MIN}–${PERTANYAAN_MAX} karakter.`, // §D (BR-18)
  "MSG-C02": "Kuota pertanyaan hari ini sudah habis ({maks}). Kuota terisi lagi pukul 00.00 WIB.",
  "MSG-C03":
    "Maaf, aku tidak menemukan pembahasan tentang hal itu di dokumen ini. Coba kata kunci lain atau tanyakan hal yang ada di materi.",
  "MSG-C04": "Asisten AI sedang tidak dapat menjawab. Coba lagi.",

  // ── Kelola dokumen (BR-20, BR-21) ─────────────────────────────
  "MSG-D01": "Nama dokumen berhasil diubah.",
  "MSG-D02":
    'Hapus "{judul}"? Semua topik, latihan, dan riwayat tanya AI dokumen ini ikut terhapus dan tidak bisa dikembalikan.',
  "MSG-D03": "Dokumen berhasil dihapus.",
  // Tambahan implementasi: dokumen `diproses` belum boleh diubah/dihapus (FT-03 API 409).
  "MSG-D04": "Dokumen masih diproses. Tunggu sampai selesai lalu coba lagi.",

  // ── Profil (BP-10) ────────────────────────────────────────────
  "MSG-P01": "Profil berhasil disimpan.",
  "MSG-P02": "Kata sandi berhasil diubah.",
  "MSG-P03": "Kata sandi lama tidak sesuai.",

  // ── Kelola pengguna (BR-23, BR-24) ────────────────────────────
  "MSG-M01": "Nonaktifkan akun {nama}? Pengguna tidak akan bisa masuk sampai diaktifkan kembali.",
  "MSG-M02": "Akun {nama} dinonaktifkan.",
  "MSG-M03": "Akun {nama} diaktifkan kembali.",
  "MSG-M04": "Aktifkan kembali akun {nama}? Pengguna bisa masuk lagi dengan email dan kata sandinya.", // §D
  "MSG-M05": "Akun admin tidak dapat dinonaktifkan.", // §D (BR-24) — tooltip & penolakan API

  // ── Pengaturan kuota (BR-28, BR-29) ───────────────────────────
  "MSG-K01": "Pengaturan kuota berhasil disimpan dan berlaku untuk aksi berikutnya.",
  "MSG-K02": "Isi bilangan bulat antara {min} dan {maks}.",
  "MSG-K03":
    "Semua kolom akan diisi nilai default: {max_dokumen} dokumen, {max_halaman} halaman, {max_ukuran_mb} MB, dan {max_pertanyaan_harian} pertanyaan per hari. Nilai baru tersimpan setelah kamu menekan Simpan perubahan.", // §D
  "MSG-K04": "Perubahan pengaturan kuota belum disimpan dan akan hilang.", // §D
  // Tambahan implementasi: deteksi versi 409 (KEPUTUSAN B14).
  "MSG-K05": "Pengaturan baru saja diubah admin lain. Muat ulang halaman untuk melihat nilai terbaru.",

  // ── Kuota (BR-04, BR-17) ──────────────────────────────────────
  "MSG-Q01": "Kuota {jenis} kamu hampir habis ({n} dari {maks}).", // §D: peringatan ≥ 80%

  // ── State kosong ──────────────────────────────────────────────
  "MSG-E01": "Belum ada dokumen. Unggah PDF pertamamu untuk mulai belajar.",
  "MSG-E02": "Belum ada latihan. Kerjakan latihan pertama untuk melihat progresmu.",
  "MSG-E03": "Mantap! Tidak ada topik yang perlu diulang.",
  "MSG-E04": "Tidak ada pengguna yang cocok dengan pencarian.",
  "MSG-E05": "Belum ada pertanyaan AI dalam {n} hari terakhir.", // §D: grafik S-14
  "MSG-E06": "Belum ada mahasiswa yang mendaftar.", // §D: pengguna terbaru S-14
  "MSG-E07": "Belum ada akun {status}.", // §D: filter S-15 ("aktif" / "nonaktif")

  // ── Umum ──────────────────────────────────────────────────────
  "MSG-G01": "Terjadi gangguan koneksi. Coba lagi.",
  "MSG-G02": "Data belum bisa dimuat.",
  "MSG-G03": "Kamu sudah keluar.", // §D: snackbar setelah logout
  // Tambahan implementasi: 404 & 403 (Panduan §3.6, BR-06 — jangan bocorkan keberadaan data).
  "MSG-G04": "{objek} tidak ditemukan.",
  "MSG-G05": "Kamu tidak punya akses ke halaman ini.",
} as const;

export type KodePesan = keyof typeof PESAN;

// Ambil nama placeholder dari teks literal, mis. "Akun {nama} …" → "nama".
type AmbilPlaceholder<S extends string> = S extends `${string}{${infer K}}${infer Sisa}`
  ? K | AmbilPlaceholder<Sisa>
  : never;

export type PlaceholderPesan<K extends KodePesan> = AmbilPlaceholder<(typeof PESAN)[K]>;
export type VariabelPesan<K extends KodePesan> = Record<PlaceholderPesan<K>, string | number>;

// Kode yang punya placeholder wajib diberi variabel; yang tidak punya, tidak boleh.
type ArgumenPesan<K extends KodePesan> = [PlaceholderPesan<K>] extends [never]
  ? []
  : [vars: VariabelPesan<K>];

/** Isi placeholder pada teks bebas (dipakai juga untuk teks LABEL/TEKS ber-placeholder). */
export function isiPlaceholder(teks: string, vars?: Record<string, string | number>): string {
  if (!vars) return teks;
  return teks.replace(/\{(\w+)\}/g, (asli, nama: string) =>
    Object.prototype.hasOwnProperty.call(vars, nama) ? String(vars[nama]) : asli,
  );
}

/**
 * Teks pesan siap tampil. Variabel bertipe ketat:
 *   pesan("MSG-M02", { nama: "Budi" }) → "Akun Budi dinonaktifkan."
 *   pesan("MSG-D01")                    → "Nama dokumen berhasil diubah."
 */
export function pesan<K extends KodePesan>(kode: K, ...args: ArgumenPesan<K>): string {
  const vars = args[0] as Record<string, string | number> | undefined;
  return isiPlaceholder(PESAN[kode], vars);
}

/** Pintasan MSG-V01: "{Nama kolom} wajib diisi." */
export function pesanWajib(kolom: string): string {
  return pesan("MSG-V01", { kolom });
}

// ── Label kolom form (dipakai MSG-V01 & label input) ──────────────
export const LABEL_KOLOM = {
  nama: "Nama lengkap",
  email: "Email",
  sandi: "Kata sandi",
  sandiLama: "Kata sandi lama",
  sandiBaru: "Kata sandi baru",
  konfirmasiSandi: "Konfirmasi kata sandi",
  judul: "Judul dokumen",
  file: "File PDF",
  pertanyaan: "Pertanyaan",
} as const;

// ── Teks UI berulang yang BUKAN pesan sistem (tombol, badge, state) ──
// Dipisah dari PESAN agar katalog MSG tetap sama dengan Breakdown §6.
export const LABEL = {
  simpan: "Simpan",
  simpanPerubahan: "Simpan perubahan",
  batal: "Batal",
  cobaLagi: "Coba lagi",
  kembali: "Kembali",
  tutup: "Tutup",
  hapus: "Hapus",
  hapusPermanen: "Hapus permanen",
  gantiNama: "Ganti nama",
  unggahUlang: "Unggah ulang",
  uploadPdf: "Upload PDF", // istilah menu yang diizinkan Panduan §2
  prosesPdf: "Proses PDF",
  pilihFile: "Pilih file",
  cobaFileLain: "Coba file lain",
  mulaiBelajar: "Mulai belajar",
  lanjutBelajar: "Lanjut belajar",
  pelajari: "Pelajari",
  pelajariLagi: "Pelajari lagi",
  latihan: "Latihan",
  mulaiLatihan: "Mulai latihan",
  ulangiLatihan: "Ulangi latihan",
  periksaJawaban: "Periksa jawaban",
  soalBerikutnya: "Soal berikutnya",
  lihatHasil: "Lihat hasil",
  kembaliKeMateri: "Kembali ke materi",
  topikBerikutnya: "Topik berikutnya",
  topikSebelumnya: "Topik sebelumnya",
  kembaliKeDokumen: "Kembali ke dokumen",
  keBeranda: "Ke beranda",
  tanyaAi: "Tanya AI",
  kirim: "Kirim",
  masuk: "Masuk",
  daftar: "Daftar",
  keluar: "Keluar",
  kirimTautanReset: "Kirim tautan reset",
  kirimUlang: "Kirim ulang",
  simpanKataSandi: "Simpan kata sandi",
  ubahKataSandi: "Ubah kata sandi",
  nonaktifkan: "Nonaktifkan",
  aktifkan: "Aktifkan",
  kembalikanDefault: "Kembalikan default",
  tetapDiSini: "Tetap di sini",
  tinggalkan: "Tinggalkan",
  lanjutLatihan: "Lanjut latihan",
} as const;

export const TEKS = {
  memuat: "Memuat…",
  menyimpan: "Menyimpan…",
  memproses: "Memproses…",
  sedangMasuk: "Sedang masuk…",
  memeriksa: "Memeriksa…",
  menyimpanHasil: "Menyimpan hasil…",
  aiMengetik: "AI sedang mengetik…",
  kosong: "—",
  belumPernah: "Belum pernah",
  belumAdaLatihan: "Belum ada latihan",
  disarankan: "Disarankan",
  diubah: "Diubah",
  akunSendiri: "(kamu)",
  jawabanHanyaDariDokumen: "Jawaban hanya dari dokumen ini",
  diambilDariBuku: "Diambil dari isi buku",
  emailTidakDapatDiubah: "Email tidak dapat diubah.", // BR-36
  privasiAdmin: "Admin tidak dapat membuka isi dokumen pengguna.", // BR-06
  kuotaDokumen: "{n} dari {maks} dokumen terpakai",
  sisaKuotaTanya: "Sisa {n} dari {maks} hari ini",
  resetKuota: "Terisi lagi pukul 00.00 WIB",
  topikKe: "Topik {n} dari {total}",
  soalKe: "Soal {n} dari {total}",
  tahapKe: "Tahap {i} dari {total}",
  tautanBaruTerkirim: "Tautan baru telah dikirim.",
  benar: "Benar!",
  belumTepat: "Belum tepat. Jawaban yang benar: {huruf}.",
} as const;

// ── Label status (badge) ──────────────────────────────────────────
// Status topik dihitung di view DB (BR-13); di sini hanya pemetaan nilai → teks.
export const STATUS_TOPIK = {
  belum: "Belum dipelajari",
  lemah: "Perlu diulang",
  selesai: "Selesai",
} as const;
export type StatusTopik = keyof typeof STATUS_TOPIK;

export const STATUS_DOKUMEN = {
  diproses: "Sedang diproses",
  siap: "Siap dipelajari",
  gagal: "Gagal diproses",
} as const;
export type StatusDokumen = keyof typeof STATUS_DOKUMEN;

// Tahap pengolahan (CHECK ck_dokumen_tahap, FT-02) — urutan objek = urutan tahap.
export const TAHAP_DOKUMEN = {
  membaca: "Membaca",
  mengekstrak: "Mengekstrak teks",
  memotong: "Memotong",
  mengindeks: "Mengindeks",
  menyusun_topik: "Menyusun topik",
} as const;
export type TahapDokumen = keyof typeof TAHAP_DOKUMEN;

export const STATUS_AKUN = {
  aktif: "Aktif",
  nonaktif: "Nonaktif",
} as const;
export type StatusAkun = keyof typeof STATUS_AKUN;

export const LABEL_PERAN = {
  mahasiswa: "Mahasiswa",
  admin: "Admin",
} as const;

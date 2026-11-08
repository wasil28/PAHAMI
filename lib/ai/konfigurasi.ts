import "server-only";

// Kenop penyetelan khusus pipeline AI/RAG. Konstanta bisnis (KATA_PER_CHUNK, MIN/MAX_TOPIK,
// JUMLAH_SOAL, ambang relevansi, dll.) tetap di lib/config.ts; di sini hanya angka teknis
// agar tidak ada "angka ajaib" yang tersebar di banyak file. Lihat docs/AI-RAG.md §Tuning.

// ── Chunk (BR-08) ──────────────────────────────────────────────
/** Chunk boleh melebar sampai 1,2× target agar kalimat tidak terpotong. */
export const RASIO_MAKS_CHUNK = 1.2;
/** Sisa chunk terakhir < 20% target digabung ke chunk sebelumnya (hindari chunk "yatim"). */
export const RASIO_MIN_SISA_CHUNK = 0.2;
/** Judul bab memulai chunk baru bila chunk berjalan sudah ≥ 40% target (batas topik lebih rapi). */
export const RASIO_MIN_SEBELUM_JUDUL = 0.4;
/** Perkiraan karakter per token (teks Indonesia ± 3,5–4 karakter/token pada tokenizer BPE). */
export const KARAKTER_PER_TOKEN = 3.5;

// ── Embedding ──────────────────────────────────────────────────
/** Jumlah teks per permintaan embedding; 64 × ±700 token jauh di bawah batas 8k/teks & payload. */
export const UKURAN_BATCH_EMBEDDING = 64;

// ── Penyusunan topik (BR-09) ───────────────────────────────────
/** Anggaran karakter kerangka dokumen yang dikirim ke model (±57 ribu token untuk 300 halaman). */
export const ANGGARAN_KARAKTER_KERANGKA = 200_000;
export const KARAKTER_KERANGKA_PER_HALAMAN_MAKS = 1_500;
export const KARAKTER_KERANGKA_PER_HALAMAN_MIN = 200;

// ── Ringkasan & soal (BR-10, BR-11) ────────────────────────────
/** Batas konteks chunk untuk ringkasan/soal; topik sangat panjang diambil sampel merata. */
export const ANGGARAN_KARAKTER_KONTEKS_TOPIK = 120_000;
export const KUTIPAN_MAKS = 500; // varchar(500) di t_topik_rujukan / t_chat_rujukan
export const POIN_PENTING_MIN = 3;
export const POIN_PENTING_MAKS = 5;
/**
 * Coba ulang bila format/validasi hasil AI salah (di luar coba ulang jaringan bawaan SDK).
 * Total panggilan = 1 + nilai ini. Dibatasi 1 agar biaya terkendali; galat jaringan sudah
 * dicoba ulang maks. 2× oleh SDK (BR-32, lihat client.ts).
 */
export const COBA_ULANG_FORMAT = 1;

// ── Materi per topik (KEPUTUSAN §4) ────────────────────────────
/** Target ± halaman PDF per satu halaman materi. */
export const HALAMAN_PER_MATERI = 5;
export const MATERI_MIN = 2;
export const MATERI_MAKS = 10;
/** Topik sependek ini (halaman) tidak dipecah: satu materi = seluruh topik, tanpa panggilan AI. */
export const HALAMAN_TANPA_PECAH = 3;
/** Cuplikan awal tiap chunk yang dikirim untuk menyusun kerangka materi. */
export const KARAKTER_KERANGKA_MATERI_PER_CHUNK = 350;
export const ANGGARAN_KARAKTER_KERANGKA_MATERI = 60_000;
export const TOKEN_MAKS_KERANGKA_MATERI = 1_500;
/** Konteks isi satu materi (rentangnya kecil, jadi biasanya seluruh teks terkirim). */
export const ANGGARAN_KARAKTER_KONTEKS_MATERI = 60_000;
export const TOKEN_MAKS_ISI_MATERI = 4_500;
export const POIN_MATERI_MIN = 3;
export const POIN_MATERI_MAKS = 6;
/** Batas waktu satu permintaan gambar sampul. */
export const BATAS_WAKTU_SAMPUL_MS = 90_000;

// ── Tanya AI (BR-16, BR-30) ────────────────────────────────────
/** Jumlah pesan riwayat terakhir (3 pasang) untuk menyusun pertanyaan mandiri (FT-06 Q-FT06-04). */
export const RIWAYAT_MAKS_PESAN = 6;
export const TOKEN_MAKS_PERTANYAAN_MANDIRI = 150;
export const TOKEN_MAKS_JAWABAN = 1_200;
export const TOKEN_MAKS_RINGKASAN = 2_500;
export const TOKEN_MAKS_SOAL = 3_000;
export const TOKEN_MAKS_TOPIK = 4_000;

// ── Tenggat (lib/ai/tenggat.ts, TENGGAT_* di lib/config.ts) ─────
/** Coba ulang jaringan SDK pada pipeline dokumen (bawaan 2×) agar kasus terburuk muat dalam tenggat. */
export const COBA_ULANG_PIPELINE = 1;
/** Timeout satu batch embedding pipeline (64 teks biasanya < 5 dtk). */
export const BATAS_WAKTU_EMBEDDING_BATCH_MS = 30_000;
/** Timeout pertanyaan mandiri & embedding pertanyaan Tanya AI (sisa tenggat untuk jawaban). */
export const BATAS_WAKTU_LANGKAH_CHAT_MS = 10_000;
/** Coba ulang embedding pertanyaan Tanya AI; pertanyaan mandiri & aliran jawaban tanpa coba ulang. */
export const COBA_ULANG_LANGKAH_CHAT = 1;

// ── Suhu model ─────────────────────────────────────────────────
export const SUHU_FAKTUAL = 0.2; // ringkasan, jawaban: setia pada teks
export const SUHU_SOAL = 0.4; // sedikit variasi pengecoh
export const SUHU_STRUKTUR = 0; // topik & pertanyaan mandiri: deterministik

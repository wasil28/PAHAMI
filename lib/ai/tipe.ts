import "server-only";

// Tipe masukan/keluaran pipeline AI. Sengaja TIDAK mengimpor types/database.ts agar lib/ai
// tidak terikat pada skema yang sedang ditulis paralel; kolom mengikuti skema-database.dbml.

/** Teks satu halaman PDF hasil ekstraksi (nomor mulai 1). */
export interface HalamanTeks {
  nomor: number;
  teks: string;
}

/** Chunk yang sudah tersimpan di t_chunk (dibaca kembali untuk ringkasan/soal/jawaban). */
export interface ChunkSumber {
  id: number;
  isi: string;
  halaman_awal: number;
  halaman_akhir: number;
  urutan?: number;
}

/** Chunk hasil pencarian vektor (fn_cari_chunk) beserta skor kemiripan kosinus. */
export interface ChunkRelevan extends ChunkSumber {
  skor: number;
}

/** Rentang halaman satu topik (t_topik). */
export interface TopikRentang {
  judul: string;
  halaman_awal: number;
  halaman_akhir: number;
}

/** Rujukan halaman untuk t_topik_rujukan / t_chat_rujukan. */
export interface Rujukan {
  halaman: number;
  kutipan: string;
  chunk_id: number | null;
}

/**
 * Pemakaian AI satu proses (bisa gabungan beberapa panggilan) → satu baris log_pemakaian_ai
 * (BR-27, KEPUTUSAN A1: token & biaya dijumlah).
 */
export interface Pemakaian {
  model: string;
  tokenMasuk: number;
  tokenKeluar: number;
  biayaRp: number;
  durasiMs: number;
}

/** Pesan riwayat chat (t_chat.peran: user | ai). */
export interface PesanRiwayat {
  peran: "user" | "ai";
  isi: string;
}

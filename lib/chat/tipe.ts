// Tipe Tanya AI (FT-06) yang dipakai bersama oleh API dan panel klien. Aman untuk klien
// (tanpa server-only) — jangan impor apa pun dari lib/ai atau lib/supabase di sini.

/** Sisa kuota tanya hari ini (BR-17, reset 00.00 WIB). */
export interface KuotaTanyaAi {
  terpakai: number;
  maks: number;
  sisa: number;
  /** ISO — 00.00 WIB berikutnya. */
  resetAt: string;
}

/** Rujukan halaman satu jawaban (t_chat_rujukan) — chip "Hal. X" + lembar kutipan (C6). */
export interface RujukanChat {
  halaman: number;
  kutipan: string;
}

/** Satu pesan riwayat (t_chat) beserta rujukannya. */
export interface PesanChat {
  id: number;
  peran: "user" | "ai";
  isi: string;
  isTidakDitemukan: boolean;
  /** KEPUTUSAN B9: jawaban terputus disimpan parsial + ditandai. */
  isTerputus: boolean;
  topikId: number | null;
  createdAt: string;
  rujukan: RujukanChat[];
}

/** Data GET /api/dokumen/[id]/chat (dibungkus `{ data }`). Pesan urut lama → baru (terbaru di bawah). */
export interface HalamanRiwayatChat {
  pesan: PesanChat[];
  /** Masih ada pesan yang lebih lama → tombol "Muat pesan sebelumnya". */
  adaSebelumnya: boolean;
  /** Hanya diisi pada halaman pertama (tanpa kursor). */
  kuota: KuotaTanyaAi | null;
}

/** Status akhir satu jawaban di metadata aliran. */
export type StatusJawaban = "selesai" | "terputus" | "gagal_simpan";

/**
 * Metadata yang dikirim di akhir aliran POST (lihat lib/chat/protokol.ts).
 * `gagal_simpan`: jawaban sudah tampil tetapi tidak tersimpan ke riwayat (kuota tidak berkurang).
 */
export interface MetaJawaban {
  status: StatusJawaban;
  /** id t_chat peran `user` & `ai`; null bila tidak tersimpan. */
  chatUserId: number | null;
  chatAiId: number | null;
  isTidakDitemukan: boolean;
  isTerputus: boolean;
  rujukan: RujukanChat[];
  /** Kuota setelah pertanyaan ini dihitung; null bila gagal dibaca. */
  kuota: KuotaTanyaAi | null;
  createdAt: string;
}

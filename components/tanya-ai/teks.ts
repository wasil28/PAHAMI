// Teks UI panel Tanya AI yang belum ada di lib/pesan.ts (FT-06 ui-ux §9 #9 "teks baru").
// Pesan sistem (MSG-C01..C04, Q01, G01/G02) tetap diambil dari lib/pesan.ts.
// TODO integrator: pindahkan ke TEKS/LABEL di lib/pesan.ts (file bersama, bukan milik FT-06).

export const TEKS_TANYA = {
  sapaan: "Halo! Tanyakan apa pun tentang materi ini. Aku hanya menjawab dari isi dokumen ini, lengkap dengan halamannya.",
  cobaTanyakan: "Coba tanyakan:",
  placeholder: "Tulis pertanyaanmu…",
  placeholderKuotaHabis: "Kuota hari ini habis",
  labelInput: "Pertanyaan untuk asisten AI",
  petunjukEnter: "Enter kirim · Shift+Enter baris baru",
  kirim: "Kirim pertanyaan",
  hentikan: "Hentikan jawaban",
  tidakAdaDiDokumen: "Tidak ada di dokumen",
  terputus: "Jawaban terputus",
  belumTersimpan: "Jawaban belum tersimpan di riwayat.",
  belumTerkirim: "Belum terkirim",
  terbaru: "Terbaru",
  muatSebelumnya: "Muat pesan sebelumnya",
  kutipanHal: "Kutipan hal. {halaman}",
  hal: "Hal. {halaman}",
  lihatKutipan: "Lihat kutipan halaman {halaman}",
  kamuBertanya: "Kamu bertanya:",
  aiMenjawab: "AI menjawab:",
  aiTidakDitemukan: "AI: tidak ditemukan di dokumen",
  pertanyaanTerkirim: "Pertanyaan terkirim.",
  jawabanSelesai: "Jawaban selesai.",
  sambilMenunggu: "Sambil menunggu, baca lagi materi atau kerjakan latihan.",
  hariIni: "Hari ini",
  kemarin: "Kemarin",
  jenisKuota: "pertanyaan",
  saranJelaskan: "Jelaskan {judul} dengan bahasa sederhana",
  saranContoh: "Berikan contoh lain",
  saranPoin: "Apa poin terpenting dari {judul}?",
} as const;

/** Batas tampilan judul topik di saran (ui-ux K-10: dipotong 40 karakter). */
export const MAKS_JUDUL_SARAN = 40;
/** Penghitung karakter tampil mulai 400 (ui-ux K-11). */
export const AMBANG_PENGHITUNG = 400;
/** Jarak (px) dari bawah yang masih dianggap "menempel" untuk gulir otomatis. */
export const JARAK_NEMPEL_BAWAH = 80;

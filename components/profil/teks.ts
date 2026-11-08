// Teks UI S-13 yang belum ada di lib/pesan.ts (ditandai "(baru)" di FT-08 ui-ux §3A).
// Pesan sistem (MSG-P01..P03, MSG-Q01, MSG-U03, MSG-C02, MSG-G01/G02) tetap dari lib/pesan.ts.
// TODO integrator: pindahkan ke TEKS/LABEL di lib/pesan.ts agar satu sumber.

export const TEKS_PROFIL = {
  judul: "Profil",
  bagianKuota: "Pemakaian kuota",
  kuotaDokumen: "Dokumen",
  kuotaTanya: "Pertanyaan AI hari ini",
  pertanyaanDari: "{n} dari {maks} pertanyaan",
  jenisDokumen: "dokumen",
  jenisTanya: "pertanyaan AI",
  batasUnggah: "Batas tiap PDF: maks. {mb} MB dan {halaman} halaman.",
  kelolaDokumen: "Kelola dokumen",
  bagianDataDiri: "Data diri",
  bagianSandi: "Ubah kata sandi",
  bantuanSandiBaru: "Minimal 8 karakter, berisi huruf dan angka.",
  bagianInfo: "Info akun",
  infoPeran: "Peran",
  infoBergabung: "Bergabung sejak",
  infoStatus: "Status",
} as const;

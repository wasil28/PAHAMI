// DEV ONLY — data contoh Laporan QC untuk pratinjau shell (?qc=1).
import type { LaporanQc } from "@/lib/qc/tipe";

const dasar = {
  deskripsi: "Langkah:\n1. Buka topik 2\n2. Klik Mulai latihan\n\nYang terjadi:\nTombol diam saja.\n\nSeharusnya:\nSoal pertama muncul.",
  urlHalaman: "/dokumen/3/topik/12?tab=tanya",
  infoPerangkat: { userAgent: "Mozilla/5.0 (Macintosh) Chrome/130", lebarLayar: 1440, tinggiLayar: 900, tema: "gelap" as const },
  pelapor: { id: 2, nama: "Budi Santoso", email: "budi@ecampus.ut.ac.id" },
  ditanganiOleh: null,
  createdAt: "2026-10-27T03:15:00Z",
  updatedAt: "2026-10-27T03:15:00Z",
  selesaiAt: null,
};

export const CONTOH_LAPORAN_QC: LaporanQc[] = [
  { ...dasar, id: 12, kode: "QC-0012", judul: "Tombol Mulai latihan tidak merespons di HP", kategori: "bug", prioritas: "tinggi", status: "baru", lampiranUrl: null, catatanTim: null },
  { ...dasar, id: 11, kode: "QC-0011", judul: "Typo di ringkasan topik", kategori: "teks", prioritas: "rendah", status: "selesai", lampiranUrl: null, catatanTim: "Sudah diperbaiki, terima kasih!" },
  { ...dasar, id: 10, kode: "QC-0010", judul: "Jawaban AI menyebut halaman yang salah", kategori: "konten_ai", prioritas: "kritis", status: "dikerjakan", lampiranUrl: null, catatanTim: null },
];

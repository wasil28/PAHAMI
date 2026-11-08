import type { Diagram } from "@/lib/materi/tipe";

// Data contoh DiagramMateri untuk showcase (satu per jenis), tema Sistem Informasi.
export const CONTOH_DIAGRAM: Diagram[] = [
  {
    jenis: "alur",
    judul: "Tahapan SDLC model waterfall",
    langkah: [
      { label: "Analisis kebutuhan", keterangan: "Mengumpulkan kebutuhan pengguna lewat wawancara dan observasi." },
      { label: "Perancangan", keterangan: "Menyusun desain basis data, antarmuka, dan arsitektur." },
      { label: "Implementasi", keterangan: "Menulis kode program sesuai rancangan." },
      { label: "Pengujian", keterangan: "Memastikan sistem bebas galat sebelum dipakai." },
    ],
  },
  {
    jenis: "siklus",
    judul: "Siklus pengolahan data",
    langkah: [
      { label: "Input", keterangan: "Data mentah dimasukkan ke sistem." },
      { label: "Proses", keterangan: "Data diolah menjadi informasi." },
      { label: "Output", keterangan: "Informasi disajikan kepada pengguna." },
      { label: "Penyimpanan" },
      { label: "Umpan balik", keterangan: "Hasil dievaluasi untuk perbaikan input." },
    ],
  },
  {
    jenis: "hierarki",
    judul: "Jenis sistem informasi",
    akar: "Sistem informasi",
    cabang: [
      { label: "TPS", anak: ["Kasir", "Penggajian"] },
      { label: "MIS", anak: ["Laporan penjualan"] },
      { label: "DSS", anak: ["Analisis what-if", "Simulasi"] },
      { label: "ESS" },
    ],
  },
  {
    jenis: "perbandingan",
    judul: "Data, informasi, dan pengetahuan",
    kolom: [
      { label: "Data", butir: ["Fakta mentah", "Belum bermakna", "Contoh: 75, 80, 90"] },
      { label: "Informasi", butir: ["Data yang sudah diolah", "Bermakna bagi penerima"] },
      { label: "Pengetahuan", butir: ["Informasi yang dipahami", "Dasar pengambilan keputusan"] },
    ],
  },
  {
    jenis: "komponen",
    judul: "Komponen sistem informasi",
    pusat: "Sistem informasi",
    bagian: [
      { label: "Perangkat keras", keterangan: "Komputer, server, jaringan." },
      { label: "Perangkat lunak", keterangan: "Aplikasi dan sistem operasi." },
      { label: "Data", keterangan: "Bahan baku informasi." },
      { label: "Prosedur", keterangan: "Aturan cara sistem dipakai." },
      { label: "Manusia", keterangan: "Pengguna dan pengelola sistem." },
      { label: "Jaringan" },
    ],
  },
];

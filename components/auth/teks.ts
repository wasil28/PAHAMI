// Teks statis layar S-02..S-05 yang ditandai "(baru)" di FT-01 ui-ux.md dan BELUM ada di lib/pesan.ts.
// Pesan sistem (MSG-xx) tetap diambil dari lib/pesan.ts. Usul: integrator memindahkan blok ini ke
// lib/pesan.ts (mis. TEKS_AUTH) saat katalog diperbarui.

export const TEKS_AUTH = {
  masuk: {
    judul: "Masuk",
    subjudul: "Lanjutkan belajar dari dokumenmu.",
    lupaSandi: "Lupa kata sandi?",
    belumPunyaAkun: "Belum punya akun?",
  },
  daftar: {
    judul: "Buat akun",
    subjudul: "Gratis untuk mahasiswa UT.",
    memuat: "Membuat akun…",
    sudahPunyaAkun: "Sudah punya akun?",
    selamatDatang: "Akun berhasil dibuat. Selamat datang!",
    ringkasanError: "Ada {n} kolom yang perlu diperbaiki.",
  },
  lupa: {
    kembali: "Kembali ke halaman masuk",
    judul: "Lupa kata sandi?",
    subjudul: "Masukkan email akunmu. Kami kirim tautan untuk membuat kata sandi baru.",
    memuat: "Mengirim…",
    judulTerkirim: "Cek email kamu",
    dikirimKe: "Dikirim ke:",
    masaBerlaku: "Tautan berlaku 60 menit.",
    salahEmail: "Salah email?",
    gantiEmail: "Ganti email",
    kirimUlangTersedia: "Kirim ulang sekarang tersedia.",
  },
  atur: {
    judul: "Buat kata sandi baru",
    subjudul: "Gunakan kata sandi yang belum pernah kamu pakai.",
    memuat: "Menyimpan…",
    memeriksa: "Memeriksa tautan…",
    judulTidakBerlaku: "Tautan tidak berlaku",
    mintaTautanBaru: "Minta tautan baru",
    sandiSama: "Kata sandi baru harus berbeda dari kata sandi lama.",
  },
  kekuatan: {
    label: "Kekuatan kata sandi",
    lemah: "Lemah",
    sedang: "Sedang",
    kuat: "Kuat",
    syaratPanjang: "Minimal 8 karakter",
    syaratHuruf: "Berisi huruf",
    syaratAngka: "Berisi angka",
  },
  panel: {
    masuk: "Belajar dari PDF-mu sendiri, dibantu AI yang menyebut halaman.",
    daftar: "Mulai belajar terarah dari modul PDF-mu.",
    reset: "Tenang, progres belajarmu aman.",
    keunggulan: [
      "Topik otomatis dari modul",
      "Latihan + pembahasan",
      "Jawaban AI bersumber dari bukumu",
    ],
    langkah: ["Unggah PDF", "Jadi topik", "Latihan", "Tanya AI"],
  },
} as const;

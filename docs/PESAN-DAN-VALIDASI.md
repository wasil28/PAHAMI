# Pesan & Validasi

Acuan: Breakdown §6 (katalog MSG), KEPUTUSAN-TERBUKA §D & A3, Panduan Standar §2.
Kode: `lib/pesan.ts` (katalog), `lib/validasi/*` (skema Zod), `lib/format.ts` (format tanggal/angka).

## 1. Cara pakai

```ts
import { pesan, PESAN, LABEL, STATUS_TOPIK } from "@/lib/pesan";
pesan("MSG-M02", { nama: "Budi" });   // "Akun Budi dinonaktifkan." (variabel diperiksa TypeScript)
PESAN["MSG-D01"];                       // teks tanpa placeholder

// Route Handler
import { parseBody } from "@/lib/validasi/permintaan";
import { skemaUbahJudul } from "@/lib/validasi";
const hasil = await parseBody(req, skemaUbahJudul);
if (hasil.error) return hasil.error;    // 400 + pesan isu pertama (sudah bahasa Indonesia)
```

- Semua pesan error skema diambil dari `PESAN`, jadi isu pertama (`pesanErrorPertama`) bisa langsung ditampilkan.
  Untuk error per kolom di form: `errorPerKolom(err)` → `{ namaKolom: pesan }`.
- `lib/validasi/index.ts` aman untuk klien. `permintaan.ts` (memakai `next/server`) hanya untuk server.
- Teks baru: tambahkan dulu ke `lib/pesan.ts` lalu ke tabel ini.

## 2. Katalog MSG (67 kode: 47 Breakdown + 15 baru §D + 5 impl)

Keterangan: **baru §D** = ditambahkan dari KEPUTUSAN-TERBUKA §D · **ubah A3** = teks diubah · **impl** = tambahan
implementasi (perlu dimasukkan ke Breakdown v1.1).

| Kode | Teks | Dipakai di |
|---|---|---|
| MSG-V01 | "{kolom} wajib diisi." | S-02, S-03, S-04, S-05, S-13, S-16 |
| MSG-V02 | "Format email belum benar, contoh: nama@ecampus.ut.ac.id." | S-02, S-03, S-04 |
| MSG-V03 | "Nama harus 3–60 karakter." | S-03, S-13 |
| MSG-V04 | "Kata sandi minimal 8 karakter dan berisi huruf serta angka." | S-03, S-05, S-13 |
| MSG-V05 | "Konfirmasi kata sandi tidak sama." | S-03, S-05, S-13 |
| MSG-V06 *(impl)* | "Data yang dikirim tidak valid. Muat ulang halaman lalu coba lagi." | API: body/query rusak, id tidak sah |
| MSG-A01 | "Email atau kata sandi salah." | S-02 |
| MSG-A02 | "Akun kamu sedang dinonaktifkan. Hubungi admin untuk informasi lebih lanjut." | S-02 (BR-23) |
| MSG-A03 *(baru §D)* | "Sesi kamu telah berakhir. Silakan masuk lagi." | S-02 banner setelah sesi habis; API 401 |
| MSG-A04 *(baru §D)* | "Tunggu {detik} detik lagi sebelum meminta tautan baru." | S-04 Kirim ulang |
| MSG-A05 | "Email ini sudah terdaftar. Silakan masuk atau gunakan email lain." | S-03 |
| MSG-A06 | "Jika email terdaftar, tautan atur ulang kata sandi telah dikirim. Periksa juga folder spam." | S-04 |
| MSG-A07 | "Kata sandi berhasil diubah. Silakan masuk dengan kata sandi baru." | S-05 → S-02 |
| MSG-A08 | "Tautan sudah kedaluwarsa atau sudah dipakai. Minta tautan baru." | S-05 |
| MSG-U01 | "Hanya file PDF yang dapat diunggah." | S-11 |
| MSG-U02 | "Ukuran file melebihi batas {max_ukuran_mb} MB." | S-11 (klien & API 413) |
| MSG-U03 | "Kuota dokumen kamu sudah penuh ({maks} dokumen). Hapus dokumen lama untuk mengunggah yang baru." | S-06 tooltip, S-11, S-13 |
| MSG-U04 *(baru §D)* | "Judul harus 3–100 karakter." | S-11, dialog Ganti nama S-06/S-07 |
| MSG-U05 | "Unggahan terputus. Periksa koneksi lalu coba lagi." | S-11 |
| MSG-U06 | "Dokumen memiliki {n} halaman, melebihi batas {max_halaman} halaman." | S-11, kartu gagal S-06/S-07 |
| MSG-U07 | "PDF ini berupa hasil scan (gambar) sehingga teksnya tidak dapat dibaca. Unggah PDF berbasis teks." | S-11, S-06, S-07 |
| MSG-U08 | "\"{judul}\" siap dipelajari! Ada {jumlah} topik untukmu." | S-11, S-06 |
| MSG-U09 | "Dokumen gagal diproses karena gangguan sistem. Silakan unggah ulang." | S-11, S-06, S-07 |
| MSG-B01 | "Materi belum bisa disiapkan. Coba lagi sebentar lagi." | S-08 |
| MSG-B02 | "Menyiapkan materi dari buku… (hanya sekali untuk topik ini)" | S-08 |
| MSG-L01 | "Menyiapkan soal latihan dari buku…" | S-09 |
| MSG-L02 | "Soal belum bisa dibuat. Coba lagi." | S-09 |
| MSG-L03 | "Keluar dari latihan? Jawabanmu belum disimpan." | S-09 |
| MSG-L04 | "Topik selesai! Pemahamanmu sudah baik." | S-10 (skor ≥ 70) |
| MSG-L05 *(ubah A3)* | "Skormu cukup baik. Pelajari lagi bagian yang salah agar pemahamanmu makin kuat." | S-10 (skor 60–69) |
| MSG-L06 | "Topik ini perlu diulang. Baca kembali materinya, kamu pasti bisa." | S-10 (skor < 60) |
| MSG-L07 *(baru §D)* | "Jawab semua soal sebelum melihat hasil." | S-09, API `JAWABAN_BELUM_LENGKAP` |
| MSG-L08 *(baru §D)* | "Hasil latihan belum tersimpan. Periksa koneksi lalu coba lagi." | S-09 gagal simpan |
| MSG-C01 *(baru §D)* | "Pertanyaan harus 3–500 karakter." | S-08 panel Tanya AI, API chat |
| MSG-C02 | "Kuota pertanyaan hari ini sudah habis ({maks}). Kuota terisi lagi pukul 00.00 WIB." | S-08, S-13 |
| MSG-C03 | "Maaf, aku tidak menemukan pembahasan tentang hal itu di dokumen ini. Coba kata kunci lain atau tanyakan hal yang ada di materi." | S-08 |
| MSG-C04 | "Asisten AI sedang tidak dapat menjawab. Coba lagi." | S-08 |
| MSG-D01 | "Nama dokumen berhasil diubah." | S-06, S-07 |
| MSG-D02 | "Hapus \"{judul}\"? Semua topik, latihan, dan riwayat tanya AI dokumen ini ikut terhapus dan tidak bisa dikembalikan." | S-06, S-07 |
| MSG-D03 | "Dokumen berhasil dihapus." | S-06, S-07 |
| MSG-D04 *(impl)* | "Dokumen masih diproses. Tunggu sampai selesai lalu coba lagi." | API 409 ganti nama/hapus saat `diproses` |
| MSG-P01 | "Profil berhasil disimpan." | S-13 |
| MSG-P02 | "Kata sandi berhasil diubah." | S-13 |
| MSG-P03 | "Kata sandi lama tidak sesuai." | S-13 |
| MSG-M01 | "Nonaktifkan akun {nama}? Pengguna tidak akan bisa masuk sampai diaktifkan kembali." | S-15 |
| MSG-M02 | "Akun {nama} dinonaktifkan." | S-15 |
| MSG-M03 | "Akun {nama} diaktifkan kembali." | S-15 |
| MSG-M04 *(baru §D)* | "Aktifkan kembali akun {nama}? Pengguna bisa masuk lagi dengan email dan kata sandinya." | S-15 dialog aktifkan |
| MSG-M05 *(baru §D)* | "Akun admin tidak dapat dinonaktifkan." | S-15 tooltip, API 403 (BR-24) |
| MSG-K01 | "Pengaturan kuota berhasil disimpan dan berlaku untuk aksi berikutnya." | S-16 |
| MSG-K02 | "Isi bilangan bulat antara {min} dan {maks}." | S-16 |
| MSG-K03 *(baru §D)* | "Semua kolom akan diisi nilai default: {max_dokumen} dokumen, {max_halaman} halaman, {max_ukuran_mb} MB, dan {max_pertanyaan_harian} pertanyaan per hari. Nilai baru tersimpan setelah kamu menekan Simpan perubahan." | S-16 dialog Kembalikan default |
| MSG-K04 *(baru §D)* | "Perubahan pengaturan kuota belum disimpan dan akan hilang." | S-16 dialog tinggalkan halaman |
| MSG-K05 *(impl)* | "Pengaturan baru saja diubah admin lain. Muat ulang halaman untuk melihat nilai terbaru." | S-16, API 409 (B14) |
| MSG-Q01 *(baru §D)* | "Kuota {jenis} kamu hampir habis ({n} dari {maks})." | S-13, S-08 (≥ 80%) |
| MSG-E01 | "Belum ada dokumen. Unggah PDF pertamamu untuk mulai belajar." | S-06 |
| MSG-E02 | "Belum ada latihan. Kerjakan latihan pertama untuk melihat progresmu." | S-12 |
| MSG-E03 | "Mantap! Tidak ada topik yang perlu diulang." | S-12 |
| MSG-E04 | "Tidak ada pengguna yang cocok dengan pencarian." | S-15 |
| MSG-E05 *(baru §D)* | "Belum ada pertanyaan AI dalam {n} hari terakhir." | S-14 grafik |
| MSG-E06 *(baru §D)* | "Belum ada mahasiswa yang mendaftar." | S-14 pengguna terbaru |
| MSG-E07 *(baru §D)* | "Belum ada akun {status}." | S-15 filter Aktif/Nonaktif kosong |
| MSG-G01 | "Terjadi gangguan koneksi. Coba lagi." | semua layar |
| MSG-G02 | "Data belum bisa dimuat." | semua layar |
| MSG-G03 *(baru §D)* | "Kamu sudah keluar." | S-02 snackbar setelah logout |
| MSG-G04 *(impl)* | "{objek} tidak ditemukan." | halaman/API 404 ("Dokumen", "Topik", "Soal") |
| MSG-G05 *(impl)* | "Kamu tidak punya akses ke halaman ini." | API 403 peran salah (BR-31) |

Teks non-MSG yang berulang (tombol, badge, status, state) ada di `LABEL`, `TEKS`, `LABEL_KOLOM`,
`STATUS_TOPIK` (Belum dipelajari / Perlu diulang / Selesai), `STATUS_DOKUMEN` (Sedang diproses / Siap dipelajari /
Gagal diproses), `TAHAP_DOKUMEN`, `STATUS_AKUN`, `LABEL_PERAN`.

## 3. Skema validasi

| Skema | File | Dipakai di | Aturan |
|---|---|---|---|
| `skemaDaftar` | akun.ts | S-03, `POST /api/auth/daftar` | nama 3–60 (trim, spasi dirapikan), email valid huruf kecil, sandi ≥ 8 huruf+angka, konfirmasi sama (BR-22) |
| `skemaMasuk` | akun.ts | S-02, `POST /api/auth/masuk` | email valid, sandi wajib (tanpa cek kekuatan) |
| `skemaLupaSandi` | akun.ts | S-04, `POST /api/auth/lupa-sandi` | email valid |
| `skemaAturUlangSandi` | akun.ts | S-05, `POST /api/auth/atur-ulang-sandi` | sandi kuat + konfirmasi |
| `skemaUbahNama` | akun.ts | S-13, `PATCH /api/profil` | nama 3–60; email tidak ada (BR-36) |
| `skemaUbahSandi` | akun.ts | S-13, `POST /api/profil/kata-sandi` | sandi lama wajib, baru kuat, konfirmasi sama |
| `skemaBuatDokumen(maxMb)` | dokumen.ts | S-11, `POST /api/dokumen` | `.pdf` + `application/pdf` (BR-01), ukuran ≤ maxMb (BR-02), judul 3–100 atau dari nama file (BR-21) |
| `validasiFilePdf(file, maxMb)` | dokumen.ts | S-11 saat file dipilih | → `"MSG-U01"` / `"MSG-U02"` / `null` |
| `skemaUbahJudul` | dokumen.ts | dialog Ganti nama, `PATCH /api/dokumen/[id]` | judul 3–100 (BR-21) |
| `skemaSimpanLatihan` | latihan.ts | S-09, `POST /api/latihan` | tepat `JUMLAH_SOAL` jawaban, `soalId` unik, pilihan 0–3 (BR-11/33 → MSG-L07) |
| `skemaPeriksaJawaban` | latihan.ts | `POST /api/latihan/periksa` | `soalId`, pilihan 0–3 |
| `skemaKirimPertanyaan` | chat.ts | S-08, `POST /api/dokumen/[id]/chat` | 3–500 setelah trim (BR-18 → MSG-C01), `topikId` opsional |
| `skemaRiwayatChatQuery` | chat.ts | `GET /api/dokumen/[id]/chat` | kursor `sebelum` (ISO) + `sebelumId` |
| `skemaUbahStatusPengguna` / `skemaBodyUbahStatusPengguna` | admin.ts | S-15, `PATCH /api/admin/pengguna/[id]/status` | `isActive` boolean (BR-24 dicek server) |
| `skemaDaftarPenggunaQuery` | admin.ts | `GET /api/admin/pengguna` | `q` ≤ 100, `status` semua/aktif/nonaktif, `peran?`, `halaman` ≥ 1, `urut` terbaru/terlama/nama; nilai salah → default |
| `skemaUbahPengaturan` | admin.ts | S-16, `PUT /api/admin/pengaturan` | `nilai` sebagian per kode, bilangan bulat dalam `RENTANG_PENGATURAN` (BR-29), `versi` ISO untuk 409 |
| `skemaNilaiPengaturan(kode)` | admin.ts | S-16 validasi per kolom | kosong → MSG-V01, salah → MSG-K02 |
| `skemaEstimasiBiayaQuery` | admin.ts | `GET /api/admin/pengaturan/estimasi-biaya` | `maxPertanyaan` 1–500 |
| `skemaStatistikQuery` | admin.ts | S-14, API statistik | `rentang` 7 / 30 (salah → 7) |
| `skemaId`, `parseIdParam` | common.ts | semua rute `[id]` | bilangan bulat positif; `null` → balas 404 |

`RENTANG_PENGATURAN` (BR-29): dokumen 1–50 · halaman 10–500 · ukuran 1–100 MB · pertanyaan/hari 1–500,
lengkap dengan default (dari `lib/config.ts`), satuan, label, dan teks dampak untuk S-16.

## 4. Perbedaan terhadap Breakdown §6

- **Baru (§D, 15 kode):** MSG-A03, A04, U04, C01, L07, L08, M04, M05, K03, K04, Q01, E05, E06, E07, G03.
- **Diubah (A3):** MSG-L05 — "Hampir! … coba sekali lagi" diganti karena skor 60–69 bisa tetap berstatus *Selesai*.
- **Tambahan implementasi (5 kode, usul masuk Breakdown v1.1):** MSG-V06, D04, K05, G04, G05.
- Field API memakai camelCase (`konfirmasiSandi`, `topikId`, `soalId`, `isActive`, `namaFile`, `ukuranByte`);
  pilihan jawaban berupa indeks 0–3, bukan huruf A–D seperti contoh di FT-05/database.md.

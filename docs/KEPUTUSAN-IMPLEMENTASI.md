# Keputusan Implementasi (final untuk development)

Tanggal: 28 Oktober 2026. Mengalahkan dokumen lain bila bertentangan.

## 1. Keputusan Terbuka (../docs/fitur/KEPUTUSAN-TERBUKA.md)
**Semua kolom "Rekomendasi" disetujui** — A1–A9, B1–B16, C1–C8, D (katalog MSG baru), E (penyelarasan). Rinciannya:
- A1 satu baris `log_pemakaian_ai` per pertanyaan (token & biaya dijumlah); gagal → `is_sukses=false`, tidak mengurangi kuota.
- A2 tambah `t_dokumen.topik_terakhir_id` (FK t_topik, ON DELETE SET NULL); diperbarui saat topik dibuka/latihan.
- A3 BR-13 tetap; MSG-L05 diubah agar tidak bertentangan dengan status.
- A4 `t_latihan_jawaban.soal_id` CASCADE; `t_topik_rujukan.chunk_id` & `t_chat_rujukan.chunk_id` SET NULL.
- A5 **embedding 768 dimensi** → `t_chunk.embedding vector(768)` (model `openai/text-embedding-3-small` via OpenRouter, parameter `dimensions: 768`).
- A6 `m_pengaturan_sistem` + kolom `tipe_nilai`, `satuan`, `is_tampil`; `ambang_relevansi` 0,50–0,95, tidak tampil di S-16.
- A7 `t_topik.ringkasan_diklaim_at`, `t_topik.soal_diklaim_at` untuk mencegah AI dipanggil ganda.
- A8 dokumen `diproses` > 15 menit → otomatis `gagal` (dicek saat membaca daftar dokumen) dan boleh dihapus.
- A9 dokumen `gagal` dihapus otomatis setelah 7 hari (dibersihkan saat beranda dimuat / fungsi pembersih).
- B15 satu peran per pengguna: unique `m_user_role.user_id`.
- C1 bar bawah 4 menu (Beranda, Upload PDF, Progres, Profil); Keluar di Profil & bawah rail/drawer.

## 2. Tampilan
- Tema **Opsi A — Hijau Teal, seed `#1F6F5C`** (Material Color Utilities, terang & gelap) + custom color `success`, `warning`.
- Font **Plus Jakarta Sans** (F2). Gaya **G1 Tonal Lembut** (kartu filled `surface-container`, radius 12–16, tombol kedua tonal).
- Ikon **Material Symbols Rounded**.

## 3. Arsitektur
- **Unggah PDF**: browser → `POST /api/dokumen` (validasi + kuota + buat baris `t_dokumen` status `diproses` + signed upload URL) → browser unggah langsung ke Storage bucket `dokumen` path `{auth_uid}/{kode}.pdf` → `POST /api/dokumen/[id]/proses` memicu pengolahan. Alasan: batas body request Vercel ±4,5 MB, file bisa 20 MB.
- **Pengolahan** (BP-04) di server (`maxDuration = 300`, dijalankan dengan `after()`): unduh → ekstrak teks per halaman (`unpdf`) → cek scan (BR-05) & batas halaman (BR-03) → chunk (BR-08) → embedding batch → simpan `t_chunk` → susun topik (BR-09) → status `siap`/`gagal`. Browser memantau status dengan polling `GET /api/dokumen/[id]`.
- **Ringkasan & soal**: dibuat saat pertama dibuka (BR-10/11), diklaim dulu (A7).
- **Tanya AI**: `POST /api/dokumen/[id]/chat` → cek kuota → embedding pertanyaan → `fn_cari_chunk` (top-5, ambang dari pengaturan) → jawaban **streaming** + rujukan halaman → simpan `t_chat`/`t_chat_rujukan` → 1 baris log.
- **AI**: OpenRouter, model `google/gemini-2.5-flash` (env `AI_MODEL`). Biaya dihitung dari token × harga model (Rp, BR-27).
- **Auth**: Supabase Auth email+sandi; konfirmasi email dimatikan selama uji coba (B3). `proxy.ts` memperbarui sesi & menjaga rute; pemeriksaan peran/aktif di `wajibLogin()`.
- **Database lokal**: migrasi divalidasi di Postgres 16 + pgvector lokal dengan shim skema `auth`/`storage`; project Supabase cloud menyusul.

## 4. Perubahan selama development
- **Ambang relevansi awal 0,50** (bukan 0,75). Skor cosine `text-embedding-3-small` untuk pasangan relevan umumnya 0,35–0,65; 0,75 membuat hampir semua jawaban "tidak ditemukan". Dikalibrasi saat uji akurasi memakai `t_chat.skor_relevansi` (BR-16).
- **Ringkasan topik** disimpan terstruktur (`konsep_inti`, `poin_penting` 3–5, `contoh`) + rujukan, bukan markdown bebas.
- **`log_pemakaian_ai.fitur`**: `indeks | topik | ringkasan | soal | tanya_ai`. Pengolahan dokumen mencatat 2 baris (indeks & topik).
- **Next.js 16.4.3** (tambalan keamanan kritis dari 16.4.0). Node ≥ 22 (`.nvmrc` = 24).
- **BR-29 `max_halaman` 10–500** (bukan 10–1.000; seed `nilai_max` + `RENTANG_PENGATURAN`). Pengolahan berjalan di satu
  fungsi `maxDuration = 300` dtk dengan tenggat internal 270 dtk; 500 halaman masih muat, 1.000 berisiko terhenti.
- **Tenggat internal** (`lib/ai/tenggat.ts`, `TENGGAT_*` di `lib/config.ts`): pengolahan dokumen 270 dtk — sinyal batal
  diteruskan ke embedding & penyusunan topik (coba ulang SDK 1×), habis → `fn_gagalkan_dokumen` dengan MSG-U09 sebelum
  fungsi dibunuh. Tanya AI 75 dtk dari `maxDuration` 90 — pertanyaan mandiri & embedding timeout 10 dtk, aliran jawaban
  tanpa coba ulang SDK dan dihentikan saat tenggat (disimpan sebagai terputus, B9), sehingga penyimpanan selalu sempat jalan.
- **Kuota Tanya AI dipesan atomik** (BR-17): `fn_klaim_kuota_tanya` (kunci advisory per pengguna) menghitung log sukses hari
  ini + reservasi berjalan (`t_reservasi_tanya`, kedaluwarsa 3 menit) lalu menyisipkan reservasi. Reservasi dipakai oleh
  `fn_simpan_chat` (termasuk jawaban "tidak ditemukan") atau dilepas `fn_lepas_kuota_tanya` saat AI gagal (A1).
  `fn_sisa_kuota_tanya` ikut menghitung reservasi berjalan.
- **Ukuran file nyata dicek** (BR-02): sebelum pipeline, `/api/dokumen/[id]/proses` membaca `storage.objects.metadata.size`
  (`fn_periksa_file_dokumen`); melebihi `max_ukuran_mb` → baris & file dihapus, 413 MSG-U02.
- **Hapus dokumen hanya lewat `fn_hapus_dokumen`**: hak DELETE langsung `t_dokumen` (REST) dicabut. RPC menegakkan aturan
  "tidak sedang diolah" (+A8) dan mengembalikan `path_file`; server menghapus baris dulu, baru file Storage (gagal hapus
  file → file yatim dicatat di log server, tidak pernah baris yang menunjuk file hilang).
- **Chunk lewat `fn_simpan_chunk`**: baris dokumen dikunci & wajib `diproses`, sehingga dokumen yang ditandai macet (A8)
  di tengah pengindeksan tidak menyisakan chunk yatim.
- **Default privileges ditutup** di migrasi grant: tabel/sequence/fungsi baru di `public` tidak otomatis terbuka untuk
  `anon`/`authenticated` (dan EXECUTE `PUBLIC`). Migrasi baru wajib menulis GRANT sendiri.
- **Batasan yang diterima — `fn_periksa_jawaban`**: dapat dipanggil berulang untuk soal yang sama sehingga kunci bisa
  "ditebak" sebelum latihan disimpan. Diterima: datanya milik mahasiswa itu sendiri (latihan mandiri, bukan ujian),
  BR-33 melarang menyimpan jawaban sementara, dan skor tetap dihitung ulang dari kunci di server (B8). Penjaga murah
  (mis. kunci per soal per sesi) akan menghambat alur "periksa → baca pembahasan → lanjut" tanpa manfaat berarti.
- **Chunk tidak melintasi judul utama (BR-08)**: judul BAB/MODUL/KEGIATAN BELAJAR selalu memulai chunk baru walau
  bab sebelumnya pendek. Sebelumnya bab < 40% target digabung ke bab berikutnya sehingga ringkasan & soal satu topik
  ikut memuat materi topik lain (ditemukan saat uji dengan OpenRouter asli). Sub-judul bernomor tetap memakai aturan rasio.
- **Model AI uji**: `AI_MODEL=openai/gpt-4.1-mini`, `AI_MODEL_PRO=openai/gpt-4.1` (penyusunan topik). Harga keduanya
  ditambahkan ke `lib/ai/biaya.ts`; bila OpenRouter mengirim `usage.cost`, angka itu yang dipakai.
- **Materi per topik (permintaan PM, 28-10-2026)**: satu topik dipecah menjadi beberapa halaman materi (sub-bab, ± 1 per
  5 halaman PDF, 2–10; topik ≤ 3 halaman tidak dipecah). Kerangka dibuat sekali saat topik pertama dibuka
  (`POST /api/topik/[id]/materi`), isi detail per materi dibuat sekali saat materi dibuka (`POST /api/materi/[id]`):
  penjelasan Markdown 400–900 kata, poin penting 3–6, contoh, rujukan, dan **diagram** (alur/siklus/hierarki/
  perbandingan/komponen) yang digambar aplikasi dari data JSON — bukan gambar AI, sehingga murah dan labelnya akurat.
  Satu **gambar sampul AI per topik** (`google/gemini-3.1-flash-lite-image`, ± Rp550/gambar, bucket privat `sampul`),
  dekoratif: gagal → placeholder, tidak dicoba ulang selama 1 hari. Tabel `t_materi`, `t_materi_rujukan`; kolom baru di
  `t_topik`; fitur log `materi` & `sampul` (migrasi `20261028001300_materi_topik.sql`). Ringkasan topik (BR-10) tetap ada
  sebagai halaman ringkasan topik. Halaman baru: `/dokumen/[id]/topik/[topikId]/materi/[materiId]`.
- **Validasi keluaran AI tanpa locale Zod**: `parseJsonAI` memakai pesan galat sendiri; locale bawaan Zod dapat melempar
  saat membuat pesan dan menggagalkan coba ulang.
- **Laporan QC (permintaan PM, 28-10-2026)**: anggota tim ditandai `m_users.is_penguji` oleh admin (Admin › Laporan QC ›
  Penguji, berdasarkan email). Penguji & admin melihat tombol "Laporkan" di semua halaman: judul, kategori (bug/tampilan/
  isi AI/teks/saran), prioritas, deskripsi, screenshot opsional (≤ 5 MB, bucket privat `qc`); alamat halaman & info
  perangkat terekam otomatis. Penguji memantau status di `/laporan-qc`; admin memilah di `/admin/laporan-qc` (status
  baru → dikerjakan → selesai/ditolak, catatan tim, ekspor CSV). Tabel `t_laporan_qc`, RPC `fn_buat_laporan_qc`,
  `fn_ubah_laporan_qc`, `fn_atur_penguji`, `fn_daftar_penguji` (migrasi `20261028001400_laporan_qc.sql`). Fitur ini
  alat bantu pengujian tim, di luar 11 fitur spesifikasi.

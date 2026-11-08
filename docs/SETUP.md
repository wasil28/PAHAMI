# Setup Pahami

## 1. Prasyarat
- Node.js ≥ 22 (`nvm use` → 24 sesuai `.nvmrc`).
- Akun [Supabase](https://supabase.com) (paket gratis cukup) dan [OpenRouter](https://openrouter.ai) (isi saldo kecil, mis. $5).

## 2. Supabase
1. Buat project baru (region **Singapore**). Simpan password database.
2. **Project Settings → API**: salin `Project URL`, `anon public key`, dan `service_role key` ke `.env.local`.
3. Terapkan skema & data awal:
   ```bash
   npx supabase login
   npx supabase link --project-ref <ref-project>
   npx supabase db push --include-seed
   ```
   Ini membuat 17 tabel, view, fungsi, RLS, bucket Storage `dokumen`, serta seed peran/menu/pengaturan kuota.
4. **Authentication → Sign In / Providers → Email**: matikan *Confirm email* (KEPUTUSAN B3). Minimal panjang sandi 8.
5. **Authentication → URL Configuration**: *Site URL* = URL aplikasi (lokal `http://localhost:3000`, produksi URL Vercel); tambahkan `<URL>/**` ke *Redirect URLs*.
6. **Authentication → Emails → Reset Password**: ganti isi template dengan `supabase/templates/reset-sandi.html` (tautan memakai `token_hash`, jadi bisa dibuka di browser mana pun).
7. *(Disarankan, pengerasan)* **Authentication → Sign In / Providers → Email**: aktifkan *Secure password change*. Trade-off: Supabase lalu menolak ganti sandi dari halaman Profil (`/api/profil/kata-sandi`) bila sesi pengguna sudah berumur > 24 jam tanpa nonce reautentikasi; aplikasi membalas pesan "perlu masuk ulang" (403 `PERLU_MASUK_ULANG`) dan pengguna cukup keluar lalu masuk lagi. Alur reset sandi lewat email tidak terdampak. Di lokal (`supabase/config.toml`) tetap `false`.
8. **Admin pertama**: daftar lewat aplikasi seperti biasa, lalu di *SQL Editor* jalankan cuplikan di bagian bawah `supabase/seed.sql` (ubah email).

## 3. OpenRouter
Buat API key di https://openrouter.ai/keys → isi `OPENROUTER_API_KEY`. Model default: `google/gemini-2.5-flash` (chat/generasi) dan `openai/text-embedding-3-small` dengan 768 dimensi (embedding). Ganti model cukup di `.env.local` — **dimensi embedding harus tetap 768**.

## 4. Menjalankan
```bash
npm install
cp .env.example .env.local   # isi semua nilai
npm run dev                  # http://localhost:3000
```
Uji alur: daftar → upload PDF teks (mis. modul 20–50 halaman) → tunggu status "Siap dipelajari" → buka topik → ringkasan → latihan → Tanya AI.

## 5. Deploy ke Vercel
1. Import repo di Vercel (root directory: `pahami`).
2. Isi semua environment variable dari `.env.example`:
   - `NEXT_PUBLIC_SITE_URL` = URL Vercel — **wajib**; tanpa ini email reset sandi tidak dikirim di produksi (sengaja tidak memakai header Host permintaan karena bisa dipalsukan).
   - `PEMULIHAN_SECRET` = string acak ≥ 32 byte (`openssl rand -base64 32`), kunci HMAC cookie penanda reset sandi. Bila kosong, kunci diturunkan dari `SUPABASE_SERVICE_ROLE_KEY` (cadangan; merotasi service key berarti tautan reset yang sedang berjalan batal).
3. Pengolahan PDF memakai `maxDuration = 300` dan Tanya AI `90` detik → pastikan *Fluid Compute* aktif (default di project baru).
4. Tambahkan URL Vercel ke *Site URL / Redirect URLs* Supabase.

## 6. Uji
- `npm test` — uji unit tanpa jaringan.
- `npm run test:db` — menjalankan semua migrasi + 162 cek RLS/aturan bisnis di Postgres lokal (Postgres.app 16 + pgvector).

## Catatan biaya (perkiraan)
Mengolah 1 modul 200 halaman ≈ Rp100–300; 1 pertanyaan Tanya AI ≈ Rp5–20. Biaya nyata tercatat per panggilan di `log_pemakaian_ai` dan terlihat di Dashboard Admin.

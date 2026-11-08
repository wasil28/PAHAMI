# Database Pahami

Postgres (Supabase) + pgvector + Auth + Storage + RLS. Acuan desain: `../docs/fitur/FT-*/database.md`,
`../docs/skema-database.dbml`, dan keputusan final `docs/KEPUTUSAN-IMPLEMENTASI.md`.
Tipe TypeScript: `types/database.ts` (bentuk `supabase gen types`).

## 1. Migrasi (`supabase/migrations/`)

| File | Isi |
|---|---|
| `20261028000100_ekstensi.sql` | `vector`, `pgcrypto`, `btree_gist` di skema `extensions` |
| `20261028000200_tabel_master.sql` | `m_users`, `m_role`, `m_user_role` (1 peran/pengguna, B15), `m_menu`, `m_otorisasi_menu`, `m_pengaturan_sistem` (+`tipe_nilai`, `satuan`, `is_tampil`, A6), `fn_set_updated_at` |
| `20261028000300_tabel_dokumen.sql` | `t_dokumen` (+`topik_terakhir_id` A2, `path_file` unik), `t_chunk` (`vector(768)` + HNSW cosine, A5), `t_topik` (+klaim A7, EXCLUDE rentang halaman), `t_topik_rujukan` |
| `20261028000400_tabel_latihan.sql` | `t_soal`, `t_latihan` (CHECK skor BR-12), `t_latihan_jawaban` (soal_id CASCADE, A4) |
| `20261028000500_tabel_chat.sql` | `t_chat` (+`is_terputus`, B9), `t_chat_rujukan`, `t_reservasi_tanya` (kuota in-flight BR-17) |
| `20261028000600_tabel_log.sql` | `log_pemakaian_ai` (1 baris/pertanyaan, A1), `log_system` |
| `20261028000700_fungsi_inti_trigger.sql` | `fn_current_user_id`, `fn_is_admin`, `fn_pengaturan*`, trigger daftar (auth.users → m_users + peran mahasiswa), penjaga BR-24/BR-36, transisi status dokumen, rentang rujukan/soal, log hanya-INSERT, audit hapus dokumen |
| `20261028000800_view_progres.sql` | `v_progres_topik` (BR-13), `v_progres_dokumen` (BR-14/15) — `security_invoker` |
| `20261028000900_rpc_mahasiswa.sql` | RPC dokumen, topik, latihan, Tanya AI, kuota, profil |
| `20261028001000_rpc_admin.sql` | RPC pengguna, pengaturan, statistik |
| `20261028001100_rls_grant.sql` | RLS + allow-list GRANT (semua hak dicabut dulu) + default privileges tertutup untuk objek baru |
| `20261028001200_storage_dokumen.sql` | bucket privat `dokumen` (PDF, 100 MB) + policy `storage.objects` |

`supabase/seed.sql`: `m_role`, `m_menu`, `m_otorisasi_menu`, 5 baris `m_pengaturan_sistem`
(max_dokumen 5 [1–50], max_halaman 500 [10–**500**, muat dalam tenggat pipeline], max_ukuran_mb 20 [1–100],
max_pertanyaan_harian 30 [1–500], ambang_relevansi **0,50** [0,50–0,95, tidak tampil]).

## 2. Tabel

| Tabel | Isi | Ditulis oleh |
|---|---|---|
| `m_users` | akun (auth_id → auth.users), `is_active`, `last_active_at` | trigger daftar, RPC profil/status |
| `m_role`, `m_user_role` | mahasiswa / admin, 1 peran per pengguna | seed, tim (SQL) |
| `m_menu`, `m_otorisasi_menu` | menu per peran | seed |
| `m_pengaturan_sistem` | kuota & ambang | `fn_ubah_pengaturan` |
| `t_dokumen` | PDF, status `diproses/siap/gagal`, tahap, path `{auth.uid()}/{kode}.pdf` | `fn_buat_dokumen`, server, pemilik (judul), `fn_hapus_dokumen` |
| `t_chunk` | potongan teks + embedding 768 | `fn_simpan_chunk` (service role) |
| `t_topik`, `t_topik_rujukan` | topik, ringkasan, rujukan halaman | server |
| `t_soal` | 5 soal/topik, kunci tertutup | server |
| `t_latihan`, `t_latihan_jawaban` | percobaan selesai | `fn_simpan_latihan` |
| `t_chat`, `t_chat_rujukan` | riwayat Tanya AI | `fn_simpan_chat` (server) |
| `t_reservasi_tanya` | kuota Tanya AI yang sedang dipakai (kedaluwarsa 3 menit) | `fn_klaim_kuota_tanya` / `fn_simpan_chat` / `fn_lepas_kuota_tanya` |
| `log_pemakaian_ai` | token & biaya per panggilan AI (tanya_ai: 1 baris/pertanyaan) | server |
| `log_system` | audit CREATE/UPDATE/DELETE/LOGIN/LOGOUT/ACTIVATE/DEACTIVATE | RPC & server |

## 3. RPC

Galat dikirim sebagai `RAISE EXCEPTION '<KODE>'` → baca `error.message` (mis. `KUOTA_PENUH`).
`KUOTA_PENUH` memakai SQLSTATE `PT429` dan `KONFLIK_VERSI` memakai `PT409` (PostgREST langsung
membalas HTTP 429/409). **S** = klien sesi (`lib/supabase/server.ts`), **SR** = service role (`lib/supabase/admin.ts`).

### Mahasiswa / pipeline

| Fungsi | Siapa | Guna | Fitur |
|---|---|---|---|
| `fn_buat_dokumen(p_judul, p_nama_file, p_ukuran_byte)` → `{id, kode, path_file, status, tahap}` | S | cek BR-01/02/04/21, buat baris `diproses`, kembalikan path untuk signed upload URL | FT-02 |
| `fn_kode_dokumen()` → text | SR | kode `DOK-YYYY-NNNNNN` (dipakai di dalam fn_buat_dokumen) | FT-02 |
| `fn_selesaikan_dokumen(p_dokumen_id, p_topik jsonb)` → `{jumlah_topik, judul}` | SR | simpan 1–15 topik bersambung hal. 1..akhir, status `siap` (tahap harus `menyusun_topik`) | FT-02 |
| `fn_gagalkan_dokumen(p_dokumen_id, p_pesan)` → boolean | SR | status `gagal` + hapus chunk/topik parsial | FT-02 |
| `fn_simpan_chunk(p_dokumen_id, p_chunk jsonb [{urutan, halaman_awal, halaman_akhir, judul_bagian, isi, jumlah_token, embedding '[…]'}])` → boolean | SR | satu batch t_chunk; kunci baris dokumen, `false` bila tidak lagi `diproses` (A8/dihapus → pipeline berhenti, tanpa chunk yatim) | FT-02 |
| `fn_periksa_file_dokumen(p_dokumen_id)` → `{ada, ukuran_byte, maks_byte, is_terlalu_besar}` | SR | BR-02: ukuran NYATA dari `storage.objects.metadata.size`; dalam batas → `t_dokumen.ukuran_byte` diselaraskan | FT-02 |
| `fn_hapus_dokumen(p_dokumen_id)` → `{path_file}` | S | satu-satunya jalur hapus: `siap`/`gagal`, macet (A8), atau `diproses` belum diklaim (`updated_by <> 'system'`); sedang diolah → `DOKUMEN_DIPROSES` (PT409); bukan milik → `TIDAK_DITEMUKAN`. Hapus file Storage SETELAH baris | FT-02/03 |
| `fn_tandai_dokumen_macet(p_user_id?)` → int | S/SR | A8: `diproses` > 15 menit → gagal | FT-02/03 |
| `fn_bersihkan_dokumen_gagal(p_user_id?)` → `{dokumen_id, path_file}[]` | S/SR | A9: hapus `gagal` > 7 hari; hapus file dari Storage dengan path hasilnya | FT-03 |
| `fn_lanjutkan_belajar()` → 0/1 baris | S | kartu "Lanjutkan belajar" (BR-34, A2, fallback BR-35) | FT-03 |
| `fn_catat_buka_topik(p_topik_id)` | S | aktivitas + topik terakhir | FT-04 |
| `fn_klaim_topik(p_topik_id, p_jenis 'ringkasan'\|'soal')` → boolean | SR | A7: hanya satu permintaan memanggil AI (sewa 210 dtk) | FT-04/05 |
| `fn_lepas_klaim_topik(p_topik_id, p_jenis)` | SR | lepas klaim saat AI gagal | FT-04/05 |
| `fn_simpan_ringkasan_topik(p_topik_id, p_konsep_inti, p_poin_penting jsonb, p_contoh, p_rujukan jsonb)` → `{is_baru, ringkasan_dibuat_at}` | SR | simpan sekali (BR-10), rujukan wajib dalam rentang | FT-04 |
| `fn_simpan_soal_topik(p_topik_id, p_soal jsonb)` → boolean | SR | 5 soal sekali (BR-11) | FT-05 |
| `fn_periksa_jawaban(p_soal_id, p_dipilih)` → `{is_benar, kunci, pembahasan, halaman_rujukan}` | S | buka kunci satu soal | FT-05 |
| `fn_simpan_latihan(p_topik_id, p_jawaban jsonb [{soal_id, dipilih}])` → `{latihan_id, skor, jumlah_benar, jumlah_soal, status_topik}` | S | skor dihitung ulang dari kunci (BR-12/33, B8) | FT-05 |
| `fn_hasil_latihan(p_latihan_id)` → baris per soal | S | tinjauan S-10 | FT-05 |
| `fn_cari_chunk(p_dokumen_id, p_embedding vector(768) ← teks '[...]', p_k=5, p_ambang=NULL)` → `{chunk_id, urutan, halaman_awal, halaman_akhir, judul_bagian, isi, skor, lolos_ambang}` | S/SR | top-k satu dokumen, **tidak disaring**; `skor` = 1 − jarak cosine; `lolos_ambang` = skor ≥ ambang (default pengaturan) | FT-06 |
| `fn_simpan_chat(p_user_id, p_dokumen_id, p_topik_id, p_pertanyaan, p_jawaban, p_is_tidak_ditemukan, p_skor_relevansi, p_rujukan jsonb, p_log jsonb, p_is_terputus=false, p_reservasi_id bigint=NULL)` → `{chat_user_id, chat_ai_id}` | SR | simpan tanya+jawab+rujukan+1 log `tanya_ai` atomik (A1, B9); `p_reservasi_id` dipakai (dihapus) di transaksi yang sama | FT-06 |
| `fn_klaim_kuota_tanya(p_user_id)` → `{reservasi_id, terpakai, maks, sisa, reset_at}` | SR | BR-17 atomik: kunci advisory per pengguna, hitung log sukses hari ini + reservasi berjalan, sisipkan reservasi; `reservasi_id` NULL = kuota habis (MSG-C02) | FT-06 |
| `fn_lepas_kuota_tanya(p_reservasi_id)` → boolean | SR | AI gagal / tidak tersimpan → kuota tidak berkurang (A1); idempoten | FT-06 |
| `fn_kuota_dokumen(p_user_id?)` → `{terpakai, maks, sisa}` | S/SR | BR-04 | FT-02/03/08 |
| `fn_sisa_kuota_tanya(p_user_id?)` → `{terpakai, maks, sisa, reset_at}` | S/SR | BR-17, reset 00.00 WIB, `is_sukses` + reservasi berjalan (< 3 menit); SECURITY DEFINER, tetap hanya dirinya | FT-06/08 |
| `fn_ubah_profil(p_nama, p_ip?)` → `{id, nama, email, updated_at}` | S | ubah nama + log (BR-22) | FT-08 |
| `fn_perbarui_aktif()` → boolean | S | `last_active_at`, maks. 1×/jam (B2) | FT-01 |
| `fn_pengaturan(p_kode)` / `_int` / `_numeric` | S/SR | baca kuota saat aksi (BR-28) | semua |
| `fn_current_user_id()`, `fn_is_admin()` | S | identitas untuk RLS | semua |

Gagal panggilan AI (tanpa jawaban) dicatat server langsung: `insert log_pemakaian_ai (..., is_sukses=false)`.
Tahap pipeline dimajukan server dengan `update t_dokumen set tahap=… where id=… and status='diproses'`
(0 baris = dokumen sudah dihapus → hentikan).

**Alur kuota Tanya AI (BR-17):** route → `fn_klaim_kuota_tanya` (NULL → 429) → AI → `fn_simpan_chat(..., p_reservasi_id)`
bila jawaban tersimpan, selain itu `fn_lepas_kuota_tanya`. Reservasi yatim (fungsi mati) kedaluwarsa setelah 3 menit.
`fn_hitung_tanya_hari_ini(p_user_id)` = helper internal (SR) yang dipakai keduanya.

### Admin (semua memeriksa `fn_is_admin()`)

| Fungsi | Guna | Fitur |
|---|---|---|
| `fn_ringkasan_pengguna()` → `{total, aktif, nonaktif}` | kartu S-15 | FT-09 |
| `fn_daftar_pengguna(p_cari?, p_status?='semua', p_halaman?=1, p_per_halaman?=20)` | tabel S-15 + `total_baris` | FT-09 |
| `fn_ubah_status_pengguna(p_user_id, p_is_active, p_ip?)` → `{id, nama, auth_id, is_active, is_berubah}` | BR-23/24 + log ACTIVATE/DEACTIVATE; lalu blokir sesi lewat Auth Admin dengan `auth_id` | FT-09 |
| `fn_ubah_pengaturan(p_nilai jsonb {kode: "nilai"}, p_ip?, p_versi? timestamptz)` → baris pengaturan tampil | BR-29, audit, konflik versi → `KONFLIK_VERSI` (409); galat per kolom di `error.details` (JSON) | FT-10 |
| `fn_estimasi_biaya_kuota(p_max_pertanyaan?)` | estimasi biaya harian S-16 (aktif = login 7 hari) | FT-10 |
| `fn_statistik_dashboard(p_rentang_hari 7\|30)` → jsonb | kartu S-14 (B11) | FT-11 |
| `fn_seri_pertanyaan_harian(p_rentang_hari)` | grafik per tanggal WIB | FT-11 |
| `fn_pengguna_terbaru(p_limit?=5)` | 5 mahasiswa terbaru | FT-11 |

`p_versi` = `max(updated_at)` dari `m_pengaturan_sistem` saat S-16 dibuka (dibandingkan per milidetik).

## 4. Ringkasan RLS

- Semua hak `anon`/`authenticated` dicabut lalu diberi seperlunya; `anon` tidak punya akses apa pun.
- Mahasiswa: **SELECT** baris miliknya (dokumen, topik, rujukan, soal tanpa kolom kunci/pembahasan/halaman_rujukan,
  latihan, chat, log pemakaian sendiri, view progres). Tulis langsung hanya `UPDATE t_dokumen(judul)` untuk dokumen
  `siap`; hapus dokumen lewat `fn_hapus_dokumen` (DELETE langsung dicabut agar tidak ada file Storage yatim / dokumen
  yang sedang diolah terhapus); sisanya lewat RPC.
- `t_chunk`, `t_reservasi_tanya`: tanpa akses browser.
- **Default privileges**: objek baru di `public` (tabel, sequence, fungsi) yang dibuat role migrasi tidak lagi
  otomatis di-GRANT ke `anon`/`authenticated`, dan fungsi baru tidak mendapat EXECUTE `PUBLIC`
  (`ALTER DEFAULT PRIVILEGES` di `20261028001100`). Migrasi baru wajib menulis GRANT eksplisit. `m_users`: tanpa UPDATE (pakai RPC); email terkunci (BR-36).
- Akun nonaktif → `fn_current_user_id()` NULL → semua policy pemilik tertutup (BR-23), tapi baris `m_users`
  sendiri tetap terbaca (cek `is_active` di `lib/auth/sesi.ts`).
- Admin: baca `m_users`, `m_user_role`, `log_system`, `log_pemakaian_ai`; **tidak** membaca baris dokumen (BR-06).
- Log hanya INSERT (trigger menolak UPDATE/DELETE, termasuk service role).
- Storage `dokumen`: baca/hapus folder `{auth.uid()}/` sendiri; unggah hanya ke path yang sudah dipesan
  `fn_buat_dokumen` (baris `diproses` milik sendiri). Signed upload URL dari server tetap berjalan.
- Embed `m_users → m_user_role(m_role(kode))` mengembalikan **array** (B15 ditegakkan dengan unique *index*, bukan
  constraint, agar PostgREST tidak mengubahnya menjadi relasi one-to-one).

## 5. Menjalankan

**Lokal dengan Supabase CLI (butuh Docker):** `npx supabase start` lalu `npx supabase db reset`
(migrasi + seed). Konfigurasi: `supabase/config.toml` (konfirmasi email mati — B3, sandi ≥ 8 huruf+angka).

**Supabase cloud:**
```bash
npx supabase login
npx supabase link --project-ref <ref>
npx supabase db push --include-seed      # migrasi + seed.sql (seed aman diulang)
npx supabase gen types typescript --linked > types/database.ts   # opsional; salin ulang alias di bagian bawah
```
Matikan juga *Confirm email* di Dashboard › Authentication bila belum.

**Admin pertama:** buat akun (daftar biasa atau Dashboard › Authentication › Add user), lalu di SQL Editor
jalankan cuplikan di bagian bawah `supabase/seed.sql` (ubah `m_user_role.role_id` ke peran `admin`).

**Uji lokal tanpa Docker** (Postgres 16 + pgvector, mis. Postgres.app):
```bash
bash supabase/tests/jalankan.sh            # buat DB pahami_uji → shim → migrasi → seed → 200 pemeriksaan → hapus DB
SIMPAN_DB=1 bash supabase/tests/jalankan.sh   # pertahankan DB untuk diperiksa
```
`tests/00_shim_supabase.sql` meniru skema `auth`/`storage`, role `anon/authenticated/service_role`, dan default
privilege Supabase. **Jangan** dijalankan di project Supabase.

-- =====================================================================
-- Seed data referensi Pahami. Aman dijalankan ulang (ON CONFLICT DO NOTHING) dan
-- tidak menimpa nilai yang sudah diubah admin.
--   Lokal  : otomatis saat `npx supabase db reset`.
--   Cloud  : `npx supabase db push --include-seed` (sekali, setelah migrasi).
-- m_role WAJIB ada sebelum pengguna pertama mendaftar (trigger fn_buat_pengguna_baru).
-- =====================================================================

-- ---------------------------------------------------------------- m_role (BR-25)
INSERT INTO public.m_role (kode, nama, deskripsi, created_by, updated_by) VALUES
  ('mahasiswa', 'Mahasiswa', 'Pengguna utama: unggah PDF, belajar, latihan, tanya AI, pantau progres', 'system', 'system'),
  ('admin',     'Admin',     'Pengelola pengguna, kuota, statistik & biaya. Tidak melihat isi dokumen (BR-06)', 'system', 'system')
ON CONFLICT (kode) DO NOTHING;

-- ---------------------------------------------------------------- m_menu (Breakdown §4.2–4.3, C1)
INSERT INTO public.m_menu (kode, nama, ikon, route_path, urutan, created_by, updated_by) VALUES
  ('M-M1', 'Beranda',          'home',        '/beranda',          1, 'system', 'system'),
  ('M-M2', 'Upload PDF',       'upload_file', '/upload',           2, 'system', 'system'),
  ('M-M3', 'Progres',          'insights',    '/progres',          3, 'system', 'system'),
  ('M-M4', 'Profil',           'person',      '/profil',           4, 'system', 'system'),
  ('M-M5', 'Keluar',           'logout',      NULL,                5, 'system', 'system'),
  ('M-A1', 'Dashboard',        'dashboard',   '/admin',            1, 'system', 'system'),
  ('M-A2', 'Pengguna',         'group',       '/admin/pengguna',   2, 'system', 'system'),
  ('M-A3', 'Pengaturan Kuota', 'tune',        '/admin/pengaturan', 3, 'system', 'system'),
  ('M-A4', 'Profil',           'person',      '/admin/profil',     4, 'system', 'system'),
  ('M-A6', 'Laporan QC',       'fact_check',  '/admin/laporan-qc', 4, 'system', 'system'),
  ('M-A5', 'Keluar',           'logout',      NULL,                5, 'system', 'system')
ON CONFLICT (kode) DO NOTHING;

-- ---------------------------------------------------------------- m_otorisasi_menu (Breakdown §3.2)
-- Hak new/edit/delete dipakai UI untuk menampilkan tombol; penegakan tetap di API + RLS.
INSERT INTO public.m_otorisasi_menu (role_id, menu_id, allow_view, allow_new, allow_edit, allow_delete, created_by, updated_by)
SELECT r.id, m.id, true, x.allow_new, x.allow_edit, x.allow_delete, 'system', 'system'
FROM (VALUES
        ('mahasiswa', 'M-M1', false, true,  true ),   -- Beranda: ganti nama & hapus dokumen (BP-09)
        ('mahasiswa', 'M-M2', true,  false, false),   -- Upload PDF
        ('mahasiswa', 'M-M3', false, false, false),   -- Progres (baca saja)
        ('mahasiswa', 'M-M4', false, true,  false),   -- Profil: ubah nama & sandi
        ('mahasiswa', 'M-M5', false, false, false),
        ('admin',     'M-A1', false, false, false),   -- Dashboard (agregat)
        ('admin',     'M-A2', false, true,  false),   -- Pengguna: aktif/nonaktif
        ('admin',     'M-A3', false, true,  false),   -- Pengaturan kuota
        ('admin',     'M-A4', false, true,  false),
        ('admin',     'M-A6', false, true,  false),   -- Laporan QC: ubah status & kelola penguji
        ('admin',     'M-A5', false, false, false)
     ) AS x (kode_role, kode_menu, allow_new, allow_edit, allow_delete)
JOIN public.m_role r ON r.kode = x.kode_role
JOIN public.m_menu m ON m.kode = x.kode_menu
ON CONFLICT (role_id, menu_id) DO NOTHING;

-- ---------------------------------------------------------------- m_pengaturan_sistem (BR-29, A6)
INSERT INTO public.m_pengaturan_sistem
  (kode, nilai, nilai_default, nilai_min, nilai_max, tipe_nilai, satuan, is_tampil, keterangan, created_by, updated_by)
VALUES
  ('max_dokumen',           '5',    '5',    1,    50,   'int',     'dokumen',    true,
   'Maks. dokumen diproses + siap per mahasiswa (BR-04). Dampak: ruang penyimpanan & biaya pengolahan.', 'system', 'system'),
  ('max_halaman',           '500',  '500',  10,   500,  'int',     'halaman',    true,
   'Maks. halaman per dokumen, dicek saat dibaca (BR-03). Dampak: lama proses & biaya indeks.', 'system', 'system'),
  ('max_ukuran_mb',         '20',   '20',   1,    100,  'int',     'MB',         true,
   'Maks. ukuran file PDF dalam MB (BR-02). Dampak: kapasitas penyimpanan.', 'system', 'system'),
  ('max_pertanyaan_harian', '30',   '30',   1,    500,  'int',     'pertanyaan', true,
   'Maks. pertanyaan Tanya AI per mahasiswa per hari, reset 00.00 WIB (BR-17). Dampak: biaya AI harian.', 'system', 'system'),
  ('ambang_relevansi',      '0.50', '0.50', 0.50, 0.95, 'numeric', NULL,         false,
   'Ambang kemiripan minimum Tanya AI (BR-16). 0,50: skor cosine text-embedding-3-small untuk pasangan relevan umumnya 0,35–0,65. Diatur tim, tidak tampil di S-16 (A6).', 'system', 'system')
ON CONFLICT (kode) DO NOTHING;

-- ---------------------------------------------------------------- Membuat admin pertama (BR-25)
-- Langkah 1: buat akun lewat Supabase Dashboard › Authentication › Add user (centang
--            "Auto Confirm User"), atau daftar biasa dari aplikasi. Trigger otomatis
--            membuat m_users + peran mahasiswa.
-- Langkah 2: jalankan di SQL Editor (peran postgres), ganti emailnya:
--
-- BEGIN;
--   UPDATE public.m_user_role ur
--      SET role_id = (SELECT id FROM public.m_role WHERE kode = 'admin')
--     FROM public.m_users u
--    WHERE ur.user_id = u.id AND u.email = lower('admin@pahami.id');
--
--   INSERT INTO public.log_system (user_id, action, modul, target_id, detail)
--   SELECT NULL, 'UPDATE', 'users', u.id::text, '{"peran":"mahasiswa→admin","sumber":"tim"}'::jsonb
--     FROM public.m_users u WHERE u.email = lower('admin@pahami.id');
-- COMMIT;

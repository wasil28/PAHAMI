-- =====================================================================
-- Row Level Security + hak akses (Breakdown §3.3 & §8.3, FT-01 … FT-11).
--
-- Prinsip:
--   1. Supabase memberi GRANT ALL ke anon/authenticated untuk setiap objek baru di public.
--      Karena itu semua hak DICABUT dulu, lalu diberikan kembali seperlunya (allow-list).
--   2. Browser (authenticated) praktis hanya MEMBACA miliknya sendiri. Semua penulisan
--      lewat RPC SECURITY DEFINER (validasi + audit tidak bisa dilewati lewat REST),
--      kecuali ganti judul dokumen (UPDATE kolom judul). Hapus dokumen lewat fn_hapus_dokumen.
--   3. service_role (server) melewati RLS: pipeline chunk, log pemakaian AI, Auth Admin.
--   4. Admin tidak punya policy baca baris dokumen/turunannya (BR-06); statistik lewat RPC.
--   5. Policy memakai (SELECT fn_…()) agar fungsi dievaluasi sekali per query (initPlan).
-- =====================================================================

-- ------------------------------------------------------------ cabut semua
REVOKE ALL ON ALL TABLES    IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC, anon, authenticated;

GRANT ALL ON ALL TABLES    IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- Objek yang dibuat migrasi BERIKUTNYA juga tertutup secara bawaan (Supabase memberi
-- GRANT ALL ke anon/authenticated lewat default privileges; PostgreSQL memberi EXECUTE ke
-- PUBLIC untuk setiap fungsi baru). Tanpa ini, fungsi/tabel baru langsung terbuka lewat
-- REST sampai seseorang ingat menulis REVOKE. Berlaku untuk objek yang dibuat role yang
-- menjalankan migrasi (postgres di Supabase). Hak eksplisit di file ini tidak terpengaruh;
-- migrasi baru WAJIB menulis GRANT seperlunya sendiri.
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL     ON TABLES    FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL     ON SEQUENCES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM anon, authenticated, PUBLIC;
-- EXECUTE untuk PUBLIC adalah default GLOBAL PostgreSQL: pencabutan per-skema tidak cukup.
ALTER DEFAULT PRIVILEGES REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL     ON TABLES    TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL     ON SEQUENCES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO service_role;

-- Log = hanya INSERT, termasuk untuk service role (trigger juga menolak).
REVOKE UPDATE, DELETE, TRUNCATE ON public.log_system       FROM service_role;
REVOKE DELETE, TRUNCATE         ON public.log_pemakaian_ai FROM service_role;
-- (UPDATE log_pemakaian_ai tetap ada hanya agar FK ON DELETE SET NULL berjalan; isi lain dijaga trigger.)

-- ------------------------------------------------------------ aktifkan RLS
ALTER TABLE public.m_users             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.m_role              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.m_user_role         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.m_menu              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.m_otorisasi_menu    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.m_pengaturan_sistem ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.t_dokumen           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.t_chunk             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.t_topik             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.t_topik_rujukan     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.t_soal              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.t_latihan           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.t_latihan_jawaban   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.t_chat              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.t_chat_rujukan      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.log_pemakaian_ai    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.log_system          ENABLE ROW LEVEL SECURITY;

-- ================================================================ AKUN & RBAC
-- m_users: pemilik membaca barisnya sendiri. Sengaja memakai auth_id (bukan
-- fn_current_user_id) supaya lib/auth/sesi.ts tetap bisa membaca is_active = false
-- dan menampilkan MSG-A02 (BR-23). Tulis: hanya trigger daftar & RPC (BR-36).
GRANT SELECT ON public.m_users TO authenticated;
CREATE POLICY m_users_select_pemilik ON public.m_users
  FOR SELECT TO authenticated
  USING (auth_id = (SELECT auth.uid()));
CREATE POLICY m_users_select_admin ON public.m_users
  FOR SELECT TO authenticated
  USING ((SELECT public.fn_is_admin()));

-- Referensi: dibaca semua pengguna login; diubah hanya lewat migrasi/seed.
GRANT SELECT ON public.m_role, public.m_menu, public.m_otorisasi_menu TO authenticated;
CREATE POLICY m_role_select_login           ON public.m_role           FOR SELECT TO authenticated USING (true);
CREATE POLICY m_menu_select_login           ON public.m_menu           FOR SELECT TO authenticated USING (true);
CREATE POLICY m_otorisasi_menu_select_login ON public.m_otorisasi_menu FOR SELECT TO authenticated USING (true);

-- m_user_role: pemilik (lewat auth_id, agar embed dari m_users tetap jalan untuk akun
-- nonaktif) & admin. BR-25: peran tidak bisa diubah sendiri (tanpa hak tulis).
GRANT SELECT ON public.m_user_role TO authenticated;
CREATE POLICY m_user_role_select_pemilik ON public.m_user_role
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.m_users u
                  WHERE u.id = m_user_role.user_id AND u.auth_id = (SELECT auth.uid())));
CREATE POLICY m_user_role_select_admin ON public.m_user_role
  FOR SELECT TO authenticated
  USING ((SELECT public.fn_is_admin()));

-- m_pengaturan_sistem: semua pengguna login membaca (S-11 menampilkan batas);
-- ubah hanya lewat fn_ubah_pengaturan (validasi BR-29 + audit).
GRANT SELECT ON public.m_pengaturan_sistem TO authenticated;
CREATE POLICY m_pengaturan_sistem_select_login ON public.m_pengaturan_sistem
  FOR SELECT TO authenticated USING (true);

-- ================================================================ DOKUMEN
-- INSERT hanya lewat fn_buat_dokumen (kuota BR-04). Pemilik boleh membaca dan mengganti
-- judul dokumen siap (BP-09). HAPUS hanya lewat fn_hapus_dokumen: DELETE langsung lewat REST
-- dicabut agar aturan "tidak sedang diolah" + urutan baris-lalu-file (Storage dihapus server
-- dengan path hasil RPC) tidak bisa dilewati dan tidak meninggalkan file yatim.
GRANT SELECT ON public.t_dokumen TO authenticated;
GRANT UPDATE (judul, updated_by) ON public.t_dokumen TO authenticated;
CREATE POLICY t_dokumen_select_pemilik ON public.t_dokumen
  FOR SELECT TO authenticated
  USING (user_id = (SELECT public.fn_current_user_id()));
CREATE POLICY t_dokumen_update_pemilik ON public.t_dokumen
  FOR UPDATE TO authenticated
  USING      (user_id = (SELECT public.fn_current_user_id()) AND status = 'siap')
  WITH CHECK (user_id = (SELECT public.fn_current_user_id()) AND status = 'siap');

-- t_chunk: tanpa policy & tanpa GRANT → browser tidak bisa membaca/menulis (§8.3).
-- t_reservasi_tanya: idem (dibaca lewat fn_sisa_kuota_tanya).
ALTER TABLE public.t_reservasi_tanya ENABLE ROW LEVEL SECURITY;

-- t_topik / t_topik_rujukan: baca bila dokumen induk milik sendiri. Tulis hanya server.
GRANT SELECT ON public.t_topik, public.t_topik_rujukan TO authenticated;
CREATE POLICY t_topik_select_pemilik ON public.t_topik
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.t_dokumen d
                  WHERE d.id = t_topik.dokumen_id
                    AND d.user_id = (SELECT public.fn_current_user_id())));
CREATE POLICY t_topik_rujukan_select_pemilik ON public.t_topik_rujukan
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.t_topik t JOIN public.t_dokumen d ON d.id = t.dokumen_id
                  WHERE t.id = t_topik_rujukan.topik_id
                    AND d.user_id = (SELECT public.fn_current_user_id())));

-- ================================================================ LATIHAN
-- t_soal: RLS menyaring BARIS, hak kolom menyaring KOLOM — kunci, pembahasan,
-- halaman_rujukan tidak bisa dibaca langsung (dibuka lewat fn_periksa_jawaban/fn_hasil_latihan).
-- Konsekuensi: select('*') pada t_soal dari klien sesi akan "permission denied".
GRANT SELECT (id, topik_id, urutan, pertanyaan, pilihan_a, pilihan_b, pilihan_c, pilihan_d, created_at)
  ON public.t_soal TO authenticated;
CREATE POLICY t_soal_select_pemilik ON public.t_soal
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.t_topik t JOIN public.t_dokumen d ON d.id = t.dokumen_id
                  WHERE t.id = t_soal.topik_id
                    AND d.user_id = (SELECT public.fn_current_user_id())));

-- t_latihan / jawaban: baca milik sendiri. INSERT hanya fn_simpan_latihan (skor dihitung server).
GRANT SELECT ON public.t_latihan, public.t_latihan_jawaban TO authenticated;
CREATE POLICY t_latihan_select_pemilik ON public.t_latihan
  FOR SELECT TO authenticated
  USING (user_id = (SELECT public.fn_current_user_id()));
CREATE POLICY t_latihan_jawaban_select_pemilik ON public.t_latihan_jawaban
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.t_latihan l
                  WHERE l.id = t_latihan_jawaban.latihan_id
                    AND l.user_id = (SELECT public.fn_current_user_id())));

-- ================================================================ CHAT
-- Baca riwayat milik sendiri (BR-19). Tulis hanya fn_simpan_chat (service role) agar pesan
-- AI + log kuota atomik dan pengguna tidak bisa menyisipkan jawaban "AI" palsu.
GRANT SELECT ON public.t_chat, public.t_chat_rujukan TO authenticated;
CREATE POLICY t_chat_select_pemilik ON public.t_chat
  FOR SELECT TO authenticated
  USING (user_id = (SELECT public.fn_current_user_id())
         AND EXISTS (SELECT 1 FROM public.t_dokumen d
                      WHERE d.id = t_chat.dokumen_id AND d.user_id = (SELECT public.fn_current_user_id())));
CREATE POLICY t_chat_rujukan_select_pemilik ON public.t_chat_rujukan
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.t_chat c
                  WHERE c.id = t_chat_rujukan.chat_id
                    AND c.user_id = (SELECT public.fn_current_user_id())));

-- ================================================================ LOG
-- log_pemakaian_ai: pemilik membaca (kuota), admin membaca semua (statistik). INSERT = server.
GRANT SELECT ON public.log_pemakaian_ai TO authenticated;
CREATE POLICY log_pemakaian_ai_select_pemilik ON public.log_pemakaian_ai
  FOR SELECT TO authenticated
  USING (user_id = (SELECT public.fn_current_user_id()));
CREATE POLICY log_pemakaian_ai_select_admin ON public.log_pemakaian_ai
  FOR SELECT TO authenticated
  USING ((SELECT public.fn_is_admin()));

-- log_system: admin membaca. INSERT hanya fungsi SECURITY DEFINER / service role.
GRANT SELECT ON public.log_system TO authenticated;
CREATE POLICY log_system_select_admin ON public.log_system
  FOR SELECT TO authenticated
  USING ((SELECT public.fn_is_admin()));

-- ================================================================ VIEW
GRANT SELECT ON public.v_progres_topik, public.v_progres_dokumen TO authenticated;

-- ================================================================ FUNGSI
-- Dipakai di policy / fungsi SECURITY INVOKER → wajib bisa dieksekusi authenticated.
GRANT EXECUTE ON FUNCTION
  public.fn_current_user_id(),
  public.fn_is_admin(),
  public.fn_pengguna_sasaran(int),
  public.fn_pengaturan(text),
  public.fn_pengaturan_int(text),
  public.fn_pengaturan_numeric(text)
TO authenticated;

-- RPC mahasiswa (sesi pengguna).
GRANT EXECUTE ON FUNCTION
  public.fn_buat_dokumen(text, text, bigint),
  public.fn_hapus_dokumen(int),
  public.fn_tandai_dokumen_macet(int),
  public.fn_bersihkan_dokumen_gagal(int),
  public.fn_lanjutkan_belajar(),
  public.fn_catat_buka_topik(int),
  public.fn_periksa_jawaban(int, text),
  public.fn_simpan_latihan(int, jsonb),
  public.fn_hasil_latihan(int),
  public.fn_cari_chunk(int, extensions.vector, int, real),
  public.fn_kuota_dokumen(int),
  public.fn_sisa_kuota_tanya(int),
  public.fn_ubah_profil(text, text),
  public.fn_perbarui_aktif(boolean)
TO authenticated;

-- RPC admin (memeriksa fn_is_admin di dalam).
GRANT EXECUTE ON FUNCTION
  public.fn_ringkasan_pengguna(),
  public.fn_daftar_pengguna(text, text, int, int),
  public.fn_ubah_status_pengguna(int, boolean, text),
  public.fn_ubah_pengaturan(jsonb, text, timestamptz),
  public.fn_estimasi_biaya_kuota(int),
  public.fn_statistik_dashboard(int),
  public.fn_seri_pertanyaan_harian(int),
  public.fn_pengguna_terbaru(int)
TO authenticated;

-- Sisanya (fn_kode_dokumen, fn_selesaikan_dokumen, fn_gagalkan_dokumen, fn_simpan_chunk,
-- fn_periksa_file_dokumen, fn_klaim_topik, fn_lepas_klaim_topik, fn_simpan_ringkasan_topik,
-- fn_simpan_soal_topik, fn_simpan_chat, fn_klaim_kuota_tanya, fn_lepas_kuota_tanya,
-- fn_hitung_tanya_hari_ini) HANYA service_role. Fungsi trigger tidak perlu hak EXECUTE pemanggil.

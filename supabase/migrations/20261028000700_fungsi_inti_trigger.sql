-- =====================================================================
-- Fungsi bersama & trigger penjaga aturan bisnis.
--   fn_current_user_id, fn_is_admin        : identitas untuk RLS (FT-01, BR-23)
--   fn_pengaturan(+_int/_numeric)          : baca kuota saat aksi (FT-10, BR-28)
--   fn_buat_pengguna_baru  (auth.users)    : buat m_users + peran mahasiswa (BR-25)
--   trigger penjaga: email tetap (BR-36), BR-24, transisi status dokumen,
--   rentang rujukan/soal (BR-10/11), log hanya INSERT, audit hapus dokumen.
-- =====================================================================

-- ------------------------------------------------- fn_current_user_id()
-- SECURITY DEFINER: membaca m_users tanpa memicu RLS m_users (hindari rekursi).
-- BR-23 / KEPUTUSAN B1: akun nonaktif → NULL → semua policy "pemilik" gagal, sehingga
-- JWT yang masih berlaku pun tidak bisa membaca data apa pun.
CREATE OR REPLACE FUNCTION public.fn_current_user_id()
RETURNS int
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT u.id
  FROM public.m_users u
  WHERE u.auth_id = auth.uid()
    AND u.is_active
    AND u.deleted_at IS NULL;
$$;

-- --------------------------------------------------------- fn_is_admin()
CREATE OR REPLACE FUNCTION public.fn_is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.m_user_role ur
    JOIN public.m_role r ON r.id = ur.role_id
    WHERE ur.user_id = public.fn_current_user_id()
      AND r.kode = 'admin'
      AND r.is_active
  );
$$;

-- ------------------------------------------------------- fn_pengaturan()
-- Gagal keras bila kode salah ketik — harus ketahuan saat pengembangan, bukan diam-diam NULL.
CREATE OR REPLACE FUNCTION public.fn_pengaturan(p_kode text)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_nilai text;
BEGIN
  SELECT p.nilai INTO v_nilai FROM public.m_pengaturan_sistem p WHERE p.kode = p_kode;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'PENGATURAN_TIDAK_ADA' USING ERRCODE = 'P0002',
          DETAIL = format('Kode pengaturan %L tidak ditemukan.', p_kode);
  END IF;
  RETURN v_nilai;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_pengaturan_int(p_kode text)
RETURNS int
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$ SELECT public.fn_pengaturan(p_kode)::int $$;

CREATE OR REPLACE FUNCTION public.fn_pengaturan_numeric(p_kode text)
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$ SELECT public.fn_pengaturan(p_kode)::numeric $$;

-- ----------------------------------------- fn_buat_pengguna_baru() (BR-25)
CREATE OR REPLACE FUNCTION public.fn_buat_pengguna_baru()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id    int;
  v_nama_meta  text := NULLIF(btrim(regexp_replace(coalesce(NEW.raw_user_meta_data ->> 'nama', ''), '\s+', ' ', 'g')), '');
  v_nama       text;
BEGIN
  IF v_nama_meta IS NOT NULL THEN
    -- Nama dikirim lewat signUp({ options: { data: { nama } } }). Tidak valid → signUp ikut gagal.
    IF char_length(v_nama_meta) NOT BETWEEN 3 AND 60 THEN
      RAISE EXCEPTION 'NAMA_TIDAK_VALID' USING ERRCODE = '22023';                      -- BR-22
    END IF;
    v_nama := v_nama_meta;
  ELSE
    -- Akun yang dibuat tim dari Dashboard tanpa metadata: pakai bagian lokal email.
    v_nama := left(split_part(NEW.email, '@', 1), 60);
    IF char_length(v_nama) < 3 THEN
      v_nama := 'Pengguna Pahami';
    END IF;
  END IF;

  INSERT INTO public.m_users (auth_id, email, nama, is_active, created_by, updated_by)
  VALUES (NEW.id, lower(NEW.email), v_nama, true, 'system', 'system')
  RETURNING id INTO v_user_id;

  -- BR-25: peran SELALU mahasiswa. Metadata "role" dari klien dapat dipalsukan → diabaikan.
  INSERT INTO public.m_user_role (user_id, role_id)
  SELECT v_user_id, r.id FROM public.m_role r WHERE r.kode = 'mahasiswa';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'SEED_ROLE_BELUM_ADA';   -- seed.sql (m_role) belum dijalankan
  END IF;

  INSERT INTO public.log_system (user_id, action, modul, target_id, detail)
  VALUES (v_user_id, 'CREATE', 'auth', v_user_id::text,
          jsonb_build_object('peran', 'mahasiswa', 'sumber', 'daftar_mandiri'));
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auth_users_buat_pengguna
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.fn_buat_pengguna_baru();

-- ---------------------------------------------- penjaga m_users (BR-36)
-- Email & auth_id tidak boleh berubah lewat jalur aplikasi mana pun. auth.uid() NULL =
-- service role / skrip tim (mis. sinkronisasi email) → diizinkan.
CREATE OR REPLACE FUNCTION public.fn_users_kunci_email()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.uid() IS NOT NULL
     AND (NEW.email IS DISTINCT FROM OLD.email OR NEW.auth_id IS DISTINCT FROM OLD.auth_id) THEN
    RAISE EXCEPTION 'EMAIL_TETAP' USING ERRCODE = '42501',
          DETAIL = 'Email dan auth_id tidak dapat diubah dari aplikasi (BR-36).';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_users_kunci_email
  BEFORE UPDATE OF email, auth_id ON public.m_users
  FOR EACH ROW EXECUTE FUNCTION public.fn_users_kunci_email();

-- ---------------------------------------------- penjaga m_users (BR-24)
-- Berlaku untuk SEMUA jalur update is_active, jadi BR-24 tidak bergantung pada UI.
-- auth.uid() NULL → service role / skrip tim → diizinkan.
CREATE OR REPLACE FUNCTION public.fn_users_cek_ubah_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.is_active IS NOT DISTINCT FROM OLD.is_active OR auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;
  IF NOT public.fn_is_admin() THEN
    RAISE EXCEPTION 'TIDAK_BERHAK' USING ERRCODE = '42501';
  END IF;
  IF NEW.id = public.fn_current_user_id() THEN
    RAISE EXCEPTION 'BR24_DIRI_SENDIRI' USING ERRCODE = '42501',
          DETAIL = 'Admin tidak dapat menonaktifkan/mengaktifkan akunnya sendiri (BR-24).';
  END IF;
  IF EXISTS (SELECT 1 FROM public.m_user_role ur JOIN public.m_role r ON r.id = ur.role_id
              WHERE ur.user_id = NEW.id AND r.kode = 'admin') THEN
    RAISE EXCEPTION 'BR24_ADMIN_LAIN' USING ERRCODE = '42501',
          DETAIL = 'Status akun admin tidak dapat diubah dari aplikasi (BR-24).';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_users_cek_ubah_status
  BEFORE UPDATE OF is_active ON public.m_users
  FOR EACH ROW EXECUTE FUNCTION public.fn_users_cek_ubah_status();

-- ------------------------------------- transisi status & tahap t_dokumen
-- siap & gagal adalah status akhir (Breakdown §1.4); tahap tidak boleh mundur;
-- siap hanya dicapai dari tahap terakhir (menyusun_topik).
CREATE OR REPLACE FUNCTION public.fn_cek_transisi_dokumen()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  c_tahap CONSTANT text[] := ARRAY['membaca','mengekstrak','memotong','mengindeks','menyusun_topik'];
BEGIN
  IF OLD.status IN ('siap', 'gagal') AND NEW.status IS DISTINCT FROM OLD.status THEN
    RAISE EXCEPTION 'TRANSISI_STATUS_TIDAK_SAH: % -> %', OLD.status, NEW.status USING ERRCODE = '23514';
  END IF;
  IF OLD.status = 'diproses' AND NEW.status = 'diproses'
     AND array_position(c_tahap, NEW.tahap::text) < array_position(c_tahap, OLD.tahap::text) THEN
    RAISE EXCEPTION 'TAHAP_MUNDUR: % -> %', OLD.tahap, NEW.tahap USING ERRCODE = '23514';
  END IF;
  IF OLD.status = 'diproses' AND NEW.status = 'siap' AND OLD.tahap <> 'menyusun_topik' THEN
    RAISE EXCEPTION 'BELUM_TAHAP_AKHIR: %', OLD.tahap USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_t_dokumen_transisi
  BEFORE UPDATE OF status, tahap ON public.t_dokumen
  FOR EACH ROW EXECUTE FUNCTION public.fn_cek_transisi_dokumen();

-- ---------------------------------------------- audit hapus dokumen (FT-03)
CREATE OR REPLACE FUNCTION public.fn_log_hapus_dokumen()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER                    -- authenticated tidak punya hak INSERT log_system
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.log_system (user_id, action, modul, target_id, detail)
  VALUES (COALESCE(public.fn_current_user_id(), OLD.user_id),
          'DELETE', 'dokumen', OLD.kode,
          -- BR-06 & Panduan §3.8: JANGAN simpan judul/isi; cukup angka.
          jsonb_build_object('status', OLD.status,
                             'jumlah_halaman', OLD.jumlah_halaman,
                             'jumlah_topik', OLD.jumlah_topik,
                             'ukuran_byte', OLD.ukuran_byte));
  RETURN OLD;
END;
$$;

CREATE TRIGGER trg_t_dokumen_log_hapus
  AFTER DELETE ON public.t_dokumen
  FOR EACH ROW EXECUTE FUNCTION public.fn_log_hapus_dokumen();

-- ------------------------------- rujukan ringkasan dalam rentang topik (BR-10/30)
CREATE OR REPLACE FUNCTION public.fn_cek_rujukan_topik()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  v_awal  int;
  v_akhir int;
  v_dok   int;
BEGIN
  SELECT t.halaman_awal, t.halaman_akhir, t.dokumen_id INTO v_awal, v_akhir, v_dok
  FROM public.t_topik t WHERE t.id = NEW.topik_id;

  IF NEW.halaman NOT BETWEEN v_awal AND v_akhir THEN
    RAISE EXCEPTION 'RUJUKAN_DI_LUAR_RENTANG: hal % bukan dalam % - %', NEW.halaman, v_awal, v_akhir
      USING ERRCODE = '23514';
  END IF;
  IF NEW.chunk_id IS NOT NULL AND NOT EXISTS (
       SELECT 1 FROM public.t_chunk c
       WHERE c.id = NEW.chunk_id
         AND c.dokumen_id = v_dok                                     -- BR-30: chunk dokumen yang sama
         AND NEW.halaman BETWEEN c.halaman_awal AND c.halaman_akhir) THEN
    RAISE EXCEPTION 'RUJUKAN_CHUNK_TIDAK_COCOK: chunk %', NEW.chunk_id USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

-- Hanya kolom halaman/topik_id: SET NULL dari FK chunk_id (A4) tidak boleh ditolak.
CREATE TRIGGER trg_t_topik_rujukan_rentang
  BEFORE INSERT OR UPDATE OF halaman, topik_id ON public.t_topik_rujukan
  FOR EACH ROW EXECUTE FUNCTION public.fn_cek_rujukan_topik();

-- --------------------------------------- rujukan soal dalam rentang topik (BR-11)
CREATE OR REPLACE FUNCTION public.fn_cek_halaman_soal()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.t_topik t
                  WHERE t.id = NEW.topik_id
                    AND NEW.halaman_rujukan BETWEEN t.halaman_awal AND t.halaman_akhir) THEN
    RAISE EXCEPTION 'SOAL_RUJUKAN_DI_LUAR_RENTANG: hal %', NEW.halaman_rujukan USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_t_soal_rentang
  BEFORE INSERT OR UPDATE OF halaman_rujukan, topik_id ON public.t_soal
  FOR EACH ROW EXECUTE FUNCTION public.fn_cek_halaman_soal();

-- ------------------------------------------------- log hanya INSERT
-- log_system: tolak UPDATE/DELETE bahkan dari service role (jejak audit tak bisa dihapus diam-diam).
CREATE OR REPLACE FUNCTION public.fn_log_tolak_ubah()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  RAISE EXCEPTION 'LOG_HANYA_INSERT' USING ERRCODE = '42501',
        DETAIL = format('Tabel %s hanya boleh INSERT.', TG_TABLE_NAME);
END;
$$;

CREATE TRIGGER trg_log_system_hanya_insert
  BEFORE UPDATE OR DELETE ON public.log_system
  FOR EACH ROW EXECUTE FUNCTION public.fn_log_tolak_ubah();

-- log_pemakaian_ai: UPDATE hanya diizinkan bila satu-satunya perubahan adalah dokumen_id → NULL
-- (efek ON DELETE SET NULL saat dokumen dihapus, BR-20).
CREATE OR REPLACE FUNCTION public.fn_jaga_log_pemakaian()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF TG_OP = 'UPDATE'
     AND NEW.dokumen_id IS NULL
     AND (to_jsonb(NEW) - 'dokumen_id') = (to_jsonb(OLD) - 'dokumen_id') THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'LOG_HANYA_INSERT: % pada log_pemakaian_ai ditolak', TG_OP USING ERRCODE = '42501';
END;
$$;

CREATE TRIGGER trg_log_pemakaian_ai_hanya_insert
  BEFORE UPDATE OR DELETE ON public.log_pemakaian_ai
  FOR EACH ROW EXECUTE FUNCTION public.fn_jaga_log_pemakaian();

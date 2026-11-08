-- =====================================================================
-- RPC admin (FT-09 Kelola Pengguna, FT-10 Pengaturan Kuota, FT-11 Statistik).
-- Semua SECURITY DEFINER dengan pemeriksaan fn_is_admin() di baris pertama, dan HANYA
-- mengeluarkan angka/kolom akun — tidak pernah judul/isi dokumen (BR-06).
-- =====================================================================

-- ======================================================= PENGGUNA (FT-09)

CREATE OR REPLACE FUNCTION public.fn_ringkasan_pengguna()
RETURNS TABLE (total int, aktif int, nonaktif int)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT public.fn_is_admin() THEN
    RAISE EXCEPTION 'TIDAK_BERHAK' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
  SELECT count(*)::int,
         count(*) FILTER (WHERE u.is_active)::int,
         count(*) FILTER (WHERE NOT u.is_active)::int
    FROM public.m_users u
   WHERE u.deleted_at IS NULL;
END;
$$;

-- Daftar pengguna S-15: cari nama/email, filter status, paging; terbaru di atas (C7).
CREATE OR REPLACE FUNCTION public.fn_daftar_pengguna(
  p_cari        text DEFAULT NULL,
  p_status      text DEFAULT 'semua',      -- semua | aktif | nonaktif
  p_halaman     int  DEFAULT 1,
  p_per_halaman int  DEFAULT 20
)
RETURNS TABLE (
  id int, nama varchar, email varchar, peran varchar, is_admin boolean, jumlah_dokumen int,
  created_at timestamptz, last_active_at timestamptz, is_active boolean, total_baris int
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
#variable_conflict use_column
DECLARE
  v_pola text;
BEGIN
  IF NOT public.fn_is_admin() THEN
    RAISE EXCEPTION 'TIDAK_BERHAK' USING ERRCODE = '42501';
  END IF;
  IF coalesce(p_status, 'semua') NOT IN ('semua', 'aktif', 'nonaktif') THEN
    RAISE EXCEPTION 'STATUS_TIDAK_VALID' USING ERRCODE = '22023';
  END IF;
  IF p_halaman < 1 OR p_per_halaman NOT BETWEEN 1 AND 100 THEN
    RAISE EXCEPTION 'PAGING_TIDAK_VALID' USING ERRCODE = '22023';
  END IF;

  -- Escape karakter khusus LIKE supaya input "50%" atau "a_b" dicari apa adanya.
  IF nullif(btrim(p_cari), '') IS NOT NULL THEN
    v_pola := '%' || replace(replace(replace(btrim(p_cari), '\', '\\'), '%', '\%'), '_', '\_') || '%';
  END IF;

  RETURN QUERY
  WITH peran AS (
    SELECT ur.user_id, bool_or(r.kode = 'admin') AS is_admin
      FROM public.m_user_role ur JOIN public.m_role r ON r.id = ur.role_id
     GROUP BY ur.user_id
  ), dok AS (
    -- Hanya angka (BR-06).
    SELECT d.user_id, count(*)::int AS jumlah FROM public.t_dokumen d GROUP BY d.user_id
  )
  SELECT u.id, u.nama, u.email,
         (CASE WHEN coalesce(p.is_admin, false) THEN 'admin' ELSE 'mahasiswa' END)::varchar,
         coalesce(p.is_admin, false),
         coalesce(dok.jumlah, 0),
         u.created_at, u.last_active_at, u.is_active,
         (count(*) OVER ())::int
    FROM public.m_users u
    LEFT JOIN peran p ON p.user_id = u.id
    LEFT JOIN dok     ON dok.user_id = u.id
   WHERE u.deleted_at IS NULL
     AND (v_pola IS NULL OR u.nama ILIKE v_pola OR u.email ILIKE v_pola)
     AND (coalesce(p_status, 'semua') = 'semua'
          OR (p_status = 'aktif' AND u.is_active)
          OR (p_status = 'nonaktif' AND NOT u.is_active))
   ORDER BY u.created_at DESC, u.id DESC
   LIMIT p_per_halaman
  OFFSET (p_halaman - 1) * p_per_halaman;
END;
$$;

-- Aktifkan/nonaktifkan akun (BR-23, BR-24) + log_system ACTIVATE/DEACTIVATE dalam satu transaksi.
-- BR-24 (bukan diri sendiri, bukan admin lain) ditegakkan trigger trg_users_cek_ubah_status.
-- Setelah sukses, server memblokir sesi lewat Auth Admin API (auth_id dikembalikan, B1).
CREATE OR REPLACE FUNCTION public.fn_ubah_status_pengguna(p_user_id int, p_is_active boolean, p_ip text DEFAULT NULL)
RETURNS TABLE (id int, nama varchar, auth_id uuid, is_active boolean, is_berubah boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
#variable_conflict use_column
DECLARE
  v_admin_id    int := public.fn_current_user_id();
  v_admin_email varchar;
  v_target      public.m_users%ROWTYPE;
BEGIN
  IF NOT public.fn_is_admin() THEN
    RAISE EXCEPTION 'TIDAK_BERHAK' USING ERRCODE = '42501';
  END IF;
  IF p_is_active IS NULL THEN
    RAISE EXCEPTION 'INPUT_TIDAK_VALID' USING ERRCODE = '22023';
  END IF;
  SELECT u.email INTO v_admin_email FROM public.m_users u WHERE u.id = v_admin_id;

  -- Kunci baris target: dua admin yang menekan tombol bersamaan diproses berurutan.
  SELECT * INTO v_target FROM public.m_users u WHERE u.id = p_user_id AND u.deleted_at IS NULL FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'TIDAK_DITEMUKAN' USING ERRCODE = 'P0002';
  END IF;

  -- Idempoten: status sudah sama → tanpa UPDATE & tanpa log ganda.
  IF v_target.is_active = p_is_active THEN
    RETURN QUERY SELECT v_target.id, v_target.nama, v_target.auth_id, v_target.is_active, false;
    RETURN;
  END IF;

  UPDATE public.m_users u SET is_active = p_is_active, updated_by = v_admin_email WHERE u.id = p_user_id;

  INSERT INTO public.log_system (user_id, action, modul, target_id, detail, ip_address)
  VALUES (v_admin_id, CASE WHEN p_is_active THEN 'ACTIVATE' ELSE 'DEACTIVATE' END, 'users', p_user_id::text,
          jsonb_build_object('is_active', jsonb_build_object('lama', v_target.is_active, 'baru', p_is_active)),
          left(p_ip, 50));

  RETURN QUERY SELECT v_target.id, v_target.nama, v_target.auth_id, p_is_active, true;
END;
$$;

-- ======================================================= PENGATURAN (FT-10)

-- Validasi + update + audit dalam satu transaksi (BR-28, BR-29).
--   p_nilai : {kode: nilai} (boleh sebagian; hanya kode is_tampil = true)
--   p_versi : max(updated_at) yang dilihat admin saat membuka S-16 → deteksi konflik (B14).
--             Konflik → KONFLIK_VERSI dengan SQLSTATE PT409 (PostgREST membalas HTTP 409).
CREATE OR REPLACE FUNCTION public.fn_ubah_pengaturan(
  p_nilai jsonb,
  p_ip    text        DEFAULT NULL,
  p_versi timestamptz DEFAULT NULL
)
RETURNS TABLE (kode varchar, nilai varchar, nilai_default varchar, updated_by varchar, updated_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
#variable_conflict use_column
DECLARE
  v_admin_id    int := public.fn_current_user_id();
  v_admin_email varchar;
  v_galat       jsonb := '[]'::jsonb;
  v_baris       record;
BEGIN
  IF NOT public.fn_is_admin() THEN
    RAISE EXCEPTION 'TIDAK_BERHAK' USING ERRCODE = '42501';
  END IF;
  IF p_nilai IS NULL OR jsonb_typeof(p_nilai) <> 'object' OR p_nilai = '{}'::jsonb THEN
    RAISE EXCEPTION 'INPUT_KOSONG' USING ERRCODE = '22023';
  END IF;
  SELECT u.email INTO v_admin_email FROM public.m_users u WHERE u.id = v_admin_id;

  -- Kunci SEMUA baris pengaturan (urutan tetap → tanpa deadlock) selama transaksi.
  PERFORM 1 FROM public.m_pengaturan_sistem p ORDER BY p.kode FOR UPDATE;

  -- Pembanding pada presisi milidetik: nilai p_versi melewati JSON di JavaScript (Date)
  -- yang hanya menyimpan milidetik, sedangkan timestamptz menyimpan mikrodetik.
  IF p_versi IS NOT NULL
     AND date_trunc('milliseconds', (SELECT max(p.updated_at) FROM public.m_pengaturan_sistem p))
         > date_trunc('milliseconds', p_versi) THEN
    RAISE EXCEPTION 'KONFLIK_VERSI' USING ERRCODE = 'PT409',
          DETAIL = 'Pengaturan sudah diubah admin lain. Muat ulang halaman.';
  END IF;

  -- Tahap 1: validasi SEMUA input, kumpulkan galat per kolom (MSG-K02).
  FOR v_baris IN
    SELECT j.key AS kode_input, btrim(j.value) AS nilai_input, p.kode, p.nilai_min, p.nilai_max,
           p.tipe_nilai, p.is_tampil
      FROM jsonb_each_text(p_nilai) j
      LEFT JOIN public.m_pengaturan_sistem p ON p.kode = j.key
  LOOP
    IF v_baris.kode IS NULL OR NOT v_baris.is_tampil THEN
      -- Kode tak dikenal, atau tidak boleh diubah dari S-16 (ambang_relevansi, A6).
      v_galat := v_galat || jsonb_build_object('kode', v_baris.kode_input, 'alasan', 'KODE_TIDAK_DIKENAL');
    -- IF bertingkat agar cast ::numeric hanya pada teks yang lolos regex.
    ELSIF v_baris.nilai_input IS NULL OR v_baris.nilai_input !~ '^[0-9]{1,9}$' THEN    -- BR-29: bulat
      v_galat := v_galat || jsonb_build_object('kode', v_baris.kode, 'alasan', 'BUKAN_BILANGAN_BULAT',
                                               'min', v_baris.nilai_min, 'maks', v_baris.nilai_max);
    ELSIF v_baris.nilai_input::numeric NOT BETWEEN v_baris.nilai_min AND v_baris.nilai_max THEN
      v_galat := v_galat || jsonb_build_object('kode', v_baris.kode, 'alasan', 'DI_LUAR_RENTANG',
                                               'min', v_baris.nilai_min, 'maks', v_baris.nilai_max);
    END IF;
  END LOOP;
  IF jsonb_array_length(v_galat) > 0 THEN
    -- DETAIL = JSON array → API menerjemahkan menjadi pesan per kolom (MSG-K02).
    RAISE EXCEPTION 'KUOTA_TIDAK_VALID' USING ERRCODE = '22023', DETAIL = v_galat::text;
  END IF;

  -- Tahap 2: simpan hanya yang berubah + audit nilai lama → baru. '005' → '5'.
  FOR v_baris IN
    SELECT p.kode, p.nilai AS lama, (btrim(j.value))::numeric::int::text AS baru
      FROM jsonb_each_text(p_nilai) j
      JOIN public.m_pengaturan_sistem p ON p.kode = j.key
     WHERE p.nilai IS DISTINCT FROM (btrim(j.value))::numeric::int::text
     ORDER BY p.kode
  LOOP
    UPDATE public.m_pengaturan_sistem p SET nilai = v_baris.baru, updated_by = v_admin_email
     WHERE p.kode = v_baris.kode;
    INSERT INTO public.log_system (user_id, action, modul, target_id, detail, ip_address)
    VALUES (v_admin_id, 'UPDATE', 'pengaturan', v_baris.kode,
            jsonb_build_object('kode', v_baris.kode, 'lama', v_baris.lama, 'baru', v_baris.baru),
            left(p_ip, 50));
  END LOOP;

  RETURN QUERY
  SELECT p.kode, p.nilai, p.nilai_default, p.updated_by, p.updated_at
    FROM public.m_pengaturan_sistem p
   WHERE p.is_tampil
   ORDER BY p.id;
END;
$$;

-- Estimasi biaya AI harian maksimum (info S-16) = maks pertanyaan × mahasiswa aktif ×
-- rata-rata biaya per pertanyaan 30 hari. B12: "mahasiswa aktif" = login 7 hari terakhir.
CREATE OR REPLACE FUNCTION public.fn_estimasi_biaya_kuota(p_max_pertanyaan int DEFAULT NULL)
RETURNS TABLE (mahasiswa_aktif int, rata_biaya_per_pertanyaan numeric, estimasi_harian_maks_rp numeric)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_maks int;
BEGIN
  IF NOT public.fn_is_admin() THEN
    RAISE EXCEPTION 'TIDAK_BERHAK' USING ERRCODE = '42501';
  END IF;
  v_maks := coalesce(p_max_pertanyaan, public.fn_pengaturan_int('max_pertanyaan_harian'));

  SELECT count(*)::int INTO mahasiswa_aktif
    FROM public.m_users u
   WHERE u.is_active AND u.deleted_at IS NULL
     AND u.last_active_at >= now() - interval '7 days'
     AND EXISTS (SELECT 1 FROM public.m_user_role ur JOIN public.m_role r ON r.id = ur.role_id
                  WHERE ur.user_id = u.id AND r.kode = 'mahasiswa');

  -- NULL bila belum ada data (UI: "belum ada data biaya").
  SELECT round(avg(l.biaya_rp), 2) INTO rata_biaya_per_pertanyaan
    FROM public.log_pemakaian_ai l
   WHERE l.fitur = 'tanya_ai' AND l.is_sukses
     AND l.created_at >= now() - interval '30 days';

  estimasi_harian_maks_rp := round(v_maks * mahasiswa_aktif * rata_biaya_per_pertanyaan, 0);
  RETURN NEXT;
END;
$$;

-- ======================================================= STATISTIK (FT-11, S-14)
-- KEPUTUSAN B11: total pengguna = mahasiswa (semua status) · biaya = semua fitur AI ·
-- rentang = tanggal kalender WIB · pilihan 7/30 hari hanya mengubah kartu AI & grafik.

CREATE OR REPLACE FUNCTION public.fn_statistik_dashboard(p_rentang_hari int DEFAULT 30)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_hari_ini date := (now() AT TIME ZONE 'Asia/Jakarta')::date;
  v_tgl_awal date;
  v_mulai    timestamptz;
  v_hasil    jsonb;
BEGIN
  IF NOT public.fn_is_admin() THEN
    RAISE EXCEPTION 'TIDAK_BERHAK' USING ERRCODE = '42501';
  END IF;
  IF p_rentang_hari IS NULL OR p_rentang_hari NOT IN (7, 30) THEN
    RAISE EXCEPTION 'RENTANG_TIDAK_VALID' USING ERRCODE = '22023';
  END IF;
  v_tgl_awal := v_hari_ini - (p_rentang_hari - 1);                   -- 30 hari = hari ini + 29 sebelumnya
  v_mulai    := v_tgl_awal::timestamp AT TIME ZONE 'Asia/Jakarta';   -- 00.00 WIB tanggal awal

  WITH mahasiswa AS (
    SELECT u.id, u.last_active_at, u.created_at
      FROM public.m_users u
     WHERE u.deleted_at IS NULL
       AND EXISTS (SELECT 1 FROM public.m_user_role ur JOIN public.m_role r ON r.id = ur.role_id
                    WHERE ur.user_id = u.id AND r.kode = 'mahasiswa')
  ), pengguna AS (
    SELECT count(*)::int AS total,
           count(*) FILTER (WHERE last_active_at >= now() - interval '7 days')::int AS aktif_7_hari,
           count(*) FILTER (WHERE created_at >= (v_hari_ini - 6)::timestamp AT TIME ZONE 'Asia/Jakarta')::int
                                                                                   AS baru_7_hari
      FROM mahasiswa
  ), dokumen AS (
    SELECT count(*)::int                                     AS total,
           count(*) FILTER (WHERE status = 'siap')::int      AS siap,
           count(*) FILTER (WHERE status = 'diproses')::int  AS diproses,
           count(*) FILTER (WHERE status = 'gagal')::int     AS gagal
      FROM public.t_dokumen
  ), pakai AS (
    SELECT l.fitur, l.is_sukses, l.biaya_rp
      FROM public.log_pemakaian_ai l
     WHERE l.created_at >= v_mulai
  ), ai AS (
    SELECT count(*) FILTER (WHERE fitur = 'tanya_ai' AND is_sukses)::int AS pertanyaan,
           coalesce(sum(biaya_rp), 0)                                    AS biaya_total,
           coalesce(sum(biaya_rp) FILTER (WHERE fitur = 'tanya_ai'), 0)  AS biaya_tanya
      FROM pakai
  ), per_fitur AS (
    SELECT coalesce(jsonb_object_agg(f.fitur, coalesce(x.biaya, 0) ORDER BY f.urut), '{}'::jsonb) AS rincian
      FROM (VALUES ('indeks', 1), ('topik', 2), ('ringkasan', 3), ('soal', 4), ('tanya_ai', 5)) AS f(fitur, urut)
      LEFT JOIN (SELECT fitur, sum(biaya_rp) AS biaya FROM pakai GROUP BY fitur) x ON x.fitur = f.fitur
  )
  SELECT jsonb_build_object(
           'rentang',  jsonb_build_object('hari', p_rentang_hari, 'tanggal_awal', v_tgl_awal,
                                          'tanggal_akhir', v_hari_ini),
           'pengguna', jsonb_build_object('total', p.total, 'aktif_7_hari', p.aktif_7_hari,
                                          'baru_7_hari', p.baru_7_hari),
           'dokumen',  jsonb_build_object('total', d.total, 'siap', d.siap, 'diproses', d.diproses, 'gagal', d.gagal),
           'ai', jsonb_build_object(
                   'pertanyaan',                a.pertanyaan,
                   'biaya_total_rp',            round(a.biaya_total, 2),
                   'biaya_tanya_ai_rp',         round(a.biaya_tanya, 2),
                   'rata_biaya_per_pertanyaan', round(a.biaya_tanya / nullif(a.pertanyaan, 0), 2),
                   'biaya_per_fitur_rp',        pf.rincian))
    INTO v_hasil
    FROM pengguna p, dokumen d, ai a, per_fitur pf;
  RETURN v_hasil;
END;
$$;

-- Seri harian grafik S-14 (tanggal kalender WIB; hari tanpa data = 0).
CREATE OR REPLACE FUNCTION public.fn_seri_pertanyaan_harian(p_rentang_hari int DEFAULT 30)
RETURNS TABLE (tanggal date, jumlah_pertanyaan int, biaya_tanya_ai_rp numeric)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_hari_ini date := (now() AT TIME ZONE 'Asia/Jakarta')::date;
  v_tgl_awal date;
BEGIN
  IF NOT public.fn_is_admin() THEN
    RAISE EXCEPTION 'TIDAK_BERHAK' USING ERRCODE = '42501';
  END IF;
  IF p_rentang_hari IS NULL OR p_rentang_hari NOT IN (7, 30) THEN
    RAISE EXCEPTION 'RENTANG_TIDAK_VALID' USING ERRCODE = '22023';
  END IF;
  v_tgl_awal := v_hari_ini - (p_rentang_hari - 1);

  RETURN QUERY
  WITH hari AS (
    SELECT g::date AS tgl
      FROM generate_series(v_tgl_awal::timestamp, v_hari_ini::timestamp, interval '1 day') AS g
  ), harian AS (
    SELECT (l.created_at AT TIME ZONE 'Asia/Jakarta')::date AS tgl,
           count(*) FILTER (WHERE l.is_sukses)::int        AS jumlah,
           sum(l.biaya_rp)                                 AS biaya
      FROM public.log_pemakaian_ai l
     WHERE l.fitur = 'tanya_ai'
       AND l.created_at >= (v_tgl_awal::timestamp AT TIME ZONE 'Asia/Jakarta')   -- sargable
     GROUP BY 1
  )
  SELECT h.tgl, coalesce(x.jumlah, 0), coalesce(x.biaya, 0)::numeric
    FROM hari h LEFT JOIN harian x ON x.tgl = h.tgl
   ORDER BY h.tgl;
END;
$$;

-- 5 mahasiswa terbaru (S-14). Jumlah dokumen sebagai angka saja (BR-06).
CREATE OR REPLACE FUNCTION public.fn_pengguna_terbaru(p_limit int DEFAULT 5)
RETURNS TABLE (id int, nama varchar, created_at timestamptz, jumlah_dokumen int, is_active boolean)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
#variable_conflict use_column
BEGIN
  IF NOT public.fn_is_admin() THEN
    RAISE EXCEPTION 'TIDAK_BERHAK' USING ERRCODE = '42501';
  END IF;
  IF p_limit IS NULL OR p_limit NOT BETWEEN 1 AND 20 THEN
    RAISE EXCEPTION 'LIMIT_TIDAK_VALID' USING ERRCODE = '22023';
  END IF;
  RETURN QUERY
  SELECT u.id, u.nama, u.created_at,
         (SELECT count(*)::int FROM public.t_dokumen d WHERE d.user_id = u.id),
         u.is_active
    FROM public.m_users u
   WHERE u.deleted_at IS NULL
     AND EXISTS (SELECT 1 FROM public.m_user_role ur JOIN public.m_role r ON r.id = ur.role_id
                  WHERE ur.user_id = u.id AND r.kode = 'mahasiswa')
   ORDER BY u.created_at DESC, u.id DESC
   LIMIT p_limit;
END;
$$;

-- =====================================================================
-- Materi per topik (KEPUTUSAN §4 "Materi per topik").
-- Satu topik dipecah menjadi beberapa halaman materi (sub-bab). Kerangka (judul + rentang
-- halaman) dibuat sekali saat topik pertama dibuka; isi detail tiap materi dibuat sekali saat
-- materi itu pertama dibuka. Pola klaim sama dengan ringkasan/soal (KEPUTUSAN A7).
-- Ditambah satu gambar sampul AI per topik di bucket privat `sampul`.
-- =====================================================================

-- ---------------------------------------------------------------- t_topik: kolom baru
ALTER TABLE public.t_topik
  ADD COLUMN materi_dibuat_at  timestamptz  NULL,
  ADD COLUMN materi_diklaim_at timestamptz  NULL,
  ADD COLUMN sampul_path       varchar(255) NULL,
  ADD COLUMN sampul_diklaim_at timestamptz  NULL,
  ADD COLUMN sampul_gagal_at   timestamptz  NULL;   -- gagal → tidak dicoba ulang terus-menerus (lihat fn_klaim_topik)

-- ---------------------------------------------------------------- t_materi
CREATE TABLE public.t_materi (
  id             int GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  topik_id       int          NOT NULL
                 CONSTRAINT fk_materi_topik REFERENCES public.t_topik (id) ON DELETE CASCADE,
  urutan         int          NOT NULL,
  judul          varchar(120) NOT NULL,
  halaman_awal   int          NOT NULL,
  halaman_akhir  int          NOT NULL,
  penjelasan     text         NULL,
  poin_penting   jsonb        NULL,
  contoh         text         NULL,
  diagram        jsonb        NULL,                  -- lib/materi/tipe.ts skemaDiagram; NULL = tanpa diagram
  isi_dibuat_at  timestamptz  NULL,
  isi_diklaim_at timestamptz  NULL,
  dibaca_at      timestamptz  NULL,
  created_at     timestamptz  NOT NULL DEFAULT now(),
  updated_at     timestamptz  NOT NULL DEFAULT now(),
  CONSTRAINT uq_materi_topik_urutan UNIQUE (topik_id, urutan),
  CONSTRAINT ck_materi_urutan   CHECK (urutan BETWEEN 1 AND 20),
  CONSTRAINT ck_materi_judul    CHECK (char_length(btrim(judul)) BETWEEN 1 AND 120),
  CONSTRAINT ck_materi_halaman  CHECK (halaman_awal >= 1 AND halaman_akhir >= halaman_awal),
  CONSTRAINT ck_materi_poin     CHECK (poin_penting IS NULL
        OR (jsonb_typeof(poin_penting) = 'array' AND jsonb_array_length(poin_penting) BETWEEN 3 AND 6)),
  CONSTRAINT ck_materi_diagram  CHECK (diagram IS NULL OR jsonb_typeof(diagram) = 'object'),
  CONSTRAINT ck_materi_isi_lengkap CHECK (isi_dibuat_at IS NULL
        OR (penjelasan IS NOT NULL AND char_length(btrim(penjelasan)) > 0
            AND poin_penting IS NOT NULL AND contoh IS NOT NULL AND char_length(btrim(contoh)) > 0))
);
COMMENT ON TABLE public.t_materi IS 'Halaman materi (sub-bab) sebuah topik. Isi dibuat sekali saat pertama dibuka.';
CREATE INDEX idx_materi_topik ON public.t_materi (topik_id);
CREATE TRIGGER trg_t_materi_updated_at BEFORE UPDATE ON public.t_materi
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

-- ---------------------------------------------------------------- t_materi_rujukan
CREATE TABLE public.t_materi_rujukan (
  id         int GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  materi_id  int          NOT NULL
             CONSTRAINT fk_materi_rujukan_materi REFERENCES public.t_materi (id) ON DELETE CASCADE,
  chunk_id   int          NULL
             CONSTRAINT fk_materi_rujukan_chunk REFERENCES public.t_chunk (id) ON DELETE SET NULL,
  halaman    int          NOT NULL,
  kutipan    varchar(500) NOT NULL,
  urutan     int          NOT NULL DEFAULT 0,
  created_at timestamptz  NOT NULL DEFAULT now(),
  CONSTRAINT ck_materi_rujukan_halaman CHECK (halaman >= 1),
  CONSTRAINT ck_materi_rujukan_kutipan CHECK (char_length(btrim(kutipan)) BETWEEN 1 AND 500),
  CONSTRAINT ck_materi_rujukan_urutan  CHECK (urutan >= 0)
);
CREATE INDEX idx_materi_rujukan_materi ON public.t_materi_rujukan (materi_id);
CREATE INDEX idx_materi_rujukan_chunk  ON public.t_materi_rujukan (chunk_id);

-- ---------------------------------------------------------------- log_pemakaian_ai: fitur baru
ALTER TABLE public.log_pemakaian_ai DROP CONSTRAINT ck_pemakaian_fitur;
ALTER TABLE public.log_pemakaian_ai ADD CONSTRAINT ck_pemakaian_fitur
  CHECK (fitur IN ('indeks', 'topik', 'ringkasan', 'soal', 'tanya_ai', 'materi', 'sampul'));

-- ---------------------------------------------------------------- RLS
ALTER TABLE public.t_materi         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.t_materi_rujukan ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.t_materi, public.t_materi_rujukan FROM anon, authenticated;
GRANT ALL ON public.t_materi, public.t_materi_rujukan TO service_role;
GRANT SELECT ON public.t_materi, public.t_materi_rujukan TO authenticated;

CREATE POLICY t_materi_select_pemilik ON public.t_materi
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.t_topik t JOIN public.t_dokumen d ON d.id = t.dokumen_id
                  WHERE t.id = t_materi.topik_id
                    AND d.user_id = (SELECT public.fn_current_user_id())));
CREATE POLICY t_materi_rujukan_select_pemilik ON public.t_materi_rujukan
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.t_materi m
                   JOIN public.t_topik t ON t.id = m.topik_id
                   JOIN public.t_dokumen d ON d.id = t.dokumen_id
                  WHERE m.id = t_materi_rujukan.materi_id
                    AND d.user_id = (SELECT public.fn_current_user_id())));

-- ======================================================= FUNGSI

-- Klaim topik: + 'materi' (kerangka) dan 'sampul'. Sampul yang gagal baru boleh dicoba lagi
-- setelah 1 hari agar halaman yang sering dibuka tidak terus memanggil model gambar.
CREATE OR REPLACE FUNCTION public.fn_klaim_topik(p_topik_id int, p_jenis text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_id int;
BEGIN
  IF p_jenis = 'ringkasan' THEN
    UPDATE public.t_topik t
       SET ringkasan_diklaim_at = now()
     WHERE t.id = p_topik_id
       AND t.ringkasan_dibuat_at IS NULL
       AND (t.ringkasan_diklaim_at IS NULL OR t.ringkasan_diklaim_at < now() - interval '210 seconds')
    RETURNING t.id INTO v_id;
  ELSIF p_jenis = 'soal' THEN
    UPDATE public.t_topik t
       SET soal_diklaim_at = now()
     WHERE t.id = p_topik_id
       AND NOT EXISTS (SELECT 1 FROM public.t_soal s WHERE s.topik_id = t.id)
       AND (t.soal_diklaim_at IS NULL OR t.soal_diklaim_at < now() - interval '210 seconds')
    RETURNING t.id INTO v_id;
  ELSIF p_jenis = 'materi' THEN
    UPDATE public.t_topik t
       SET materi_diklaim_at = now()
     WHERE t.id = p_topik_id
       AND t.materi_dibuat_at IS NULL
       AND (t.materi_diklaim_at IS NULL OR t.materi_diklaim_at < now() - interval '210 seconds')
    RETURNING t.id INTO v_id;
  ELSIF p_jenis = 'sampul' THEN
    UPDATE public.t_topik t
       SET sampul_diklaim_at = now()
     WHERE t.id = p_topik_id
       AND t.sampul_path IS NULL
       AND (t.sampul_gagal_at IS NULL OR t.sampul_gagal_at < now() - interval '1 day')
       AND (t.sampul_diklaim_at IS NULL OR t.sampul_diklaim_at < now() - interval '210 seconds')
    RETURNING t.id INTO v_id;
  ELSE
    RAISE EXCEPTION 'JENIS_TIDAK_VALID' USING ERRCODE = '22023';
  END IF;
  RETURN v_id IS NOT NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_lepas_klaim_topik(p_topik_id int, p_jenis text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF p_jenis = 'ringkasan' THEN
    UPDATE public.t_topik SET ringkasan_diklaim_at = NULL WHERE id = p_topik_id AND ringkasan_dibuat_at IS NULL;
  ELSIF p_jenis = 'soal' THEN
    UPDATE public.t_topik SET soal_diklaim_at = NULL WHERE id = p_topik_id;
  ELSIF p_jenis = 'materi' THEN
    UPDATE public.t_topik SET materi_diklaim_at = NULL WHERE id = p_topik_id AND materi_dibuat_at IS NULL;
  ELSIF p_jenis = 'sampul' THEN
    -- Sampul bersifat dekoratif: kegagalan dicatat agar tidak dicoba ulang setiap kali dibuka.
    UPDATE public.t_topik SET sampul_diklaim_at = NULL, sampul_gagal_at = now()
     WHERE id = p_topik_id AND sampul_path IS NULL;
  ELSE
    RAISE EXCEPTION 'JENIS_TIDAK_VALID' USING ERRCODE = '22023';
  END IF;
END;
$$;

-- Simpan kerangka materi sekali (all-or-nothing). Service role.
-- p_materi: [{judul, halaman_awal, halaman_akhir}] terurut; wajib di dalam rentang topik.
CREATE OR REPLACE FUNCTION public.fn_simpan_kerangka_materi(p_topik_id int, p_materi jsonb)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_awal  int;
  v_akhir int;
  v_dibuat timestamptz;
BEGIN
  SELECT t.halaman_awal, t.halaman_akhir, t.materi_dibuat_at INTO v_awal, v_akhir, v_dibuat
    FROM public.t_topik t WHERE t.id = p_topik_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'TOPIK_TIDAK_DITEMUKAN' USING ERRCODE = 'P0002';
  END IF;
  IF v_dibuat IS NOT NULL THEN
    RETURN false;                                       -- sudah dibuat permintaan lain
  END IF;
  IF p_materi IS NULL OR jsonb_typeof(p_materi) <> 'array'
     OR jsonb_array_length(p_materi) NOT BETWEEN 1 AND 20 THEN
    RAISE EXCEPTION 'MATERI_TIDAK_VALID' USING ERRCODE = '23514';
  END IF;
  IF EXISTS (SELECT 1 FROM jsonb_to_recordset(p_materi) AS x(halaman_awal int, halaman_akhir int)
              WHERE x.halaman_awal < v_awal OR x.halaman_akhir > v_akhir) THEN
    RAISE EXCEPTION 'MATERI_DI_LUAR_RENTANG' USING ERRCODE = '23514';
  END IF;

  INSERT INTO public.t_materi (topik_id, urutan, judul, halaman_awal, halaman_akhir)
  SELECT p_topik_id, x.n::int, left(btrim(x.r ->> 'judul'), 120),
         (x.r ->> 'halaman_awal')::int, (x.r ->> 'halaman_akhir')::int
    FROM jsonb_array_elements(p_materi) WITH ORDINALITY AS x(r, n);

  UPDATE public.t_topik SET materi_dibuat_at = now(), materi_diklaim_at = NULL WHERE id = p_topik_id;
  RETURN true;
END;
$$;

-- Klaim isi satu materi (pola A7, sewa 210 dtk). Service role.
CREATE OR REPLACE FUNCTION public.fn_klaim_materi(p_materi_id int)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_id int;
BEGIN
  UPDATE public.t_materi m
     SET isi_diklaim_at = now()
   WHERE m.id = p_materi_id
     AND m.isi_dibuat_at IS NULL
     AND (m.isi_diklaim_at IS NULL OR m.isi_diklaim_at < now() - interval '210 seconds')
  RETURNING m.id INTO v_id;
  RETURN v_id IS NOT NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_lepas_klaim_materi(p_materi_id int)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  UPDATE public.t_materi SET isi_diklaim_at = NULL WHERE id = p_materi_id AND isi_dibuat_at IS NULL;
$$;

-- Simpan isi materi sekali + rujukan (wajib ≥ 1, di dalam rentang materi). Service role.
CREATE OR REPLACE FUNCTION public.fn_simpan_isi_materi(
  p_materi_id    int,
  p_penjelasan   text,
  p_poin_penting jsonb,
  p_contoh       text,
  p_diagram      jsonb,
  p_rujukan      jsonb
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_awal   int;
  v_akhir  int;
  v_dibuat timestamptz;
BEGIN
  SELECT m.halaman_awal, m.halaman_akhir, m.isi_dibuat_at INTO v_awal, v_akhir, v_dibuat
    FROM public.t_materi m WHERE m.id = p_materi_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'MATERI_TIDAK_DITEMUKAN' USING ERRCODE = 'P0002';
  END IF;
  IF v_dibuat IS NOT NULL THEN
    RETURN false;                                       -- tidak pernah menimpa
  END IF;
  IF p_rujukan IS NULL OR jsonb_typeof(p_rujukan) <> 'array' OR jsonb_array_length(p_rujukan) < 1 THEN
    RAISE EXCEPTION 'RUJUKAN_KOSONG' USING ERRCODE = '23514';
  END IF;
  IF EXISTS (SELECT 1 FROM jsonb_to_recordset(p_rujukan) AS x(halaman int)
              WHERE x.halaman < v_awal OR x.halaman > v_akhir) THEN
    RAISE EXCEPTION 'RUJUKAN_DI_LUAR_RENTANG' USING ERRCODE = '23514';
  END IF;

  UPDATE public.t_materi m
     SET penjelasan = btrim(p_penjelasan),
         poin_penting = p_poin_penting,
         contoh = btrim(p_contoh),
         diagram = CASE WHEN p_diagram IS NULL OR jsonb_typeof(p_diagram) <> 'object' THEN NULL ELSE p_diagram END,
         isi_dibuat_at = now(),
         isi_diklaim_at = NULL
   WHERE m.id = p_materi_id;

  INSERT INTO public.t_materi_rujukan (materi_id, chunk_id, halaman, kutipan, urutan)
  SELECT p_materi_id, (x.r ->> 'chunk_id')::int, (x.r ->> 'halaman')::int,
         left(btrim(x.r ->> 'kutipan'), 500), (x.n - 1)::int
    FROM jsonb_array_elements(p_rujukan) WITH ORDINALITY AS x(r, n);
  RETURN true;
END;
$$;

-- Simpan path sampul setelah file terunggah. Service role.
CREATE OR REPLACE FUNCTION public.fn_simpan_sampul_topik(p_topik_id int, p_path text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  UPDATE public.t_topik
     SET sampul_path = left(p_path, 255), sampul_diklaim_at = NULL, sampul_gagal_at = NULL
   WHERE id = p_topik_id;
$$;

-- Tandai materi sudah dibaca. Sesi pengguna; hanya materi milik pemanggil.
CREATE OR REPLACE FUNCTION public.fn_catat_baca_materi(p_materi_id int)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE public.t_materi m
     SET dibaca_at = coalesce(m.dibaca_at, now())
    FROM public.t_topik t
    JOIN public.t_dokumen d ON d.id = t.dokumen_id
   WHERE m.id = p_materi_id
     AND t.id = m.topik_id
     AND d.user_id = public.fn_current_user_id()
     AND m.dibaca_at IS NULL;
END;
$$;

-- Statistik admin: rincian biaya per fitur ikut menampilkan 'materi' & 'sampul'.
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
  v_tgl_awal := v_hari_ini - (p_rentang_hari - 1);
  v_mulai    := v_tgl_awal::timestamp AT TIME ZONE 'Asia/Jakarta';

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
      FROM (VALUES ('indeks', 1), ('topik', 2), ('ringkasan', 3), ('materi', 4), ('sampul', 5),
                   ('soal', 6), ('tanya_ai', 7)) AS f(fitur, urut)
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

-- ---------------------------------------------------------------- Hak EXECUTE
REVOKE ALL ON FUNCTION
  public.fn_simpan_kerangka_materi(int, jsonb),
  public.fn_klaim_materi(int),
  public.fn_lepas_klaim_materi(int),
  public.fn_simpan_isi_materi(int, text, jsonb, text, jsonb, jsonb),
  public.fn_simpan_sampul_topik(int, text),
  public.fn_catat_baca_materi(int)
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION
  public.fn_simpan_kerangka_materi(int, jsonb),
  public.fn_klaim_materi(int),
  public.fn_lepas_klaim_materi(int),
  public.fn_simpan_isi_materi(int, text, jsonb, text, jsonb, jsonb),
  public.fn_simpan_sampul_topik(int, text),
  public.fn_catat_baca_materi(int)
TO service_role;
GRANT EXECUTE ON FUNCTION public.fn_catat_baca_materi(int) TO authenticated;

-- ---------------------------------------------------------------- Storage bucket `sampul`
-- Path: {auth.uid()}/{kode_dokumen}/topik-{topik_id}.{ext}. Ditulis server (service role);
-- pemilik folder boleh membaca (signed URL). Dihapus bersama dokumen (lib/data/dokumen.ts).
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('sampul', 'sampul', false, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO UPDATE
  SET public = false,
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

CREATE POLICY storage_sampul_select_pemilik ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'sampul'
         AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
         AND (SELECT public.fn_current_user_id()) IS NOT NULL);

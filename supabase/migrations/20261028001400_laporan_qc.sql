-- =====================================================================
-- Laporan QC (KEPUTUSAN §4 "Laporan QC"). Anggota tim yang ditandai penguji (m_users.is_penguji)
-- dan admin mengirim temuan dari halaman mana pun; admin memilah & menindaklanjuti.
-- Screenshot di bucket privat `qc` (ditulis & dibaca server dengan service role).
-- =====================================================================

ALTER TABLE public.m_users ADD COLUMN is_penguji boolean NOT NULL DEFAULT false;

CREATE TABLE public.t_laporan_qc (
  id              int GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  pelapor_id      int           NOT NULL
                  CONSTRAINT fk_qc_pelapor REFERENCES public.m_users (id) ON DELETE RESTRICT,
  judul           varchar(120)  NOT NULL,
  deskripsi       text          NOT NULL,
  kategori        varchar(20)   NOT NULL,
  prioritas       varchar(10)   NOT NULL DEFAULT 'sedang',
  status          varchar(12)   NOT NULL DEFAULT 'baru',
  url_halaman     varchar(500)  NOT NULL,
  info_perangkat  jsonb         NULL,
  lampiran_path   varchar(255)  NULL,
  catatan_tim     text          NULL,
  ditangani_oleh  int           NULL
                  CONSTRAINT fk_qc_penangan REFERENCES public.m_users (id) ON DELETE SET NULL,
  selesai_at      timestamptz   NULL,
  created_at      timestamptz   NOT NULL DEFAULT now(),
  updated_at      timestamptz   NOT NULL DEFAULT now(),
  CONSTRAINT ck_qc_judul     CHECK (char_length(btrim(judul)) BETWEEN 5 AND 120),
  CONSTRAINT ck_qc_deskripsi CHECK (char_length(btrim(deskripsi)) BETWEEN 1 AND 4000),
  CONSTRAINT ck_qc_kategori  CHECK (kategori IN ('bug', 'tampilan', 'konten_ai', 'teks', 'saran')),
  CONSTRAINT ck_qc_prioritas CHECK (prioritas IN ('rendah', 'sedang', 'tinggi', 'kritis')),
  CONSTRAINT ck_qc_status    CHECK (status IN ('baru', 'dikerjakan', 'selesai', 'ditolak')),
  CONSTRAINT ck_qc_catatan   CHECK (catatan_tim IS NULL OR char_length(catatan_tim) <= 2000),
  CONSTRAINT ck_qc_info      CHECK (info_perangkat IS NULL OR jsonb_typeof(info_perangkat) = 'object')
);
COMMENT ON TABLE public.t_laporan_qc IS 'Temuan QC dari tim penguji; dikelola admin.';
CREATE INDEX idx_qc_pelapor ON public.t_laporan_qc (pelapor_id, created_at DESC);
CREATE INDEX idx_qc_status  ON public.t_laporan_qc (status, created_at DESC);
CREATE TRIGGER trg_t_laporan_qc_updated_at BEFORE UPDATE ON public.t_laporan_qc
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

-- ---------------------------------------------------------------- RLS
ALTER TABLE public.t_laporan_qc ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.t_laporan_qc FROM anon, authenticated;
GRANT ALL ON public.t_laporan_qc TO service_role;
GRANT SELECT ON public.t_laporan_qc TO authenticated;

CREATE POLICY t_laporan_qc_select_pelapor ON public.t_laporan_qc
  FOR SELECT TO authenticated
  USING (pelapor_id = (SELECT public.fn_current_user_id()));
CREATE POLICY t_laporan_qc_select_admin ON public.t_laporan_qc
  FOR SELECT TO authenticated
  USING ((SELECT public.fn_is_admin()));

-- ---------------------------------------------------------------- Fungsi
CREATE OR REPLACE FUNCTION public.fn_boleh_lapor_qc()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT public.fn_is_admin()
      OR EXISTS (SELECT 1 FROM public.m_users u
                  WHERE u.id = public.fn_current_user_id() AND u.is_penguji);
$$;

-- Sesi pengguna. Mengembalikan id laporan baru. Lampiran diisi server setelah unggah.
CREATE OR REPLACE FUNCTION public.fn_buat_laporan_qc(
  p_judul      text,
  p_deskripsi  text,
  p_kategori   text,
  p_prioritas  text,
  p_url        text,
  p_info       jsonb
)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user int := public.fn_current_user_id();
  v_id   int;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'BELUM_LOGIN' USING ERRCODE = '42501';
  END IF;
  IF NOT public.fn_boleh_lapor_qc() THEN
    RAISE EXCEPTION 'BUKAN_PENGUJI' USING ERRCODE = '42501';
  END IF;
  INSERT INTO public.t_laporan_qc (pelapor_id, judul, deskripsi, kategori, prioritas, url_halaman, info_perangkat)
  VALUES (v_user, btrim(p_judul), btrim(p_deskripsi), p_kategori, coalesce(p_prioritas, 'sedang'),
          left(coalesce(p_url, '/'), 500),
          CASE WHEN jsonb_typeof(p_info) = 'object' THEN p_info ELSE NULL END)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

-- Admin: ubah status / prioritas / catatan. NULL = tidak diubah.
CREATE OR REPLACE FUNCTION public.fn_ubah_laporan_qc(
  p_id        int,
  p_status    text DEFAULT NULL,
  p_prioritas text DEFAULT NULL,
  p_catatan   text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT public.fn_is_admin() THEN
    RAISE EXCEPTION 'TIDAK_BERHAK' USING ERRCODE = '42501';
  END IF;
  UPDATE public.t_laporan_qc q
     SET status         = coalesce(p_status, q.status),
         prioritas      = coalesce(p_prioritas, q.prioritas),
         catatan_tim    = CASE WHEN p_catatan IS NULL THEN q.catatan_tim ELSE nullif(btrim(p_catatan), '') END,
         ditangani_oleh = public.fn_current_user_id(),
         selesai_at     = CASE
                            WHEN coalesce(p_status, q.status) IN ('selesai', 'ditolak')
                              THEN coalesce(q.selesai_at, now())
                            ELSE NULL
                          END
   WHERE q.id = p_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'TIDAK_DITEMUKAN' USING ERRCODE = 'P0002';
  END IF;
END;
$$;

-- Admin: tandai / lepas penguji berdasarkan email. NULL bila email tidak terdaftar.
CREATE OR REPLACE FUNCTION public.fn_atur_penguji(p_email text, p_penguji boolean)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_id int;
BEGIN
  IF NOT public.fn_is_admin() THEN
    RAISE EXCEPTION 'TIDAK_BERHAK' USING ERRCODE = '42501';
  END IF;
  UPDATE public.m_users u
     SET is_penguji = p_penguji,
         updated_by = (SELECT email FROM public.m_users WHERE id = public.fn_current_user_id())
   WHERE u.email = lower(btrim(p_email)) AND u.deleted_at IS NULL
  RETURNING u.id INTO v_id;
  RETURN v_id;
END;
$$;

-- Admin: daftar penguji + jumlah laporan.
CREATE OR REPLACE FUNCTION public.fn_daftar_penguji()
RETURNS TABLE (id int, nama text, email text, peran text, jumlah_laporan int)
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
  SELECT u.id, u.nama::text, u.email::text, coalesce(r.kode, 'mahasiswa')::text,
         (SELECT count(*)::int FROM public.t_laporan_qc q WHERE q.pelapor_id = u.id)
    FROM public.m_users u
    LEFT JOIN public.m_user_role ur ON ur.user_id = u.id
    LEFT JOIN public.m_role r ON r.id = ur.role_id
   WHERE u.is_penguji AND u.deleted_at IS NULL
   ORDER BY u.nama;
END;
$$;

REVOKE ALL ON FUNCTION
  public.fn_boleh_lapor_qc(),
  public.fn_buat_laporan_qc(text, text, text, text, text, jsonb),
  public.fn_ubah_laporan_qc(int, text, text, text),
  public.fn_atur_penguji(text, boolean),
  public.fn_daftar_penguji()
FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION
  public.fn_boleh_lapor_qc(),
  public.fn_buat_laporan_qc(text, text, text, text, text, jsonb),
  public.fn_ubah_laporan_qc(int, text, text, text),
  public.fn_atur_penguji(text, boolean),
  public.fn_daftar_penguji()
TO authenticated, service_role;

-- ---------------------------------------------------------------- Storage bucket `qc`
-- Path: {pelapor_id}/{laporan_id}.{ext}. Tanpa policy untuk authenticated: unggah & signed URL lewat server.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('qc', 'qc', false, 5242880, ARRAY['image/png', 'image/jpeg', 'image/webp'])
ON CONFLICT (id) DO UPDATE
  SET public = false,
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

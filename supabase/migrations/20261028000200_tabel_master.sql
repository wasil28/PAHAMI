-- =====================================================================
-- Bagian 1 skema: AKUN & RBAC + pengaturan sistem (tabel m_*).
-- Acuan: skema-database.dbml, FT-01, FT-08, FT-09, FT-10, KEPUTUSAN A6 & B15.
-- Kata sandi TIDAK disimpan di sini — dikelola Supabase Auth (NF-01).
-- =====================================================================

-- Trigger umum kolom updated_at (dipakai semua tabel yang diubah manusia).
CREATE OR REPLACE FUNCTION public.fn_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------- m_users
CREATE TABLE public.m_users (
  id             int GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  -- Akun tidak pernah dihapus, hanya dinonaktifkan (BR-23) → RESTRICT.
  auth_id        uuid         NOT NULL
                 CONSTRAINT fk_users_auth REFERENCES auth.users (id) ON DELETE RESTRICT,
  email          varchar(255) NOT NULL,
  nama           varchar(60)  NOT NULL,
  is_active      boolean      NOT NULL DEFAULT true,
  last_active_at timestamptz  NULL,
  created_by     varchar(100) NULL,
  created_at     timestamptz  NOT NULL DEFAULT now(),
  updated_by     varchar(100) NULL,
  updated_at     timestamptz  NOT NULL DEFAULT now(),
  deleted_at     timestamptz  NULL,
  CONSTRAINT uq_users_auth_id UNIQUE (auth_id),
  CONSTRAINT uq_users_email   UNIQUE (email),
  CONSTRAINT ck_users_nama    CHECK (char_length(btrim(nama)) BETWEEN 3 AND 60),         -- BR-22
  CONSTRAINT ck_users_email   CHECK (email = lower(email) AND position('@' IN email) > 1)
);
COMMENT ON TABLE public.m_users IS 'Akun mahasiswa & admin, tertaut auth.users lewat auth_id. Ubah hanya lewat RPC (BR-36).';
CREATE INDEX idx_users_active ON public.m_users (is_active);

-- updated_at hanya untuk kolom yang diubah manusia; last_active_at (B2) sengaja tidak
-- memicu supaya "terakhir diubah" tetap bermakna.
CREATE TRIGGER trg_m_users_updated_at
  BEFORE UPDATE OF nama, email, is_active, deleted_at ON public.m_users
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

-- ----------------------------------------------------------------- m_role
CREATE TABLE public.m_role (
  id          int GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  kode        varchar(30)  NOT NULL,
  nama        varchar(100) NOT NULL,
  deskripsi   text         NULL,
  is_active   boolean      NOT NULL DEFAULT true,
  created_by  varchar(100) NULL,
  created_at  timestamptz  NOT NULL DEFAULT now(),
  updated_by  varchar(100) NULL,
  updated_at  timestamptz  NOT NULL DEFAULT now(),
  CONSTRAINT uq_role_kode UNIQUE (kode),
  CONSTRAINT ck_role_kode CHECK (kode IN ('mahasiswa', 'admin'))                          -- BR-25
);
CREATE TRIGGER trg_m_role_updated_at BEFORE UPDATE ON public.m_role
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

-- ------------------------------------------------------------ m_user_role
CREATE TABLE public.m_user_role (
  id          int GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id     int         NOT NULL
              CONSTRAINT fk_user_role_user REFERENCES public.m_users (id) ON DELETE CASCADE,
  role_id     int         NOT NULL
              CONSTRAINT fk_user_role_role REFERENCES public.m_role (id) ON DELETE RESTRICT,
  created_at  timestamptz NOT NULL DEFAULT now()
);
-- KEPUTUSAN B15: satu peran per pengguna, agar arah login BR-31 tidak ambigu.
-- Sengaja UNIQUE INDEX (bukan UNIQUE CONSTRAINT): PostgREST menganggap FK yang punya
-- unique *constraint* sebagai relasi one-to-one dan embed `m_users → m_user_role(...)`
-- akan berubah dari array menjadi objek (lib/auth/sesi.ts mengharapkan array).
-- Penegakan di database tetap sama kuatnya.
CREATE UNIQUE INDEX uq_user_role_user ON public.m_user_role (user_id);
CREATE INDEX idx_user_role_role ON public.m_user_role (role_id);

-- ----------------------------------------------------------------- m_menu
CREATE TABLE public.m_menu (
  id          int GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  parent_id   int          NULL
              CONSTRAINT fk_menu_parent REFERENCES public.m_menu (id) ON DELETE SET NULL,
  kode        varchar(20)  NOT NULL,
  nama        varchar(100) NOT NULL,
  ikon        varchar(60)  NULL,
  route_path  varchar(255) NULL,
  urutan      int          NOT NULL DEFAULT 0,
  is_active   boolean      NOT NULL DEFAULT true,
  created_by  varchar(100) NULL,
  created_at  timestamptz  NOT NULL DEFAULT now(),
  updated_by  varchar(100) NULL,
  updated_at  timestamptz  NOT NULL DEFAULT now(),
  CONSTRAINT uq_menu_kode UNIQUE (kode)
);
CREATE TRIGGER trg_m_menu_updated_at BEFORE UPDATE ON public.m_menu
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

-- ------------------------------------------------------- m_otorisasi_menu
CREATE TABLE public.m_otorisasi_menu (
  id            int GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  role_id       int          NOT NULL
                CONSTRAINT fk_otorisasi_role REFERENCES public.m_role (id) ON DELETE CASCADE,
  menu_id       int          NOT NULL
                CONSTRAINT fk_otorisasi_menu REFERENCES public.m_menu (id) ON DELETE CASCADE,
  allow_view    boolean      NOT NULL DEFAULT true,
  allow_new     boolean      NOT NULL DEFAULT false,
  allow_edit    boolean      NOT NULL DEFAULT false,
  allow_delete  boolean      NOT NULL DEFAULT false,
  created_by    varchar(100) NULL,
  created_at    timestamptz  NOT NULL DEFAULT now(),
  updated_by    varchar(100) NULL,
  updated_at    timestamptz  NOT NULL DEFAULT now(),
  CONSTRAINT uq_otorisasi_role_menu UNIQUE (role_id, menu_id),
  -- tidak masuk akal punya hak ubah tanpa hak lihat
  CONSTRAINT ck_otorisasi_view CHECK (allow_view OR NOT (allow_new OR allow_edit OR allow_delete))
);
CREATE INDEX idx_otorisasi_menu ON public.m_otorisasi_menu (menu_id);
CREATE TRIGGER trg_m_otorisasi_menu_updated_at BEFORE UPDATE ON public.m_otorisasi_menu
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

-- ---------------------------------------------------- m_pengaturan_sistem
-- KEPUTUSAN A6: + tipe_nilai, satuan, is_tampil. Nilai disimpan teks lalu dibaca sesuai
-- tipe lewat fn_pengaturan_int / fn_pengaturan_numeric.
CREATE TABLE public.m_pengaturan_sistem (
  id             int GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  kode           varchar(100) NOT NULL,
  nilai          varchar(100) NOT NULL,
  nilai_default  varchar(100) NOT NULL,
  nilai_min      numeric      NULL,
  nilai_max      numeric      NULL,
  tipe_nilai     varchar(10)  NOT NULL DEFAULT 'int',
  satuan         varchar(30)  NULL,
  is_tampil      boolean      NOT NULL DEFAULT true,      -- false = tidak tampil/diubah di S-16
  keterangan     varchar(255) NULL,
  created_by     varchar(100) NULL,
  created_at     timestamptz  NOT NULL DEFAULT now(),
  updated_by     varchar(100) NULL,
  updated_at     timestamptz  NOT NULL DEFAULT now(),
  CONSTRAINT uq_pengaturan_kode UNIQUE (kode),
  CONSTRAINT ck_pengaturan_tipe CHECK (tipe_nilai IN ('int', 'numeric')),
  CONSTRAINT ck_pengaturan_min_max CHECK (nilai_min IS NULL OR nilai_max IS NULL OR nilai_min <= nilai_max),
  -- BR-29 sebagai jaring pengaman: format dulu (regex), baru rentang. CASE menjamin cast
  -- ::numeric hanya dijalankan pada teks yang lolos regex (AND tidak menjamin urutan).
  CONSTRAINT ck_pengaturan_nilai_valid CHECK (
    CASE
      WHEN tipe_nilai = 'int'     AND nilai ~ '^[0-9]{1,9}$'
        THEN nilai::numeric BETWEEN coalesce(nilai_min, nilai::numeric) AND coalesce(nilai_max, nilai::numeric)
      WHEN tipe_nilai = 'numeric' AND nilai ~ '^[0-9]{1,9}(\.[0-9]+)?$'
        THEN nilai::numeric BETWEEN coalesce(nilai_min, nilai::numeric) AND coalesce(nilai_max, nilai::numeric)
      ELSE false
    END),
  CONSTRAINT ck_pengaturan_default_valid CHECK (
    CASE
      WHEN nilai_default ~ '^[0-9]{1,9}(\.[0-9]+)?$'
        THEN nilai_default::numeric BETWEEN coalesce(nilai_min, nilai_default::numeric)
                                        AND coalesce(nilai_max, nilai_default::numeric)
      ELSE false
    END)
);
COMMENT ON TABLE public.m_pengaturan_sistem IS 'Kuota & konfigurasi runtime (F-18, BR-28/29). Ubah hanya lewat fn_ubah_pengaturan.';
CREATE TRIGGER trg_pengaturan_set_updated_at BEFORE UPDATE ON public.m_pengaturan_sistem
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

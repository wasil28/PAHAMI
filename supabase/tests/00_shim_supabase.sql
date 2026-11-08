-- =====================================================================
-- SHIM SUPABASE — HANYA UNTUK UJI LOKAL (Postgres 16 + pgvector biasa).
-- JANGAN dijalankan di project Supabase: skema auth/storage di sana asli.
--
-- Meniru bagian Supabase yang dirujuk migrasi Pahami:
--   * role anon / authenticated / service_role (service_role BYPASSRLS)
--   * skema extensions (tempat ekstensi), search_path seperti Supabase
--   * auth.users + auth.uid() / auth.jwt() / auth.role() yang membaca
--     setting `request.jwt.claims` (persis cara PostgREST mengisinya)
--   * storage.buckets, storage.objects (+RLS), storage.foldername()
--   * default privileges Supabase: tabel & fungsi baru di public otomatis
--     di-GRANT ke anon/authenticated/service_role — supaya uji ini ikut
--     membuktikan bahwa REVOKE di migrasi benar-benar menutup akses.
-- =====================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOLOGIN NOINHERIT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN NOINHERIT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    CREATE ROLE service_role NOLOGIN NOINHERIT BYPASSRLS;
  END IF;
END $$;

CREATE SCHEMA IF NOT EXISTS extensions;
CREATE SCHEMA IF NOT EXISTS auth;
CREATE SCHEMA IF NOT EXISTS storage;

GRANT USAGE ON SCHEMA public, extensions, auth, storage TO anon, authenticated, service_role;

-- Supabase: search_path role = "$user", public, extensions
DO $$ BEGIN
  EXECUTE format('ALTER DATABASE %I SET search_path = "$user", public, extensions', current_database());
END $$;
SET search_path = "$user", public, extensions;

-- ---------------------------------------------------------------- auth
CREATE TABLE IF NOT EXISTS auth.users (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email              varchar(255),
  raw_user_meta_data jsonb DEFAULT '{}'::jsonb,
  created_at         timestamptz DEFAULT now()
);

CREATE OR REPLACE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS $$
  SELECT coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb
$$;

CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT nullif(auth.jwt() ->> 'sub', '')::uuid
$$;

CREATE OR REPLACE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS $$
  SELECT nullif(auth.jwt() ->> 'role', '')
$$;

GRANT EXECUTE ON FUNCTION auth.jwt(), auth.uid(), auth.role() TO anon, authenticated, service_role;

-- ------------------------------------------------------------- storage
CREATE TABLE IF NOT EXISTS storage.buckets (
  id                 text PRIMARY KEY,
  name               text NOT NULL UNIQUE,
  public             boolean DEFAULT false,
  file_size_limit    bigint,
  allowed_mime_types text[],
  created_at         timestamptz DEFAULT now(),
  updated_at         timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS storage.objects (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket_id  text REFERENCES storage.buckets (id),
  name       text,
  owner      uuid,
  metadata   jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (bucket_id, name)
);
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON storage.objects TO authenticated, service_role;
GRANT SELECT ON storage.buckets TO authenticated, service_role;

-- Sama dengan Supabase: semua segmen kecuali nama file terakhir.
CREATE OR REPLACE FUNCTION storage.foldername(name text) RETURNS text[]
LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE _parts text[];
BEGIN
  SELECT string_to_array(name, '/') INTO _parts;
  RETURN _parts[1:array_length(_parts, 1) - 1];
END $$;
GRANT EXECUTE ON FUNCTION storage.foldername(text) TO anon, authenticated, service_role;

-- -------------------------------------------- default privileges public
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES    TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon, authenticated, service_role;

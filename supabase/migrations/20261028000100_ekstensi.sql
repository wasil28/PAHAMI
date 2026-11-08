-- =====================================================================
-- Ekstensi yang dibutuhkan Pahami.
--   vector     : kolom embedding t_chunk + pencarian kemiripan (BR-16, KEPUTUSAN A5)
--   pgcrypto   : gen_random_uuid()/digest bila dibutuhkan fungsi server
--   btree_gist : agar EXCLUDE pada t_topik bisa memakai "dokumen_id WITH =" (BR-09)
-- Dipasang di skema `extensions` (konvensi Supabase) supaya skema public bersih.
-- =====================================================================

CREATE SCHEMA IF NOT EXISTS extensions;

CREATE EXTENSION IF NOT EXISTS vector     WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pgcrypto   WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS btree_gist WITH SCHEMA extensions;

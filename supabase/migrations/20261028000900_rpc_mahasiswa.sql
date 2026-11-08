-- =====================================================================
-- RPC untuk alur mahasiswa & pipeline server (FT-02 … FT-08).
-- Konvensi: satu panggilan RPC = satu transaksi (PostgREST tidak bisa menahan transaksi
-- melintasi beberapa panggilan), jadi setiap penulisan multi-tabel ditulis sebagai fungsi.
-- Galat dikirim sebagai RAISE EXCEPTION '<KODE>' — aplikasi membaca error.message.
--   * "sesi pengguna"  = dipanggil dengan klien sesi (lib/supabase/server.ts), RLS berlaku
--   * "service role"   = hanya klien admin (lib/supabase/admin.ts), auth.uid() NULL
-- Hak EXECUTE diatur di migrasi RLS & grant.
-- =====================================================================

-- ----------------------------------------------- fn_pengguna_sasaran()
-- Penentu "untuk siapa" fungsi bersama dijalankan:
--   sesi pengguna → selalu dirinya sendiri (p_user_id lain ditolak, BR-06);
--   service role  → p_user_id apa adanya (boleh NULL = semua, tergantung fungsi).
CREATE OR REPLACE FUNCTION public.fn_pengguna_sasaran(p_user_id int)
RETURNS int
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_saya int;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN p_user_id;
  END IF;
  v_saya := public.fn_current_user_id();
  IF v_saya IS NULL THEN
    RAISE EXCEPTION 'BELUM_LOGIN' USING ERRCODE = '28000';        -- termasuk akun nonaktif (BR-23)
  END IF;
  IF p_user_id IS NOT NULL AND p_user_id <> v_saya THEN
    RAISE EXCEPTION 'TIDAK_BERHAK' USING ERRCODE = '42501';
  END IF;
  RETURN v_saya;
END;
$$;

-- ======================================================= DOKUMEN (FT-02/03)

-- Kode DOK-YYYY-NNNNNN (tahun WIB).
CREATE OR REPLACE FUNCTION public.fn_kode_dokumen()
RETURNS text
LANGUAGE sql
VOLATILE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT 'DOK-' || to_char(now() AT TIME ZONE 'Asia/Jakarta', 'YYYY') || '-'
      || lpad(nextval('public.seq_t_dokumen_kode')::text, 6, '0');
$$;

-- Tandai gagal + hapus data parsial (BR-03, BR-05, BR-32, NF-04). Service role.
-- File PDF tidak dihapus di sini: kartu gagal tetap tampil (S-06) sampai dihapus / A9.
CREATE OR REPLACE FUNCTION public.fn_gagalkan_dokumen(p_dokumen_id int, p_pesan text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  PERFORM 1 FROM public.t_dokumen WHERE id = p_dokumen_id AND status = 'diproses' FOR UPDATE;
  IF NOT FOUND THEN
    RETURN false;                  -- sudah siap/gagal/dihapus: tidak ada yang dilakukan
  END IF;

  DELETE FROM public.t_topik WHERE dokumen_id = p_dokumen_id;
  DELETE FROM public.t_chunk WHERE dokumen_id = p_dokumen_id;

  UPDATE public.t_dokumen
     SET status = 'gagal',
         pesan_gagal = left(coalesce(nullif(btrim(p_pesan), ''),
                       'Dokumen gagal diproses karena gangguan sistem. Silakan unggah ulang.'), 255),
         updated_by = 'system'
   WHERE id = p_dokumen_id;
  RETURN true;
END;
$$;

-- KEPUTUSAN A8: dokumen `diproses` tanpa detak (updated_at) > 15 menit → gagal (MSG-U09),
-- supaya tidak memakan kuota BR-04 dan bisa dihapus. Dipanggil saat daftar dokumen dibaca
-- (sesi pengguna → hanya miliknya) atau cron server (service role, p_user_id NULL = semua).
CREATE OR REPLACE FUNCTION public.fn_tandai_dokumen_macet(p_user_id int DEFAULT NULL)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user  int := public.fn_pengguna_sasaran(p_user_id);
  v_id    int;
  v_hasil int := 0;
BEGIN
  FOR v_id IN
    SELECT d.id FROM public.t_dokumen d
     WHERE d.status = 'diproses'
       AND d.updated_at < now() - interval '15 minutes'      -- BATAS_WAKTU_PROSES_MENIT
       AND (v_user IS NULL OR d.user_id = v_user)
  LOOP
    IF public.fn_gagalkan_dokumen(v_id,
         'Dokumen gagal diproses karena gangguan sistem. Silakan unggah ulang.') THEN   -- MSG-U09
      v_hasil := v_hasil + 1;
    END IF;
  END LOOP;
  RETURN v_hasil;
END;
$$;

-- KEPUTUSAN A9: dokumen `gagal` > 7 hari dihapus permanen (cascade BR-20).
-- Mengembalikan path_file supaya pemanggil menghapus file di Storage
-- (storage.from('dokumen').remove(paths) — JANGAN DELETE langsung dari storage.objects).
CREATE OR REPLACE FUNCTION public.fn_bersihkan_dokumen_gagal(p_user_id int DEFAULT NULL)
RETURNS TABLE (dokumen_id int, path_file varchar)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
#variable_conflict use_column
DECLARE
  v_user int := public.fn_pengguna_sasaran(p_user_id);
BEGIN
  RETURN QUERY
  DELETE FROM public.t_dokumen d
   WHERE d.status = 'gagal'
     AND d.updated_at < now() - interval '7 days'            -- HAPUS_DOKUMEN_GAGAL_HARI
     AND (v_user IS NULL OR d.user_id = v_user)
  RETURNING d.id, d.path_file;
END;
$$;

-- Simpan satu batch chunk (BP-04 tahap mengindeks). Service role.
-- Baris dokumen dikunci FOR UPDATE dan WAJIB masih `diproses`: bila A8 (fn_tandai_dokumen_macet)
-- atau penghapusan sudah terjadi, tidak ada chunk yatim yang tertulis — false → pipeline berhenti
-- diam-diam. fn_gagalkan_dokumen mengunci baris yang sama, jadi keduanya tidak bisa bersilangan.
-- p_chunk: [{urutan, halaman_awal, halaman_akhir, judul_bagian, isi, jumlah_token, embedding: "[…]"}]
CREATE OR REPLACE FUNCTION public.fn_simpan_chunk(p_dokumen_id int, p_chunk jsonb)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF jsonb_typeof(p_chunk) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'INPUT_TIDAK_VALID' USING ERRCODE = '22023';
  END IF;
  PERFORM 1 FROM public.t_dokumen WHERE id = p_dokumen_id AND status = 'diproses' FOR UPDATE;
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  INSERT INTO public.t_chunk (dokumen_id, urutan, halaman_awal, halaman_akhir, judul_bagian, isi, jumlah_token, embedding)
  SELECT p_dokumen_id, x.urutan, x.halaman_awal, x.halaman_akhir, x.judul_bagian, x.isi, x.jumlah_token,
         x.embedding::extensions.vector
    FROM jsonb_to_recordset(p_chunk) AS x(urutan int, halaman_awal int, halaman_akhir int, judul_bagian varchar,
                                         isi text, jumlah_token int, embedding text);
  RETURN true;
END;
$$;

-- Ukuran NYATA file di Storage (BR-02). Ukuran yang dikirim browser ke fn_buat_dokumen bisa
-- dipalsukan dan signed upload URL hanya dibatasi batas fisik bucket (100 MB), jadi sebelum
-- pipeline dimulai server membaca storage.objects.metadata->>'size'. Service role.
-- ada=false → file belum diunggah (MSG-U05). ukuran_byte NULL → metadata belum tersedia.
-- Bila ada & tidak melebihi batas, t_dokumen.ukuran_byte diselaraskan dengan ukuran nyata.
CREATE OR REPLACE FUNCTION public.fn_periksa_file_dokumen(p_dokumen_id int)
RETURNS TABLE (ada boolean, ukuran_byte bigint, maks_byte bigint, is_terlalu_besar boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
#variable_conflict use_column
DECLARE
  v_path varchar;
BEGIN
  SELECT d.path_file INTO v_path FROM public.t_dokumen d WHERE d.id = p_dokumen_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'TIDAK_DITEMUKAN' USING ERRCODE = 'P0002';
  END IF;
  maks_byte := public.fn_pengaturan_int('max_ukuran_mb')::bigint * 1024 * 1024;   -- BR-02, BR-28
  SELECT true, nullif(o.metadata ->> 'size', '')::bigint INTO ada, ukuran_byte
    FROM storage.objects o
   WHERE o.bucket_id = 'dokumen' AND o.name = v_path;
  ada := coalesce(ada, false);
  is_terlalu_besar := coalesce(ukuran_byte > maks_byte, false);
  IF ada AND ukuran_byte IS NOT NULL AND NOT is_terlalu_besar THEN
    UPDATE public.t_dokumen d SET ukuran_byte = fn_periksa_file_dokumen.ukuran_byte
     WHERE d.id = p_dokumen_id AND d.ukuran_byte IS DISTINCT FROM fn_periksa_file_dokumen.ukuran_byte;
  END IF;
  RETURN NEXT;
END;
$$;

-- Hapus dokumen milik sendiri (BP-09, BR-20). Sesi pengguna — satu-satunya jalur hapus dari
-- browser (DELETE langsung ke t_dokumen dicabut) supaya aturan berikut tidak bisa dilewati:
--   * `siap` / `gagal` → boleh;
--   * `diproses` macet > 15 menit → ditandai gagal dulu (A8) lalu boleh;
--   * `diproses` yang BELUM diklaim pipeline (updated_by <> 'system' = PENANDA_PIPELINE di
--     lib/dokumen/jalankan.ts; unggahan batal/terputus, NF-04) → boleh;
--   * `diproses` yang sedang diolah → DOKUMEN_DIPROSES (PT409 → HTTP 409, MSG-D04).
-- Mengembalikan path_file: pemanggil menghapus file Storage SETELAH baris terhapus (file yatim
-- lebih aman daripada baris yang menunjuk file yang sudah hilang). Cascade + trigger audit
-- fn_log_hapus_dokumen berjalan seperti biasa.
CREATE OR REPLACE FUNCTION public.fn_hapus_dokumen(p_dokumen_id int)
RETURNS TABLE (path_file varchar)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
#variable_conflict use_column
DECLARE
  v_user   int := public.fn_current_user_id();
  v_status varchar;
  v_oleh   varchar;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'BELUM_LOGIN' USING ERRCODE = '28000';          -- termasuk akun nonaktif (BR-23)
  END IF;
  PERFORM public.fn_tandai_dokumen_macet(v_user);                    -- A8

  SELECT d.status, d.updated_by INTO v_status, v_oleh
    FROM public.t_dokumen d
   WHERE d.id = p_dokumen_id AND d.user_id = v_user
   FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'TIDAK_DITEMUKAN' USING ERRCODE = 'P0002';      -- milik orang lain = tidak ada (BR-06)
  END IF;
  IF v_status = 'diproses' AND v_oleh IS NOT DISTINCT FROM 'system' THEN
    RAISE EXCEPTION 'DOKUMEN_DIPROSES' USING ERRCODE = 'PT409';
  END IF;

  RETURN QUERY
  DELETE FROM public.t_dokumen d WHERE d.id = p_dokumen_id RETURNING d.path_file;
END;
$$;

-- Buat catatan dokumen `diproses` SEBELUM file diunggah (KEPUTUSAN §3: browser lalu
-- mengunggah langsung ke Storage lewat signed upload URL untuk path yang dikembalikan).
-- Sesi pengguna. Kuota BR-04 dihitung ulang di sini dengan kunci advisory agar dua tab
-- yang mengunggah bersamaan tidak bisa melewati batas.
CREATE OR REPLACE FUNCTION public.fn_buat_dokumen(p_judul text, p_nama_file text, p_ukuran_byte bigint)
RETURNS TABLE (id int, kode varchar, path_file varchar, status varchar, tahap varchar)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
#variable_conflict use_column
DECLARE
  v_user_id   int := public.fn_current_user_id();
  v_auth      uuid := auth.uid();
  v_email     varchar(255);
  v_judul     text := btrim(regexp_replace(coalesce(p_judul, ''), '\s+', ' ', 'g'));
  v_kode      text;
  v_terpakai  int;
  v_maks      int;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'BELUM_LOGIN' USING ERRCODE = '28000';
  END IF;
  IF public.fn_is_admin() THEN                               -- matriks §3.2: admin tidak mengunggah
    RAISE EXCEPTION 'TIDAK_BERHAK' USING ERRCODE = '42501';
  END IF;
  IF char_length(v_judul) NOT BETWEEN 3 AND 100 THEN          -- BR-21
    RAISE EXCEPTION 'JUDUL_TIDAK_VALID' USING ERRCODE = '22023';
  END IF;
  IF p_nama_file IS NULL OR lower(btrim(p_nama_file)) NOT LIKE '%.pdf' THEN
    RAISE EXCEPTION 'BUKAN_PDF' USING ERRCODE = '22023';     -- BR-01 (ekstensi; MIME dicek bucket)
  END IF;
  IF p_ukuran_byte IS NULL OR p_ukuran_byte <= 0
     OR p_ukuran_byte > public.fn_pengaturan_int('max_ukuran_mb')::bigint * 1024 * 1024 THEN
    RAISE EXCEPTION 'FILE_TERLALU_BESAR' USING ERRCODE = '22023',
          DETAIL = public.fn_pengaturan('max_ukuran_mb');      -- BR-02
  END IF;

  PERFORM pg_advisory_xact_lock(1001, v_user_id);

  -- A8: dokumen macet milik sendiri dibereskan dulu agar tidak memakan kuota.
  PERFORM public.fn_tandai_dokumen_macet(v_user_id);

  v_maks := public.fn_pengaturan_int('max_dokumen');          -- dibaca saat ini (BR-28)
  SELECT count(*) INTO v_terpakai
    FROM public.t_dokumen d
   WHERE d.user_id = v_user_id AND d.status IN ('diproses', 'siap');   -- gagal tidak dihitung (BR-04)
  IF v_terpakai >= v_maks THEN
    RAISE EXCEPTION 'KUOTA_PENUH' USING ERRCODE = 'PT429', DETAIL = v_maks::text;   -- HTTP 429
  END IF;

  v_kode := public.fn_kode_dokumen();
  SELECT u.email INTO v_email FROM public.m_users u WHERE u.id = v_user_id;

  RETURN QUERY
  INSERT INTO public.t_dokumen AS d
         (kode, user_id, judul, nama_file, path_file, ukuran_byte, status, tahap, created_by, updated_by)
  VALUES (v_kode, v_user_id, v_judul, left(btrim(p_nama_file), 255),
          v_auth::text || '/' || v_kode || '.pdf', p_ukuran_byte,
          'diproses', 'membaca', v_email, v_email)
  RETURNING d.id, d.kode, d.path_file, d.status, d.tahap;
END;
$$;

-- Simpan topik + status `siap` (BP-04 L-05–06). Service role.
-- Validasi BR-09 atas seluruh himpunan: urutan 1..n, mulai hal. 1, bersambung tanpa celah,
-- berakhir di jumlah_halaman. KEPUTUSAN B4: 1–15 topik (dokumen pendek boleh < 4;
-- > 15 harus sudah digabung oleh aplikasi).
CREATE OR REPLACE FUNCTION public.fn_selesaikan_dokumen(p_dokumen_id int, p_topik jsonb)
RETURNS TABLE (jumlah_topik int, judul varchar)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
#variable_conflict use_column
DECLARE
  v_halaman int;
  v_status  varchar(20);
  v_n       int;
  v_salah   int;
  v_akhir   int;
  v_min     int;
  v_distinct int;
BEGIN
  SELECT d.jumlah_halaman, d.status INTO v_halaman, v_status
    FROM public.t_dokumen d WHERE d.id = p_dokumen_id
     FOR UPDATE;                                       -- cegah balapan dengan hapus dokumen
  IF NOT FOUND OR v_status <> 'diproses' THEN
    RAISE EXCEPTION 'DOKUMEN_TIDAK_DIPROSES' USING ERRCODE = 'P0002';
  END IF;
  IF p_topik IS NULL OR jsonb_typeof(p_topik) <> 'array' THEN
    RAISE EXCEPTION 'TOPIK_TIDAK_VALID' USING ERRCODE = '23514';
  END IF;

  WITH t AS (
    SELECT (x ->> 'urutan')::int AS urutan, btrim(x ->> 'judul') AS judul,
           (x ->> 'halaman_awal')::int AS a, (x ->> 'halaman_akhir')::int AS b
      FROM jsonb_array_elements(p_topik) AS x
  ), s AS (
    SELECT t.*, lag(b) OVER (ORDER BY urutan) AS b_sebelum,
                row_number() OVER (ORDER BY urutan) AS nomor
      FROM t
  )
  SELECT count(*),
         count(*) FILTER (WHERE a IS DISTINCT FROM coalesce(b_sebelum, 0) + 1
                             OR b < a
                             OR urutan IS DISTINCT FROM nomor
                             OR judul IS NULL OR char_length(judul) NOT BETWEEN 1 AND 120),
         max(b), min(urutan), count(DISTINCT urutan)
    INTO v_n, v_salah, v_akhir, v_min, v_distinct
    FROM s;

  IF v_n NOT BETWEEN 1 AND 15 OR v_salah > 0 OR v_distinct <> v_n OR v_min <> 1
     OR v_akhir IS DISTINCT FROM v_halaman THEN
    RAISE EXCEPTION 'TOPIK_TIDAK_VALID' USING ERRCODE = '23514',
          DETAIL = format('n=%s salah=%s akhir=%s halaman=%s', v_n, v_salah, v_akhir, v_halaman);
  END IF;

  INSERT INTO public.t_topik (dokumen_id, urutan, judul, halaman_awal, halaman_akhir)
  SELECT p_dokumen_id, (x ->> 'urutan')::int, btrim(x ->> 'judul'),
         (x ->> 'halaman_awal')::int, (x ->> 'halaman_akhir')::int
    FROM jsonb_array_elements(p_topik) AS x;

  RETURN QUERY
  UPDATE public.t_dokumen d
     SET status = 'siap', tahap = NULL, jumlah_topik = v_n,
         selesai_diproses_at = now(), updated_by = 'system'
   WHERE d.id = p_dokumen_id
  RETURNING d.jumlah_topik, d.judul;                   -- untuk MSG-U08
END;
$$;

-- "Lanjutkan belajar" (BR-34, KEPUTUSAN A2). Sesi pengguna (SECURITY INVOKER → RLS).
-- Dokumen siap dengan aktivitas terakhir terbaru; topik = topik_terakhir_id, jatuh ke
-- topik disarankan BR-35 (belum/lemah terkecil), lalu topik pertama. 0 baris = sembunyikan kartu.
CREATE OR REPLACE FUNCTION public.fn_lanjutkan_belajar()
RETURNS TABLE (dokumen_id int, judul_dokumen varchar, topik_id int, urutan int, judul_topik varchar,
               halaman_awal int, halaman_akhir int, skor_terakhir int, status_topik varchar,
               aktivitas_at timestamptz)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
  WITH dok AS (
    SELECT d.id, d.judul, d.topik_terakhir_id, d.aktivitas_terakhir_at
      FROM public.t_dokumen d
     WHERE d.user_id = public.fn_current_user_id()
       AND d.status = 'siap'
       AND d.aktivitas_terakhir_at IS NOT NULL
     ORDER BY d.aktivitas_terakhir_at DESC, d.id DESC
     LIMIT 1
  ), pilih AS (
    SELECT coalesce(
             (SELECT t.id FROM public.t_topik t, dok WHERE t.id = dok.topik_terakhir_id AND t.dokumen_id = dok.id),
             (SELECT v.topik_id FROM public.v_progres_topik v, dok
               WHERE v.dokumen_id = dok.id AND v.status IN ('belum', 'lemah')
               ORDER BY v.urutan LIMIT 1),
             (SELECT t.id FROM public.t_topik t, dok WHERE t.dokumen_id = dok.id ORDER BY t.urutan LIMIT 1)
           ) AS topik_id
  )
  SELECT dok.id, dok.judul, v.topik_id, v.urutan, v.judul_topik, v.halaman_awal, v.halaman_akhir,
         v.skor_terakhir, v.status, dok.aktivitas_terakhir_at
    FROM dok
    JOIN pilih ON true
    JOIN public.v_progres_topik v ON v.topik_id = pilih.topik_id;
$$;

-- ======================================================= TOPIK (FT-04)

-- Catat aktivitas membuka topik (BR-34, A2). Sesi pengguna.
CREATE OR REPLACE FUNCTION public.fn_catat_buka_topik(p_topik_id int)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER                 -- pengguna tidak punya hak kolom aktivitas/topik_terakhir
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE public.t_dokumen d
     SET aktivitas_terakhir_at = now(),
         topik_terakhir_id     = p_topik_id
    FROM public.t_topik t
   WHERE t.id = p_topik_id
     AND d.id = t.dokumen_id
     AND d.user_id = public.fn_current_user_id()     -- hanya dokumen milik pemanggil
     AND d.status = 'siap';
  -- 0 baris = bukan pemilik / tidak ada → diam saja.
END;
$$;

-- KEPUTUSAN A7: klaim pembuatan ringkasan/soal supaya dua tab tidak memanggil AI dua kali.
-- Service role. true = pemanggil ini yang membuat; false = sudah ada / sedang dibuat
-- (API membalas 202 "sedang disiapkan" lalu browser polling).
-- Sewa 210 detik ≥ batas waktu AI 60 dtk × (1 + 2 coba ulang, BR-32) agar klaim dari proses
-- yang masih hidup tidak direbut; proses yang mati otomatis lepas setelah itu.
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
  ELSE
    RAISE EXCEPTION 'JENIS_TIDAK_VALID' USING ERRCODE = '22023';
  END IF;
  RETURN v_id IS NOT NULL;
END;
$$;

-- Lepas klaim saat AI gagal (MSG-B01) → "Coba lagi" bisa langsung mengklaim ulang.
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
  ELSE
    RAISE EXCEPTION 'JENIS_TIDAK_VALID' USING ERRCODE = '22023';
  END IF;
END;
$$;

-- Simpan ringkasan sekali + rujukan (BR-10). Service role. Tidak pernah menimpa.
CREATE OR REPLACE FUNCTION public.fn_simpan_ringkasan_topik(
  p_topik_id     int,
  p_konsep_inti  text,
  p_poin_penting jsonb,
  p_contoh       text,
  p_rujukan      jsonb
)
RETURNS TABLE (is_baru boolean, ringkasan_dibuat_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
#variable_conflict use_column
DECLARE
  v_dibuat timestamptz;
BEGIN
  SELECT t.ringkasan_dibuat_at INTO v_dibuat
    FROM public.t_topik t WHERE t.id = p_topik_id
     FOR UPDATE;                                   -- tab kedua menunggu di sini
  IF NOT FOUND THEN
    RAISE EXCEPTION 'TOPIK_TIDAK_DITEMUKAN' USING ERRCODE = 'P0002';
  END IF;
  IF v_dibuat IS NOT NULL THEN                     -- BR-10: sudah dibuat → jangan timpa
    RETURN QUERY SELECT false, v_dibuat;
    RETURN;
  END IF;
  IF p_rujukan IS NULL OR jsonb_typeof(p_rujukan) <> 'array' OR jsonb_array_length(p_rujukan) < 1 THEN
    RAISE EXCEPTION 'RUJUKAN_KOSONG' USING ERRCODE = '23514';      -- BR-10: wajib ≥ 1 rujukan
  END IF;

  UPDATE public.t_topik t
     SET konsep_inti = btrim(p_konsep_inti),
         poin_penting = p_poin_penting,            -- ck_topik_poin: array 3–5
         contoh = btrim(p_contoh),
         ringkasan_dibuat_at = now(),
         ringkasan_diklaim_at = NULL
   WHERE t.id = p_topik_id;

  -- trg_t_topik_rujukan_rentang menolak halaman di luar rentang → seluruh transaksi batal.
  INSERT INTO public.t_topik_rujukan (topik_id, chunk_id, halaman, kutipan, urutan)
  SELECT p_topik_id, (x.r ->> 'chunk_id')::int, (x.r ->> 'halaman')::int,
         left(btrim(x.r ->> 'kutipan'), 500), (x.n - 1)::int
    FROM jsonb_array_elements(p_rujukan) WITH ORDINALITY AS x(r, n);

  RETURN QUERY SELECT true, now();
END;
$$;

-- ======================================================= LATIHAN (FT-05)

-- Bank soal dibuat sekali (BR-11). Service role. all-or-nothing untuk 5 soal.
CREATE OR REPLACE FUNCTION public.fn_simpan_soal_topik(p_topik_id int, p_soal jsonb)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  PERFORM pg_advisory_xact_lock(3001, p_topik_id);       -- serialisasi dua tab/permintaan
  IF EXISTS (SELECT 1 FROM public.t_soal WHERE topik_id = p_topik_id) THEN
    RETURN false;                                         -- sudah dibuat permintaan lain
  END IF;
  IF p_soal IS NULL OR jsonb_typeof(p_soal) <> 'array' OR jsonb_array_length(p_soal) <> 5 THEN
    RAISE EXCEPTION 'SOAL_TIDAK_VALID' USING ERRCODE = '23514', DETAIL = 'Harus tepat 5 soal (BR-11).';
  END IF;

  INSERT INTO public.t_soal
    (topik_id, urutan, pertanyaan, pilihan_a, pilihan_b, pilihan_c, pilihan_d, kunci, pembahasan, halaman_rujukan)
  SELECT p_topik_id, x.urutan, btrim(x.pertanyaan),
         btrim(x.pilihan_a), btrim(x.pilihan_b), btrim(x.pilihan_c), btrim(x.pilihan_d),
         upper(btrim(x.kunci)), btrim(x.pembahasan), x.halaman_rujukan
    FROM jsonb_to_recordset(p_soal) AS x(
         urutan int, pertanyaan text, pilihan_a text, pilihan_b text, pilihan_c text,
         pilihan_d text, kunci text, pembahasan text, halaman_rujukan int);
  -- ck_soal_* & trg_t_soal_rentang menolak soal cacat → seluruh 5 soal batal.

  UPDATE public.t_topik SET soal_diklaim_at = NULL WHERE id = p_topik_id;
  RETURN true;
END;
$$;

-- Periksa satu jawaban (BP-06 L-04) → membuka kunci & pembahasan soal itu saja.
-- Sesi pengguna. Tidak menyimpan apa pun (BR-33).
CREATE OR REPLACE FUNCTION public.fn_periksa_jawaban(p_soal_id int, p_dipilih text)
RETURNS TABLE (is_benar boolean, kunci char(1), pembahasan text, halaman_rujukan int)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
#variable_conflict use_column
BEGIN
  IF upper(coalesce(p_dipilih, '')) NOT IN ('A', 'B', 'C', 'D') THEN
    RAISE EXCEPTION 'INPUT_TIDAK_VALID' USING ERRCODE = '22023';
  END IF;
  RETURN QUERY
  SELECT (s.kunci = upper(p_dipilih)), s.kunci, s.pembahasan, s.halaman_rujukan
    FROM public.t_soal s
    JOIN public.t_topik t   ON t.id = s.topik_id
    JOIN public.t_dokumen d ON d.id = t.dokumen_id
   WHERE s.id = p_soal_id
     AND d.user_id = public.fn_current_user_id()            -- BR-06
     AND d.status = 'siap';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'TIDAK_DITEMUKAN' USING ERRCODE = 'P0002';
  END IF;
END;
$$;

-- Simpan percobaan selesai (BR-12, BR-33, BR-34). Sesi pengguna.
-- KEPUTUSAN B8: is_benar & skor dihitung ULANG dari t_soal.kunci, bukan dari klien.
CREATE OR REPLACE FUNCTION public.fn_simpan_latihan(p_topik_id int, p_jawaban jsonb)
RETURNS TABLE (latihan_id int, skor smallint, jumlah_benar smallint, jumlah_soal smallint, status_topik varchar)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
#variable_conflict use_column
DECLARE
  v_user_id    int := public.fn_current_user_id();
  v_email      varchar(255);
  v_judul      varchar(120);
  v_dokumen_id int;
  v_total      int;
  v_dijawab    int;
  v_benar      int;
  v_skor       int;
  v_latihan_id int;
  v_status     varchar(10);
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'BELUM_LOGIN' USING ERRCODE = '28000';
  END IF;

  SELECT t.judul, t.dokumen_id INTO v_judul, v_dokumen_id
    FROM public.t_topik t
    JOIN public.t_dokumen d ON d.id = t.dokumen_id
   WHERE t.id = p_topik_id AND d.user_id = v_user_id AND d.status = 'siap';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'TIDAK_DITEMUKAN' USING ERRCODE = 'P0002';
  END IF;
  IF p_jawaban IS NULL OR jsonb_typeof(p_jawaban) <> 'array' THEN
    RAISE EXCEPTION 'JAWABAN_BELUM_LENGKAP' USING ERRCODE = '23514';
  END IF;

  SELECT count(*) INTO v_total FROM public.t_soal s WHERE s.topik_id = p_topik_id;

  WITH j AS (
    SELECT (x ->> 'soal_id')::int AS soal_id, upper(x ->> 'dipilih') AS dipilih
      FROM jsonb_array_elements(p_jawaban) AS x
  )
  SELECT count(DISTINCT j.soal_id),
         count(DISTINCT j.soal_id) FILTER (WHERE s.kunci = j.dipilih)
    INTO v_dijawab, v_benar
    FROM j
    JOIN public.t_soal s ON s.id = j.soal_id AND s.topik_id = p_topik_id
   WHERE j.dipilih IN ('A', 'B', 'C', 'D');

  -- BR-33: hanya disimpan bila SEMUA soal terjawab, masing-masing tepat sekali (MSG-L07).
  IF v_total = 0 OR v_dijawab <> v_total OR jsonb_array_length(p_jawaban) <> v_total THEN
    RAISE EXCEPTION 'JAWABAN_BELUM_LENGKAP' USING ERRCODE = '23514';
  END IF;

  v_skor := round(v_benar * 100.0 / v_total);                         -- BR-12
  SELECT u.email INTO v_email FROM public.m_users u WHERE u.id = v_user_id;

  INSERT INTO public.t_latihan AS l
         (user_id, topik_id, skor, jumlah_benar, jumlah_soal, snapshot_judul_topik, created_by)
  VALUES (v_user_id, p_topik_id, v_skor, v_benar, v_total, v_judul, v_email)
  RETURNING l.id INTO v_latihan_id;

  INSERT INTO public.t_latihan_jawaban (latihan_id, soal_id, dipilih, is_benar)
  SELECT v_latihan_id, s.id, upper(x ->> 'dipilih'), (s.kunci = upper(x ->> 'dipilih'))
    FROM jsonb_array_elements(p_jawaban) AS x
    JOIN public.t_soal s ON s.id = (x ->> 'soal_id')::int AND s.topik_id = p_topik_id;

  UPDATE public.t_dokumen d
     SET aktivitas_terakhir_at = now(),                               -- BR-34
         topik_terakhir_id = p_topik_id                               -- A2
   WHERE d.id = v_dokumen_id;

  SELECT v.status INTO v_status                                       -- BR-13
    FROM public.v_progres_topik v
   WHERE v.topik_id = p_topik_id AND v.user_id = v_user_id;

  RETURN QUERY SELECT v_latihan_id, v_skor::smallint, v_benar::smallint, v_total::smallint, v_status;
END;
$$;

-- Tinjauan hasil (S-10). Kunci boleh tampil karena soal SUDAH dijawab dalam percobaan
-- milik pemanggil. Sesi pengguna.
CREATE OR REPLACE FUNCTION public.fn_hasil_latihan(p_latihan_id int)
RETURNS TABLE (
  urutan int, soal_id int, pertanyaan text, pilihan_a text, pilihan_b text, pilihan_c text, pilihan_d text,
  dipilih char(1), kunci char(1), is_benar boolean, pembahasan text, halaman_rujukan int,
  skor smallint, jumlah_benar smallint, jumlah_soal smallint, topik_id int,
  snapshot_judul_topik varchar, created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT s.urutan, s.id, s.pertanyaan, s.pilihan_a, s.pilihan_b, s.pilihan_c, s.pilihan_d,
         j.dipilih, s.kunci, j.is_benar, s.pembahasan, s.halaman_rujukan,
         l.skor, l.jumlah_benar, l.jumlah_soal, l.topik_id, l.snapshot_judul_topik, l.created_at
    FROM public.t_latihan l
    JOIN public.t_latihan_jawaban j ON j.latihan_id = l.id
    JOIN public.t_soal s            ON s.id = j.soal_id
   WHERE l.id = p_latihan_id
     AND l.user_id = public.fn_current_user_id()
   ORDER BY s.urutan;
$$;

-- ======================================================= TANYA AI (FT-06)

-- Cari chunk paling mirip DALAM SATU dokumen (BR-16, BR-30).
-- Panggilan: rpc('fn_cari_chunk', { p_dokumen_id, p_embedding: '[...]', p_k: 5 }).
-- Mengembalikan top-N TANPA disaring; kolom `lolos_ambang` menandai skor >= ambang
-- (p_ambang NULL → nilai pengaturan ambang_relevansi). Dengan begitu aplikasi tetap tahu
-- skor tertinggi untuk t_chat.skor_relevansi walau jawabannya "tidak ditemukan" (bahan
-- uji akurasi BR-16). Aplikasi WAJIB hanya mengirim baris lolos_ambang=true ke model.
--
-- Pencarian dibuat EKSAK (CTE MATERIALIZED, tidak memakai HNSW): satu dokumen maks.
-- ± 600 chunk (300 hal.), jadi pindai eksak murah dan selalu menghasilkan N baris.
-- HNSW + filter dokumen_id di pgvector < 0.8 bisa mengembalikan < N baris karena
-- kandidat global disaring belakangan. Index HNSW tetap ada untuk pencarian lintas dokumen.
--
-- Sesi pengguna: hanya dokumen milik sendiri yang siap. Service role: dokumen mana pun.
CREATE OR REPLACE FUNCTION public.fn_cari_chunk(
  p_dokumen_id int,
  p_embedding  extensions.vector(768),     -- dari supabase-js boleh dikirim teks '[0.01,...]'
  p_k          int  DEFAULT 5,
  p_ambang     real DEFAULT NULL
)
RETURNS TABLE (chunk_id int, urutan int, halaman_awal int, halaman_akhir int, judul_bagian varchar,
               isi text, skor real, lolos_ambang boolean)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
#variable_conflict use_column
DECLARE
  v_ambang real := coalesce(p_ambang, public.fn_pengaturan_numeric('ambang_relevansi')::real);
BEGIN
  IF auth.uid() IS NOT NULL AND NOT EXISTS (
       SELECT 1 FROM public.t_dokumen d
        WHERE d.id = p_dokumen_id AND d.status = 'siap'
          AND d.user_id = public.fn_current_user_id()) THEN
    RAISE EXCEPTION 'TIDAK_DITEMUKAN' USING ERRCODE = 'P0002';      -- BR-06: jangan bocorkan
  END IF;

  RETURN QUERY
  WITH kandidat AS MATERIALIZED (
    SELECT c.id, c.urutan, c.halaman_awal, c.halaman_akhir, c.judul_bagian, c.isi,
           (c.embedding <=> p_embedding) AS jarak
      FROM public.t_chunk c
     WHERE c.dokumen_id = p_dokumen_id                       -- BR-16: hanya dokumen ini
  )
  SELECT k.id, k.urutan, k.halaman_awal, k.halaman_akhir, k.judul_bagian, k.isi,
         (1 - k.jarak)::real, ((1 - k.jarak)::real >= v_ambang)
    FROM kandidat k
   ORDER BY k.jarak, k.id
   LIMIT least(greatest(coalesce(p_k, 5), 1), 20);
END;
$$;

-- Simpan pertanyaan, jawaban, rujukan, dan 1 baris log (A1) secara atomik. Service role,
-- dipanggil SETELAH streaming selesai/terputus. KEPUTUSAN B9: jawaban terputus tetap disimpan
-- (p_is_terputus=true) dan tetap dihitung 1 pertanyaan.
CREATE OR REPLACE FUNCTION public.fn_simpan_chat(
  p_user_id            int,
  p_dokumen_id         int,
  p_topik_id           int,
  p_pertanyaan         text,
  p_jawaban            text,
  p_is_tidak_ditemukan boolean,
  p_skor_relevansi     real,
  p_rujukan            jsonb,
  p_log                jsonb,
  p_is_terputus        boolean DEFAULT false,
  p_reservasi_id       bigint  DEFAULT NULL
)
RETURNS TABLE (chat_user_id int, chat_ai_id int)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_chat int;
  v_ai_chat   int;
  v_salah     int;
  v_rujukan   jsonb := coalesce(p_rujukan, '[]'::jsonb);
BEGIN
  -- BR-17: kuota sudah dipesan fn_klaim_kuota_tanya → reservasi "dipakai" (dihapus) di transaksi
  -- yang sama dengan log sukses di bawah. Bila transaksi gagal, penghapusan ikut batal dan
  -- server melepasnya lewat fn_lepas_kuota_tanya. Reservasi kedaluwarsa (sudah dibersihkan)
  -- tidak menggagalkan simpan: jawaban sudah tampil ke mahasiswa dan tetap dihitung.
  IF p_reservasi_id IS NOT NULL THEN
    PERFORM pg_advisory_xact_lock(1002, p_user_id);
    DELETE FROM public.t_reservasi_tanya r WHERE r.id = p_reservasi_id AND r.user_id = p_user_id;
  END IF;

  PERFORM 1 FROM public.t_dokumen d
   WHERE d.id = p_dokumen_id AND d.user_id = p_user_id AND d.status = 'siap';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'DOKUMEN_TIDAK_VALID' USING ERRCODE = 'P0002';
  END IF;
  IF p_topik_id IS NOT NULL AND NOT EXISTS (
       SELECT 1 FROM public.t_topik t WHERE t.id = p_topik_id AND t.dokumen_id = p_dokumen_id) THEN
    RAISE EXCEPTION 'TOPIK_TIDAK_VALID' USING ERRCODE = '23514';
  END IF;
  IF jsonb_typeof(v_rujukan) <> 'array' THEN
    RAISE EXCEPTION 'RUJUKAN_TIDAK_VALID' USING ERRCODE = '23514';
  END IF;

  INSERT INTO public.t_chat (user_id, dokumen_id, topik_id, peran, isi)
  VALUES (p_user_id, p_dokumen_id, p_topik_id, 'user', btrim(p_pertanyaan))   -- ck_chat_isi: BR-18
  RETURNING id INTO v_user_chat;

  -- clock_timestamp(): created_at jawaban > pertanyaan walau satu transaksi.
  INSERT INTO public.t_chat (user_id, dokumen_id, topik_id, peran, isi,
                             is_tidak_ditemukan, is_terputus, skor_relevansi, created_at)
  VALUES (p_user_id, p_dokumen_id, p_topik_id, 'ai', p_jawaban,
          coalesce(p_is_tidak_ditemukan, false), coalesce(p_is_terputus, false),
          p_skor_relevansi, clock_timestamp())
  RETURNING id INTO v_ai_chat;

  -- Rujukan: chunk wajib milik dokumen ini & halaman berada di dalam chunk (BR-30).
  SELECT count(*) INTO v_salah
    FROM jsonb_to_recordset(v_rujukan) AS x(chunk_id int, halaman int, kutipan text)
   WHERE NOT EXISTS (
     SELECT 1 FROM public.t_chunk c
      WHERE c.id = x.chunk_id AND c.dokumen_id = p_dokumen_id
        AND x.halaman BETWEEN c.halaman_awal AND c.halaman_akhir);
  IF v_salah > 0 THEN
    RAISE EXCEPTION 'RUJUKAN_TIDAK_VALID' USING ERRCODE = '23514';
  END IF;
  IF coalesce(p_is_tidak_ditemukan, false) AND jsonb_array_length(v_rujukan) > 0 THEN
    RAISE EXCEPTION 'RUJUKAN_PADA_TIDAK_DITEMUKAN' USING ERRCODE = '23514';
  END IF;

  INSERT INTO public.t_chat_rujukan (chat_id, chunk_id, halaman, kutipan)
  SELECT v_ai_chat, x.chunk_id, x.halaman, left(btrim(x.kutipan), 500)
    FROM jsonb_to_recordset(v_rujukan) AS x(chunk_id int, halaman int, kutipan text);

  -- A1: satu baris per pertanyaan → kuota BR-17 berkurang 1 ("tidak ditemukan" tetap dihitung).
  INSERT INTO public.log_pemakaian_ai
    (user_id, dokumen_id, fitur, model, token_masuk, token_keluar, biaya_rp, durasi_ms, is_sukses)
  VALUES (p_user_id, p_dokumen_id, 'tanya_ai',
          coalesce(nullif(p_log ->> 'model', ''), 'tidak_diketahui'),
          coalesce((p_log ->> 'token_masuk')::int, 0),
          coalesce((p_log ->> 'token_keluar')::int, 0),
          coalesce((p_log ->> 'biaya_rp')::numeric(12,2), 0),
          (p_log ->> 'durasi_ms')::int,
          true);

  RETURN QUERY SELECT v_user_chat, v_ai_chat;
END;
$$;

-- ======================================================= KUOTA (FT-08)

-- Kuota dokumen BR-04. Sesi pengguna (p_user_id boleh dikosongkan) atau service role.
-- sisa bisa 0 walau terpakai > maks bila admin menurunkan kuota (B13: tampil "6 dari 5").
CREATE OR REPLACE FUNCTION public.fn_kuota_dokumen(p_user_id int DEFAULT NULL)
RETURNS TABLE (terpakai int, maks int, sisa int)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER                -- RLS t_dokumen tetap berlaku untuk sesi pengguna
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user int := public.fn_pengguna_sasaran(p_user_id);
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'INPUT_TIDAK_VALID' USING ERRCODE = '22023', DETAIL = 'p_user_id wajib untuk service role.';
  END IF;
  maks := public.fn_pengaturan_int('max_dokumen');            -- dibaca saat ini (BR-28)
  SELECT count(*)::int INTO terpakai
    FROM public.t_dokumen d
   WHERE d.user_id = v_user AND d.status IN ('diproses', 'siap');   -- gagal tidak dihitung
  sisa := greatest(maks - terpakai, 0);
  RETURN NEXT;
END;
$$;

-- Pemakaian tanya AI hari ini (WIB) untuk satu pengguna = log sukses + reservasi yang masih
-- berjalan (BR-17, A1). Reservasi > 3 menit (BATAS_RESERVASI_TANYA) diabaikan: fungsi chat
-- (maxDuration 90 dtk) pasti sudah berhenti. Internal (tanpa GRANT untuk browser).
CREATE OR REPLACE FUNCTION public.fn_hitung_tanya_hari_ini(p_user_id int)
RETURNS int
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT (SELECT count(*)::int
            FROM public.log_pemakaian_ai l
           WHERE l.user_id = p_user_id
             AND l.fitur = 'tanya_ai'
             AND l.is_sukses                -- MSG-C04: AI gagal → kuota tidak berkurang
             -- "Hari ini" menurut WIB: 00.00 WIB = 17.00 UTC hari sebelumnya.
             AND l.created_at >= (((now() AT TIME ZONE 'Asia/Jakarta')::date)::timestamp AT TIME ZONE 'Asia/Jakarta'))
       + (SELECT count(*)::int
            FROM public.t_reservasi_tanya r
           WHERE r.user_id = p_user_id
             AND r.created_at > now() - interval '3 minutes');     -- BATAS_RESERVASI_TANYA
$$;

-- Kuota tanya AI harian BR-17, reset 00.00 WIB. Hanya baris sukses (A1) + pertanyaan yang
-- sedang dijawab (reservasi) yang dihitung. Sesi pengguna (dirinya) atau service role.
-- SECURITY DEFINER karena t_reservasi_tanya tidak terbuka untuk browser; batas "hanya
-- dirinya sendiri" ditegakkan fn_pengguna_sasaran.
CREATE OR REPLACE FUNCTION public.fn_sisa_kuota_tanya(p_user_id int DEFAULT NULL)
RETURNS TABLE (terpakai int, maks int, sisa int, reset_at timestamptz)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user int := public.fn_pengguna_sasaran(p_user_id);
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'INPUT_TIDAK_VALID' USING ERRCODE = '22023', DETAIL = 'p_user_id wajib untuk service role.';
  END IF;
  maks     := public.fn_pengaturan_int('max_pertanyaan_harian');   -- dibaca saat ini (BR-28)
  terpakai := public.fn_hitung_tanya_hari_ini(v_user);
  sisa     := greatest(maks - terpakai, 0);
  reset_at := ((((now() AT TIME ZONE 'Asia/Jakarta')::date) + 1)::timestamp AT TIME ZONE 'Asia/Jakarta');
  RETURN NEXT;
END;
$$;

-- Pesan satu kuota tanya secara atomik SEBELUM AI dipanggil (BR-17). Service role.
-- Kunci advisory per pengguna membuat cek "terpakai < maks" + INSERT reservasi tidak bisa
-- disela permintaan paralel (dua tab / klik ganda). reservasi_id NULL = kuota habis
-- (kolom lain tetap terisi untuk MSG-C02). Reservasi dipakai oleh fn_simpan_chat
-- (p_reservasi_id) atau dilepas fn_lepas_kuota_tanya bila AI gagal (A1).
CREATE OR REPLACE FUNCTION public.fn_klaim_kuota_tanya(p_user_id int)
RETURNS TABLE (reservasi_id bigint, terpakai int, maks int, sisa int, reset_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
#variable_conflict use_column
DECLARE
  v_id bigint;
BEGIN
  IF p_user_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.m_users u WHERE u.id = p_user_id AND u.is_active) THEN
    RAISE EXCEPTION 'INPUT_TIDAK_VALID' USING ERRCODE = '22023';
  END IF;
  PERFORM pg_advisory_xact_lock(1002, p_user_id);

  -- Bersihkan reservasi kedaluwarsa milik pengguna ini (fungsi chat yang mati di tengah jalan).
  DELETE FROM public.t_reservasi_tanya r
   WHERE r.user_id = p_user_id AND r.created_at <= now() - interval '3 minutes';   -- BATAS_RESERVASI_TANYA

  maks     := public.fn_pengaturan_int('max_pertanyaan_harian');   -- BR-28
  terpakai := public.fn_hitung_tanya_hari_ini(p_user_id);
  reset_at := ((((now() AT TIME ZONE 'Asia/Jakarta')::date) + 1)::timestamp AT TIME ZONE 'Asia/Jakarta');
  IF terpakai < maks THEN
    INSERT INTO public.t_reservasi_tanya (user_id) VALUES (p_user_id) RETURNING id INTO v_id;
    terpakai := terpakai + 1;
  END IF;
  reservasi_id := v_id;
  sisa := greatest(maks - terpakai, 0);
  RETURN NEXT;
END;
$$;

-- Lepas reservasi (AI gagal / jawaban tidak tersimpan) → kuota tidak berkurang (A1, MSG-C04).
-- Service role. Idempoten: reservasi yang sudah dipakai/dilepas → false.
CREATE OR REPLACE FUNCTION public.fn_lepas_kuota_tanya(p_reservasi_id bigint)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  WITH x AS (DELETE FROM public.t_reservasi_tanya WHERE id = p_reservasi_id RETURNING 1)
  SELECT EXISTS (SELECT 1 FROM x);
$$;

-- ======================================================= PROFIL (FT-08, FT-01)

-- Ubah nama + audit dalam satu transaksi (BR-22). Satu-satunya jalur ubah m_users.nama.
CREATE OR REPLACE FUNCTION public.fn_ubah_profil(p_nama text, p_ip text DEFAULT NULL)
RETURNS TABLE (id int, nama varchar, email varchar, updated_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
#variable_conflict use_column
DECLARE
  v_user_id   int  := public.fn_current_user_id();
  v_nama_baru text := btrim(regexp_replace(coalesce(p_nama, ''), '\s+', ' ', 'g'));
  v_lama      public.m_users%ROWTYPE;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'BELUM_LOGIN' USING ERRCODE = '28000';
  END IF;
  IF char_length(v_nama_baru) NOT BETWEEN 3 AND 60 THEN
    RAISE EXCEPTION 'NAMA_TIDAK_VALID' USING ERRCODE = '22023', DETAIL = 'Nama harus 3–60 karakter.';
  END IF;

  SELECT * INTO v_lama FROM public.m_users u WHERE u.id = v_user_id AND u.deleted_at IS NULL FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'TIDAK_DITEMUKAN' USING ERRCODE = 'P0002';
  END IF;

  IF v_lama.nama IS DISTINCT FROM v_nama_baru THEN
    UPDATE public.m_users u SET nama = v_nama_baru, updated_by = v_lama.email WHERE u.id = v_user_id;
    INSERT INTO public.log_system (user_id, action, modul, target_id, detail, ip_address)
    VALUES (v_user_id, 'UPDATE', 'users', v_user_id::text,
            jsonb_build_object('kolom', 'nama', 'lama', v_lama.nama, 'baru', v_nama_baru),
            left(p_ip, 50));
  END IF;

  RETURN QUERY SELECT u.id, u.nama, u.email, u.updated_at FROM public.m_users u WHERE u.id = v_user_id;
END;
$$;

-- KEPUTUSAN B2: last_active_at diperbarui saat login & maks. 1× per jam saat memakai
-- aplikasi. Sesi pengguna. true = baris diperbarui. p_paksa=true dipakai saat login
-- supaya "terakhir aktif" selalu tercatat walau belum lewat 1 jam.
CREATE OR REPLACE FUNCTION public.fn_perbarui_aktif(p_paksa boolean DEFAULT false)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_id int;
BEGIN
  UPDATE public.m_users u
     SET last_active_at = now()
   WHERE u.id = public.fn_current_user_id()
     AND (p_paksa OR u.last_active_at IS NULL OR u.last_active_at < now() - interval '1 hour')
  RETURNING u.id INTO v_id;
  RETURN v_id IS NOT NULL;
END;
$$;

-- =====================================================================
-- UJI LOKAL: RLS, RPC, view progres, kuota, BR-24, akun nonaktif, cascade BR-20.
-- Dijalankan oleh tests/jalankan.sh SETELAH shim + semua migrasi + seed.
-- Setiap pemeriksaan memanggil uji.cek()/uji.galat(); gagal = exception = skrip berhenti
-- (psql ON_ERROR_STOP=1). Identitas ditiru dengan SET ROLE + request.jwt.claims,
-- persis seperti PostgREST memanggil Postgres.
-- =====================================================================
\set ON_ERROR_STOP 1
SET client_min_messages = notice;

-- ------------------------------------------------------------ alat bantu uji
DROP SCHEMA IF EXISTS uji CASCADE;
CREATE SCHEMA uji;
GRANT USAGE ON SCHEMA uji TO PUBLIC;

CREATE TABLE uji.var (k text PRIMARY KEY, v text);
GRANT ALL ON uji.var TO PUBLIC;
CREATE TABLE uji.hasil (n serial, pesan text);
GRANT ALL ON uji.hasil TO PUBLIC;
GRANT ALL ON SEQUENCE uji.hasil_n_seq TO PUBLIC;

CREATE FUNCTION uji.atur(p_k text, p_v text) RETURNS text LANGUAGE sql AS $$
  INSERT INTO uji.var VALUES (p_k, p_v) ON CONFLICT (k) DO UPDATE SET v = EXCLUDED.v RETURNING v $$;
CREATE FUNCTION uji.v(p_k text) RETURNS text LANGUAGE sql STABLE AS $$ SELECT v FROM uji.var WHERE k = p_k $$;
CREATE FUNCTION uji.i(p_k text) RETURNS int LANGUAGE sql STABLE AS $$ SELECT v::int FROM uji.var WHERE k = p_k $$;

CREATE FUNCTION uji.cek(p_ok boolean, p_pesan text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF p_ok IS NOT TRUE THEN
    RAISE EXCEPTION 'GAGAL UJI: %', p_pesan;
  END IF;
  INSERT INTO uji.hasil (pesan) VALUES (p_pesan);
  RAISE NOTICE 'LULUS: %', p_pesan;
END $$;

-- Menjalankan SQL dan mengharapkan galat yang pesannya diawali p_harap.
CREATE FUNCTION uji.galat(p_sql text, p_harap text, p_pesan text) RETURNS void LANGUAGE plpgsql AS $$
DECLARE v_pesan text; v_state text;
BEGIN
  BEGIN
    EXECUTE p_sql;
  EXCEPTION WHEN others THEN
    GET STACKED DIAGNOSTICS v_pesan = MESSAGE_TEXT, v_state = RETURNED_SQLSTATE;
    IF v_pesan LIKE p_harap || '%' OR v_state = p_harap THEN
      PERFORM uji.cek(true, p_pesan || ' [' || v_state || ' ' || left(v_pesan, 60) || ']');
      RETURN;
    END IF;
    RAISE EXCEPTION 'GAGAL UJI: % — galat tak terduga: % (%)', p_pesan, v_pesan, v_state;
  END;
  RAISE EXCEPTION 'GAGAL UJI: % — seharusnya galat %', p_pesan, p_harap;
END $$;

-- Meniru JWT: sesi pengguna (sub = auth id) atau service role (tanpa sub).
CREATE FUNCTION uji.sebagai(p_siapa text) RETURNS void LANGUAGE sql AS $$
  SELECT set_config('request.jwt.claims',
           json_build_object('sub', uji.v('auth_' || p_siapa), 'role', 'authenticated')::text, false) $$;
CREATE FUNCTION uji.sebagai_server() RETURNS void LANGUAGE sql AS $$
  SELECT set_config('request.jwt.claims', '{"role":"service_role"}', false) $$;

-- Vektor 768 dimensi: hampir one-hot pada posisi p (embedding uji yang mudah ditebak).
CREATE FUNCTION uji.vek(p int) RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT '[' || string_agg(CASE WHEN i = p THEN '1' ELSE '0.01' END, ',' ORDER BY i) || ']'
    FROM generate_series(1, 768) i $$;

GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA uji TO PUBLIC;

-- ================================================================ 1. AKUN (FT-01)
SELECT uji.atur('auth_a', '11111111-1111-1111-1111-111111111111'),
       uji.atur('auth_b', '22222222-2222-2222-2222-222222222222'),
       uji.atur('auth_c', '33333333-3333-3333-3333-333333333333'),
       uji.atur('auth_d', '44444444-4444-4444-4444-444444444444'),
       uji.atur('auth_e', '55555555-5555-5555-5555-555555555555');

INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES
  (uji.v('auth_a')::uuid, 'Andi@Contoh.id', '{"nama":"  Andi   Pratama "}'),
  (uji.v('auth_b')::uuid, 'budi@contoh.id', '{"nama":"Budi Santoso","role":"admin"}'),   -- role palsu diabaikan
  (uji.v('auth_c')::uuid, 'citra@pahami.id', '{"nama":"Citra Admin"}'),
  (uji.v('auth_d')::uuid, 'dewi@pahami.id', '{"nama":"Dewi Admin"}'),
  (uji.v('auth_e')::uuid, 'ab@contoh.id', '{}');                                           -- tanpa metadata

DO $$ BEGIN
  PERFORM uji.cek((SELECT count(*) FROM m_users) = 5, 'trigger daftar membuat 5 m_users');
  PERFORM uji.cek((SELECT count(*) FROM m_user_role ur JOIN m_role r ON r.id = ur.role_id WHERE r.kode = 'mahasiswa') = 5,
                  'BR-25: semua pendaftar berperan mahasiswa (metadata role diabaikan)');
  PERFORM uji.cek((SELECT email FROM m_users WHERE auth_id = uji.v('auth_a')::uuid) = 'andi@contoh.id', 'email disimpan huruf kecil');
  PERFORM uji.cek((SELECT nama FROM m_users WHERE auth_id = uji.v('auth_a')::uuid) = 'Andi Pratama', 'nama dirapikan spasinya');
  PERFORM uji.cek((SELECT nama FROM m_users WHERE auth_id = uji.v('auth_e')::uuid) = 'Pengguna Pahami', 'nama cadangan bila tanpa metadata');
  PERFORM uji.cek((SELECT count(*) FROM log_system WHERE action = 'CREATE' AND modul = 'auth') = 5, 'log_system CREATE per pendaftar');
END $$;

SELECT uji.galat($$INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES (gen_random_uuid(), 'x@contoh.id', '{"nama":"Xy"}')$$,
                 'NAMA_TIDAK_VALID', 'BR-22: nama < 3 karakter membatalkan pendaftaran');

-- Simpan id aplikasi
SELECT uji.atur('id_' || k, (SELECT id::text FROM m_users WHERE auth_id = uji.v('auth_' || k)::uuid))
  FROM unnest(ARRAY['a','b','c','d','e']) k;

-- Promosi admin (cuplikan seed.sql)
UPDATE m_user_role ur SET role_id = (SELECT id FROM m_role WHERE kode = 'admin')
  FROM m_users u WHERE ur.user_id = u.id AND u.email IN ('citra@pahami.id', 'dewi@pahami.id');

SELECT uji.galat($$INSERT INTO m_user_role (user_id, role_id) SELECT uji.i('id_a'), id FROM m_role WHERE kode = 'admin'$$,
                 '23505', 'B15: satu pengguna hanya satu peran (unique user_id)');

-- ================================================================ 2. UNGGAH (FT-02)
SELECT uji.sebagai('a');
SET ROLE authenticated;
SELECT uji.atur('dok_a1', id::text), uji.atur('path_a1', path_file) FROM fn_buat_dokumen('Pengantar Ekonomi', 'ekonomi.pdf', 1048576);
SELECT uji.atur('dok_a2', id::text) FROM fn_buat_dokumen('Statistika Dasar', 'STAT.PDF', 2048);
DO $$ BEGIN
  PERFORM uji.cek(uji.v('path_a1') ~ ('^' || uji.v('auth_a') || '/DOK-[0-9]{4}-[0-9]{6}\.pdf$'), 'path = {auth.uid()}/{kode}.pdf');
  PERFORM uji.cek((SELECT status || '/' || tahap FROM t_dokumen WHERE id = uji.i('dok_a1')) = 'diproses/membaca', 'dokumen baru diproses/membaca');
  PERFORM uji.cek((SELECT terpakai FROM fn_kuota_dokumen()) = 2, 'kuota dokumen terpakai 2 (diproses dihitung)');
END $$;
SELECT uji.galat($$SELECT * FROM fn_buat_dokumen('ab', 'x.pdf', 10)$$, 'JUDUL_TIDAK_VALID', 'BR-21 judul < 3');
SELECT uji.galat($$SELECT * FROM fn_buat_dokumen('Judul Baik', 'x.docx', 10)$$, 'BUKAN_PDF', 'BR-01 bukan .pdf');
SELECT uji.galat($$SELECT * FROM fn_buat_dokumen('Judul Baik', 'x.pdf', 21 * 1024 * 1024)$$, 'FILE_TERLALU_BESAR', 'BR-02 > 20 MB');
SELECT uji.galat($$INSERT INTO t_dokumen (kode, user_id, judul, nama_file, path_file, ukuran_byte) VALUES ('DOK-2026-999999', 1, 'abc', 'a.pdf', 'x', 1)$$,
                 '42501', 'INSERT t_dokumen langsung ditolak (wajib lewat RPC)');
RESET ROLE;

-- BR-04: kuota penuh (kuota diturunkan sementara ke 2)
UPDATE m_pengaturan_sistem SET nilai = '2' WHERE kode = 'max_dokumen';
SELECT uji.sebagai('a');
SET ROLE authenticated;
SELECT uji.galat($$SELECT * FROM fn_buat_dokumen('Dokumen Ketiga', 'c.pdf', 10)$$, 'KUOTA_PENUH', 'BR-04 kuota penuh (SQLSTATE PT429)');
RESET ROLE;
UPDATE m_pengaturan_sistem SET nilai = '5' WHERE kode = 'max_dokumen';

SELECT uji.sebagai('b');
SET ROLE authenticated;
SELECT uji.atur('dok_b1', id::text) FROM fn_buat_dokumen('Catatan Budi', 'budi.pdf', 5000);
RESET ROLE;

SELECT uji.sebagai('c');
SET ROLE authenticated;
SELECT uji.galat($$SELECT * FROM fn_buat_dokumen('Admin Unggah', 'a.pdf', 10)$$, 'TIDAK_BERHAK', 'admin tidak boleh mengunggah (§3.2)');
RESET ROLE;

-- Storage: hanya path yang sudah dipesan
SELECT uji.sebagai('a');
SET ROLE authenticated;
INSERT INTO storage.objects (bucket_id, name, owner, metadata)
VALUES ('dokumen', uji.v('path_a1'), uji.v('auth_a')::uuid, '{"size":1048576,"mimetype":"application/pdf"}');
SELECT uji.galat($$INSERT INTO storage.objects (bucket_id, name, owner) VALUES ('dokumen', uji.v('auth_a') || '/liar.pdf', uji.v('auth_a')::uuid)$$,
                 'new row violates row-level security', 'storage: unggah ke path tak dipesan ditolak');
SELECT uji.galat($$INSERT INTO storage.objects (bucket_id, name, owner) VALUES ('dokumen', uji.v('auth_b') || '/DOK-2026-000003.pdf', uji.v('auth_a')::uuid)$$,
                 'new row violates row-level security', 'storage: unggah ke folder orang lain ditolak');
DO $$ BEGIN
  PERFORM uji.cek((SELECT count(*) FROM storage.objects WHERE bucket_id = 'dokumen') = 1, 'storage: pemilik melihat file sendiri');
END $$;
SELECT uji.sebagai('b');
DO $$ BEGIN
  PERFORM uji.cek((SELECT count(*) FROM storage.objects WHERE bucket_id = 'dokumen') = 0, 'storage: B tidak melihat file A');
END $$;
RESET ROLE;

-- ================================================================ 3. PIPELINE (service role)
SELECT uji.sebagai_server();
SET ROLE service_role;
UPDATE t_dokumen SET tahap = 'mengekstrak', jumlah_halaman = 20 WHERE id = uji.i('dok_a1');
SELECT uji.galat($$UPDATE t_dokumen SET tahap = 'membaca' WHERE id = uji.i('dok_a1')$$, 'TAHAP_MUNDUR', 'tahap tidak boleh mundur');
UPDATE t_dokumen SET tahap = 'mengindeks' WHERE id = uji.i('dok_a1');
INSERT INTO t_chunk (dokumen_id, urutan, halaman_awal, halaman_akhir, judul_bagian, isi, jumlah_token, embedding)
SELECT uji.i('dok_a1'), g, (g - 1) * 5 + 1, g * 5, 'Bab ' || g, 'Isi bab ' || g, 100, uji.vek(g)::extensions.vector
  FROM generate_series(1, 4) g;
SELECT uji.galat($$UPDATE t_dokumen SET status = 'siap', tahap = NULL, jumlah_topik = 4, selesai_diproses_at = now() WHERE id = uji.i('dok_a1')$$,
                 'BELUM_TAHAP_AKHIR', 'siap hanya dari tahap menyusun_topik');
UPDATE t_dokumen SET tahap = 'menyusun_topik' WHERE id = uji.i('dok_a1');
SELECT uji.galat($$SELECT * FROM fn_selesaikan_dokumen(uji.i('dok_a1'), '[{"urutan":1,"judul":"A","halaman_awal":1,"halaman_akhir":5},{"urutan":2,"judul":"B","halaman_awal":7,"halaman_akhir":20}]')$$,
                 'TOPIK_TIDAK_VALID', 'BR-09 topik bercelah ditolak');
SELECT uji.galat($$SELECT * FROM fn_selesaikan_dokumen(uji.i('dok_a1'), '[{"urutan":1,"judul":"A","halaman_awal":1,"halaman_akhir":18}]')$$,
                 'TOPIK_TIDAK_VALID', 'BR-09 topik harus mencakup seluruh halaman');
SELECT * FROM fn_selesaikan_dokumen(uji.i('dok_a1'),
  '[{"urutan":1,"judul":"Konsep Dasar","halaman_awal":1,"halaman_akhir":5},
    {"urutan":2,"judul":"Permintaan","halaman_awal":6,"halaman_akhir":10},
    {"urutan":3,"judul":"Penawaran","halaman_awal":11,"halaman_akhir":15},
    {"urutan":4,"judul":"Pasar","halaman_awal":16,"halaman_akhir":20}]');
SELECT uji.atur('topik_a' || urutan, id::text) FROM t_topik WHERE dokumen_id = uji.i('dok_a1');
SELECT uji.atur('chunk_a1', id::text) FROM t_chunk WHERE dokumen_id = uji.i('dok_a1') AND urutan = 1;
SELECT uji.atur('chunk_a4', id::text) FROM t_chunk WHERE dokumen_id = uji.i('dok_a1') AND urutan = 4;
SELECT uji.galat($$UPDATE t_dokumen SET status = 'gagal', pesan_gagal = 'x' WHERE id = uji.i('dok_a1')$$,
                 'TRANSISI_STATUS_TIDAK_SAH', 'siap adalah status akhir');

-- dokumen A2 gagal (BR-05), data parsial dihapus. Chunk lewat fn_simpan_chunk (temuan #7).
DO $$ BEGIN
  PERFORM uji.cek(fn_simpan_chunk(uji.i('dok_a2'), json_build_array(json_build_object(
                    'urutan', 1, 'halaman_awal', 1, 'halaman_akhir', 1, 'judul_bagian', NULL, 'isi', 'parsial',
                    'jumlah_token', 3, 'embedding', uji.vek(9)))::jsonb),
                  'fn_simpan_chunk menyimpan batch untuk dokumen diproses');
  PERFORM uji.cek((SELECT count(*) FROM t_chunk WHERE dokumen_id = uji.i('dok_a2')) = 1, 'chunk A2 tersimpan');
END $$;
SELECT uji.galat($$SELECT fn_simpan_chunk(uji.i('dok_a2'), '{}')$$, 'INPUT_TIDAK_VALID', 'fn_simpan_chunk menolak p_chunk bukan array');
SELECT fn_gagalkan_dokumen(uji.i('dok_a2'), 'PDF ini berupa hasil scan (gambar) sehingga teksnya tidak dapat dibaca. Unggah PDF berbasis teks.');
DO $$ BEGIN
  PERFORM uji.cek(NOT fn_simpan_chunk(uji.i('dok_a2'), json_build_array(json_build_object(
                    'urutan', 2, 'halaman_awal', 1, 'halaman_akhir', 1, 'isi', 'yatim', 'embedding', uji.vek(9)))::jsonb)
              AND (SELECT count(*) FROM t_chunk WHERE dokumen_id = uji.i('dok_a2')) = 0,
                  'fn_simpan_chunk: dokumen sudah gagal (A8) → false, tidak ada chunk yatim');
END $$;

-- BR-02: ukuran NYATA file Storage (temuan #2). A1 = 1 MB (diunggah di bagian 2).
INSERT INTO storage.objects (bucket_id, name, owner, metadata)
VALUES ('dokumen', (SELECT path_file FROM t_dokumen WHERE id = uji.i('dok_b1')), uji.v('auth_b')::uuid, '{"size":26214400}'),
       ('dokumen', (SELECT path_file FROM t_dokumen WHERE id = uji.i('dok_a2')), uji.v('auth_a')::uuid, '{"size":4096}');
DO $$ DECLARE r record; BEGIN
  SELECT * INTO r FROM fn_periksa_file_dokumen(uji.i('dok_a1'));
  PERFORM uji.cek(r.ada AND r.ukuran_byte = 1048576 AND r.maks_byte = 20 * 1024 * 1024 AND NOT r.is_terlalu_besar,
                  'fn_periksa_file_dokumen: file 1 MB ada & dalam batas');
  SELECT * INTO r FROM fn_periksa_file_dokumen(uji.i('dok_b1'));
  PERFORM uji.cek(r.ada AND r.ukuran_byte = 26214400 AND r.is_terlalu_besar, 'BR-02: file nyata 25 MB > batas 20 MB terdeteksi');
  PERFORM uji.cek((SELECT ukuran_byte FROM t_dokumen WHERE id = uji.i('dok_b1')) = 5000, 'ukuran terlalu besar tidak disalin ke t_dokumen');
  SELECT * INTO r FROM fn_periksa_file_dokumen(uji.i('dok_a2'));
  PERFORM uji.cek(r.ada AND NOT r.is_terlalu_besar AND (SELECT ukuran_byte FROM t_dokumen WHERE id = uji.i('dok_a2')) = 4096,
                  'ukuran_byte diselaraskan dengan ukuran nyata');
END $$;
DELETE FROM storage.objects WHERE name = (SELECT path_file FROM t_dokumen WHERE id = uji.i('dok_b1'));
DO $$ DECLARE r record; BEGIN
  SELECT * INTO r FROM fn_periksa_file_dokumen(uji.i('dok_b1'));
  PERFORM uji.cek(NOT r.ada AND r.ukuran_byte IS NULL AND NOT r.is_terlalu_besar, 'fn_periksa_file_dokumen: file belum diunggah → ada=false');
END $$;

-- dokumen B1: pendek, 2 topik (KEPUTUSAN B4)
UPDATE t_dokumen SET tahap = 'menyusun_topik', jumlah_halaman = 10 WHERE id = uji.i('dok_b1');
INSERT INTO t_chunk (dokumen_id, urutan, halaman_awal, halaman_akhir, isi, embedding)
VALUES (uji.i('dok_b1'), 1, 1, 10, 'Isi Budi', uji.vek(1)::extensions.vector);
SELECT * FROM fn_selesaikan_dokumen(uji.i('dok_b1'),
  '[{"urutan":1,"judul":"Satu","halaman_awal":1,"halaman_akhir":4},{"urutan":2,"judul":"Dua","halaman_awal":5,"halaman_akhir":10}]');
SELECT uji.atur('topik_b1', id::text) FROM t_topik WHERE dokumen_id = uji.i('dok_b1') AND urutan = 1;

DO $$ BEGIN
  PERFORM uji.cek((SELECT status FROM t_dokumen WHERE id = uji.i('dok_a1')) = 'siap', 'A1 siap dengan 4 topik');
  PERFORM uji.cek((SELECT status FROM t_dokumen WHERE id = uji.i('dok_a2')) = 'gagal'
              AND (SELECT count(*) FROM t_chunk WHERE dokumen_id = uji.i('dok_a2')) = 0, 'NF-04: dokumen gagal tanpa chunk parsial');
  PERFORM uji.cek((SELECT jumlah_topik FROM t_dokumen WHERE id = uji.i('dok_b1')) = 2, 'B4: dokumen pendek boleh 2 topik');
END $$;

-- Klaim & ringkasan (A7, BR-10)
DO $$ BEGIN
  PERFORM uji.cek(fn_klaim_topik(uji.i('topik_a1'), 'ringkasan'), 'A7: klaim ringkasan pertama berhasil');
  PERFORM uji.cek(NOT fn_klaim_topik(uji.i('topik_a1'), 'ringkasan'), 'A7: klaim kedua (tab lain) ditolak');
END $$;
SELECT uji.galat($$SELECT * FROM fn_simpan_ringkasan_topik(uji.i('topik_a1'), 'Konsep', '["a","b","c"]', 'Contoh', '[{"halaman":9,"kutipan":"luar"}]')$$,
                 'RUJUKAN_DI_LUAR_RENTANG', 'BR-10 rujukan di luar rentang topik ditolak');
SELECT uji.galat($$SELECT * FROM fn_simpan_ringkasan_topik(uji.i('topik_a1'), 'Konsep', '["a","b"]', 'Contoh', '[{"halaman":2,"kutipan":"x"}]')$$,
                 '23514', 'poin penting harus 3–5');
SELECT * FROM fn_simpan_ringkasan_topik(uji.i('topik_a1'), 'Kelangkaan adalah inti ekonomi', '["Kelangkaan","Pilihan","Biaya peluang"]',
                                        'Memilih kuliah atau bekerja', json_build_array(json_build_object('halaman', 2, 'kutipan', 'Ekonomi mempelajari kelangkaan', 'chunk_id', uji.i('chunk_a1')))::jsonb);
DO $$ BEGIN
  PERFORM uji.cek(NOT (SELECT is_baru FROM fn_simpan_ringkasan_topik(uji.i('topik_a1'), 'Lain', '["x","y","z"]', 'Lain', '[{"halaman":3,"kutipan":"x"}]')),
                  'BR-10: ringkasan tidak ditimpa');
  PERFORM uji.cek(NOT fn_klaim_topik(uji.i('topik_a1'), 'ringkasan'), 'A7: tidak bisa klaim bila ringkasan sudah ada');
END $$;

-- Soal (BR-11): kunci A,B,C,D,A
DO $$ BEGIN
  PERFORM uji.cek(fn_klaim_topik(uji.i('topik_a1'), 'soal'), 'A7: klaim soal berhasil');
END $$;
SELECT uji.galat($$SELECT fn_simpan_soal_topik(uji.i('topik_a1'), '[{"urutan":1}]')$$, 'SOAL_TIDAK_VALID', 'BR-11 harus 5 soal');
SELECT fn_simpan_soal_topik(uji.i('topik_a1'), (
  SELECT jsonb_agg(jsonb_build_object('urutan', g, 'pertanyaan', 'Soal ' || g, 'pilihan_a', 'a' || g, 'pilihan_b', 'b' || g,
                   'pilihan_c', 'c' || g, 'pilihan_d', 'd' || g, 'kunci', (ARRAY['A','B','C','D','A'])[g],
                   'pembahasan', 'Karena ' || g, 'halaman_rujukan', g))
    FROM generate_series(1, 5) g));
DO $$ BEGIN
  PERFORM uji.cek(NOT fn_simpan_soal_topik(uji.i('topik_a1'), '[]'), 'BR-11: bank soal dibuat sekali');
END $$;
SELECT uji.atur('soal_a' || urutan, id::text) FROM t_soal WHERE topik_id = uji.i('topik_a1');

-- Chat A (2 pertanyaan sukses + 1 gagal) & kuota tanya
SELECT * FROM fn_simpan_chat(uji.i('id_a'), uji.i('dok_a1'), uji.i('topik_a1'), 'Apa itu kelangkaan?', 'Kelangkaan adalah ...', false, 0.91,
  json_build_array(json_build_object('chunk_id', uji.i('chunk_a1'), 'halaman', 3, 'kutipan', 'kelangkaan'))::jsonb,
  '{"model":"google/gemini-2.5-flash","token_masuk":1200,"token_keluar":300,"biaya_rp":2.5,"durasi_ms":1500}');
SELECT * FROM fn_simpan_chat(uji.i('id_a'), uji.i('dok_a1'), NULL, 'Siapa presiden pertama?', 'Maaf, tidak ditemukan di dokumen.', true, 0.41,
  '[]', '{"model":"google/gemini-2.5-flash","token_masuk":10,"token_keluar":0,"biaya_rp":0.01}', false);
INSERT INTO log_pemakaian_ai (user_id, dokumen_id, fitur, model, is_sukses) VALUES (uji.i('id_a'), uji.i('dok_a1'), 'tanya_ai', 'm', false);
-- pertanyaan kemarin (WIB) tidak dihitung
INSERT INTO log_pemakaian_ai (user_id, dokumen_id, fitur, model, created_at)
VALUES (uji.i('id_a'), uji.i('dok_a1'), 'tanya_ai', 'm', ((now() AT TIME ZONE 'Asia/Jakarta')::date::timestamp AT TIME ZONE 'Asia/Jakarta') - interval '1 minute');
SELECT uji.galat($$SELECT * FROM fn_simpan_chat(uji.i('id_a'), uji.i('dok_a1'), NULL, 'Pertanyaan sah', 'Jawab', false, 0.9,
                    json_build_array(json_build_object('chunk_id', (SELECT id FROM t_chunk WHERE dokumen_id = uji.i('dok_b1')), 'halaman', 1, 'kutipan', 'x'))::jsonb, '{}')$$,
                 'RUJUKAN_TIDAK_VALID', 'BR-30 rujukan chunk dokumen lain ditolak');
SELECT uji.galat($$SELECT * FROM fn_simpan_chat(uji.i('id_a'), uji.i('dok_a1'), NULL, 'hi', 'Jawab', false, 0.9, '[]', '{}')$$,
                 '23514', 'BR-18 pertanyaan < 3 karakter ditolak');
SELECT uji.galat($$SELECT * FROM fn_simpan_chat(uji.i('id_b'), uji.i('dok_a1'), NULL, 'Pertanyaan sah', 'Jawab', false, 0.9, '[]', '{}')$$,
                 'DOKUMEN_TIDAK_VALID', 'chat ke dokumen orang lain ditolak');
SELECT uji.galat($$UPDATE log_system SET action = 'LOGIN'$$, '42501', 'log_system tidak bisa diubah service role');
SELECT uji.galat($$UPDATE log_pemakaian_ai SET biaya_rp = 0$$, 'LOG_HANYA_INSERT', 'log_pemakaian_ai hanya INSERT');
DO $$ BEGIN
  PERFORM uji.cek((SELECT count(*) FROM fn_cari_chunk(uji.i('dok_a1'), uji.vek(4)::extensions.vector, 5)) = 4,
                  'fn_cari_chunk service role: semua chunk dokumen (4 < 5)');
  PERFORM uji.cek((SELECT terpakai FROM fn_sisa_kuota_tanya(uji.i('id_a'))) = 2, 'service role membaca kuota tanya A');
END $$;
SELECT uji.galat($$SELECT * FROM fn_kuota_dokumen()$$, 'INPUT_TIDAK_VALID', 'service role wajib memberi p_user_id');
RESET ROLE;

-- ================================================================ 4. ISOLASI RLS (BR-06)
SELECT uji.sebagai('b');
SET ROLE authenticated;
DO $$ BEGIN
  PERFORM uji.cek((SELECT count(*) FROM t_dokumen) = 1, 'B hanya melihat 1 dokumen miliknya');
  PERFORM uji.cek((SELECT count(*) FROM t_dokumen WHERE id = uji.i('dok_a1')) = 0, 'B tidak melihat t_dokumen A');
  PERFORM uji.cek((SELECT count(*) FROM t_topik WHERE dokumen_id = uji.i('dok_a1')) = 0, 'B tidak melihat t_topik A');
  PERFORM uji.cek((SELECT count(*) FROM t_topik_rujukan) = 0, 'B tidak melihat rujukan A');
  PERFORM uji.cek((SELECT count(*) FROM t_soal) = 0, 'B tidak melihat soal A');
  PERFORM uji.cek((SELECT count(*) FROM t_chat) = 0, 'B tidak melihat t_chat A');
  PERFORM uji.cek((SELECT count(*) FROM t_chat_rujukan) = 0, 'B tidak melihat rujukan chat A');
  PERFORM uji.cek((SELECT count(*) FROM log_pemakaian_ai) = 0, 'B tidak melihat log pemakaian A');
  PERFORM uji.cek((SELECT count(*) FROM log_system) = 0, 'mahasiswa tidak membaca log_system');
  PERFORM uji.cek((SELECT count(*) FROM v_progres_topik WHERE dokumen_id = uji.i('dok_a1')) = 0, 'B tidak melihat progres A (view security_invoker)');
  PERFORM uji.cek((SELECT count(*) FROM m_users) = 1, 'B hanya melihat akunnya sendiri');
  PERFORM uji.cek((SELECT status FROM v_progres_topik WHERE topik_id = uji.i('topik_b1')) = 'belum', 'BR-13: belum pernah latihan → belum');
END $$;
SELECT uji.galat($$SELECT count(*) FROM t_chunk$$, '42501', 't_chunk tertutup bagi browser');
SELECT uji.galat($$SELECT * FROM fn_periksa_jawaban(uji.i('soal_a1'), 'A')$$, 'TIDAK_DITEMUKAN', 'B tidak bisa memeriksa soal A');
SELECT uji.galat($$SELECT * FROM fn_cari_chunk(uji.i('dok_a1'), uji.vek(1)::extensions.vector)$$, 'TIDAK_DITEMUKAN', 'B tidak bisa mencari chunk dokumen A');
SELECT uji.galat($$SELECT * FROM fn_kuota_dokumen(uji.i('id_a'))$$, 'TIDAK_BERHAK', 'B tidak bisa melihat kuota A');
SELECT uji.galat($$SELECT * FROM fn_simpan_latihan(uji.i('topik_a1'), '[]')$$, 'TIDAK_DITEMUKAN', 'B tidak bisa menyimpan latihan di topik A');
DO $$ DECLARE n int; BEGIN
  UPDATE t_dokumen SET judul = 'Dibajak' WHERE id = uji.i('dok_a1');
  GET DIAGNOSTICS n = ROW_COUNT;
  PERFORM uji.cek(n = 0, 'B tidak bisa mengganti judul dokumen A');
END $$;
SELECT uji.galat($$SELECT * FROM fn_hapus_dokumen(uji.i('dok_a1'))$$, 'TIDAK_DITEMUKAN', 'B tidak bisa menghapus dokumen A (fn_hapus_dokumen)');
SELECT uji.galat($$DELETE FROM t_dokumen WHERE id = uji.i('dok_a1')$$, '42501', 'DELETE t_dokumen langsung lewat REST dicabut (temuan #6)');
SELECT uji.galat($$SELECT * FROM fn_periksa_file_dokumen(uji.i('dok_a1'))$$, '42501', 'fn_periksa_file_dokumen hanya service role');
SELECT uji.galat($$SELECT fn_simpan_chunk(uji.i('dok_a1'), '[]')$$, '42501', 'fn_simpan_chunk hanya service role');
SELECT uji.galat($$SELECT * FROM fn_klaim_kuota_tanya(uji.i('id_b'))$$, '42501', 'fn_klaim_kuota_tanya hanya service role');
SELECT uji.galat($$SELECT fn_lepas_kuota_tanya(1)$$, '42501', 'fn_lepas_kuota_tanya hanya service role');
SELECT uji.galat($$SELECT count(*) FROM t_reservasi_tanya$$, '42501', 't_reservasi_tanya tertutup bagi browser');
SELECT fn_catat_buka_topik(uji.i('topik_a1'));   -- diam saja, tidak mengubah dokumen A
RESET ROLE;
DO $$ BEGIN
  PERFORM uji.cek((SELECT aktivitas_terakhir_at FROM t_dokumen WHERE id = uji.i('dok_a1')) IS NULL, 'catat buka topik orang lain tidak berefek');
END $$;

SELECT uji.sebagai('a');
SET ROLE authenticated;
DO $$ DECLARE n int; BEGIN
  PERFORM uji.cek((SELECT count(*) FROM t_soal WHERE topik_id = uji.i('topik_a1')) = 5, 'A membaca 5 soal (tanpa kunci)');
  UPDATE t_dokumen SET judul = 'Pengantar Ilmu Ekonomi' WHERE id = uji.i('dok_a1');
  GET DIAGNOSTICS n = ROW_COUNT;
  PERFORM uji.cek(n = 1, 'BP-09: pemilik mengganti judul dokumen siap');
  UPDATE t_dokumen SET judul = 'Coba Ganti' WHERE id = uji.i('dok_a2');
  GET DIAGNOSTICS n = ROW_COUNT;
  PERFORM uji.cek(n = 0, 'BR-07: dokumen gagal tidak bisa diganti judul');
  PERFORM uji.cek((SELECT count(*) FROM t_chat WHERE dokumen_id = uji.i('dok_a1')) = 4, 'A melihat riwayat chatnya (2 tanya + 2 jawab)');
END $$;
SELECT uji.galat($$SELECT kunci FROM t_soal$$, '42501', 'kolom kunci tidak bisa dibaca sebelum dijawab');
SELECT uji.galat($$UPDATE t_dokumen SET status = 'siap' WHERE id = uji.i('dok_a2')$$, '42501', 'kolom status tidak bisa diubah pengguna');
SELECT uji.galat($$UPDATE m_users SET nama = 'Nama Baru'$$, '42501', 'UPDATE m_users langsung ditolak (lewat RPC)');
SELECT uji.galat($$INSERT INTO t_latihan (user_id, topik_id, skor, jumlah_benar, jumlah_soal, snapshot_judul_topik) VALUES (uji.i('id_a'), uji.i('topik_a1'), 100, 5, 5, 'x')$$,
                 '42501', 'skor tidak bisa disisipkan langsung (B8)');
SELECT uji.galat($$INSERT INTO t_chat (user_id, dokumen_id, peran, isi) VALUES (uji.i('id_a'), uji.i('dok_a1'), 'ai', 'palsu')$$,
                 '42501', 'jawaban AI palsu tidak bisa disisipkan');
SELECT uji.galat($$SELECT fn_simpan_chat(uji.i('id_a'), uji.i('dok_a1'), NULL, 'abc', 'x', false, 0.9, '[]', '{}')$$,
                 '42501', 'fn_simpan_chat hanya service role');
DO $$ BEGIN
  PERFORM uji.cek((SELECT count(*) FROM fn_cari_chunk(uji.i('dok_a1'), uji.vek(2)::extensions.vector, 3)) = 3, 'fn_cari_chunk mengembalikan top-3');
  PERFORM uji.cek((SELECT urutan FROM fn_cari_chunk(uji.i('dok_a1'), uji.vek(2)::extensions.vector, 3) LIMIT 1) = 2
              AND (SELECT skor FROM fn_cari_chunk(uji.i('dok_a1'), uji.vek(2)::extensions.vector, 3) LIMIT 1) > 0.99,
                  'chunk paling mirip di urutan pertama (skor = 1 - jarak cosine)');
  PERFORM uji.cek((SELECT count(*) FILTER (WHERE lolos_ambang) FROM fn_cari_chunk(uji.i('dok_a1'), uji.vek(2)::extensions.vector, 3)) = 1,
                  'lolos_ambang hanya untuk skor ≥ ambang pengaturan (0,50)');
  PERFORM uji.cek((SELECT count(*) FILTER (WHERE lolos_ambang) FROM fn_cari_chunk(uji.i('dok_a1'), uji.vek(2)::extensions.vector, 3, 0.0)) = 3,
                  'p_ambang eksplisit dipakai');
  PERFORM uji.cek((SELECT count(*) FROM fn_cari_chunk(p_dokumen_id => uji.i('dok_a1'), p_embedding => uji.vek(1)::text::extensions.vector, p_k => 2)) = 2,
                  'parameter bernama p_dokumen_id/p_embedding/p_k (bentuk rpc AI lib)');
END $$;

-- ================================================================ 5. LATIHAN (FT-05) & PROGRES (FT-07)
SELECT uji.galat($$SELECT * FROM fn_simpan_latihan(uji.i('topik_a1'), json_build_array(json_build_object('soal_id', uji.i('soal_a1'), 'dipilih', 'A'))::jsonb)$$,
                 'JAWABAN_BELUM_LENGKAP', 'BR-33: latihan tidak lengkap tidak disimpan');
SELECT uji.galat($$SELECT * FROM fn_simpan_latihan(uji.i('topik_a1'), (SELECT jsonb_agg(jsonb_build_object('soal_id', uji.i('soal_a1'), 'dipilih', 'A')) FROM generate_series(1,5)))$$,
                 'JAWABAN_BELUM_LENGKAP', 'BR-33: soal yang sama dijawab berulang ditolak');
DO $$
DECLARE r record;
BEGIN
  -- 4 benar (soal 5 dijawab B padahal kunci A); is_benar dari klien diabaikan (B8).
  SELECT * INTO r FROM fn_simpan_latihan(uji.i('topik_a1'), json_build_array(
      json_build_object('soal_id', uji.i('soal_a1'), 'dipilih', 'a', 'is_benar', false),
      json_build_object('soal_id', uji.i('soal_a2'), 'dipilih', 'B'),
      json_build_object('soal_id', uji.i('soal_a3'), 'dipilih', 'C'),
      json_build_object('soal_id', uji.i('soal_a4'), 'dipilih', 'D'),
      json_build_object('soal_id', uji.i('soal_a5'), 'dipilih', 'B', 'is_benar', true))::jsonb);
  PERFORM uji.cek(r.skor = 80 AND r.jumlah_benar = 4 AND r.jumlah_soal = 5, 'BR-12: skor 4/5 = 80 dihitung server');
  PERFORM uji.cek(r.status_topik = 'selesai', 'BR-13: skor 80 → selesai');
  PERFORM uji.atur('latihan_1', r.latihan_id::text);
  PERFORM uji.cek((SELECT count(*) FROM fn_hasil_latihan(r.latihan_id) WHERE kunci IS NOT NULL) = 5, 'fn_hasil_latihan membuka kunci setelah dijawab');
  PERFORM uji.cek((SELECT is_benar FROM fn_periksa_jawaban(uji.i('soal_a2'), 'b')), 'fn_periksa_jawaban benar');

  -- percobaan 2: 3/5 = 60 → tetap selesai (pernah ≥70 & terakhir ≥60)
  SELECT * INTO r FROM fn_simpan_latihan(uji.i('topik_a1'), json_build_array(
      json_build_object('soal_id', uji.i('soal_a1'), 'dipilih', 'A'),
      json_build_object('soal_id', uji.i('soal_a2'), 'dipilih', 'B'),
      json_build_object('soal_id', uji.i('soal_a3'), 'dipilih', 'C'),
      json_build_object('soal_id', uji.i('soal_a4'), 'dipilih', 'A'),
      json_build_object('soal_id', uji.i('soal_a5'), 'dipilih', 'B'))::jsonb);
  PERFORM uji.cek(r.skor = 60 AND r.status_topik = 'selesai', 'BR-13: 80 lalu 60 → selesai');
END $$;
RESET ROLE;

-- Riwayat dengan skor non-kelipatan 20 (20 soal) langsung ke tabel, untuk kasus BR-13.
INSERT INTO t_latihan (user_id, topik_id, skor, jumlah_benar, jumlah_soal, snapshot_judul_topik, created_at) VALUES
  (uji.i('id_a'), uji.i('topik_a2'), 80, 16, 20, 'Permintaan', now() - interval '2 hours'),
  (uji.i('id_a'), uji.i('topik_a2'), 65, 13, 20, 'Permintaan', now() - interval '1 hour'),
  (uji.i('id_a'), uji.i('topik_a3'), 65, 13, 20, 'Penawaran',  now() - interval '1 hour'),
  (uji.i('id_a'), uji.i('topik_a4'), 80, 16, 20, 'Pasar',      now() - interval '2 hours'),
  (uji.i('id_a'), uji.i('topik_a4'), 50, 10, 20, 'Pasar',      now() - interval '1 hour');
SELECT uji.galat($$INSERT INTO t_latihan (user_id, topik_id, skor, jumlah_benar, jumlah_soal, snapshot_judul_topik) VALUES (uji.i('id_a'), uji.i('topik_a4'), 90, 1, 5, 'x')$$,
                 '23514', 'ck_latihan_skor: skor harus = round(benar/soal×100)');

SELECT uji.sebagai('a');
SET ROLE authenticated;
DO $$ BEGIN
  PERFORM uji.cek((SELECT status FROM v_progres_topik WHERE topik_id = uji.i('topik_a2')) = 'selesai', 'BR-13: 80 lalu 65 → selesai');
  PERFORM uji.cek((SELECT status FROM v_progres_topik WHERE topik_id = uji.i('topik_a3')) = 'lemah',   'BR-13: hanya 65 → lemah');
  PERFORM uji.cek((SELECT status FROM v_progres_topik WHERE topik_id = uji.i('topik_a4')) = 'lemah',   'BR-13: 80 lalu 50 → lemah');
  PERFORM uji.cek((SELECT skor_terakhir FROM v_progres_topik WHERE topik_id = uji.i('topik_a4')) = 50, 'skor_terakhir = percobaan terbaru');
  PERFORM uji.cek((SELECT persen_selesai FROM v_progres_dokumen WHERE dokumen_id = uji.i('dok_a1')) = 50, 'BR-14: 2 dari 4 selesai = 50%');
  PERFORM uji.cek((SELECT rata_rata_skor FROM v_progres_dokumen WHERE dokumen_id = uji.i('dok_a1')) = 60, 'BR-15: rata-rata skor terakhir (60+65+65+50)/4 = 60');
  PERFORM uji.cek((SELECT topik_id FROM fn_lanjutkan_belajar()) = uji.i('topik_a1'), 'BR-34/A2: lanjutkan ke topik latihan terakhir');
  PERFORM fn_catat_buka_topik(uji.i('topik_a3'));
  PERFORM uji.cek((SELECT topik_id FROM fn_lanjutkan_belajar()) = uji.i('topik_a3'), 'BR-34/A2: lanjutkan ke topik yang terakhir dibuka');
END $$;

-- ================================================================ 6. KUOTA (FT-08) & PROFIL
DO $$ DECLARE r record; BEGIN
  SELECT * INTO r FROM fn_sisa_kuota_tanya();
  PERFORM uji.cek(r.terpakai = 2 AND r.maks = 30 AND r.sisa = 28,
                  'BR-17/A1: 2 pertanyaan sukses hari ini (gagal & kemarin tidak dihitung, "tidak ditemukan" dihitung)');
  PERFORM uji.cek(r.reset_at = (((now() AT TIME ZONE 'Asia/Jakarta')::date + 1)::timestamp AT TIME ZONE 'Asia/Jakarta'), 'reset 00.00 WIB besok');
  SELECT * INTO r FROM fn_kuota_dokumen();
  PERFORM uji.cek(r.terpakai = 1 AND r.maks = 5 AND r.sisa = 4, 'BR-04: dokumen gagal tidak dihitung kuota');
  PERFORM uji.cek((SELECT nama FROM fn_ubah_profil('  Andi   Pratama  Putra ')) = 'Andi Pratama Putra', 'fn_ubah_profil merapikan & menyimpan nama');
  PERFORM uji.cek(fn_perbarui_aktif(), 'B2: last_active_at diperbarui pertama kali');
  PERFORM uji.cek(NOT fn_perbarui_aktif(), 'B2: maks. 1× per jam');
  PERFORM uji.cek(fn_perbarui_aktif(true), 'B2: login selalu memperbarui (p_paksa)');
END $$;
SELECT uji.galat($$SELECT * FROM fn_ubah_profil('ab')$$, 'NAMA_TIDAK_VALID', 'BR-22 nama < 3');
RESET ROLE;
DO $$ BEGIN
  PERFORM uji.cek((SELECT count(*) FROM log_system WHERE modul = 'users' AND action = 'UPDATE' AND detail->>'kolom' = 'nama') = 1, 'ubah nama tercatat di log_system');
END $$;
-- BR-36: email terkunci walau lewat jalur dengan JWT pengguna
SELECT uji.sebagai('a');
SELECT uji.galat($$UPDATE m_users SET email = 'lain@contoh.id' WHERE id = uji.i('id_a')$$, 'EMAIL_TETAP', 'BR-36: email tidak bisa diubah');

-- ================================================================ 7. ADMIN (FT-09/10/11)
SELECT uji.sebagai('c');
SET ROLE authenticated;
DO $$ BEGIN
  PERFORM uji.cek((SELECT count(*) FROM m_users) = 5, 'admin membaca semua akun');
  PERFORM uji.cek((SELECT count(*) FROM t_dokumen) = 0, 'BR-06: admin tidak membaca baris dokumen');
  PERFORM uji.cek((SELECT count(*) FROM log_system) > 0, 'admin membaca log_system');
  PERFORM uji.cek((SELECT total FROM fn_ringkasan_pengguna()) = 5, 'fn_ringkasan_pengguna total 5');
  PERFORM uji.cek((SELECT count(*) FROM fn_daftar_pengguna('contoh', 'semua', 1, 20)) = 3, 'fn_daftar_pengguna cari "contoh"');
  PERFORM uji.cek((SELECT jumlah_dokumen FROM fn_daftar_pengguna('andi')) = 2, 'jumlah dokumen sebagai angka');
  PERFORM uji.cek((SELECT is_admin FROM fn_daftar_pengguna('dewi')), 'is_admin untuk menonaktifkan tombol');
END $$;
SELECT uji.galat($$SELECT * FROM fn_ubah_status_pengguna(uji.i('id_d'), false)$$, 'BR24_ADMIN_LAIN', 'BR-24: admin tidak bisa menonaktifkan admin lain');
SELECT uji.galat($$SELECT * FROM fn_ubah_status_pengguna(uji.i('id_c'), false)$$, 'BR24_DIRI_SENDIRI', 'BR-24: admin tidak bisa menonaktifkan diri');
SELECT uji.galat($$UPDATE m_users SET is_active = false WHERE id = uji.i('id_b')$$, '42501', 'admin tidak bisa UPDATE m_users langsung');
DO $$ DECLARE r record; BEGIN
  SELECT * INTO r FROM fn_ubah_status_pengguna(uji.i('id_b'), false, '127.0.0.1');
  PERFORM uji.cek(r.is_berubah AND NOT r.is_active AND r.auth_id = uji.v('auth_b')::uuid, 'admin menonaktifkan mahasiswa B');
  SELECT * INTO r FROM fn_ubah_status_pengguna(uji.i('id_b'), false);
  PERFORM uji.cek(NOT r.is_berubah, 'nonaktifkan ulang idempoten');
  PERFORM uji.cek((SELECT count(*) FROM log_system WHERE action = 'DEACTIVATE' AND target_id = uji.v('id_b')) = 1, 'log DEACTIVATE tercatat sekali');
END $$;

-- Akun nonaktif (BR-23 / B1)
SELECT uji.sebagai('b');
DO $$ BEGIN
  PERFORM uji.cek(fn_current_user_id() IS NULL, 'BR-23: akun nonaktif → fn_current_user_id() NULL');
  PERFORM uji.cek((SELECT count(*) FROM t_dokumen) = 0, 'BR-23: akun nonaktif tidak melihat dokumennya');
  PERFORM uji.cek((SELECT is_active FROM m_users) = false, 'akun nonaktif tetap bisa membaca status dirinya (MSG-A02)');
  PERFORM uji.cek((SELECT count(*) FROM m_users u JOIN m_user_role ur ON ur.user_id = u.id) = 1, 'embed m_users→m_user_role tetap terbaca');
END $$;
SELECT uji.galat($$SELECT * FROM fn_buat_dokumen('Judul Baru', 'b.pdf', 10)$$, 'BELUM_LOGIN', 'BR-23: akun nonaktif tidak bisa mengunggah');
SELECT uji.galat($$SELECT * FROM fn_sisa_kuota_tanya()$$, 'BELUM_LOGIN', 'BR-23: akun nonaktif tidak bisa membaca kuota');

SELECT uji.sebagai('a');
SELECT uji.galat($$SELECT * FROM fn_ubah_status_pengguna(uji.i('id_b'), true)$$, 'TIDAK_BERHAK', 'mahasiswa tidak bisa memanggil RPC admin');
SELECT uji.galat($$SELECT fn_statistik_dashboard(7)$$, 'TIDAK_BERHAK', 'mahasiswa tidak bisa membaca statistik');

SELECT uji.sebagai('c');
SELECT * FROM fn_ubah_status_pengguna(uji.i('id_b'), true);

-- Pengaturan (FT-10)
SELECT uji.atur('versi', (SELECT max(updated_at)::text FROM m_pengaturan_sistem));
DO $$ BEGIN
  PERFORM uji.cek((SELECT nilai FROM fn_ubah_pengaturan('{"max_dokumen":"008"}', '127.0.0.1', uji.v('versi')::timestamptz) WHERE kode = 'max_dokumen') = '8',
                  'fn_ubah_pengaturan menyimpan (008 → 8)');
  PERFORM uji.cek((SELECT count(*) FROM fn_ubah_pengaturan('{"max_halaman":"500"}')) = 4, 'hanya 4 baris tampil (ambang tersembunyi, A6)');
  PERFORM uji.cek((SELECT count(*) FROM log_system WHERE modul = 'pengaturan') = 1, 'hanya nilai yang berubah diaudit');
END $$;
SELECT uji.galat($$SELECT * FROM fn_ubah_pengaturan('{"max_dokumen":"9"}', NULL, uji.v('versi')::timestamptz)$$, 'PT409', 'B14: versi lama → KONFLIK_VERSI (HTTP 409)');
SELECT uji.galat($$SELECT * FROM fn_ubah_pengaturan('{"max_dokumen":"0"}')$$, 'KUOTA_TIDAK_VALID', 'BR-29: di luar rentang ditolak');
SELECT uji.galat($$SELECT * FROM fn_ubah_pengaturan('{"max_dokumen":"2.5"}')$$, 'KUOTA_TIDAK_VALID', 'BR-29: bukan bilangan bulat ditolak');
SELECT uji.galat($$SELECT * FROM fn_ubah_pengaturan('{"ambang_relevansi":"0.6"}')$$, 'KUOTA_TIDAK_VALID', 'A6: ambang_relevansi tidak bisa diubah dari S-16');
SELECT uji.galat($$UPDATE m_pengaturan_sistem SET nilai = '9'$$, '42501', 'pengaturan tidak bisa di-UPDATE langsung');

-- Statistik (FT-11, B11)
DO $$ DECLARE j jsonb; BEGIN
  j := fn_statistik_dashboard(7);
  PERFORM uji.cek((j #>> '{pengguna,total}')::int = 3, 'B11: total pengguna = mahasiswa (admin tidak dihitung)');
  PERFORM uji.cek((j #>> '{ai,pertanyaan}')::int = 3, 'pertanyaan sukses dalam rentang 7 hari (2 hari ini + 1 kemarin)');
  PERFORM uji.cek((j #>> '{dokumen,total}')::int = 3, 'jumlah dokumen (angka saja)');
  PERFORM uji.cek((SELECT count(*) FROM fn_seri_pertanyaan_harian(7)) = 7, 'seri harian 7 tanggal');
  PERFORM uji.cek((SELECT sum(jumlah_pertanyaan) FROM fn_seri_pertanyaan_harian(30)) = (fn_statistik_dashboard(30) #>> '{ai,pertanyaan}')::int,
                  'grafik = kartu pada rentang sama');
  PERFORM uji.cek((SELECT count(*) FROM fn_pengguna_terbaru(5)) = 3, 'pengguna terbaru hanya mahasiswa');
  PERFORM uji.cek((SELECT mahasiswa_aktif FROM fn_estimasi_biaya_kuota(40)) = 1, 'B12: mahasiswa aktif = login 7 hari');
END $$;
SELECT uji.galat($$SELECT fn_statistik_dashboard(14)$$, 'RENTANG_TIDAK_VALID', 'rentang hanya 7/30');
RESET ROLE;

-- ================================================================ 8. A8 / A9
SELECT uji.sebagai('b');
SET ROLE authenticated;
SELECT uji.atur('dok_b2', id::text) FROM fn_buat_dokumen('Dokumen Macet', 'macet.pdf', 100);
SELECT uji.atur('dok_b3', id::text), uji.atur('path_b3', path_file) FROM fn_buat_dokumen('Unggahan Batal', 'batal.pdf', 100);
DO $$ BEGIN
  PERFORM uji.cek((SELECT path_file FROM fn_hapus_dokumen(uji.i('dok_b3'))) = uji.v('path_b3'),
                  'NF-04: dokumen diproses yang belum diklaim pipeline boleh dihapus, path dikembalikan');
  PERFORM uji.cek(NOT EXISTS (SELECT 1 FROM t_dokumen WHERE id = uji.i('dok_b3')), 'baris dokumen batal terhapus');
END $$;
RESET ROLE;
UPDATE t_dokumen SET updated_by = 'system' WHERE id = uji.i('dok_b2');      -- klaim pipeline (PENANDA_PIPELINE)
SELECT uji.sebagai('b');
SET ROLE authenticated;
SELECT uji.galat($$SELECT * FROM fn_hapus_dokumen(uji.i('dok_b2'))$$, 'PT409', 'dokumen yang sedang diolah tidak bisa dihapus (MSG-D04)');
RESET ROLE;
ALTER TABLE t_dokumen DISABLE TRIGGER trg_t_dokumen_updated_at;
UPDATE t_dokumen SET updated_at = now() - interval '20 minutes' WHERE id = uji.i('dok_b2');
ALTER TABLE t_dokumen ENABLE TRIGGER trg_t_dokumen_updated_at;
SELECT uji.sebagai('b');
SET ROLE authenticated;
DO $$ BEGIN
  PERFORM uji.cek(fn_tandai_dokumen_macet() = 1, 'A8: dokumen diproses > 15 menit ditandai gagal');
  PERFORM uji.cek((SELECT status FROM t_dokumen WHERE id = uji.i('dok_b2')) = 'gagal', 'A8: status jadi gagal');
END $$;
RESET ROLE;
ALTER TABLE t_dokumen DISABLE TRIGGER trg_t_dokumen_updated_at;
UPDATE t_dokumen SET updated_at = now() - interval '8 days' WHERE id IN (uji.i('dok_b2'), uji.i('dok_a2'));
ALTER TABLE t_dokumen ENABLE TRIGGER trg_t_dokumen_updated_at;
SELECT uji.sebagai('b');
SET ROLE authenticated;
DO $$ BEGIN
  PERFORM uji.cek((SELECT count(*) FROM fn_bersihkan_dokumen_gagal() WHERE dokumen_id = uji.i('dok_b2')) = 1,
                  'A9: dokumen gagal > 7 hari dihapus & path dikembalikan');
END $$;
RESET ROLE;
DO $$ BEGIN
  PERFORM uji.cek(EXISTS (SELECT 1 FROM t_dokumen WHERE id = uji.i('dok_a2')), 'A9 sesi B tidak menghapus dokumen gagal milik A');
END $$;
SELECT uji.sebagai_server();
SET ROLE service_role;
DO $$ BEGIN
  PERFORM uji.cek((SELECT count(*) FROM fn_bersihkan_dokumen_gagal()) = 1, 'A9 service role membersihkan semua pengguna');
END $$;
RESET ROLE;

-- ================================================================ 9. HAPUS BERUNTUN (BR-20)
DO $$ BEGIN
  PERFORM uji.cek((SELECT count(*) FROM t_chunk WHERE dokumen_id = uji.i('dok_a1')) = 4
              AND (SELECT count(*) FROM t_latihan l JOIN t_topik t ON t.id = l.topik_id WHERE t.dokumen_id = uji.i('dok_a1')) = 7
              AND (SELECT count(*) FROM t_chat_rujukan) = 1, 'prasyarat: data turunan A1 ada');
END $$;
SELECT uji.sebagai('a');
SET ROLE authenticated;
SELECT uji.atur('path_hapus', path_file) FROM fn_hapus_dokumen(uji.i('dok_a1'));
RESET ROLE;
DO $$ BEGIN
  PERFORM uji.cek(uji.v('path_hapus') = uji.v('path_a1') AND NOT EXISTS (SELECT 1 FROM t_dokumen WHERE id = uji.i('dok_a1')),
                  'pemilik menghapus dokumen siap lewat fn_hapus_dokumen (path dikembalikan untuk Storage)');
  PERFORM uji.cek((SELECT count(*) FROM t_chunk WHERE dokumen_id = uji.i('dok_a1')) = 0, 'BR-20: chunk terhapus');
  PERFORM uji.cek((SELECT count(*) FROM t_topik WHERE dokumen_id = uji.i('dok_a1')) = 0, 'BR-20: topik terhapus');
  PERFORM uji.cek((SELECT count(*) FROM t_topik_rujukan) = 0, 'BR-20: rujukan topik terhapus');
  PERFORM uji.cek((SELECT count(*) FROM t_soal) = 0, 'BR-20: soal terhapus');
  PERFORM uji.cek((SELECT count(*) FROM t_latihan WHERE user_id = uji.i('id_a')) = 0, 'BR-20: percobaan latihan terhapus');
  PERFORM uji.cek((SELECT count(*) FROM t_latihan_jawaban) = 0, 'BR-20: jawaban latihan terhapus');
  PERFORM uji.cek((SELECT count(*) FROM t_chat WHERE user_id = uji.i('id_a')) = 0, 'BR-20/BR-19: riwayat chat terhapus');
  PERFORM uji.cek((SELECT count(*) FROM t_chat_rujukan) = 0, 'BR-20: rujukan chat terhapus');
  PERFORM uji.cek((SELECT count(*) FROM log_pemakaian_ai WHERE user_id = uji.i('id_a') AND dokumen_id IS NULL) = 4,
                  'log pemakaian tetap ada, dokumen_id → NULL');
  PERFORM uji.cek((SELECT count(*) FROM log_system WHERE action = 'DELETE' AND modul = 'dokumen' AND user_id = uji.i('id_a')
                     AND target_id = split_part(split_part(uji.v('path_a1'), '/', 2), '.', 1)
                     AND NOT (detail ? 'judul')) = 1,
                  'hapus dokumen tercatat di log_system (tanpa judul, BR-06)');
END $$;

-- ================================================================ 10. RESERVASI KUOTA TANYA (BR-17, temuan #1)
UPDATE m_pengaturan_sistem SET nilai = '2' WHERE kode = 'max_pertanyaan_harian';
SELECT uji.sebagai_server();
SET ROLE service_role;
DO $$ DECLARE r record; v1 bigint; v2 bigint; BEGIN
  PERFORM uji.cek((SELECT terpakai FROM fn_sisa_kuota_tanya(uji.i('id_b'))) = 0, 'prasyarat: B belum bertanya hari ini');
  SELECT * INTO r FROM fn_klaim_kuota_tanya(uji.i('id_b'));
  v1 := r.reservasi_id;
  PERFORM uji.cek(v1 IS NOT NULL AND r.terpakai = 1 AND r.sisa = 1 AND r.maks = 2, 'klaim 1 berhasil (sisa 1)');
  SELECT * INTO r FROM fn_klaim_kuota_tanya(uji.i('id_b'));
  v2 := r.reservasi_id;
  PERFORM uji.cek(v2 IS NOT NULL AND r.sisa = 0, 'klaim 2 (paralel) berhasil, sisa 0');
  SELECT * INTO r FROM fn_klaim_kuota_tanya(uji.i('id_b'));
  PERFORM uji.cek(r.reservasi_id IS NULL AND r.terpakai = 2 AND r.sisa = 0, 'klaim 3 ditolak: reservasi berjalan ikut dihitung');
  PERFORM uji.cek((SELECT terpakai FROM fn_sisa_kuota_tanya(uji.i('id_b'))) = 2, 'fn_sisa_kuota_tanya menghitung reservasi berjalan');
  -- AI gagal → lepas (tidak dihitung, A1); idempoten
  PERFORM uji.cek(fn_lepas_kuota_tanya(v2), 'lepas reservasi saat AI gagal');
  PERFORM uji.cek(NOT fn_lepas_kuota_tanya(v2), 'lepas ulang idempoten (false)');
  PERFORM uji.cek((SELECT sisa FROM fn_sisa_kuota_tanya(uji.i('id_b'))) = 1, 'kuota kembali setelah dilepas');
  -- Jawaban "tidak ditemukan" tersimpan → reservasi dipakai, tetap dihitung 1
  PERFORM fn_simpan_chat(uji.i('id_b'), uji.i('dok_b1'), NULL, 'Pertanyaan Budi', 'Maaf, tidak ditemukan di dokumen.', true, 0.2,
                         '[]', '{"model":"m"}', false, v1);
  PERFORM uji.cek(NOT EXISTS (SELECT 1 FROM t_reservasi_tanya WHERE id = v1), 'fn_simpan_chat memakai (menghapus) reservasi');
  PERFORM uji.cek((SELECT terpakai FROM fn_sisa_kuota_tanya(uji.i('id_b'))) = 1, 'jawaban tersimpan dihitung tepat 1 (tanpa ganda)');
  -- Reservasi kedaluwarsa (> 3 menit, fungsi chat mati) tidak dihitung dan dibersihkan saat klaim
  INSERT INTO t_reservasi_tanya (user_id, created_at) VALUES (uji.i('id_b'), now() - interval '4 minutes');
  PERFORM uji.cek((SELECT terpakai FROM fn_sisa_kuota_tanya(uji.i('id_b'))) = 1, 'reservasi kedaluwarsa diabaikan');
  SELECT * INTO r FROM fn_klaim_kuota_tanya(uji.i('id_b'));
  PERFORM uji.cek(r.reservasi_id IS NOT NULL AND r.sisa = 0
              AND (SELECT count(*) FROM t_reservasi_tanya WHERE user_id = uji.i('id_b')) = 1,
                  'klaim membersihkan reservasi kedaluwarsa');
  PERFORM fn_lepas_kuota_tanya(r.reservasi_id);
END $$;
SELECT uji.galat($$SELECT * FROM fn_klaim_kuota_tanya(NULL)$$, 'INPUT_TIDAK_VALID', 'klaim tanpa pengguna ditolak');
RESET ROLE;
SELECT uji.sebagai('b');
SET ROLE authenticated;
DO $$ BEGIN
  PERFORM uji.cek((SELECT terpakai FROM fn_sisa_kuota_tanya()) = 1, 'sesi B membaca kuotanya (SECURITY DEFINER, tetap hanya dirinya)');
END $$;
SELECT uji.galat($$SELECT * FROM fn_sisa_kuota_tanya(uji.i('id_a'))$$, 'TIDAK_BERHAK', 'B tidak bisa membaca kuota tanya A');
RESET ROLE;
UPDATE m_pengaturan_sistem SET nilai = '30' WHERE kode = 'max_pertanyaan_harian';

-- ================================================================ 11. DEFAULT PRIVILEGES (temuan #8)
-- Objek yang dibuat SETELAH migrasi (oleh role migrasi) tidak boleh otomatis terbuka.
CREATE FUNCTION public.fn_uji_objek_baru() RETURNS int LANGUAGE sql AS $$ SELECT 1 $$;
CREATE TABLE public.t_uji_objek_baru (id int GENERATED ALWAYS AS IDENTITY PRIMARY KEY);
DO $$ BEGIN
  PERFORM uji.cek(NOT has_function_privilege('anon', 'public.fn_uji_objek_baru()', 'EXECUTE')
              AND NOT has_function_privilege('authenticated', 'public.fn_uji_objek_baru()', 'EXECUTE'),
                  'fungsi baru tidak bisa dieksekusi anon/authenticated (termasuk lewat PUBLIC)');
  PERFORM uji.cek(has_function_privilege('service_role', 'public.fn_uji_objek_baru()', 'EXECUTE'), 'fungsi baru tetap bisa dieksekusi service_role');
  PERFORM uji.cek(NOT has_table_privilege('anon', 'public.t_uji_objek_baru', 'SELECT')
              AND NOT has_table_privilege('authenticated', 'public.t_uji_objek_baru', 'SELECT')
              AND NOT has_table_privilege('authenticated', 'public.t_uji_objek_baru', 'INSERT'),
                  'tabel baru tertutup bagi anon/authenticated');
  PERFORM uji.cek(has_table_privilege('service_role', 'public.t_uji_objek_baru', 'SELECT,INSERT,UPDATE,DELETE'),
                  'tabel baru tetap terbuka bagi service_role');
  PERFORM uji.cek(NOT has_sequence_privilege('authenticated', pg_get_serial_sequence('public.t_uji_objek_baru', 'id'), 'USAGE'),
                  'sequence baru tertutup bagi authenticated');
  PERFORM uji.cek(has_function_privilege('authenticated', 'public.fn_hapus_dokumen(int)', 'EXECUTE')
              AND has_function_privilege('authenticated', 'public.fn_sisa_kuota_tanya(int)', 'EXECUTE'),
                  'GRANT eksplisit yang sudah ada tidak terpengaruh');
END $$;
DROP FUNCTION public.fn_uji_objek_baru();
DROP TABLE public.t_uji_objek_baru;

-- ================================================================ 12. LAPORAN QC
-- a = mahasiswa biasa, c = admin. a belum penguji → ditolak; setelah ditandai admin → boleh.
SELECT uji.sebagai('a');
SET ROLE authenticated;
SELECT uji.galat($$SELECT fn_buat_laporan_qc('Tombol rusak', 'x', 'bug', 'tinggi', '/beranda', '{}')$$, 'BUKAN_PENGUJI', 'QC: bukan penguji tidak bisa melapor');
SELECT uji.galat($$SELECT fn_atur_penguji('a@uji.id', true)$$, 'TIDAK_BERHAK', 'QC: mahasiswa tidak bisa mengatur penguji');
SELECT uji.sebagai('c');
SET ROLE authenticated;
DO $$ BEGIN
  PERFORM uji.cek(fn_atur_penguji((SELECT email FROM m_users WHERE id = uji.i('id_a')), true) = uji.i('id_a'), 'QC: admin menandai penguji');
  PERFORM uji.cek(fn_atur_penguji('tidak.ada@uji.id', true) IS NULL, 'QC: email tak terdaftar → NULL');
  PERFORM uji.atur('qc_admin', fn_buat_laporan_qc('Laporan dari admin', 'isi', 'saran', 'rendah', '/admin', NULL)::text);
END $$;
SELECT uji.sebagai('a');
SET ROLE authenticated;
DO $$ BEGIN
  PERFORM uji.atur('qc_a', fn_buat_laporan_qc('Tombol terpotong', 'Langkah 1', 'tampilan', 'tinggi', '/dokumen/1', '{"lebarLayar":390}')::text);
  PERFORM uji.cek((SELECT count(*) FROM t_laporan_qc) = 1, 'QC: penguji hanya melihat laporannya sendiri');
END $$;
SELECT uji.galat($$SELECT fn_ubah_laporan_qc(uji.i('qc_a'), 'selesai')$$, 'TIDAK_BERHAK', 'QC: penguji tidak bisa mengubah status');
SELECT uji.galat($$INSERT INTO t_laporan_qc (pelapor_id, judul, deskripsi, kategori, url_halaman) VALUES (1, 'langsung', 'x', 'bug', '/')$$, 'permission denied', 'QC: insert langsung ditolak');
SELECT uji.sebagai('c');
SET ROLE authenticated;
DO $$ BEGIN
  PERFORM uji.cek((SELECT count(*) FROM t_laporan_qc) = 2, 'QC: admin melihat semua laporan');
  PERFORM fn_ubah_laporan_qc(uji.i('qc_a'), 'selesai', NULL, 'Sudah diperbaiki');
  PERFORM uji.cek((SELECT selesai_at IS NOT NULL AND catatan_tim = 'Sudah diperbaiki' AND prioritas = 'tinggi'
                     FROM t_laporan_qc WHERE id = uji.i('qc_a')), 'QC: status selesai mengisi selesai_at, prioritas tetap');
  PERFORM fn_ubah_laporan_qc(uji.i('qc_a'), 'dikerjakan');
  PERFORM uji.cek((SELECT selesai_at IS NULL FROM t_laporan_qc WHERE id = uji.i('qc_a')), 'QC: dibuka lagi → selesai_at dikosongkan');
  PERFORM uji.cek((SELECT count(*) FROM fn_daftar_penguji()) = 1, 'QC: daftar penguji');
END $$;
RESET ROLE;

-- ================================================================ RINGKASAN
SELECT count(*) AS jumlah_pemeriksaan_lulus FROM uji.hasil;

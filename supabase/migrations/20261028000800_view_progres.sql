-- =====================================================================
-- View progres belajar (FT-07). Dihitung saat dibaca, tidak disimpan (Breakdown §8.4).
-- security_invoker = true → RLS tabel dasar berlaku untuk pemanggil. Tanpa opsi ini view
-- berjalan dengan hak pemilik (postgres) dan membocorkan progres mahasiswa lain (BR-06).
-- =====================================================================

CREATE OR REPLACE VIEW public.v_progres_topik
WITH (security_invoker = true) AS
SELECT
  d.user_id,
  d.id            AS dokumen_id,
  d.judul         AS judul_dokumen,
  t.id            AS topik_id,
  t.urutan,
  t.judul         AS judul_topik,
  t.halaman_awal,
  t.halaman_akhir,
  a.jumlah_latihan,
  a.skor_terakhir,
  a.skor_tertinggi,
  a.latihan_terakhir_at,
  -- BR-13 (KEPUTUSAN A3: tetap BR-13). 70/60 = SKOR_SELESAI / SKOR_PERTAHANKAN di lib/config.ts.
  CASE
    WHEN a.jumlah_latihan = 0                             THEN 'belum'
    WHEN a.skor_tertinggi >= 70 AND a.skor_terakhir >= 60 THEN 'selesai'
    ELSE                                                       'lemah'
  END::varchar(10) AS status
FROM public.t_topik t
JOIN public.t_dokumen d
  ON d.id = t.dokumen_id
 AND d.status = 'siap'                                   -- BR-07: hanya dokumen siap
CROSS JOIN LATERAL (
  SELECT count(*)::int        AS jumlah_latihan,
         max(l.skor)::int     AS skor_tertinggi,
         max(l.created_at)    AS latihan_terakhir_at,
         (SELECT l2.skor::int
            FROM public.t_latihan l2
           WHERE l2.user_id = d.user_id AND l2.topik_id = t.id
           ORDER BY l2.created_at DESC, l2.id DESC       -- id memecah seri bila waktu sama
           LIMIT 1)           AS skor_terakhir
  FROM public.t_latihan l
  WHERE l.user_id = d.user_id
    AND l.topik_id = t.id
) a;

COMMENT ON VIEW public.v_progres_topik IS
  'Status topik per pemilik (BR-13): belum | selesai | lemah.';

CREATE OR REPLACE VIEW public.v_progres_dokumen
WITH (security_invoker = true) AS
SELECT
  v.user_id,
  v.dokumen_id,
  v.judul_dokumen,
  count(*)::int                                       AS total_topik,
  count(*) FILTER (WHERE v.status = 'selesai')::int   AS topik_selesai,
  count(*) FILTER (WHERE v.status = 'lemah')::int     AS topik_lemah,
  count(*) FILTER (WHERE v.status = 'belum')::int     AS topik_belum,
  -- BR-14: % = selesai ÷ total × 100, dibulatkan.
  coalesce(round(100.0 * count(*) FILTER (WHERE v.status = 'selesai') / nullif(count(*), 0))::int, 0)
                                                      AS persen_selesai,
  -- BR-15: rata-rata SKOR TERAKHIR tiap topik yang pernah dilatih (avg mengabaikan NULL).
  round(avg(v.skor_terakhir))::int                    AS rata_rata_skor,
  sum(v.jumlah_latihan)::int                          AS jumlah_latihan,
  max(v.latihan_terakhir_at)                          AS latihan_terakhir_at
FROM public.v_progres_topik v
GROUP BY v.user_id, v.dokumen_id, v.judul_dokumen;

COMMENT ON VIEW public.v_progres_dokumen IS
  'Progres per dokumen siap: persen_selesai (BR-14), rata_rata_skor (BR-15, NULL bila belum latihan).';

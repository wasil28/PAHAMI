-- =====================================================================
-- Bagian 3 skema: LATIHAN (BP-06). t_soal, t_latihan, t_latihan_jawaban.
-- Acuan: FT-05, KEPUTUSAN A4 (soal_id CASCADE).
-- =====================================================================

-- ----------------------------------------------------------------- t_soal
CREATE TABLE public.t_soal (
  id               int GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  topik_id         int         NOT NULL
                   CONSTRAINT fk_soal_topik REFERENCES public.t_topik (id) ON DELETE CASCADE,
  urutan           int         NOT NULL,
  pertanyaan       text        NOT NULL,
  pilihan_a        text        NOT NULL,
  pilihan_b        text        NOT NULL,
  pilihan_c        text        NOT NULL,
  pilihan_d        text        NOT NULL,
  kunci            char(1)     NOT NULL,     -- tidak bisa dibaca browser (hak kolom), lihat RLS
  pembahasan       text        NOT NULL,
  halaman_rujukan  int         NOT NULL,
  created_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_soal_topik_urutan UNIQUE (topik_id, urutan),
  CONSTRAINT ck_soal_urutan  CHECK (urutan BETWEEN 1 AND 5),                                -- BR-11
  CONSTRAINT ck_soal_kunci   CHECK (kunci IN ('A', 'B', 'C', 'D')),
  CONSTRAINT ck_soal_isi     CHECK (char_length(btrim(pertanyaan)) > 0 AND char_length(btrim(pembahasan)) > 0),
  CONSTRAINT ck_soal_pilihan CHECK (
        char_length(btrim(pilihan_a)) > 0 AND char_length(btrim(pilihan_b)) > 0
    AND char_length(btrim(pilihan_c)) > 0 AND char_length(btrim(pilihan_d)) > 0
    AND pilihan_a <> pilihan_b AND pilihan_a <> pilihan_c AND pilihan_a <> pilihan_d
    AND pilihan_b <> pilihan_c AND pilihan_b <> pilihan_d AND pilihan_c <> pilihan_d),
  CONSTRAINT ck_soal_halaman CHECK (halaman_rujukan >= 1)
);
COMMENT ON TABLE public.t_soal IS 'Bank soal 5 PG per topik (BR-11). Kolom kunci/pembahasan tertutup sebelum dijawab.';

-- -------------------------------------------------------------- t_latihan
CREATE TABLE public.t_latihan (
  id                   int GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id              int          NOT NULL
                       CONSTRAINT fk_latihan_user REFERENCES public.m_users (id) ON DELETE RESTRICT,
  topik_id             int          NOT NULL
                       CONSTRAINT fk_latihan_topik REFERENCES public.t_topik (id) ON DELETE CASCADE,
  skor                 smallint     NOT NULL,
  jumlah_benar         smallint     NOT NULL,
  jumlah_soal          smallint     NOT NULL,
  snapshot_judul_topik varchar(120) NOT NULL,
  created_by           varchar(100) NULL,
  created_at           timestamptz  NOT NULL DEFAULT now(),
  CONSTRAINT ck_latihan_jumlah   CHECK (jumlah_soal > 0 AND jumlah_benar BETWEEN 0 AND jumlah_soal),
  -- BR-12: skor = round(benar ÷ soal × 100), 0–100. Dicek ulang di DB agar tak bisa dipalsukan.
  CONSTRAINT ck_latihan_skor     CHECK (skor BETWEEN 0 AND 100
                                        AND skor = round(jumlah_benar * 100.0 / jumlah_soal)),
  CONSTRAINT ck_latihan_snapshot CHECK (char_length(btrim(snapshot_judul_topik)) > 0)
);
COMMENT ON TABLE public.t_latihan IS 'Satu percobaan latihan yang selesai (BR-33). Dasar status topik BR-13.';
CREATE INDEX idx_latihan_user_topik   ON public.t_latihan (user_id, topik_id, created_at);
CREATE INDEX idx_latihan_user_created ON public.t_latihan (user_id, created_at);
CREATE INDEX idx_latihan_topik        ON public.t_latihan (topik_id);

-- ------------------------------------------------------ t_latihan_jawaban
CREATE TABLE public.t_latihan_jawaban (
  id          int GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  latihan_id  int     NOT NULL
              CONSTRAINT fk_latihan_jawaban_latihan REFERENCES public.t_latihan (id) ON DELETE CASCADE,
  -- KEPUTUSAN A4: CASCADE. t_soal & t_latihan_jawaban terhapus lewat dua jalur cascade dari
  -- t_topik; RESTRICT/NO ACTION akan menggagalkan hapus dokumen (BR-20).
  soal_id     int     NOT NULL
              CONSTRAINT fk_latihan_jawaban_soal REFERENCES public.t_soal (id) ON DELETE CASCADE,
  dipilih     char(1) NOT NULL,
  is_benar    boolean NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_latihan_jawaban UNIQUE (latihan_id, soal_id),
  CONSTRAINT ck_latihan_jawaban_dipilih CHECK (dipilih IN ('A', 'B', 'C', 'D'))
);
CREATE INDEX idx_latihan_jawaban_soal ON public.t_latihan_jawaban (soal_id);

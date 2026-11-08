-- =====================================================================
-- Bagian 2 skema: DOKUMEN & PENGOLAHAN (BP-03, BP-04).
-- t_dokumen, t_chunk, t_topik, t_topik_rujukan.
-- Acuan: FT-02, FT-03, FT-04, KEPUTUSAN A2, A4, A5, A7, B4, E (path unik).
-- Rantai hapus BR-20: t_dokumen → CASCADE ke semua turunan.
-- =====================================================================

-- Kode tampil DOK-YYYY-NNNNNN (nomor global, tidak direset per tahun).
CREATE SEQUENCE public.seq_t_dokumen_kode AS int START 1 NO CYCLE;

-- -------------------------------------------------------------- t_dokumen
CREATE TABLE public.t_dokumen (
  id                    int GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  kode                  varchar(20)  NOT NULL,
  -- Akun tidak dihapus (hanya nonaktif) → RESTRICT.
  user_id               int          NOT NULL
                        CONSTRAINT fk_dokumen_user REFERENCES public.m_users (id) ON DELETE RESTRICT,
  judul                 varchar(100) NOT NULL,
  nama_file             varchar(255) NOT NULL,
  -- KEPUTUSAN §3: path Storage = {auth.uid()}/{kode}.pdf (bucket privat `dokumen`).
  path_file             varchar(500) NOT NULL,
  ukuran_byte           bigint       NOT NULL,
  jumlah_halaman        int          NULL,
  jumlah_topik          int          NULL,
  status                varchar(20)  NOT NULL DEFAULT 'diproses',
  tahap                 varchar(20)  NULL,
  pesan_gagal           varchar(255) NULL,
  selesai_diproses_at   timestamptz  NULL,
  aktivitas_terakhir_at timestamptz  NULL,          -- BR-34
  topik_terakhir_id     int          NULL,          -- KEPUTUSAN A2 (FK ditambah setelah t_topik)
  created_by            varchar(100) NULL,
  created_at            timestamptz  NOT NULL DEFAULT now(),
  updated_by            varchar(100) NULL,
  updated_at            timestamptz  NOT NULL DEFAULT now(),   -- juga "detak" pipeline (A8)
  CONSTRAINT uq_dokumen_kode      UNIQUE (kode),
  CONSTRAINT uq_dokumen_path_file UNIQUE (path_file),
  CONSTRAINT ck_dokumen_status CHECK (status IN ('diproses', 'siap', 'gagal')),
  CONSTRAINT ck_dokumen_tahap  CHECK (tahap IS NULL OR tahap IN
        ('membaca', 'mengekstrak', 'memotong', 'mengindeks', 'menyusun_topik')),
  CONSTRAINT ck_dokumen_kode   CHECK (kode ~ '^DOK-[0-9]{4}-[0-9]{6}$'),
  CONSTRAINT ck_dokumen_judul  CHECK (char_length(btrim(judul)) BETWEEN 3 AND 100),        -- BR-21
  CONSTRAINT ck_dokumen_path   CHECK (path_file ~ '^[0-9a-f-]{36}/DOK-[0-9]{4}-[0-9]{6}\.pdf$'
                                      AND split_part(path_file, '/', 2) = kode || '.pdf'),
  CONSTRAINT ck_dokumen_ukuran CHECK (ukuran_byte > 0),                                       -- BR-02
  CONSTRAINT ck_dokumen_halaman CHECK (jumlah_halaman IS NULL OR jumlah_halaman > 0),
  -- BR-09 + KEPUTUSAN B4: dokumen pendek boleh < 4 topik (min. 1), maksimum 15.
  CONSTRAINT ck_dokumen_jumlah_topik CHECK (jumlah_topik IS NULL OR jumlah_topik BETWEEN 1 AND 15),
  -- Konsistensi antar-kolom per status (siklus Breakdown §1.4).
  CONSTRAINT ck_dokumen_konsistensi CHECK (
       (status = 'diproses' AND tahap IS NOT NULL AND pesan_gagal IS NULL)
    OR (status = 'siap'     AND tahap IS NULL     AND pesan_gagal IS NULL
                            AND jumlah_topik IS NOT NULL AND selesai_diproses_at IS NOT NULL)
    OR (status = 'gagal'    AND pesan_gagal IS NOT NULL)   -- tahap = tahap tempat gagal (diagnosis)
  )
);
COMMENT ON TABLE public.t_dokumen IS 'PDF milik mahasiswa. Privat: hanya pemilik (BR-06, RLS).';
CREATE INDEX idx_dokumen_user_status  ON public.t_dokumen (user_id, status);
CREATE INDEX idx_dokumen_user_created ON public.t_dokumen (user_id, created_at);
CREATE INDEX idx_dokumen_aktivitas    ON public.t_dokumen (user_id, aktivitas_terakhir_at DESC) WHERE status = 'siap';
CREATE INDEX idx_dokumen_macet        ON public.t_dokumen (updated_at) WHERE status = 'diproses';   -- A8
CREATE INDEX idx_dokumen_gagal        ON public.t_dokumen (updated_at) WHERE status = 'gagal';      -- A9

CREATE TRIGGER trg_t_dokumen_updated_at BEFORE UPDATE ON public.t_dokumen
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

-- ---------------------------------------------------------------- t_chunk
-- Hasil proses mesin: tanpa kolom audit selain created_at (Panduan §5.3).
CREATE TABLE public.t_chunk (
  id             int GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  dokumen_id     int          NOT NULL
                 CONSTRAINT fk_chunk_dokumen REFERENCES public.t_dokumen (id) ON DELETE CASCADE,   -- BR-20
  urutan         int          NOT NULL,
  halaman_awal   int          NOT NULL,
  halaman_akhir  int          NOT NULL,
  judul_bagian   varchar(255) NULL,
  isi            text         NOT NULL,
  jumlah_token   int          NULL,
  -- KEPUTUSAN A5: 768 dimensi (text-embedding-3-small, dimensions: 768) → hemat ±50% ruang.
  embedding      extensions.vector(768) NOT NULL,
  created_at     timestamptz  NOT NULL DEFAULT now(),
  CONSTRAINT uq_chunk_dokumen_urutan UNIQUE (dokumen_id, urutan),
  CONSTRAINT ck_chunk_urutan  CHECK (urutan >= 1),
  CONSTRAINT ck_chunk_halaman CHECK (halaman_awal >= 1 AND halaman_akhir >= halaman_awal),
  CONSTRAINT ck_chunk_isi     CHECK (char_length(isi) > 0),
  CONSTRAINT ck_chunk_token   CHECK (jumlah_token IS NULL OR jumlah_token >= 0)
);
COMMENT ON TABLE public.t_chunk IS 'Potongan teks terindeks (BR-08). Hanya server; browser tidak punya akses.';
-- Index vektor HNSW cosine (A5/BR-16). Embedding model teks dinormalisasi → cosine.
CREATE INDEX idx_chunk_embedding ON public.t_chunk
  USING hnsw (embedding extensions.vector_cosine_ops) WITH (m = 16, ef_construction = 64);

-- ---------------------------------------------------------------- t_topik
CREATE TABLE public.t_topik (
  id                   int GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  dokumen_id           int          NOT NULL
                       CONSTRAINT fk_topik_dokumen REFERENCES public.t_dokumen (id) ON DELETE CASCADE,  -- BR-20
  urutan               int          NOT NULL,
  judul                varchar(120) NOT NULL,
  halaman_awal         int          NOT NULL,
  halaman_akhir        int          NOT NULL,
  konsep_inti          text         NULL,
  poin_penting         jsonb        NULL,
  contoh               text         NULL,
  ringkasan_dibuat_at  timestamptz  NULL,
  ringkasan_diklaim_at timestamptz  NULL,   -- KEPUTUSAN A7: cegah AI dipanggil dua kali (dua tab)
  soal_diklaim_at      timestamptz  NULL,   -- KEPUTUSAN A7
  created_at           timestamptz  NOT NULL DEFAULT now(),
  updated_at           timestamptz  NOT NULL DEFAULT now(),
  CONSTRAINT uq_topik_dokumen_urutan UNIQUE (dokumen_id, urutan),
  CONSTRAINT ck_topik_urutan  CHECK (urutan BETWEEN 1 AND 15),
  CONSTRAINT ck_topik_judul   CHECK (char_length(btrim(judul)) BETWEEN 1 AND 120),          -- BR-09
  CONSTRAINT ck_topik_halaman CHECK (halaman_awal >= 1 AND halaman_akhir >= halaman_awal),
  CONSTRAINT ck_topik_konsep  CHECK (konsep_inti IS NULL OR char_length(btrim(konsep_inti)) > 0),
  CONSTRAINT ck_topik_contoh  CHECK (contoh IS NULL OR char_length(btrim(contoh)) > 0),
  CONSTRAINT ck_topik_poin    CHECK (poin_penting IS NULL
        OR (jsonb_typeof(poin_penting) = 'array' AND jsonb_array_length(poin_penting) BETWEEN 3 AND 5)),
  -- BR-10: ringkasan dianggap ada hanya bila lengkap.
  CONSTRAINT ck_topik_ringkasan_lengkap CHECK (ringkasan_dibuat_at IS NULL
        OR (konsep_inti IS NOT NULL AND poin_penting IS NOT NULL AND contoh IS NOT NULL)),
  -- BR-09: dua topik dalam satu dokumen tidak boleh berbagi halaman.
  CONSTRAINT ex_topik_rentang EXCLUDE USING gist (
        dokumen_id WITH =,
        int4range(halaman_awal, halaman_akhir, '[]') WITH &&)
);
COMMENT ON TABLE public.t_topik IS 'Topik belajar hasil BP-04; ringkasan diisi saat pertama dibuka (BR-10).';
CREATE TRIGGER trg_t_topik_updated_at BEFORE UPDATE ON public.t_topik
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

-- A2: "Lanjutkan belajar" menunjuk topik terakhir. SET NULL saat topik terhapus.
ALTER TABLE public.t_dokumen
  ADD CONSTRAINT fk_dokumen_topik_terakhir FOREIGN KEY (topik_terakhir_id)
      REFERENCES public.t_topik (id) ON DELETE SET NULL;
CREATE INDEX idx_dokumen_topik_terakhir ON public.t_dokumen (topik_terakhir_id);

-- -------------------------------------------------------- t_topik_rujukan
CREATE TABLE public.t_topik_rujukan (
  id        int GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  topik_id  int          NOT NULL
            CONSTRAINT fk_topik_rujukan_topik REFERENCES public.t_topik (id) ON DELETE CASCADE,
  -- KEPUTUSAN A4: SET NULL — rujukan teks tetap ada walau chunk dihapus.
  chunk_id  int          NULL
            CONSTRAINT fk_topik_rujukan_chunk REFERENCES public.t_chunk (id) ON DELETE SET NULL,
  halaman   int          NOT NULL,
  kutipan   varchar(500) NOT NULL,
  urutan    int          NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ck_topik_rujukan_halaman CHECK (halaman >= 1),
  CONSTRAINT ck_topik_rujukan_kutipan CHECK (char_length(btrim(kutipan)) BETWEEN 1 AND 500),
  CONSTRAINT ck_topik_rujukan_urutan  CHECK (urutan >= 0)
);
CREATE INDEX idx_topik_rujukan_topik ON public.t_topik_rujukan (topik_id);
CREATE INDEX idx_topik_rujukan_chunk ON public.t_topik_rujukan (chunk_id);

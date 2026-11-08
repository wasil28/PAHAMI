-- =====================================================================
-- Bagian 4 skema: TANYA AI (BP-07). t_chat, t_chat_rujukan.
-- Acuan: FT-06, KEPUTUSAN A4, B9.
-- =====================================================================

CREATE TABLE public.t_chat (
  id                 int GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id            int         NOT NULL
                     CONSTRAINT fk_chat_user REFERENCES public.m_users (id) ON DELETE RESTRICT,
  dokumen_id         int         NOT NULL
                     CONSTRAINT fk_chat_dokumen REFERENCES public.t_dokumen (id) ON DELETE CASCADE,  -- BR-19/20
  topik_id           int         NULL
                     CONSTRAINT fk_chat_topik REFERENCES public.t_topik (id) ON DELETE SET NULL,
  peran              varchar(10) NOT NULL,
  isi                text        NOT NULL,
  is_tidak_ditemukan boolean     NOT NULL DEFAULT false,       -- F-14
  -- KEPUTUSAN B9: jawaban yang terputus di tengah streaming tetap disimpan + ditandai.
  is_terputus        boolean     NOT NULL DEFAULT false,
  skor_relevansi     real        NULL,                         -- bahan uji ambang (BR-16)
  created_at         timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ck_chat_peran CHECK (peran IN ('user', 'ai')),
  CONSTRAINT ck_chat_isi   CHECK (
        (peran = 'user' AND char_length(btrim(isi)) BETWEEN 3 AND 500)                    -- BR-18
     OR (peran = 'ai'   AND char_length(btrim(isi)) > 0)),
  CONSTRAINT ck_chat_flag_ai CHECK (
        peran = 'ai' OR (is_tidak_ditemukan = false AND is_terputus = false AND skor_relevansi IS NULL)),
  CONSTRAINT ck_chat_skor  CHECK (skor_relevansi IS NULL OR skor_relevansi BETWEEN -1 AND 1)
);
COMMENT ON TABLE public.t_chat IS 'Riwayat Tanya AI per dokumen per mahasiswa (F-15, BR-19).';
CREATE INDEX idx_chat_dokumen_created ON public.t_chat (dokumen_id, created_at);
CREATE INDEX idx_chat_user_created    ON public.t_chat (user_id, created_at);
CREATE INDEX idx_chat_topik           ON public.t_chat (topik_id);

CREATE TABLE public.t_chat_rujukan (
  id        int GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  chat_id   int          NOT NULL
            CONSTRAINT fk_chat_rujukan_chat REFERENCES public.t_chat (id) ON DELETE CASCADE,
  chunk_id  int          NULL
            CONSTRAINT fk_chat_rujukan_chunk REFERENCES public.t_chunk (id) ON DELETE SET NULL,    -- A4
  halaman   int          NOT NULL,
  kutipan   varchar(500) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ck_chat_rujukan_halaman CHECK (halaman >= 1),
  CONSTRAINT ck_chat_rujukan_kutipan CHECK (char_length(btrim(kutipan)) BETWEEN 1 AND 500)
);
CREATE INDEX idx_chat_rujukan_chat  ON public.t_chat_rujukan (chat_id);
CREATE INDEX idx_chat_rujukan_chunk ON public.t_chat_rujukan (chunk_id);

-- Reservasi kuota Tanya AI (BR-17). Satu baris = satu pertanyaan yang sedang dijawab
-- (antara cek kuota dan fn_simpan_chat). Mencegah dua permintaan paralel sama-sama lolos
-- cek "sisa > 0". Dibuat fn_klaim_kuota_tanya, dihapus fn_simpan_chat (dipakai) atau
-- fn_lepas_kuota_tanya (AI gagal → tidak dihitung, A1). Baris > 3 menit dianggap kedaluwarsa
-- (fungsi server pasti sudah mati, maxDuration chat 90 dtk) dan diabaikan/dibersihkan.
CREATE TABLE public.t_reservasi_tanya (
  id         bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id    int         NOT NULL
             CONSTRAINT fk_reservasi_tanya_user REFERENCES public.m_users (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.t_reservasi_tanya IS 'Kuota Tanya AI yang sedang dipakai (in-flight, BR-17). Hanya server.';
CREATE INDEX idx_reservasi_tanya_user ON public.t_reservasi_tanya (user_id, created_at);

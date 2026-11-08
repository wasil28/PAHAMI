-- =====================================================================
-- Bagian 5 skema: LOG & AUDIT (hanya INSERT — Panduan §5.1).
-- log_pemakaian_ai (BR-27, dasar kuota BR-17 & statistik F-19), log_system (audit).
-- Acuan: FT-02 §7.6, FT-09 Q-FT09-02, KEPUTUSAN A1, E (T-10 → log_system).
-- =====================================================================

-- KEPUTUSAN A1: fitur tanya_ai dicatat SATU baris per pertanyaan (token & biaya dijumlah);
-- gagal → is_sukses=false dan tidak mengurangi kuota. Fitur lain: satu baris per panggilan.
CREATE TABLE public.log_pemakaian_ai (
  id            int GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id       int           NOT NULL
                CONSTRAINT fk_pemakaian_user REFERENCES public.m_users (id) ON DELETE RESTRICT,
  -- SET NULL: log tetap ada untuk statistik walau dokumen dihapus (BR-20).
  dokumen_id    int           NULL
                CONSTRAINT fk_pemakaian_dokumen REFERENCES public.t_dokumen (id) ON DELETE SET NULL,
  fitur         varchar(20)   NOT NULL,
  model         varchar(100)  NOT NULL,
  token_masuk   int           NOT NULL DEFAULT 0,
  token_keluar  int           NOT NULL DEFAULT 0,
  biaya_rp      numeric(12,2) NOT NULL DEFAULT 0,
  durasi_ms     int           NULL,
  is_sukses     boolean       NOT NULL DEFAULT true,
  created_at    timestamptz   NOT NULL DEFAULT now(),
  CONSTRAINT ck_pemakaian_fitur  CHECK (fitur IN ('indeks', 'topik', 'ringkasan', 'soal', 'tanya_ai')),
  CONSTRAINT ck_pemakaian_token  CHECK (token_masuk >= 0 AND token_keluar >= 0),
  CONSTRAINT ck_pemakaian_biaya  CHECK (biaya_rp >= 0),
  CONSTRAINT ck_pemakaian_durasi CHECK (durasi_ms IS NULL OR durasi_ms >= 0)
);
COMMENT ON TABLE public.log_pemakaian_ai IS 'Pemakaian AI (BR-27). tanya_ai = 1 baris per pertanyaan (A1). Hanya INSERT.';
CREATE INDEX idx_pemakaian_user_fitur    ON public.log_pemakaian_ai (user_id, fitur, created_at);
CREATE INDEX idx_pemakaian_created       ON public.log_pemakaian_ai (created_at);
CREATE INDEX idx_pemakaian_dokumen       ON public.log_pemakaian_ai (dokumen_id);    -- percepat SET NULL
CREATE INDEX idx_pemakaian_tanya_created ON public.log_pemakaian_ai (created_at) WHERE fitur = 'tanya_ai';

CREATE TABLE public.log_system (
  id          int GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id     int          NULL
              CONSTRAINT fk_log_system_user REFERENCES public.m_users (id) ON DELETE RESTRICT,   -- pelaku (akun tak pernah dihapus)
  action      varchar(30)  NOT NULL,
  modul       varchar(30)  NOT NULL,
  target_id   varchar(50)  NULL,
  detail      jsonb        NULL,       -- JANGAN simpan isi/judul dokumen (BR-06, Panduan §3.8)
  ip_address  varchar(50)  NULL,
  created_at  timestamptz  NOT NULL DEFAULT now(),
  CONSTRAINT ck_log_system_action CHECK (action IN ('CREATE','UPDATE','DELETE','LOGIN','LOGOUT','ACTIVATE','DEACTIVATE')),
  CONSTRAINT ck_log_system_modul  CHECK (modul  IN ('auth','users','dokumen','pengaturan'))
);
COMMENT ON TABLE public.log_system IS 'Audit tindakan penting (login, aktif/nonaktif, ubah kuota, hapus dokumen). Hanya INSERT.';
CREATE INDEX idx_log_modul_created ON public.log_system (modul, created_at);
CREATE INDEX idx_log_system_user   ON public.log_system (user_id, created_at DESC);

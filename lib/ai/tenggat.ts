// Tenggat waktu per permintaan server (Route Handler punya maxDuration; bila habis, fungsi
// dibunuh tanpa sempat menulis status apa pun). Tenggat internal dibuat LEBIH PENDEK dari
// maxDuration supaya langkah penutup (simpan jawaban, fn_gagalkan_dokumen) selalu sempat jalan.
// Murni (tanpa server-only) agar mudah diuji.

/** Batas satu panggilan AI: sinyal batal + timeout & coba ulang SDK (menimpa bawaan client.ts). */
export interface OpsiPermintaanAI {
  signal?: AbortSignal;
  /** Timeout per percobaan (ms). Bawaan: AI_BATAS_WAKTU_MS. */
  timeoutMs?: number;
  /** Coba ulang jaringan SDK. Bawaan: AI_MAKS_COBA_ULANG (BR-32). */
  maksCobaUlang?: number;
}

/** Opsi permintaan SDK `openai` dari OpsiPermintaanAI (kunci yang tidak diisi tidak dikirim). */
export function keOpsiSdk(p?: OpsiPermintaanAI): { signal?: AbortSignal; timeout?: number; maxRetries?: number } {
  return {
    ...(p?.signal ? { signal: p.signal } : {}),
    ...(p?.timeoutMs !== undefined ? { timeout: p.timeoutMs } : {}),
    ...(p?.maksCobaUlang !== undefined ? { maxRetries: p.maksCobaUlang } : {}),
  };
}

export interface Tenggat {
  /** Batal saat tenggat habis (atau saat `hentikan()` dipanggil). */
  readonly signal: AbortSignal;
  /** Sisa waktu (ms), ≥ 0. */
  sisaMs(): number;
  habis(): boolean;
  /** Opsi panggilan AI yang tidak pernah melewati tenggat: timeout = min(maksMs, sisa). */
  permintaan(maksMs: number, maksCobaUlang: number): OpsiPermintaanAI;
  /** Bersihkan timer (panggil setelah pekerjaan selesai). */
  hentikan(): void;
}

/** Tenggat `batasMs` dari SEKARANG (buat di awal Route Handler agar dihitung dari awal permintaan). */
export function buatTenggat(batasMs: number): Tenggat {
  const akhir = Date.now() + batasMs;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(new Error("TENGGAT_HABIS")), Math.max(0, batasMs));
  const sisaMs = () => Math.max(0, akhir - Date.now());
  return {
    signal: ctrl.signal,
    sisaMs,
    habis: () => ctrl.signal.aborted || sisaMs() === 0,
    permintaan: (maksMs, maksCobaUlang) => ({
      signal: ctrl.signal,
      timeoutMs: Math.max(1, Math.min(maksMs, sisaMs())),
      maksCobaUlang,
    }),
    hentikan: () => clearTimeout(timer),
  };
}

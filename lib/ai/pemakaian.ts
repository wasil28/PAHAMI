import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { bulatRp } from "@/lib/ai/biaya";
import type { Pemakaian } from "@/lib/ai/tipe";

// Pencatatan pemakaian AI ke log_pemakaian_ai (BR-27; dasar kuota BR-17 & statistik FT-11).

/** Nilai CHECK ck_pemakaian_fitur (migrasi tabel_log). */
export type FiturAI = "indeks" | "topik" | "ringkasan" | "soal" | "tanya_ai" | "materi" | "sampul";

export interface CatatPemakaianInput {
  /** m_users.id (int), BUKAN auth uid. */
  userId: number;
  fitur: FiturAI;
  dokumenId?: number | null;
  pemakaian: Pemakaian;
  /** false → tidak dihitung kuota (A1), tetap masuk statistik biaya. */
  isSukses: boolean;
  /** Hanya untuk log server; tabel tidak punya kolom pesan (jangan berisi isi dokumen). */
  pesanError?: string;
}

/** Bentuk baris log (dipakai juga sebagai p_log jsonb pada RPC fn_simpan_chat, FT-06 Q-FT06-07). */
export function keBarisLog(p: Pemakaian): {
  model: string;
  token_masuk: number;
  token_keluar: number;
  biaya_rp: number;
  durasi_ms: number;
} {
  return {
    model: (p.model || "tidak-diketahui").slice(0, 100),
    token_masuk: Math.max(0, Math.round(p.tokenMasuk)),
    token_keluar: Math.max(0, Math.round(p.tokenKeluar)),
    biaya_rp: Math.max(0, bulatRp(p.biayaRp)),
    durasi_ms: Math.max(0, Math.round(p.durasiMs)),
  };
}

interface KlienInsert {
  from(tabel: string): {
    insert(baris: Record<string, unknown>): PromiseLike<{ error: { message: string } | null }>;
  };
}

/**
 * Menyisipkan satu baris log. TIDAK PERNAH melempar: kegagalan pencatatan tidak boleh
 * menggagalkan fitur utama (jawaban sudah tampil / dokumen sudah siap); galat cukup di-log.
 * Untuk Tanya AI yang sukses, log ditulis atomik di fn_simpan_chat (pakai keBarisLog); fungsi
 * ini dipakai untuk fitur lain dan untuk Tanya AI yang gagal (is_sukses=false).
 */
export async function catatPemakaianAI(input: CatatPemakaianInput): Promise<void> {
  try {
    const klien = createAdminClient() as unknown as KlienInsert;
    const { error } = await klien.from("log_pemakaian_ai").insert({
      user_id: input.userId,
      dokumen_id: input.dokumenId ?? null,
      fitur: input.fitur,
      ...keBarisLog(input.pemakaian),
      is_sukses: input.isSukses,
    });
    if (error) console.error(`[ai] gagal mencatat pemakaian (${input.fitur}):`, error.message);
    if (!input.isSukses && input.pesanError) {
      console.warn(`[ai] panggilan ${input.fitur} gagal (user ${input.userId}):`, input.pesanError.slice(0, 300));
    }
  } catch (e) {
    console.error(`[ai] gagal mencatat pemakaian (${input.fitur}):`, e instanceof Error ? e.message : e);
  }
}

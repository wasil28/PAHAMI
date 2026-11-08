import "server-only";
import type OpenAI from "openai";
import { z } from "zod";
import { DEFAULT_AMBANG_RELEVANSI, JUMLAH_CHUNK_KONTEKS } from "@/lib/config";
import { createAdminClient } from "@/lib/supabase/admin";
import { embedPertanyaan, keVektorPg } from "@/lib/ai/embedding";
import { pemakaianKosong } from "@/lib/ai/biaya";
import type { OpsiPermintaanAI } from "@/lib/ai/tenggat";
import type { ChunkRelevan, Pemakaian } from "@/lib/ai/tipe";

// Pencarian chunk paling relevan untuk Tanya AI (BP-07 langkah 4–5, BR-16, F-14).

/**
 * SATU-SATUNYA tempat nama RPC & parameternya (FT-06 Q-FT06-05):
 *   fn_cari_chunk(p_dokumen_id int, p_embedding vector, p_k int DEFAULT 5)
 *   → (chunk_id, halaman_awal, halaman_akhir, isi, skor) urut skor menurun.
 * Bila migrasi memakai nama lain (mis. p_jumlah) atau menambah ambang (p_ambang), cukup ubah
 * di sini. `ambang: null` = ambang TIDAK dikirim ke DB, disaring di kode — sengaja, agar skor
 * tertinggi tetap diketahui walau di bawah ambang (disimpan ke t_chat.skor_relevansi untuk uji
 * akurasi BR-16).
 */
export const RPC_CARI_CHUNK = {
  nama: "fn_cari_chunk",
  param: {
    dokumenId: "p_dokumen_id",
    embedding: "p_embedding",
    jumlah: "p_k",
    ambang: null as string | null,
  },
} as const;

/** Klien minimal yang dibutuhkan (Supabase admin/server client memenuhi bentuk ini). */
export interface KlienRpc {
  rpc(fn: string, args: Record<string, unknown>): PromiseLike<{ data: unknown; error: { message: string } | null }>;
}

/** Baris hasil RPC — toleran nama kolom (chunk_id/id, skor/similarity). */
const skemaBaris = z
  .object({
    chunk_id: z.coerce.number().optional(),
    id: z.coerce.number().optional(),
    halaman_awal: z.coerce.number(),
    halaman_akhir: z.coerce.number(),
    isi: z.string(),
    urutan: z.coerce.number().optional(),
    skor: z.coerce.number().optional(),
    similarity: z.coerce.number().optional(),
  })
  .transform((b): ChunkRelevan | null => {
    const id = b.chunk_id ?? b.id;
    const skor = b.skor ?? b.similarity;
    if (id === undefined || skor === undefined) return null;
    return { id, isi: b.isi, halaman_awal: b.halaman_awal, halaman_akhir: b.halaman_akhir, urutan: b.urutan, skor };
  });

export interface OpsiPilihChunk {
  dokumenId: number;
  /** Pertanyaan (sudah mandiri) — di-embed di sini. Abaikan bila `embedding` diberikan. */
  pertanyaan?: string;
  embedding?: number[];
  /** Default JUMLAH_CHUNK_KONTEKS (5, BR-16). */
  jumlah?: number;
  /** Dari fn_pengaturan('ambang_relevansi'); default DEFAULT_AMBANG_RELEVANSI (0,50). */
  ambang?: number;
  klienDb?: KlienRpc;
  klienAI?: OpenAI;
  /** Tenggat permintaan chat (timeout pendek, coba ulang dikurangi). */
  permintaan?: OpsiPermintaanAI;
}

export interface HasilPilihChunk {
  /** Top-k bila skor tertinggi ≥ ambang; kosong → jawab MSG-C03 tanpa memanggil model (F-14). */
  chunks: ChunkRelevan[];
  /** Semua hasil RPC (top-k) sebelum disaring. */
  semua: ChunkRelevan[];
  /** Skor tertinggi (untuk t_chat.skor_relevansi); null bila dokumen tanpa chunk. */
  skorTertinggi: number | null;
  /** Pemakaian embedding pertanyaan (digabung ke log 'tanya_ai', A1). */
  pemakaian: Pemakaian;
}

/**
 * Embedding pertanyaan → RPC fn_cari_chunk (hanya dokumen itu, BR-16) → saring ambang.
 * @throws AiGagalError (embedding) | Error (RPC)
 */
export async function pilihChunkRelevan(opsi: OpsiPilihChunk): Promise<HasilPilihChunk> {
  const jumlah = opsi.jumlah ?? JUMLAH_CHUNK_KONTEKS;
  const ambang = opsi.ambang ?? DEFAULT_AMBANG_RELEVANSI;

  let vektor = opsi.embedding;
  let pemakaian = pemakaianKosong();
  if (!vektor) {
    if (!opsi.pertanyaan?.trim()) throw new Error("pilihChunkRelevan butuh pertanyaan atau embedding.");
    const e = await embedPertanyaan(opsi.pertanyaan, opsi.klienAI, opsi.permintaan);
    vektor = e.vektor;
    pemakaian = e.pemakaian;
  }

  const p = RPC_CARI_CHUNK.param;
  const args: Record<string, unknown> = {
    [p.dokumenId]: opsi.dokumenId,
    [p.embedding]: keVektorPg(vektor),
    [p.jumlah]: jumlah,
  };
  if (p.ambang) args[p.ambang] = ambang;

  // Service role: t_chunk tidak punya policy baca untuk pengguna. Pemanggil WAJIB sudah
  // memastikan dokumen milik pengguna & berstatus siap (BR-06, BR-07).
  const klien = opsi.klienDb ?? (createAdminClient() as unknown as KlienRpc);
  const { data, error } = await klien.rpc(RPC_CARI_CHUNK.nama, args);
  if (error) throw new Error(`RPC ${RPC_CARI_CHUNK.nama} gagal: ${error.message}`);

  const baris = Array.isArray(data) ? data : [];
  const semua = baris
    .map((b) => skemaBaris.safeParse(b))
    .map((r) => (r.success ? r.data : null))
    .filter((c): c is ChunkRelevan => c !== null)
    .sort((a, b) => b.skor - a.skor);

  // FT-06 Q-FT06-06: yang dibandingkan dengan ambang adalah skor TERTINGGI. Bila lolos, kelima
  // chunk teratas dikirim ke model (chunk berskor lebih rendah sering melengkapi konteks).
  const skorTertinggi = semua[0]?.skor ?? null;
  return {
    chunks: skorTertinggi !== null && skorTertinggi >= ambang ? semua : [],
    semua,
    skorTertinggi,
    pemakaian,
  };
}

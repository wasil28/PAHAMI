import "server-only";
import type OpenAI from "openai";
import type { EmbeddingCreateParams } from "openai/resources/embeddings";
import { getKlienAI, getModelEmbedding } from "@/lib/ai/client";
import { biayaDariUsage, gabungPemakaian } from "@/lib/ai/biaya";
import { UKURAN_BATCH_EMBEDDING } from "@/lib/ai/konfigurasi";
import { AiGagalError, type ParamOpenRouter, type UsageOpenRouter } from "@/lib/ai/panggil";
import { keOpsiSdk, type OpsiPermintaanAI } from "@/lib/ai/tenggat";
import type { Pemakaian } from "@/lib/ai/tipe";

// Embedding teks (BP-04 langkah 4 "mengindeks", BP-07 langkah 4). Dimensi WAJIB sama dengan
// kolom t_chunk.embedding vector(768) (KEPUTUSAN A5) — dicek per vektor agar galat skema
// ketahuan di sini, bukan saat INSERT.

export interface HasilEmbedding {
  vektor: number[][];
  tokenMasuk: number;
  /** Pemakaian gabungan semua batch → log fitur 'indeks' (BR-27). */
  pemakaian: Pemakaian;
}

/**
 * Membuat embedding untuk banyak teks secara batch (urutan keluaran = urutan masukan).
 * `permintaan` (opsional): sinyal tenggat + timeout/coba ulang per batch (pipeline & Tanya AI).
 * @throws AiGagalError (membawa pemakaian batch yang sudah berhasil)
 */
export async function embedTeks(
  teks: readonly string[],
  klien: OpenAI = getKlienAI(),
  permintaan?: OpsiPermintaanAI,
): Promise<HasilEmbedding> {
  const { model, dimensi } = getModelEmbedding();
  const vektor: number[][] = [];
  let pemakaian: Pemakaian = gabungPemakaian();
  pemakaian.model = model;

  for (let i = 0; i < teks.length; i += UKURAN_BATCH_EMBEDDING) {
    // API menolak string kosong; chunk kosong seharusnya tidak ada, tetapi jaga-jaga.
    const input = teks.slice(i, i + UKURAN_BATCH_EMBEDDING).map((t) => t.trim() || "-");
    const mulai = Date.now();
    const body: EmbeddingCreateParams & ParamOpenRouter = {
      model,
      input,
      dimensions: dimensi,
      encoding_format: "float", // OpenRouter mengembalikan float; cegah SDK meminta base64
      usage: { include: true },
    };
    try {
      if (permintaan?.signal?.aborted) throw new Error("Tenggat waktu habis sebelum embedding selesai.");
      const res = await klien.embeddings.create(body, keOpsiSdk(permintaan));
      const data = [...res.data].sort((a, b) => a.index - b.index);
      if (data.length !== input.length) {
        throw new Error(`Jumlah embedding ${data.length} ≠ masukan ${input.length}.`);
      }
      for (const d of data) {
        if (d.embedding.length !== dimensi) {
          throw new Error(`Dimensi embedding ${d.embedding.length} ≠ ${dimensi} (cek AI_EMBED_DIM & migrasi).`);
        }
        vektor.push(d.embedding);
      }
      const usage = res.usage as UsageOpenRouter | undefined;
      const tokenMasuk = usage?.prompt_tokens ?? 0;
      pemakaian = gabungPemakaian(pemakaian, {
        model,
        tokenMasuk,
        tokenKeluar: 0,
        biayaRp: biayaDariUsage(model, tokenMasuk, 0, usage?.cost),
        durasiMs: Date.now() - mulai,
      });
    } catch (e) {
      throw new AiGagalError("Gagal membuat embedding.", pemakaian, e);
    }
  }
  return { vektor, tokenMasuk: pemakaian.tokenMasuk, pemakaian };
}

/** Embedding satu pertanyaan (Tanya AI). */
export async function embedPertanyaan(
  teks: string,
  klien?: OpenAI,
  permintaan?: OpsiPermintaanAI,
): Promise<{ vektor: number[]; pemakaian: Pemakaian }> {
  const r = await embedTeks([teks], klien, permintaan);
  return { vektor: r.vektor[0], pemakaian: r.pemakaian };
}

/** Format literal pgvector: "[0.1,0.2,…]" (dikirim sebagai teks lalu di-cast ::vector). */
export function keVektorPg(v: readonly number[]): string {
  return `[${v.map((x) => (Number.isFinite(x) ? x : 0)).join(",")}]`;
}

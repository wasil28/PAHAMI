import "server-only";
import OpenAI from "openai";
import { AI_BATAS_WAKTU_MS, AI_MAKS_COBA_ULANG } from "@/lib/config";

// Semua panggilan AI lewat OpenRouter (API kompatibel OpenAI). Ganti model cukup lewat .env.local.

let klien: OpenAI | null = null;

export function getKlienAI(): OpenAI {
  if (!klien) {
    if (!process.env.OPENROUTER_API_KEY) console.warn("[ai] OPENROUTER_API_KEY belum diatur — semua fitur AI akan gagal.");
    klien = new OpenAI({
      baseURL: process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1",
      // Tanpa key, SDK melempar error saat konstruksi (di luar try pemanggil). Placeholder membuat
      // kegagalan terjadi saat request → tertangkap sebagai AiGagalError dan ditampilkan rapi.
      apiKey: process.env.OPENROUTER_API_KEY || "kunci-openrouter-belum-diatur",
      timeout: AI_BATAS_WAKTU_MS,
      maxRetries: AI_MAKS_COBA_ULANG, // BR-32: coba ulang maks. 2×
      defaultHeaders: { "X-Title": "Pahami" },
    });
  }
  return klien;
}

export type TingkatModel = "cepat" | "pro";

/** "cepat" = chat, ringkasan, soal · "pro" = penyusunan topik (butuh penalaran lebih). */
export function getModel(tingkat: TingkatModel = "cepat"): string {
  const cepat = process.env.AI_MODEL || "google/gemini-2.5-flash";
  return tingkat === "pro" ? process.env.AI_MODEL_PRO || cepat : cepat;
}

/** Model gambar termurah untuk sampul topik (dekoratif). */
export function getModelGambar(): string {
  return process.env.AI_MODEL_GAMBAR || "google/gemini-3.1-flash-lite-image";
}

export function getModelEmbedding(): { model: string; dimensi: number } {
  return {
    model: process.env.AI_EMBED_MODEL || "openai/text-embedding-3-small",
    dimensi: Number(process.env.AI_EMBED_DIM || 768), // harus sama dengan vector(768) di t_chunk
  };
}

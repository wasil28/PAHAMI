import "server-only";
import type OpenAI from "openai";
import { getKlienAI, getModelGambar } from "@/lib/ai/client";
import { BATAS_WAKTU_SAMPUL_MS } from "@/lib/ai/konfigurasi";
import { AiGagalError, pemakaianDariUsage, type UsageOpenRouter } from "@/lib/ai/panggil";
import { promptSampul } from "@/lib/ai/prompt/materi";
import type { Pemakaian } from "@/lib/ai/tipe";

// Gambar sampul topik lewat model gambar termurah di OpenRouter (KEPUTUSAN §4). Dekoratif:
// pemanggil menelan kegagalan dan halaman tetap memakai placeholder.

export interface HasilSampul {
  data: Buffer;
  mime: "image/jpeg" | "image/png" | "image/webp";
  ekstensi: "jpg" | "png" | "webp";
  pemakaian: Pemakaian;
}

/** Bentuk pesan OpenRouter untuk keluaran gambar (tidak ada di tipe SDK OpenAI). */
interface PesanDenganGambar {
  images?: { image_url?: { url?: string } }[];
}

const EKSTENSI: Record<HasilSampul["mime"], HasilSampul["ekstensi"]> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

/**
 * Membuat satu gambar sampul 16:9 tanpa teks.
 * @throws AiGagalError (membawa pemakaian bila model sudah ditagih)
 */
export async function buatSampul(judulTopik: string, gagasan: string, klien: OpenAI = getKlienAI()): Promise<HasilSampul> {
  const model = getModelGambar();
  const mulai = Date.now();
  let res;
  try {
    // Parameter khusus OpenRouter (modalities, image_config, usage) diteruskan apa adanya oleh SDK.
    const body = {
      model,
      modalities: ["image", "text"],
      image_config: { aspect_ratio: "16:9" },
      usage: { include: true },
      messages: [{ role: "user", content: promptSampul(judulTopik, gagasan) }],
    } as unknown as Parameters<OpenAI["chat"]["completions"]["create"]>[0];
    res = (await klien.chat.completions.create(body, { timeout: BATAS_WAKTU_SAMPUL_MS, maxRetries: 1 })) as OpenAI.ChatCompletion;
  } catch (e) {
    throw new AiGagalError("Model gambar gagal merespons.", { model, tokenMasuk: 0, tokenKeluar: 0, biayaRp: 0, durasiMs: Date.now() - mulai }, e);
  }

  const pemakaian = pemakaianDariUsage(res.model || model, res.usage as UsageOpenRouter | undefined, Date.now() - mulai);
  const url = (res.choices[0]?.message as PesanDenganGambar | undefined)?.images?.[0]?.image_url?.url ?? "";
  const cocok = /^data:(image\/(?:jpeg|png|webp));base64,([\s\S]+)$/.exec(url);
  if (!cocok) throw new AiGagalError("Model tidak mengembalikan gambar.", pemakaian);
  const mime = cocok[1] as HasilSampul["mime"];
  const data = Buffer.from(cocok[2], "base64");
  if (data.length === 0 || data.length > 5 * 1024 * 1024) throw new AiGagalError("Ukuran gambar tidak valid.", pemakaian);
  return { data, mime, ekstensi: EKSTENSI[mime], pemakaian };
}

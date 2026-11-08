import "server-only";
import type OpenAI from "openai";
import type {
  ChatCompletionCreateParamsNonStreaming,
  ChatCompletionMessageParam,
} from "openai/resources/chat/completions";
import { getKlienAI, getModel, type TingkatModel } from "@/lib/ai/client";
import { biayaDariUsage, gabungPemakaian } from "@/lib/ai/biaya";
import { AiFormatError } from "@/lib/ai/json";
import { COBA_ULANG_FORMAT } from "@/lib/ai/konfigurasi";
import { keOpsiSdk, type OpsiPermintaanAI } from "@/lib/ai/tenggat";
import type { Pemakaian } from "@/lib/ai/tipe";

export type { OpsiPermintaanAI } from "@/lib/ai/tenggat";

// Pembungkus panggilan chat non-streaming + pencatatan token/biaya. Coba ulang jaringan
// (maks. 2×, BR-32) ditangani SDK; di sini coba ulang bila FORMAT/validasi hasil salah.

/** Usage OpenRouter: field standar OpenAI + `cost` (USD) bila `usage: { include: true }`. */
export interface UsageOpenRouter {
  prompt_tokens?: number;
  completion_tokens?: number;
  cost?: number | null;
}

/** Parameter tambahan khusus OpenRouter (tidak ada di tipe SDK OpenAI). */
export interface ParamOpenRouter {
  usage?: { include: boolean };
}

/** Panggilan AI gagal permanen. Membawa pemakaian agar tetap bisa dicatat is_sukses=false (A1). */
export class AiGagalError extends Error {
  readonly pemakaian: Pemakaian;
  constructor(pesan: string, pemakaian: Pemakaian, sebab?: unknown) {
    super(pesan, sebab === undefined ? undefined : { cause: sebab });
    this.name = "AiGagalError";
    this.pemakaian = pemakaian;
  }
}

/** `signal`/`timeoutMs`/`maksCobaUlang` (OpsiPermintaanAI) menimpa bawaan klien — dipakai jalur bertenggat. */
export interface OpsiPanggilChat extends OpsiPermintaanAI {
  tingkat?: TingkatModel;
  pesan: ChatCompletionMessageParam[];
  suhu: number;
  maksToken: number;
  /** Minta model mengeluarkan objek JSON (response_format json_object). */
  json?: boolean;
}

export interface HasilPanggilChat {
  teks: string;
  pemakaian: Pemakaian;
  /** finish_reason "length" → keluaran terpotong batas token. */
  terpotong: boolean;
}

export function pemakaianDariUsage(model: string, usage: UsageOpenRouter | null | undefined, durasiMs: number): Pemakaian {
  const tokenMasuk = usage?.prompt_tokens ?? 0;
  const tokenKeluar = usage?.completion_tokens ?? 0;
  return {
    model,
    tokenMasuk,
    tokenKeluar,
    biayaRp: biayaDariUsage(model, tokenMasuk, tokenKeluar, usage?.cost),
    durasiMs,
  };
}

/** Satu panggilan chat completion. Galat jaringan dilempar sebagai AiGagalError. */
export async function panggilChat(opsi: OpsiPanggilChat, klien: OpenAI = getKlienAI()): Promise<HasilPanggilChat> {
  const model = getModel(opsi.tingkat ?? "cepat");
  const mulai = Date.now();
  const body: ChatCompletionCreateParamsNonStreaming & ParamOpenRouter = {
    model,
    messages: opsi.pesan,
    temperature: opsi.suhu,
    max_tokens: opsi.maksToken,
    usage: { include: true },
    ...(opsi.json ? { response_format: { type: "json_object" as const } } : {}),
  };
  try {
    const res = await klien.chat.completions.create(body, keOpsiSdk(opsi));
    const pilihan = res.choices[0];
    return {
      teks: pilihan?.message?.content ?? "",
      pemakaian: pemakaianDariUsage(res.model || model, res.usage as UsageOpenRouter | undefined, Date.now() - mulai),
      terpotong: pilihan?.finish_reason === "length",
    };
  } catch (e) {
    throw new AiGagalError("Layanan AI gagal merespons.", { model, tokenMasuk: 0, tokenKeluar: 0, biayaRp: 0, durasiMs: Date.now() - mulai }, e);
  }
}

/**
 * Memanggil AI lalu memproses hasil dengan `olah` (parse + validasi aturan bisnis). Bila `olah`
 * melempar AiFormatError, panggilan diulang maks. COBA_ULANG_FORMAT kali dengan pesan koreksi.
 * Pemakaian SEMUA percobaan dijumlah (biaya nyata), termasuk saat akhirnya gagal.
 */
export async function panggilDanOlah<T>(
  opsi: OpsiPanggilChat,
  olah: (teks: string) => T,
  klien?: OpenAI,
): Promise<{ hasil: T; pemakaian: Pemakaian }> {
  let pemakaian: Pemakaian | null = null;
  let pesan = opsi.pesan;
  let galatTerakhir: unknown = null;
  for (let percobaan = 0; percobaan <= COBA_ULANG_FORMAT; percobaan++) {
    let r: HasilPanggilChat;
    try {
      r = await panggilChat({ ...opsi, pesan }, klien);
    } catch (e) {
      const p = e instanceof AiGagalError ? e.pemakaian : null;
      throw new AiGagalError("Layanan AI gagal merespons.", gabungPemakaian(pemakaian, p), e);
    }
    pemakaian = gabungPemakaian(pemakaian, r.pemakaian);
    try {
      return { hasil: olah(r.teks), pemakaian };
    } catch (e) {
      if (!(e instanceof AiFormatError)) throw e;
      galatTerakhir = e;
      console.warn("[ai] format keluaran salah, diulang:", e.detail.slice(0, 300));
      // Beri tahu model kesalahannya agar percobaan berikut lebih mungkin valid.
      pesan = [
        ...opsi.pesan,
        { role: "assistant", content: r.teks.slice(0, 4_000) },
        {
          role: "user",
          content: `Keluaranmu belum memenuhi aturan: ${e.message} ${e.detail}`.trim() +
            "\nUlangi dan keluarkan HANYA JSON yang valid sesuai format di awal, tanpa teks lain.",
        },
      ];
    }
  }
  throw new AiGagalError("Keluaran AI tidak valid setelah dicoba ulang.", pemakaian ?? gabungPemakaian(), galatTerakhir);
}

import "server-only";
import type { Pemakaian } from "@/lib/ai/tipe";

// Estimasi biaya AI dalam Rupiah (BR-27, FT-11). Rumus:
//   biaya_rp = (token_masuk × harga_masuk + token_keluar × harga_keluar) / 1.000.000 × kurs
// Bila OpenRouter mengembalikan `usage.cost` (USD, aktif dengan `usage: { include: true }`),
// angka itu dipakai karena sudah memperhitungkan harga aktual penyedia.

interface HargaModel {
  /** USD per 1 juta token masukan. */
  masuk: number;
  /** USD per 1 juta token keluaran. */
  keluar: number;
}

/** Harga daftar OpenRouter (USD / 1 juta token). Perbarui bila harga penyedia berubah. */
export const HARGA_MODEL_USD: Readonly<Record<string, HargaModel>> = {
  "google/gemini-2.5-flash": { masuk: 0.3, keluar: 2.5 },
  "google/gemini-2.5-flash-lite": { masuk: 0.1, keluar: 0.4 },
  "openai/gpt-4.1-mini": { masuk: 0.4, keluar: 1.6 },
  "openai/gpt-4.1": { masuk: 2, keluar: 8 },
  // Model gambar: token keluaran gambar ± $30/1 juta (≈ $0,034 per gambar 16:9).
  "google/gemini-3.1-flash-lite-image": { masuk: 0.25, keluar: 30 },
  "openai/text-embedding-3-small": { masuk: 0.02, keluar: 0 },
};

/** Model tak dikenal dihitung dengan harga gemini-2.5-flash (sengaja konservatif / tidak meremehkan). */
export const HARGA_CADANGAN_USD: HargaModel = { masuk: 0.3, keluar: 2.5 };

export const KURS_USD_IDR_DEFAULT = 16_500;

export function getKursUsdIdr(): number {
  const kurs = Number(process.env.KURS_USD_IDR);
  return Number.isFinite(kurs) && kurs > 0 ? kurs : KURS_USD_IDR_DEFAULT;
}

export function getHargaModel(model: string): HargaModel {
  // OpenRouter kadang menambah akhiran varian (mis. ":free", ":nitro") → cocokkan nama dasar.
  const dasar = model.split(":")[0];
  return HARGA_MODEL_USD[model] ?? HARGA_MODEL_USD[dasar] ?? HARGA_CADANGAN_USD;
}

/** Biaya Rp dari jumlah token (dibulatkan 2 desimal sesuai numeric(12,2)). */
export function hitungBiayaRp(model: string, tokenMasuk: number, tokenKeluar: number): number {
  const h = getHargaModel(model);
  const usd = (tokenMasuk * h.masuk + tokenKeluar * h.keluar) / 1_000_000;
  return bulatRp(usd * getKursUsdIdr());
}

/** Biaya Rp dari `usage.cost` OpenRouter (USD) bila ada; selain itu dari tabel harga. */
export function biayaDariUsage(
  model: string,
  tokenMasuk: number,
  tokenKeluar: number,
  biayaUsd: number | null | undefined,
): number {
  if (typeof biayaUsd === "number" && Number.isFinite(biayaUsd) && biayaUsd >= 0) {
    return bulatRp(biayaUsd * getKursUsdIdr());
  }
  return hitungBiayaRp(model, tokenMasuk, tokenKeluar);
}

export function bulatRp(n: number): number {
  return Math.round(n * 100) / 100;
}

export function pemakaianKosong(model = ""): Pemakaian {
  return { model, tokenMasuk: 0, tokenKeluar: 0, biayaRp: 0, durasiMs: 0 };
}

/**
 * Menjumlahkan pemakaian beberapa panggilan menjadi satu (KEPUTUSAN A1: satu baris log per
 * pertanyaan / per proses). Kolom `model` diisi model generatif utama — panggilan dengan token
 * keluaran terbesar — agar statistik per model (FT-11) tidak terpecah oleh model embedding.
 */
export function gabungPemakaian(...daftar: readonly (Pemakaian | null | undefined)[]): Pemakaian {
  const ada = daftar.filter((p): p is Pemakaian => !!p);
  if (ada.length === 0) return pemakaianKosong();
  const utama = ada.reduce((a, b) => (b.tokenKeluar > a.tokenKeluar ? b : a), ada[0]);
  return {
    model: utama.model || ada.find((p) => p.model)?.model || "",
    tokenMasuk: ada.reduce((s, p) => s + p.tokenMasuk, 0),
    tokenKeluar: ada.reduce((s, p) => s + p.tokenKeluar, 0),
    biayaRp: bulatRp(ada.reduce((s, p) => s + p.biayaRp, 0)),
    durasiMs: ada.reduce((s, p) => s + p.durasiMs, 0),
  };
}

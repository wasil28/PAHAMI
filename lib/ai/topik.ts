import "server-only";
import type OpenAI from "openai";
import { AiFormatError, parseJsonAI } from "@/lib/ai/json";
import { SUHU_STRUKTUR, TOKEN_MAKS_TOPIK } from "@/lib/ai/konfigurasi";
import { panggilDanOlah, type OpsiPermintaanAI } from "@/lib/ai/panggil";
import { buatKerangkaDokumen, promptTopik, skemaTopikAI } from "@/lib/ai/prompt/topik";
import { cekAturanTopik, normalisasiTopik, type TopikBaru } from "@/lib/ai/topik-normalisasi";
import type { HalamanTeks, Pemakaian } from "@/lib/ai/tipe";

export type { TopikBaru } from "@/lib/ai/topik-normalisasi";

/**
 * Menyusun 1–15 topik berurutan dengan rentang halaman bersambung 1..N (BP-04 langkah 5, BR-09,
 * KEPUTUSAN B4). Memakai model "pro". Keluaran yang tak bisa diurai dicoba ulang (BR-32).
 * Pemakaian → log fitur 'topik'.
 * @throws AiGagalError (membawa pemakaian untuk log is_sukses=false)
 */
export async function susunTopik(
  halaman: readonly HalamanTeks[],
  jumlahHalaman: number,
  klien?: OpenAI,
  /** Tenggat pipeline (sinyal + timeout/coba ulang dikurangi), lihat lib/dokumen/jalankan.ts. */
  permintaan?: OpsiPermintaanAI,
): Promise<{ topik: TopikBaru[]; pemakaian: Pemakaian }> {
  const kerangka = buatKerangkaDokumen(halaman);
  const { hasil, pemakaian } = await panggilDanOlah(
    {
      tingkat: "pro",
      pesan: promptTopik(kerangka, jumlahHalaman),
      suhu: SUHU_STRUKTUR,
      maksToken: TOKEN_MAKS_TOPIK,
      json: true,
      ...permintaan,
    },
    (teks) => {
      const ai = parseJsonAI(teks, "object", skemaTopikAI);
      const topik = normalisasiTopik(ai.topik, jumlahHalaman);
      const galat = cekAturanTopik(topik, jumlahHalaman);
      if (galat.length) throw new AiFormatError("Daftar topik tidak memenuhi aturan.", galat.join(" "));
      return topik;
    },
    klien,
  );
  return { topik: hasil, pemakaian };
}

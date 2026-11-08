import "server-only";
import type OpenAI from "openai";
import { AiFormatError, parseJsonAI } from "@/lib/ai/json";
import {
  ANGGARAN_KARAKTER_KONTEKS_TOPIK,
  POIN_PENTING_MAKS,
  SUHU_FAKTUAL,
  TOKEN_MAKS_RINGKASAN,
} from "@/lib/ai/konfigurasi";
import { batasiKonteks, chunkDalamRentang, formatKonteks, labelHalaman, validasiRujukan } from "@/lib/ai/konteks";
import { AiGagalError, panggilDanOlah } from "@/lib/ai/panggil";
import { promptRingkasan, skemaRingkasanAI } from "@/lib/ai/prompt/ringkasan";
import { pemakaianKosong } from "@/lib/ai/biaya";
import type { ChunkSumber, Pemakaian, Rujukan, TopikRentang } from "@/lib/ai/tipe";

/** Siap disimpan: t_topik (konsep_inti, poin_penting, contoh) + t_topik_rujukan. */
export interface HasilRingkasan {
  konsep_inti: string;
  poin_penting: string[];
  contoh: string;
  /** Versi Markdown gabungan (opsional untuk tampilan/ekspor). */
  markdown: string;
  /** ≥ 1, semua di dalam rentang topik, urut halaman; `urutan` t_topik_rujukan = indeks + 1. */
  rujukan: Rujukan[];
  pemakaian: Pemakaian;
}

/**
 * Membuat ringkasan topik hanya dari chunk dalam rentang halaman topik (BP-05, BR-10, BR-30).
 * Rujukan di luar rentang dibuang; bila tidak tersisa satu pun → dianggap keluaran tidak valid
 * dan dicoba ulang. Pemakaian → log fitur 'ringkasan'.
 * @throws AiGagalError
 */
export async function buatRingkasan(
  topik: TopikRentang,
  chunks: readonly ChunkSumber[],
  klien?: OpenAI,
): Promise<HasilRingkasan> {
  const dalam = chunkDalamRentang(chunks, topik.halaman_awal, topik.halaman_akhir);
  if (dalam.length === 0) {
    throw new AiGagalError("Tidak ada teks dokumen pada rentang halaman topik.", pemakaianKosong());
  }
  const konteks = batasiKonteks(dalam, ANGGARAN_KARAKTER_KONTEKS_TOPIK);
  const rentang = { awal: topik.halaman_awal, akhir: topik.halaman_akhir };

  const { hasil, pemakaian } = await panggilDanOlah(
    {
      pesan: promptRingkasan(topik, formatKonteks(konteks)),
      suhu: SUHU_FAKTUAL,
      maksToken: TOKEN_MAKS_RINGKASAN,
      json: true,
    },
    (teks) => {
      const ai = parseJsonAI(teks, "object", skemaRingkasanAI);
      const rujukan = validasiRujukan(ai.rujukan, dalam, rentang).sort((a, b) => a.halaman - b.halaman);
      if (rujukan.length === 0) {
        throw new AiFormatError(
          "Rujukan halaman wajib berada di dalam rentang topik.",
          `Gunakan halaman di ${labelHalaman(topik.halaman_awal, topik.halaman_akhir)}.`,
        );
      }
      // Kelebihan butir dipangkas (bukan ditolak) agar tidak membuang biaya panggilan ulang.
      const poin = ai.poin_penting.slice(0, POIN_PENTING_MAKS);
      return { konsep_inti: ai.konsep_inti, poin_penting: poin, contoh: ai.contoh, rujukan };
    },
    klien,
  );

  return { ...hasil, markdown: keMarkdown(hasil), pemakaian };
}

function keMarkdown(r: { konsep_inti: string; poin_penting: string[]; contoh: string; rujukan: Rujukan[] }): string {
  return [
    "## Konsep inti",
    r.konsep_inti,
    "",
    "## Poin penting",
    ...r.poin_penting.map((p) => `- ${p}`),
    "",
    "## Contoh sehari-hari",
    r.contoh,
    "",
    "## Rujukan halaman",
    ...r.rujukan.map((x) => `- Hal. ${x.halaman}: "${x.kutipan}"`),
  ].join("\n");
}

import "server-only";
import { z } from "zod";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { POIN_PENTING_MAKS, POIN_PENTING_MIN } from "@/lib/ai/konfigurasi";
import { labelHalaman } from "@/lib/ai/konteks";
import { ATURAN_JSON, ATURAN_SUMBER, GAYA_BAHASA } from "@/lib/ai/prompt/umum";

// Prompt ringkasan topik (BP-05, F-09, BR-10, BR-30). Bentuk keluaran mengikuti kolom t_topik:
// konsep_inti (1 paragraf), poin_penting (3–5 butir), contoh (sehari-hari), + rujukan halaman.

export const skemaRingkasanAI = z.object({
  konsep_inti: z.string().trim().min(1),
  poin_penting: z.array(z.string().trim().min(1)).min(POIN_PENTING_MIN),
  contoh: z.string().trim().min(1),
  rujukan: z
    .array(
      z.object({
        halaman: z.coerce.number(),
        kutipan: z.string().optional().default(""),
      }),
    )
    .min(1),
});
export type RingkasanAI = z.infer<typeof skemaRingkasanAI>;

export function promptRingkasan(
  topik: { judul: string; halaman_awal: number; halaman_akhir: number },
  konteks: string,
): ChatCompletionMessageParam[] {
  const rentang = labelHalaman(topik.halaman_awal, topik.halaman_akhir);
  const sistem = `Kamu tutor yang merangkum materi buku ajar agar mudah dipahami mahasiswa Universitas Terbuka.

${ATURAN_SUMBER}

${GAYA_BAHASA}

ISI RINGKASAN:
- "konsep_inti": 1 paragraf (3–5 kalimat) yang menjelaskan gagasan utama topik.
- "poin_penting": ${POIN_PENTING_MIN}–${POIN_PENTING_MAKS} butir, masing-masing 1 kalimat. Boleh menebalkan istilah kunci dengan **dua bintang**.
- "contoh": 1 paragraf contoh penerapan dalam kehidupan sehari-hari. Utamakan contoh yang ADA di dokumen; bila dokumen tidak memberi contoh, buat ilustrasi sederhana yang setia pada konsep di dokumen tanpa menambah fakta baru.
- "rujukan": 1–5 rujukan. "halaman" = satu nomor halaman di dalam ${rentang} yang benar-benar memuat konsep tersebut; "kutipan" = salinan PERSIS 1–2 kalimat dari potongan (maks. 300 karakter), bukan parafrase.

${ATURAN_JSON}
Bentuk:
{"konsep_inti":"…","poin_penting":["…","…","…"],"contoh":"…","rujukan":[{"halaman":12,"kutipan":"…"}]}`;

  const pengguna = `Topik: "${topik.judul}" (${rentang}).

Potongan dokumen:

${konteks}`;

  return [
    { role: "system", content: sistem },
    { role: "user", content: pengguna },
  ];
}

import "server-only";
import { z } from "zod";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { JUMLAH_PILIHAN, JUMLAH_SOAL } from "@/lib/config";
import { labelHalaman } from "@/lib/ai/konteks";
import { ATURAN_JSON, ATURAN_SUMBER, GAYA_BAHASA } from "@/lib/ai/prompt/umum";

// Prompt soal latihan (BP-06, BR-11, BR-30): 5 soal PG, 4 pilihan, 1 kunci, pembahasan, rujukan
// halaman dalam rentang topik. Validasi ketat dilakukan di soal.ts (bukan di skema ini) agar
// pesan koreksi ke model bisa spesifik.

export const skemaSoalAI = z.object({
  soal: z
    .array(
      z.object({
        pertanyaan: z.string(),
        pilihan: z.array(z.string()),
        kunci: z.union([z.string(), z.number()]),
        pembahasan: z.string(),
        halaman_rujukan: z.coerce.number(),
      }),
    )
    .min(1),
});
export type SoalAI = z.infer<typeof skemaSoalAI>;

export function promptSoal(
  topik: { judul: string; halaman_awal: number; halaman_akhir: number },
  konteks: string,
): ChatCompletionMessageParam[] {
  const rentang = labelHalaman(topik.halaman_awal, topik.halaman_akhir);
  const sistem = `Kamu penyusun soal latihan pilihan ganda untuk mahasiswa Universitas Terbuka.

${ATURAN_SUMBER}

${GAYA_BAHASA}

ATURAN SOAL:
- Buat TEPAT ${JUMLAH_SOAL} soal pilihan ganda tentang topik, mencakup bagian-bagian berbeda dari potongan (jangan menumpuk di satu halaman).
- Tiap soal: "pertanyaan" jelas dan berdiri sendiri; "pilihan" berisi TEPAT ${JUMLAH_PILIHAN} teks jawaban berbeda TANPA awalan huruf (jangan tulis "A." dst.); "kunci" = huruf A, B, C, atau D yang menunjuk satu-satunya jawaban benar; sebar posisi kunci (jangan selalu A).
- Pengecoh masuk akal tetapi jelas salah menurut dokumen. Hindari "semua benar"/"semua salah".
- Utamakan pemahaman konsep, bukan hafalan angka atau halaman.
- "pembahasan": 1–3 kalimat mengapa kunci benar (dan bila perlu mengapa pengecoh salah), berdasarkan dokumen.
- "halaman_rujukan": satu nomor halaman di dalam ${rentang}, dari label potongan yang memuat jawabannya.

${ATURAN_JSON}
Bentuk:
{"soal":[{"pertanyaan":"…","pilihan":["…","…","…","…"],"kunci":"B","pembahasan":"…","halaman_rujukan":12}]}`;

  const pengguna = `Topik: "${topik.judul}" (${rentang}).

Potongan dokumen:

${konteks}`;

  return [
    { role: "system", content: sistem },
    { role: "user", content: pengguna },
  ];
}

// Skema latihan (BR-11, BR-12, BR-33). Pilihan dikirim sebagai indeks 0..3 (A–D)
// sesuai pilihan asli soal di DB; urutan tampil yang diacak hanya urusan UI.

import { z } from "zod";
import { JUMLAH_PILIHAN, JUMLAH_SOAL } from "@/lib/config";
import { PESAN } from "@/lib/pesan";
import { skemaId } from "./common";

/** Indeks pilihan 0..JUMLAH_PILIHAN-1 (BR-11: 4 pilihan). */
export const skemaPilihan = z
  .number({ error: PESAN["MSG-L07"] })
  .int(PESAN["MSG-V06"])
  .min(0, PESAN["MSG-V06"])
  .max(JUMLAH_PILIHAN - 1, PESAN["MSG-V06"]);

export const skemaJawabanSoal = z.object({
  soalId: skemaId,
  pilihan: skemaPilihan,
});
export type JawabanSoal = z.output<typeof skemaJawabanSoal>;

/**
 * Body POST /api/latihan. Percobaan hanya disimpan bila SEMUA soal terjawab (BR-33):
 * jumlah jawaban harus tepat JUMLAH_SOAL dan tiap soal hanya sekali → selain itu MSG-L07.
 * Skor tetap dihitung ulang di server dari kunci (KEPUTUSAN B8).
 */
export const skemaSimpanLatihan = z.object({
  topikId: skemaId,
  jawaban: z
    .array(skemaJawabanSoal, { error: PESAN["MSG-L07"] })
    .length(JUMLAH_SOAL, PESAN["MSG-L07"])
    .refine((daftar) => new Set(daftar.map((j) => j.soalId)).size === daftar.length, {
      error: PESAN["MSG-L07"],
    }),
});
export type DataSimpanLatihan = z.output<typeof skemaSimpanLatihan>;

/** Body POST /api/latihan/periksa — memeriksa satu soal (umpan balik S-09). */
export const skemaPeriksaJawaban = skemaJawabanSoal;
export type DataPeriksaJawaban = JawabanSoal;

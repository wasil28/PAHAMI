// Skema Tanya AI (BR-18). Kuota harian (BR-17) dicek di server, bukan di skema.

import { z } from "zod";
import { PERTANYAAN_MAX, PERTANYAAN_MIN } from "@/lib/config";
import { PESAN } from "@/lib/pesan";
import { skemaId } from "./common";

/** Pertanyaan 3–500 karakter setelah dipangkas; hanya spasi → kosong → MSG-C01. */
export const skemaPertanyaan = z
  .string({ error: PESAN["MSG-C01"] })
  .trim()
  .min(PERTANYAAN_MIN, PESAN["MSG-C01"])
  .max(PERTANYAAN_MAX, PESAN["MSG-C01"]);

/** Body POST /api/dokumen/[id]/chat. topikId opsional = konteks topik yang sedang dibuka. */
export const skemaKirimPertanyaan = z.object({
  pertanyaan: skemaPertanyaan,
  topikId: skemaId.optional(),
});
export type DataKirimPertanyaan = z.output<typeof skemaKirimPertanyaan>;

/** Tombol kirim aktif hanya bila pertanyaan valid (S-08: tanpa pesan untuk input kosong). */
export function pertanyaanValid(teks: string): boolean {
  return skemaPertanyaan.safeParse(teks).success;
}

/** Query GET riwayat chat dengan kursor (?sebelum=ISO&sebelumId=7001), BR-19. */
export const skemaRiwayatChatQuery = z.object({
  sebelum: z.iso.datetime({ offset: true, error: PESAN["MSG-V06"] }).optional(),
  sebelumId: z.coerce.number().int().positive(PESAN["MSG-V06"]).optional(),
});
export type QueryRiwayatChat = z.output<typeof skemaRiwayatChatQuery>;

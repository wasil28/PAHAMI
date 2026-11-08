// Skema & helper validasi bersama. File ini aman untuk klien (tanpa next/server);
// helper Route Handler (parseBody, parseSearchParams) ada di ./permintaan.ts.

import { z } from "zod";
import { PESAN } from "@/lib/pesan";

/** ID numerik dari parameter rute / body (string "12" atau angka 12) → bilangan bulat positif. */
export const skemaId = z.coerce
  .number({ error: PESAN["MSG-V06"] })
  .int(PESAN["MSG-V06"])
  .positive(PESAN["MSG-V06"])
  .max(Number.MAX_SAFE_INTEGER, PESAN["MSG-V06"]);

/** Alias sesuai istilah rute: `const id = parseIdParam((await props.params).id)`. */
export const idParam = skemaId;

/**
 * Parameter rute → id atau null. Route Handler membalas 404 bila null
 * (BR-06: id tidak valid diperlakukan sama dengan data yang tidak ada).
 */
export function parseIdParam(nilai: string | undefined): number | null {
  if (nilai === undefined || !/^\d+$/.test(nilai)) return null;
  const hasil = skemaId.safeParse(nilai);
  return hasil.success ? hasil.data : null;
}

/** Nomor halaman paging dari query (?halaman=2); salah/kosong → 1. */
export const skemaHalaman = z.coerce.number().int().min(1).catch(1);

/** Pesan isu pertama — langsung bisa ditampilkan (semua pesan skema diambil dari PESAN). */
export function pesanErrorPertama(err: z.ZodError): string {
  return err.issues[0]?.message ?? PESAN["MSG-V06"];
}

/** Satu pesan per kolom (isu pertama tiap path) untuk menampilkan error di bawah input form. */
export function errorPerKolom(err: z.ZodError): Record<string, string> {
  const hasil: Record<string, string> = {};
  for (const isu of err.issues) {
    const kunci = isu.path.map(String).join(".") || "_form";
    if (!(kunci in hasil)) hasil[kunci] = isu.message;
  }
  return hasil;
}

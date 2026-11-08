// Skema akun: daftar, masuk, lupa/atur ulang sandi, ubah nama, ubah sandi (BR-22, BR-36).
// Dipakai form S-02..S-05, S-13 dan API /api/auth/*, /api/profil*.

import { z } from "zod";
import { NAMA_MAX, NAMA_MIN, SANDI_MIN } from "@/lib/config";
import { LABEL_KOLOM, PESAN, pesanWajib } from "@/lib/pesan";

// ── Kolom dasar ───────────────────────────────────────────────────

/** Nama 3–60 karakter setelah dipangkas; spasi ganda dirapikan (MSG-V01/V03). */
export const skemaNama = z
  .string({ error: pesanWajib(LABEL_KOLOM.nama) })
  .trim()
  .transform((s) => s.replace(/\s+/g, " "))
  .pipe(
    z
      .string()
      .min(1, pesanWajib(LABEL_KOLOM.nama))
      .min(NAMA_MIN, PESAN["MSG-V03"])
      .max(NAMA_MAX, PESAN["MSG-V03"]),
  );

/** Email dipangkas & huruf kecil agar unik tidak peka huruf besar (MSG-V01/V02). */
export const skemaEmail = z
  .string({ error: pesanWajib(LABEL_KOLOM.email) })
  .trim()
  .toLowerCase()
  .min(1, pesanWajib(LABEL_KOLOM.email))
  .pipe(z.email(PESAN["MSG-V02"]));

/** Sandi kuat: ≥ 8 karakter, mengandung huruf DAN angka (BR-22, MSG-V04). Tidak dipangkas. */
export function skemaSandiKuat(label: string = LABEL_KOLOM.sandi) {
  return z
    .string({ error: pesanWajib(label) })
    .min(1, pesanWajib(label))
    .min(SANDI_MIN, PESAN["MSG-V04"])
    .regex(/\p{L}/u, PESAN["MSG-V04"])
    .regex(/\p{Nd}/u, PESAN["MSG-V04"]);
}

/** Sandi hanya wajib diisi (layar Masuk & sandi lama tidak dicek kekuatannya). */
function skemaSandiWajib(label: string) {
  return z.string({ error: pesanWajib(label) }).min(1, pesanWajib(label));
}

/** Cek sandi kuat untuk indikator kekuatan di S-03 tanpa memicu Zod. */
export function sandiMemenuhiAturan(sandi: string): boolean {
  return skemaSandiKuat().safeParse(sandi).success;
}

// ── Skema form / API ─────────────────────────────────────────────

export const skemaDaftar = z
  .object({
    nama: skemaNama,
    email: skemaEmail,
    sandi: skemaSandiKuat(),
    konfirmasiSandi: skemaSandiWajib(LABEL_KOLOM.konfirmasiSandi),
  })
  .refine((d) => d.sandi === d.konfirmasiSandi, {
    error: PESAN["MSG-V05"],
    path: ["konfirmasiSandi"],
  });
export type InputDaftar = z.input<typeof skemaDaftar>;
export type DataDaftar = z.output<typeof skemaDaftar>;

export const skemaMasuk = z.object({
  email: skemaEmail,
  sandi: skemaSandiWajib(LABEL_KOLOM.sandi),
});
export type DataMasuk = z.output<typeof skemaMasuk>;

export const skemaLupaSandi = z.object({ email: skemaEmail });
export type DataLupaSandi = z.output<typeof skemaLupaSandi>;

export const skemaAturUlangSandi = z
  .object({
    sandi: skemaSandiKuat(LABEL_KOLOM.sandiBaru),
    konfirmasiSandi: skemaSandiWajib(LABEL_KOLOM.konfirmasiSandi),
  })
  .refine((d) => d.sandi === d.konfirmasiSandi, {
    error: PESAN["MSG-V05"],
    path: ["konfirmasiSandi"],
  });
export type DataAturUlangSandi = z.output<typeof skemaAturUlangSandi>;

/** Email sengaja tidak ada di skema — email tidak dapat diubah (BR-36). */
export const skemaUbahNama = z.object({ nama: skemaNama });
export type DataUbahNama = z.output<typeof skemaUbahNama>;

export const skemaUbahSandi = z
  .object({
    sandiLama: skemaSandiWajib(LABEL_KOLOM.sandiLama),
    sandiBaru: skemaSandiKuat(LABEL_KOLOM.sandiBaru),
    konfirmasiSandi: skemaSandiWajib(LABEL_KOLOM.konfirmasiSandi),
  })
  .refine((d) => d.sandiBaru === d.konfirmasiSandi, {
    error: PESAN["MSG-V05"],
    path: ["konfirmasiSandi"],
  });
export type DataUbahSandi = z.output<typeof skemaUbahSandi>;

// Skema dokumen: buat (unggah) & ganti nama (BR-01, BR-02, BR-21).
// Batas ukuran berasal dari m_pengaturan_sistem.max_ukuran_mb saat aksi (BR-02, BR-28),
// jadi skema unggah dibuat lewat factory, bukan konstanta.

import { z } from "zod";
import { JUDUL_DOKUMEN_MAX, JUDUL_DOKUMEN_MIN, TIPE_FILE_DIIZINKAN } from "@/lib/config";
import { BYTE_PER_MB } from "@/lib/format";
import { PESAN, pesan, type KodePesan } from "@/lib/pesan";

const EKSTENSI_PDF = /\.pdf$/i;
const NAMA_FILE_MAX = 255; // batas umum sistem berkas

/** Judul 3–100 karakter setelah dipangkas (BR-21, MSG-U04). */
export const skemaJudulDokumen = z
  .string({ error: PESAN["MSG-U04"] })
  .trim()
  .min(JUDUL_DOKUMEN_MIN, PESAN["MSG-U04"])
  .max(JUDUL_DOKUMEN_MAX, PESAN["MSG-U04"]);

/** Judul default S-11: nama file tanpa ".pdf", dipotong ke batas maksimum. */
export function judulDariNamaFile(namaFile: string): string {
  return namaFile.trim().replace(EKSTENSI_PDF, "").trim().slice(0, JUDUL_DOKUMEN_MAX).trim();
}

export function batasUkuranByte(maxUkuranMb: number): number {
  return maxUkuranMb * BYTE_PER_MB;
}

/**
 * Body POST /api/dokumen. Judul opsional; bila kosong diisi dari nama file
 * lalu tetap dicek 3–100 karakter (BR-21).
 */
export function skemaBuatDokumen(maxUkuranMb: number) {
  const pesanUkuran = pesan("MSG-U02", { max_ukuran_mb: maxUkuranMb });
  return z
    .object({
      judul: z.string({ error: PESAN["MSG-U04"] }).trim().optional(),
      namaFile: z
        .string({ error: PESAN["MSG-U01"] })
        .trim()
        .min(1, PESAN["MSG-U01"])
        .max(NAMA_FILE_MAX, PESAN["MSG-U01"])
        .regex(EKSTENSI_PDF, PESAN["MSG-U01"]),
      tipe: z.literal(TIPE_FILE_DIIZINKAN, { error: PESAN["MSG-U01"] }), // BR-01
      ukuranByte: z
        .number({ error: PESAN["MSG-V06"] })
        .int(PESAN["MSG-V06"])
        .positive(PESAN["MSG-U01"]) // file 0 byte bukan PDF yang sah
        .max(batasUkuranByte(maxUkuranMb), pesanUkuran), // BR-02
    })
    .transform((d, ctx) => {
      const judul = d.judul ? d.judul : judulDariNamaFile(d.namaFile);
      if (judul.length < JUDUL_DOKUMEN_MIN || judul.length > JUDUL_DOKUMEN_MAX) {
        ctx.issues.push({ code: "custom", message: PESAN["MSG-U04"], path: ["judul"], input: d.judul });
        return z.NEVER;
      }
      return { ...d, judul };
    });
}
export type InputBuatDokumen = z.input<ReturnType<typeof skemaBuatDokumen>>;
export type DataBuatDokumen = z.output<ReturnType<typeof skemaBuatDokumen>>;

/** Body PATCH /api/dokumen/[id] (dialog Ganti nama S-06/S-07 → MSG-D01). */
export const skemaUbahJudul = z.object({ judul: skemaJudulDokumen });
export type DataUbahJudul = z.output<typeof skemaUbahJudul>;

export interface FileDipilih {
  name: string;
  type: string;
  size: number;
}

/**
 * Cek file di klien saat dipilih/diseret (S-11). Mengembalikan kode pesan atau null bila valid.
 * Server tetap memvalidasi ulang lewat skemaBuatDokumen (klien bisa diakali).
 */
export function validasiFilePdf(file: FileDipilih, maxUkuranMb: number): KodePesan | null {
  // BR-01: ekstensi .pdf DAN tipe application/pdf.
  if (!EKSTENSI_PDF.test(file.name) || file.type !== TIPE_FILE_DIIZINKAN || file.size <= 0) {
    return "MSG-U01";
  }
  if (file.size > batasUkuranByte(maxUkuranMb)) return "MSG-U02"; // BR-02
  return null;
}

/** Sama dengan validasiFilePdf tetapi langsung berupa teks siap tampil. */
export function pesanValidasiFilePdf(file: FileDipilih, maxUkuranMb: number): string | null {
  const kode = validasiFilePdf(file, maxUkuranMb);
  if (kode === "MSG-U02") return pesan("MSG-U02", { max_ukuran_mb: maxUkuranMb });
  return kode ? PESAN[kode] : null;
}

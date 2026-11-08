import { z } from "zod";
import { skemaHalaman } from "@/lib/validasi/common";
import {
  CATATAN_QC_MAX,
  DESKRIPSI_QC_MAX,
  JUDUL_QC_MAX,
  JUDUL_QC_MIN,
  KATEGORI_QC,
  PRIORITAS_QC,
  STATUS_QC,
  type KategoriQc,
  type PrioritasQc,
  type StatusQc,
} from "@/lib/qc/tipe";

// Validasi Laporan QC (KEPUTUSAN §4). Aman untuk klien.

const kategori = Object.keys(KATEGORI_QC) as [KategoriQc, ...KategoriQc[]];
const prioritas = Object.keys(PRIORITAS_QC) as [PrioritasQc, ...PrioritasQc[]];
const status = Object.keys(STATUS_QC) as [StatusQc, ...StatusQc[]];

const skemaInfoPerangkat = z
  .object({
    userAgent: z.string().max(400).catch(""),
    lebarLayar: z.coerce.number().int().min(0).max(20000).catch(0),
    tinggiLayar: z.coerce.number().int().min(0).max(20000).catch(0),
    tema: z.enum(["terang", "gelap"]).catch("terang"),
  })
  .nullable()
  .catch(null);

export const skemaBuatLaporanQc = z.object({
  judul: z
    .string({ error: "Judul wajib diisi." })
    .trim()
    .min(JUDUL_QC_MIN, `Judul minimal ${JUDUL_QC_MIN} karakter.`)
    .max(JUDUL_QC_MAX, `Judul maksimal ${JUDUL_QC_MAX} karakter.`),
  deskripsi: z
    .string({ error: "Deskripsi wajib diisi." })
    .trim()
    .min(1, "Deskripsi wajib diisi.")
    .max(DESKRIPSI_QC_MAX, `Deskripsi maksimal ${DESKRIPSI_QC_MAX} karakter.`),
  kategori: z.enum(kategori, { error: "Pilih kategori." }),
  prioritas: z.enum(prioritas, { error: "Pilih prioritas." }).default("sedang"),
  /** Path + query halaman tempat temuan (bukan URL penuh dari domain lain). */
  urlHalaman: z
    .string()
    .trim()
    .max(500)
    .refine((u) => u.startsWith("/") && !u.startsWith("//"), "Alamat halaman tidak valid.")
    .catch("/"),
  infoPerangkat: z
    .string()
    .optional()
    .transform((s) => {
      try {
        return s ? (JSON.parse(s) as unknown) : null;
      } catch {
        return null;
      }
    })
    .pipe(skemaInfoPerangkat),
});
export type DataBuatLaporanQc = z.output<typeof skemaBuatLaporanQc>;

export const skemaUbahLaporanQc = z
  .object({
    status: z.enum(status, { error: "Status tidak valid." }).optional(),
    prioritas: z.enum(prioritas, { error: "Prioritas tidak valid." }).optional(),
    catatanTim: z.string().max(CATATAN_QC_MAX, `Catatan maksimal ${CATATAN_QC_MAX} karakter.`).optional(),
  })
  .refine((d) => d.status !== undefined || d.prioritas !== undefined || d.catatanTim !== undefined, "Tidak ada perubahan.");

export const skemaFilterQc = z.object({
  status: z.enum(status).optional().catch(undefined),
  kategori: z.enum(kategori).optional().catch(undefined),
  halaman: skemaHalaman.default(1),
});

export const skemaAturPenguji = z.object({
  email: z.string({ error: "Email wajib diisi." }).trim().toLowerCase().email("Format email tidak valid."),
  penguji: z.boolean(),
});

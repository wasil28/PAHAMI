// Skema area admin: kelola pengguna (BR-23/24), pengaturan kuota (BR-28/29), statistik (BR-27).

import { z } from "zod";
import {
  DEFAULT_MAX_DOKUMEN,
  DEFAULT_MAX_HALAMAN,
  DEFAULT_MAX_PERTANYAAN_HARIAN,
  DEFAULT_MAX_UKURAN_MB,
  PERAN,
} from "@/lib/config";
import { PESAN, pesan, pesanWajib } from "@/lib/pesan";
import { skemaHalaman, skemaId } from "./common";

// ── Kelola pengguna (S-15) ───────────────────────────────────────

/** Body PATCH /api/admin/pengguna/[id]/status. BR-24 (bukan admin) dicek di server. */
export const skemaUbahStatusPengguna = z.object({
  userId: skemaId,
  isActive: z.boolean({ error: PESAN["MSG-V06"] }),
});
export type DataUbahStatusPengguna = z.output<typeof skemaUbahStatusPengguna>;

/** Bagian body saja (userId diambil dari parameter rute). */
export const skemaBodyUbahStatusPengguna = skemaUbahStatusPengguna.pick({ isActive: true });

export const FILTER_STATUS_PENGGUNA = ["semua", "aktif", "nonaktif"] as const;
export const URUTAN_PENGGUNA = ["terbaru", "terlama", "nama"] as const; // default terbaru (KEPUTUSAN C7)
export const PENGGUNA_PER_HALAMAN = 20; // S-15 paging
export const CARI_PENGGUNA_MAX = 100;

/**
 * Query GET /api/admin/pengguna (dari URLSearchParams). Nilai salah tidak ditolak, tetapi
 * kembali ke default agar URL yang diketik manual tetap menampilkan daftar.
 */
export const skemaDaftarPenggunaQuery = z.object({
  q: z
    .string()
    .trim()
    .transform((s) => s.slice(0, CARI_PENGGUNA_MAX))
    .catch("")
    .default(""),
  status: z.enum(FILTER_STATUS_PENGGUNA).catch("semua").default("semua"),
  peran: z.enum([PERAN.MAHASISWA, PERAN.ADMIN]).optional().catch(undefined),
  halaman: skemaHalaman.default(1),
  urut: z.enum(URUTAN_PENGGUNA).catch("terbaru").default("terbaru"),
});
export type QueryDaftarPengguna = z.output<typeof skemaDaftarPenggunaQuery>;

// ── Pengaturan kuota (S-16) ──────────────────────────────────────

/**
 * Rentang BR-29 per kode m_pengaturan_sistem (FT-10). Diekspor agar UI menampilkan
 * "Default {d} · Rentang {min}–{maks}" tanpa mengode ulang angka.
 * Catatan: DB juga menyimpan nilai_min/nilai_max; keduanya harus sama dengan tabel ini.
 */
export const RENTANG_PENGATURAN = {
  max_dokumen: {
    min: 1,
    maks: 50,
    bawaan: DEFAULT_MAX_DOKUMEN,
    satuan: "dokumen",
    label: "Maks. dokumen per mahasiswa",
    dampak: "Memengaruhi ruang penyimpanan & biaya pengolahan.",
  },
  max_halaman: {
    min: 10,
    // BR-29 (KEPUTUSAN §4): 500 halaman masih muat dalam tenggat pipeline ±270 dtk
    // (maxDuration 300 dtk); 1.000 halaman berisiko terhenti di tengah jalan.
    maks: 500,
    bawaan: DEFAULT_MAX_HALAMAN,
    satuan: "halaman",
    label: "Maks. halaman per dokumen",
    dampak: "Memengaruhi lama proses & biaya indeks.",
  },
  max_ukuran_mb: {
    min: 1,
    maks: 100,
    bawaan: DEFAULT_MAX_UKURAN_MB,
    satuan: "MB",
    label: "Maks. ukuran file",
    dampak: "Memengaruhi kapasitas penyimpanan.",
  },
  max_pertanyaan_harian: {
    min: 1,
    maks: 500,
    bawaan: DEFAULT_MAX_PERTANYAAN_HARIAN,
    satuan: "pertanyaan",
    label: "Maks. pertanyaan AI per hari",
    dampak: "Memengaruhi biaya AI harian.",
  },
} as const;

export type KodePengaturan = keyof typeof RENTANG_PENGATURAN;
export const KODE_PENGATURAN = Object.keys(RENTANG_PENGATURAN) as KodePengaturan[];

const POLA_BILANGAN_BULAT = /^\d+$/;

/**
 * Satu nilai kuota dari input form (string) atau JSON (number):
 * kosong → MSG-V01 "{label} wajib diisi." · bukan bulat / di luar rentang → MSG-K02 (BR-29).
 */
export function skemaNilaiPengaturan(kode: KodePengaturan) {
  const { min, maks, label } = RENTANG_PENGATURAN[kode];
  const pesanWajibIsi = pesanWajib(label);
  // Angka rentang tanpa pemisah ribuan ("1000") agar sama dengan isian (FT-10 §3A.5).
  const pesanRentang = pesan("MSG-K02", { min, maks });
  return z
    .union([z.number(), z.string()], { error: pesanWajibIsi })
    .transform((v, ctx): number => {
      const teks = typeof v === "number" ? String(v) : v.trim();
      if (teks === "") {
        ctx.issues.push({ code: "custom", message: pesanWajibIsi, input: v });
        return z.NEVER;
      }
      const n = Number(teks);
      if (!POLA_BILANGAN_BULAT.test(teks) || n < min || n > maks) {
        ctx.issues.push({ code: "custom", message: pesanRentang, input: v });
        return z.NEVER;
      }
      return n;
    });
}

/**
 * Body PUT /api/admin/pengaturan: { nilai: { max_dokumen: 8, … }, versi }.
 * Boleh sebagian kode, minimal satu. `versi` = updated_at terbaru yang dilihat admin
 * → server membalas 409 + MSG-K05 bila sudah diubah admin lain (KEPUTUSAN B14).
 */
export const skemaUbahPengaturan = z.object({
  nilai: z
    .strictObject(
      {
        max_dokumen: skemaNilaiPengaturan("max_dokumen").optional(),
        max_halaman: skemaNilaiPengaturan("max_halaman").optional(),
        max_ukuran_mb: skemaNilaiPengaturan("max_ukuran_mb").optional(),
        max_pertanyaan_harian: skemaNilaiPengaturan("max_pertanyaan_harian").optional(),
      },
      { error: PESAN["MSG-V06"] },
    )
    .refine((n) => Object.values(n).some((v) => v !== undefined), { error: PESAN["MSG-V06"] }),
  versi: z.iso.datetime({ offset: true, error: PESAN["MSG-V06"] }).nullish(),
});
export type InputUbahPengaturan = z.input<typeof skemaUbahPengaturan>;
export type DataUbahPengaturan = z.output<typeof skemaUbahPengaturan>;

/** Query GET /api/admin/pengaturan/estimasi-biaya?maxPertanyaan=40. */
export const skemaEstimasiBiayaQuery = z.object({
  maxPertanyaan: skemaNilaiPengaturan("max_pertanyaan_harian").optional(),
});
export type QueryEstimasiBiaya = z.output<typeof skemaEstimasiBiayaQuery>;

// ── Statistik (S-14) ─────────────────────────────────────────────

export const RENTANG_STATISTIK = [7, 30] as const;
export type RentangStatistik = (typeof RENTANG_STATISTIK)[number];

/** Query GET statistik ?rentang=7|30 (hari kalender WIB, KEPUTUSAN B11); default 30 (FT-11/BP-13). */
export const skemaStatistikQuery = z.object({
  rentang: z
    .enum(["7", "30"])
    .catch("30")
    .default("30")
    .transform((v): RentangStatistik => (v === "7" ? 7 : 30)),
});
export type QueryStatistik = z.output<typeof skemaStatistikQuery>;

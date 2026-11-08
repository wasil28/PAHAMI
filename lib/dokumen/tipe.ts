// Tipe data dokumen untuk UI & API FT-02/FT-03. Aman dipakai di klien (tanpa server-only).
// Kolom status/tahap di types/database.ts bertipe string → dipersempit lewat helper di bawah.

import { STATUS_DOKUMEN, STATUS_TOPIK, TAHAP_DOKUMEN, type StatusDokumen, type StatusTopik, type TahapDokumen } from "@/lib/pesan";

export type { StatusDokumen, StatusTopik, TahapDokumen };

/** Bentuk balasan GET /api/dokumen/[id] (polling S-11/S-06/S-07). */
export interface StatusDokumenApi {
  id: number;
  kode: string;
  judul: string;
  status: StatusDokumen;
  tahap: TahapDokumen | null;
  pesanGagal: string | null;
  jumlahHalaman: number | null;
  jumlahTopik: number | null;
}

/** Satu kartu dokumen di S-06. */
export interface RingkasanDokumen extends StatusDokumenApi {
  namaFile: string;
  createdAt: string;
  aktivitasTerakhirAt: string | null;
  /** Dari v_progres_dokumen (BR-14); 0 untuk dokumen belum siap. */
  topikSelesai: number;
  totalTopik: number;
  topikLemah: number;
  persenSelesai: number;
}

/** Satu topik di jalur belajar S-07 (v_progres_topik, BR-13). */
export interface TopikDokumen {
  id: number;
  urutan: number;
  judul: string;
  halamanAwal: number;
  halamanAkhir: number;
  status: StatusTopik;
  skorTerakhir: number | null;
}

export interface DetailDokumen extends RingkasanDokumen {
  ukuranByte: number;
  rataRataSkor: number | null;
  topik: TopikDokumen[];
  /** BR-35: topik urutan terkecil yang belum/lemah; B5: bila semua selesai → skor terendah. */
  topikDisarankanId: number | null;
  semuaSelesai: boolean;
}

export interface KuotaDokumen {
  terpakai: number;
  maks: number;
}

export function keStatusDokumen(nilai: string): StatusDokumen {
  return nilai in STATUS_DOKUMEN ? (nilai as StatusDokumen) : "gagal";
}

export function keTahapDokumen(nilai: string | null): TahapDokumen | null {
  return nilai !== null && nilai in TAHAP_DOKUMEN ? (nilai as TahapDokumen) : null;
}

export function keStatusTopik(nilai: string | null): StatusTopik {
  return nilai !== null && nilai in STATUS_TOPIK ? (nilai as StatusTopik) : "belum";
}

/** BR-04 + KEPUTUSAN B13: pemakaian bisa melebihi batas setelah admin menurunkan kuota. */
export function isKuotaPenuh(k: KuotaDokumen): boolean {
  return k.terpakai >= k.maks;
}

// Helper format tampilan: locale id-ID dan zona WIB (Panduan §2: "8 Okt 2026", "Rp18.500", "33%").
// Semua fungsi murni (tanpa I/O) sehingga aman dipakai di Server maupun Client Component.

import { ZONA_WAKTU } from "@/lib/config";
import { STATUS_TOPIK, type StatusTopik } from "@/lib/pesan";

const LOCALE = "id-ID";
export const BYTE_PER_KB = 1024;
export const BYTE_PER_MB = BYTE_PER_KB * 1024;
const MS_PER_DETIK = 1000;
const MS_PER_MENIT = 60 * MS_PER_DETIK;
const MS_PER_JAM = 60 * MS_PER_MENIT;
const MS_PER_HARI = 24 * MS_PER_JAM;
const BATAS_HARI_RELATIF = 7; // ≥ 7 hari → tampil tanggal biasa

export type MasukanTanggal = Date | string | number;

function keDate(t: MasukanTanggal): Date {
  return t instanceof Date ? t : new Date(t);
}

// Formatter dibuat sekali (Intl cukup mahal dibuat berulang).
const fmtTanggal = new Intl.DateTimeFormat(LOCALE, {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: ZONA_WAKTU,
});
const fmtTanggalPendek = new Intl.DateTimeFormat(LOCALE, {
  day: "numeric",
  month: "short",
  timeZone: ZONA_WAKTU,
});
const fmtBagian = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "numeric",
  day: "numeric",
  hour: "numeric",
  minute: "numeric",
  second: "numeric",
  hourCycle: "h23",
  timeZone: ZONA_WAKTU,
});
const fmtAngka = new Intl.NumberFormat(LOCALE);
const fmtDesimal1 = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 1 });

interface BagianWaktu {
  tahun: number;
  bulan: number; // 1–12
  hari: number;
  jam: number;
  menit: number;
  detik: number;
}

/** Komponen tanggal-jam menurut ZONA_WAKTU (bukan zona mesin). */
function bagianWib(d: Date): BagianWaktu {
  const ambil = (tipe: Intl.DateTimeFormatPartTypes): number =>
    Number(fmtBagian.formatToParts(d).find((p) => p.type === tipe)?.value ?? 0);
  return {
    tahun: ambil("year"),
    bulan: ambil("month"),
    hari: ambil("day"),
    jam: ambil("hour"),
    menit: ambil("minute"),
    detik: ambil("second"),
  };
}

/** Selisih zona (ms) terhadap UTC pada saat `d` — WIB = +7 jam, dihitung bukan dikode. */
function offsetZonaMs(d: Date): number {
  const b = bagianWib(d);
  const sebagaiUtc = Date.UTC(b.tahun, b.bulan - 1, b.hari, b.jam, b.menit, b.detik);
  return sebagaiUtc - Math.floor(d.getTime() / MS_PER_DETIK) * MS_PER_DETIK;
}

/** Nomor hari kalender WIB (untuk membandingkan "kemarin", "3 hari lalu"). */
function nomorHariWib(d: Date): number {
  const b = bagianWib(d);
  return Math.round(Date.UTC(b.tahun, b.bulan - 1, b.hari) / MS_PER_HARI);
}

// ── Tanggal ───────────────────────────────────────────────────────

/** "28 Okt 2026" */
export function formatTanggal(t: MasukanTanggal): string {
  return fmtTanggal.format(keDate(t));
}

/** "8 Okt" — sumbu grafik (FT-11). */
export function formatTanggalPendek(t: MasukanTanggal): string {
  return fmtTanggalPendek.format(keDate(t));
}

/** "8 Okt 2026, 14.30" (jam WIB, pemisah titik sesuai kaidah Indonesia). */
export function formatTanggalWaktu(t: MasukanTanggal): string {
  const d = keDate(t);
  const b = bagianWib(d);
  const jam = String(b.jam).padStart(2, "0");
  const menit = String(b.menit).padStart(2, "0");
  return `${formatTanggal(d)}, ${jam}.${menit}`;
}

/**
 * Waktu relatif: "baru saja" · "5 menit lalu" · "3 jam lalu" · "kemarin" · "3 hari lalu";
 * ≥ 7 hari atau waktu di masa depan → formatTanggal. Hari dihitung per kalender WIB.
 */
export function formatRelatif(t: MasukanTanggal, sekarang: MasukanTanggal = new Date()): string {
  const d = keDate(t);
  const kini = keDate(sekarang);
  const selisih = kini.getTime() - d.getTime();

  if (selisih < -MS_PER_MENIT) return formatTanggal(d); // jam klien sedikit maju masih "baru saja"
  if (selisih < MS_PER_MENIT) return "baru saja";
  if (selisih < MS_PER_JAM) return `${Math.floor(selisih / MS_PER_MENIT)} menit lalu`;

  const selisihHari = nomorHariWib(kini) - nomorHariWib(d);
  if (selisihHari <= 0) return `${Math.floor(selisih / MS_PER_JAM)} jam lalu`;
  if (selisihHari === 1) return "kemarin";
  if (selisihHari < BATAS_HARI_RELATIF) return `${selisihHari} hari lalu`;
  return formatTanggal(d);
}

/** Awal hari (00.00 WIB) dari tanggal `t` — batas hitung kuota harian (BR-17). */
export function awalHariWIB(t: MasukanTanggal = new Date()): Date {
  const d = keDate(t);
  const b = bagianWib(d);
  return new Date(Date.UTC(b.tahun, b.bulan - 1, b.hari) - offsetZonaMs(d));
}

/** 00.00 WIB berikutnya — waktu kuota tanya terisi lagi (BR-17, MSG-C02). */
export function awalHariBerikutWIB(t: MasukanTanggal = new Date()): Date {
  const awal = awalHariWIB(t);
  // Ambil titik di tengah hari berikutnya lalu bulatkan ke awal hari agar aman dari DST.
  return awalHariWIB(new Date(awal.getTime() + MS_PER_HARI + MS_PER_JAM * 12));
}

// ── Angka ─────────────────────────────────────────────────────────

/** "1.250" */
export function formatAngka(n: number): string {
  return fmtAngka.format(n);
}

/** "Rp1.250" — dibulatkan ke rupiah; 0 < n < 1 → "< Rp1" (estimasi biaya kecil, FT-11). */
export function formatRupiah(n: number): string {
  if (n > 0 && n < 1) return "< Rp1";
  const bulat = Math.round(n);
  const tanda = bulat < 0 ? "-" : "";
  return `${tanda}Rp${fmtAngka.format(Math.abs(bulat))}`;
}

/** Nilai persen 0–100 → "33%" (tanpa spasi, Panduan §2). */
export function formatPersen(nilai: number, desimal = 0): string {
  const f = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: desimal });
  return `${f.format(nilai)}%`;
}

/** round(bagian ÷ total × 100); total 0 → 0 (BR-14, persen kuota FT-08). */
export function hitungPersen(bagian: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((bagian / total) * 100);
}

/** Byte → "512 B" · "340 KB" · "2,4 MB". */
export function formatUkuranFile(byte: number): string {
  if (byte < BYTE_PER_KB) return `${formatAngka(byte)} B`;
  if (byte < BYTE_PER_MB) return `${fmtDesimal1.format(byte / BYTE_PER_KB)} KB`;
  return `${fmtDesimal1.format(byte / BYTE_PER_MB)} MB`;
}

/** "hal. 25–51" atau "hal. 7" bila satu halaman. */
export function formatRentangHalaman(awal: number, akhir: number): string {
  return awal === akhir ? `hal. ${awal}` : `hal. ${awal}–${akhir}`;
}

// ── Label ─────────────────────────────────────────────────────────

/** Nilai status dari view DB (BR-13) → teks badge. Logika status TIDAK diulang di sini. */
export function labelStatusTopik(status: StatusTopik): string {
  return STATUS_TOPIK[status];
}

/** "Rina Saputri" → "Rina" (sapaan Beranda S-06). */
export function namaDepan(nama: string): string {
  return nama.trim().split(/\s+/)[0] ?? "";
}

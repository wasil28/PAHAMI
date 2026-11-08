import "server-only";
import { extractText, getDocumentProxy } from "unpdf";
import { DEFAULT_MAX_HALAMAN, MIN_KARAKTER_HALAMAN_TEKS, RASIO_HALAMAN_SCAN } from "@/lib/config";
import type { HalamanTeks } from "@/lib/ai/tipe";

// Ekstraksi teks PDF per halaman (BP-04 langkah 1–2). Nomor halaman dipertahankan karena
// seluruh rujukan (BR-08/10/11, F-14) bergantung padanya.

export type KodeErrorPdf = "PDF_RUSAK" | "PDF_TERKUNCI" | "PDF_SCAN" | "HALAMAN_MELEBIHI";

/** Galat ekstraksi dengan kode agar route bisa memetakan ke MSG-U06/U07/U09. */
export class PdfError extends Error {
  readonly kode: KodeErrorPdf;
  /** Terisi untuk HALAMAN_MELEBIHI (dipakai di MSG-U06 "{n} halaman"). */
  readonly jumlahHalaman?: number;

  constructor(kode: KodeErrorPdf, pesan: string, opsi?: { jumlahHalaman?: number; cause?: unknown }) {
    super(pesan, opsi?.cause === undefined ? undefined : { cause: opsi.cause });
    this.name = "PdfError";
    this.kode = kode;
    this.jumlahHalaman = opsi?.jumlahHalaman;
  }
}

export function isPdfError(e: unknown): e is PdfError {
  return e instanceof PdfError;
}

export interface HasilEkstrakPdf {
  jumlahHalaman: number;
  halaman: HalamanTeks[];
}

export interface OpsiEkstrakPdf {
  /** Batas halaman dari m_pengaturan_sistem (BR-03). Default DEFAULT_MAX_HALAMAN. */
  maxHalaman?: number;
  /** Lempar PDF_SCAN bila BR-05 terpenuhi. Default true. */
  cekScan?: boolean;
}

/**
 * Mengekstrak teks setiap halaman. Urutan pemeriksaan sengaja: jumlah halaman dulu (murah,
 * BR-03) baru ekstraksi penuh, lalu cek scan (BR-05).
 * @throws PdfError PDF_RUSAK | PDF_TERKUNCI | HALAMAN_MELEBIHI | PDF_SCAN
 */
export async function ekstrakTeksPdf(
  buffer: Uint8Array,
  opsi: OpsiEkstrakPdf = {},
): Promise<HasilEkstrakPdf> {
  const maxHalaman = opsi.maxHalaman ?? DEFAULT_MAX_HALAMAN;
  if (!adalahPdf(buffer)) {
    throw new PdfError("PDF_RUSAK", "Berkas bukan PDF yang valid.");
  }

  // pdf.js dapat "memindahkan" (detach) ArrayBuffer yang diberikan; salin agar buffer
  // pemanggil tetap utuh.
  let pdf: Awaited<ReturnType<typeof getDocumentProxy>>;
  try {
    pdf = await getDocumentProxy(buffer.slice());
  } catch (e) {
    throw petakanGalatPdf(e);
  }

  try {
    const jumlahHalaman = pdf.numPages;
    if (jumlahHalaman > maxHalaman) {
      throw new PdfError(
        "HALAMAN_MELEBIHI",
        `Dokumen memiliki ${jumlahHalaman} halaman, melebihi batas ${maxHalaman} halaman.`,
        { jumlahHalaman },
      );
    }

    let mentah: string[];
    try {
      ({ text: mentah } = await extractText(pdf, { mergePages: false }));
    } catch (e) {
      throw petakanGalatPdf(e);
    }

    const bersih = bersihkanHalaman(mentah);
    const halaman: HalamanTeks[] = bersih.map((teks, i) => ({ nomor: i + 1, teks }));

    if (opsi.cekScan !== false && cekPdfScan(halaman).isScan) {
      throw new PdfError(
        "PDF_SCAN",
        "PDF berupa hasil scan (gambar) sehingga teksnya tidak dapat dibaca.",
      );
    }
    return { jumlahHalaman, halaman };
  } finally {
    await pdf.destroy().catch(() => undefined);
  }
}

export interface HasilCekScan {
  isScan: boolean;
  halamanKosong: number;
  rasioKosong: number;
}

/**
 * BR-05: dokumen dianggap hasil scan bila > 50% halaman berisi < 50 karakter teks.
 * Karakter dihitung tanpa spasi agar halaman berisi spasi/nomor saja tetap dianggap kosong.
 */
export function cekPdfScan(halaman: readonly HalamanTeks[]): HasilCekScan {
  if (halaman.length === 0) return { isScan: true, halamanKosong: 0, rasioKosong: 1 };
  const halamanKosong = halaman.filter(
    (h) => h.teks.replace(/\s+/g, "").length < MIN_KARAKTER_HALAMAN_TEKS,
  ).length;
  const rasioKosong = halamanKosong / halaman.length;
  return { isScan: rasioKosong > RASIO_HALAMAN_SCAN, halamanKosong, rasioKosong };
}

// ── Normalisasi teks (murni, dapat diuji tanpa PDF) ─────────────

/** Halaman ≥ 5 dan baris tepi muncul di ≥ 40% halaman → dianggap header/footer berulang. */
const MIN_HALAMAN_DETEKSI_HEADER = 5;
const RASIO_HEADER_BERULANG = 0.4;
const PANJANG_MAKS_HEADER = 80;
const BARIS_TEPI = 2; // 2 baris teratas & terbawah tiap halaman diperiksa

const POLA_NOMOR_HALAMAN = /^(?:hal(?:aman)?\.?\s*)?[-–—\s]*(?:\d{1,4}|[ivxlcdm]{1,7})[-–—\s]*$/i;

/**
 * Membersihkan teks mentah per halaman: Unicode NFKC (ligatur "ﬁ"→"fi"), spasi dirapikan,
 * pemenggalan kata di akhir baris disambung, nomor halaman & header/footer berulang dibuang.
 * Baris dipertahankan (dipisah "\n") karena judul bab dipakai chunk & kerangka topik.
 */
export function bersihkanHalaman(mentah: readonly string[]): string[] {
  const barisPerHalaman = mentah.map((t) => sambungPemenggalan(pecahBaris(t)));
  const berulang = cariHeaderBerulang(barisPerHalaman);
  return barisPerHalaman.map((baris) =>
    baris
      .filter((b, i) => {
        if (POLA_NOMOR_HALAMAN.test(b)) return false;
        // Header/footer hanya dibuang di posisi tepi; kalimat isi yang kebetulan sama tetap utuh.
        const diTepi = i < BARIS_TEPI || i >= baris.length - BARIS_TEPI;
        return !(diTepi && berulang.has(kunciHeader(b)));
      })
      .join("\n"),
  );
}

function pecahBaris(teks: string): string[] {
  return teks
    .normalize("NFKC")
    .replace(/­/g, "") // soft hyphen
    .replace(/[​-‍﻿]/g, "")
    .split(/\r?\n|\r/)
    .map((b) => b.replace(/[^\S\n]+/g, " ").trim())
    .filter((b) => b.length > 0);
}

/**
 * "pemba-" + "ngunan" → "pembangunan"; reduplikasi "anak-" + "anak" tetap "anak-anak"
 * (kata ulang bahasa Indonesia tidak boleh kehilangan tanda hubung).
 */
export function sambungPemenggalan(baris: readonly string[]): string[] {
  const hasil: string[] = [];
  for (const b of baris) {
    const sebelum = hasil[hasil.length - 1];
    const mAkhir = sebelum?.match(/(\p{L}+)-$/u);
    const mAwal = b.match(/^(\p{Ll}+)(.*)$/u);
    if (sebelum !== undefined && mAkhir && mAwal) {
      const kataUlang = mAkhir[1].toLowerCase() === mAwal[1].toLowerCase();
      hasil[hasil.length - 1] = kataUlang
        ? `${sebelum}${b}` // tanda hubung dipertahankan
        : `${sebelum.slice(0, -1)}${b}`;
    } else {
      hasil.push(b);
    }
  }
  return hasil;
}

function kunciHeader(baris: string): string {
  return baris.toLowerCase().replace(/\d+/g, "#").replace(/\s+/g, " ").trim();
}

function cariHeaderBerulang(barisPerHalaman: readonly string[][]): Set<string> {
  const hasil = new Set<string>();
  const n = barisPerHalaman.length;
  if (n < MIN_HALAMAN_DETEKSI_HEADER) return hasil;
  const hitung = new Map<string, number>();
  for (const baris of barisPerHalaman) {
    const tepi = new Set(
      [...baris.slice(0, BARIS_TEPI), ...baris.slice(-BARIS_TEPI)]
        .filter((b) => b.length <= PANJANG_MAKS_HEADER)
        .map(kunciHeader),
    );
    for (const k of tepi) hitung.set(k, (hitung.get(k) ?? 0) + 1);
  }
  for (const [k, c] of hitung) {
    if (c / n >= RASIO_HEADER_BERULANG && k.replace(/[#\s]/g, "").length > 0) hasil.add(k);
  }
  return hasil;
}

function adalahPdf(buffer: Uint8Array): boolean {
  // Tanda tangan "%PDF-" boleh didahului sampah ≤ 1 KB (spesifikasi PDF mengizinkan).
  const awal = new TextDecoder("latin1").decode(buffer.subarray(0, 1024));
  return awal.includes("%PDF-");
}

function petakanGalatPdf(e: unknown): PdfError {
  if (e instanceof PdfError) return e;
  const nama = e instanceof Error ? e.name : "";
  if (nama === "PasswordException") {
    return new PdfError("PDF_TERKUNCI", "PDF dilindungi kata sandi.", { cause: e });
  }
  return new PdfError("PDF_RUSAK", "PDF rusak atau tidak dapat dibaca.", { cause: e });
}

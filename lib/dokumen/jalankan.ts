import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { AI_BATAS_WAKTU_MS, BUCKET_DOKUMEN, DEFAULT_MAX_HALAMAN, TENGGAT_PIPELINE_MS } from "@/lib/config";
import { cekPdfScan, ekstrakTeksPdf } from "@/lib/pdf/ekstrak";
import { buatChunk } from "@/lib/ai/chunk";
import { embedTeks, keVektorPg } from "@/lib/ai/embedding";
import { susunTopik } from "@/lib/ai/topik";
import { catatPemakaianAI } from "@/lib/ai/pemakaian";
import { BATAS_WAKTU_EMBEDDING_BATCH_MS, COBA_ULANG_PIPELINE } from "@/lib/ai/konfigurasi";
import { buatTenggat, type Tenggat } from "@/lib/ai/tenggat";
import type { Json } from "@/types/database";
import { prosesDokumen, type DepsProses, type DokumenProses, type HasilProses } from "./proses";

// Implementasi nyata DepsProses (service role — t_chunk & RPC pipeline hanya untuk server,
// DATABASE.md §3). Dipanggil dari POST /api/dokumen/[id]/proses di dalam after().

type KlienAdmin = ReturnType<typeof createAdminClient>;

/** Jumlah baris per INSERT t_chunk (embedding 768 angka ≈ 10 KB/baris → jaga ukuran body). */
const BARIS_PER_INSERT = 100;
/** Penanda bahwa pipeline sudah mengklaim dokumen (updated_by hanya bisa ditulis server untuk baris `diproses`). */
export const PENANDA_PIPELINE = "system";

export async function bacaPengaturanInt(admin: KlienAdmin, kode: string, cadangan: number): Promise<number> {
  const { data, error } = await admin.rpc("fn_pengaturan_int", { p_kode: kode });
  if (error || typeof data !== "number") {
    console.error(`[pengaturan] ${kode} tidak terbaca, pakai default`, error?.message);
    return cadangan;
  }
  return data;
}

/**
 * Klaim atomik supaya dua permintaan /proses (klik ganda, dua tab) tidak menjalankan
 * pipeline dua kali. Baris terkunci saat UPDATE; permintaan kedua tidak lagi lolos WHERE.
 * @returns true bila klaim ini yang menang.
 */
export async function klaimProsesDokumen(dokumenId: number, userId: number): Promise<boolean> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("t_dokumen")
    .update({ updated_by: PENANDA_PIPELINE })
    .eq("id", dokumenId)
    .eq("user_id", userId)
    .eq("status", "diproses")
    .eq("tahap", "membaca")
    .or(`updated_by.is.null,updated_by.neq.${PENANDA_PIPELINE}`)
    .select("id");
  if (error) throw error;
  return (data ?? []).length > 0;
}

/**
 * @param tenggat Tenggat pipeline (dibuat di awal permintaan /proses). Panggilan AI memakai sinyalnya
 *   dan coba ulang dikurangi (COBA_ULANG_PIPELINE) agar kasus terburuk muat sebelum maxDuration.
 */
export function buatDepsProses(admin: KlienAdmin, maxHalaman: number, tenggat?: Tenggat): DepsProses {
  return {
    maxHalaman,
    signal: tenggat?.signal,
    async unduhPdf(path) {
      const { data, error } = await admin.storage.from(BUCKET_DOKUMEN).download(path);
      if (error || !data) throw error ?? new Error("File PDF tidak ditemukan di Storage.");
      return new Uint8Array(await data.arrayBuffer());
    },
    ekstrakTeks: (buffer, maks) => ekstrakTeksPdf(buffer, { maxHalaman: maks, cekScan: false }),
    isPdfScan: (halaman) => cekPdfScan(halaman).isScan,
    buatChunk: (halaman) => buatChunk(halaman),
    embedTeks: (teks) => embedTeks(teks, undefined, tenggat?.permintaan(BATAS_WAKTU_EMBEDDING_BATCH_MS, COBA_ULANG_PIPELINE)),
    keVektorPg,
    susunTopik: (halaman, n) => susunTopik(halaman, n, undefined, tenggat?.permintaan(AI_BATAS_WAKTU_MS, COBA_ULANG_PIPELINE)),
    async majukanTahap(dokumenId, tahap, data) {
      const { data: baris, error } = await admin
        .from("t_dokumen")
        .update({ tahap, ...(data?.jumlahHalaman ? { jumlah_halaman: data.jumlahHalaman } : {}) })
        .eq("id", dokumenId)
        .eq("status", "diproses")
        .select("id");
      if (error) throw error;
      return (baris ?? []).length > 0; // 0 baris = dokumen dihapus/ditandai macet (DATABASE.md §3)
    },
    async simpanChunk(baris) {
      // fn_simpan_chunk mengunci baris dokumen & mewajibkan status `diproses`: bila A8 menandai
      // macet di tengah jalan, batch berikutnya ditolak (false) dan tidak ada chunk yatim.
      for (let i = 0; i < baris.length; i += BARIS_PER_INSERT) {
        const batch = baris.slice(i, i + BARIS_PER_INSERT);
        const { data, error } = await admin.rpc("fn_simpan_chunk", {
          p_dokumen_id: batch[0].dokumen_id,
          p_chunk: batch as unknown as Json,
        });
        if (error) throw error;
        if (data !== true) return false;
      }
      return true;
    },
    async selesaikan(dokumenId, topik) {
      const { data, error } = await admin.rpc("fn_selesaikan_dokumen", {
        p_dokumen_id: dokumenId,
        p_topik: topik as unknown as Json,
      });
      if (error) {
        if (error.message.includes("DOKUMEN_TIDAK_DIPROSES")) return null;
        throw error;
      }
      const hasil = data?.[0];
      if (!hasil) throw new Error("fn_selesaikan_dokumen tidak mengembalikan baris.");
      return { jumlahTopik: hasil.jumlah_topik, judul: hasil.judul };
    },
    async gagalkan(dokumenId, pesanGagal) {
      const { data, error } = await admin.rpc("fn_gagalkan_dokumen", { p_dokumen_id: dokumenId, p_pesan: pesanGagal });
      if (error) throw error;
      return data === true;
    },
    catatPemakaian: catatPemakaianAI,
  };
}

/**
 * Titik masuk pipeline (dipanggil di after()). Tidak pernah melempar.
 * @param tenggat Sebaiknya dibuat di awal Route Handler (waktu maxDuration dihitung sejak permintaan masuk).
 */
export async function jalankanProsesDokumen(
  dok: DokumenProses,
  tenggat: Tenggat = buatTenggat(TENGGAT_PIPELINE_MS),
): Promise<HasilProses> {
  try {
    const admin = createAdminClient();
    const maxHalaman = await bacaPengaturanInt(admin, "max_halaman", DEFAULT_MAX_HALAMAN); // BR-28: dibaca saat aksi
    return await prosesDokumen(dok, buatDepsProses(admin, maxHalaman, tenggat));
  } finally {
    tenggat.hentikan();
  }
}

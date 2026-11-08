import "server-only";
import { AiGagalError } from "@/lib/ai/panggil";
import { isPdfError, type HasilEkstrakPdf } from "@/lib/pdf/ekstrak";
import type { ChunkBaru } from "@/lib/ai/chunk";
import type { TopikBaru } from "@/lib/ai/topik";
import type { CatatPemakaianInput, FiturAI } from "@/lib/ai/pemakaian";
import type { HalamanTeks, Pemakaian } from "@/lib/ai/tipe";
import { PESAN, pesan, type TahapDokumen } from "@/lib/pesan";

// Orkestrasi pengolahan dokumen BP-04 (KEPUTUSAN §3). Semua efek samping (Storage, DB, AI)
// disuntikkan lewat DepsProses supaya alur bisa diuji tanpa Supabase/OpenRouter
// (lihat lib/dokumen/__tests__/proses.test.ts). Implementasi nyata: lib/dokumen/jalankan.ts.
//
// Tahap (CHECK ck_dokumen_tahap, tidak boleh mundur):
//   membaca        unduh + hitung/ekstrak halaman (BR-03, PDF rusak/terkunci)
//   mengekstrak    cek PDF hasil scan (BR-05)
//   memotong       buatChunk (BR-08)
//   mengindeks     embedding + simpan t_chunk (A5) → log 'indeks'
//   menyusun_topik susunTopik (BR-09, B4) → fn_selesaikan_dokumen → log 'topik'
// Setiap pergantian tahap juga menjadi "detak" updated_at agar tidak dianggap macet (A8).
// Tenggat (deps.signal, TENGGAT_PIPELINE_MS): habis → fn_gagalkan_dokumen dengan MSG-U09 SEBELUM
// fungsi server dibunuh maxDuration, supaya dokumen tidak tertahan `diproses` sampai A8.

export interface DokumenProses {
  id: number;
  /** m_users.id pemilik (untuk log_pemakaian_ai). */
  userId: number;
  pathFile: string;
}

export interface BarisChunk {
  dokumen_id: number;
  urutan: number;
  halaman_awal: number;
  halaman_akhir: number;
  judul_bagian: string | null;
  isi: string;
  jumlah_token: number;
  /** Literal pgvector "[…]" (keVektorPg). */
  embedding: string;
}

export interface TopikSimpan {
  urutan: number;
  judul: string;
  halaman_awal: number;
  halaman_akhir: number;
}

export interface DepsProses {
  /** max_halaman dari m_pengaturan_sistem saat proses dimulai (BR-03, BR-28). */
  maxHalaman: number;
  /** Tenggat pipeline: batal → berhenti di titik periksa berikutnya & gagalkan dokumen (MSG-U09). */
  signal?: AbortSignal;
  unduhPdf(path: string): Promise<Uint8Array>;
  /** Ekstraksi TANPA cek scan (cek scan dilakukan di tahap `mengekstrak`). */
  ekstrakTeks(buffer: Uint8Array, maxHalaman: number): Promise<HasilEkstrakPdf>;
  isPdfScan(halaman: readonly HalamanTeks[]): boolean;
  buatChunk(halaman: readonly HalamanTeks[]): ChunkBaru[];
  embedTeks(teks: string[]): Promise<{ vektor: number[][]; pemakaian: Pemakaian }>;
  keVektorPg(v: readonly number[]): string;
  susunTopik(halaman: readonly HalamanTeks[], jumlahHalaman: number): Promise<{ topik: TopikBaru[]; pemakaian: Pemakaian }>;
  /** UPDATE tahap WHERE status='diproses'. false = dokumen sudah dihapus/gagal → hentikan. */
  majukanTahap(dokumenId: number, tahap: TahapDokumen, data?: { jumlahHalaman?: number }): Promise<boolean>;
  /** fn_simpan_chunk per batch. false = dokumen tidak lagi `diproses` (A8/dihapus) → hentikan tanpa chunk yatim. */
  simpanChunk(baris: BarisChunk[]): Promise<boolean>;
  /** fn_selesaikan_dokumen. null = dokumen tidak lagi `diproses` (dihapus/ditandai macet). */
  selesaikan(dokumenId: number, topik: TopikSimpan[]): Promise<{ jumlahTopik: number; judul: string } | null>;
  /** fn_gagalkan_dokumen (hapus chunk/topik parsial, status gagal). */
  gagalkan(dokumenId: number, pesanGagal: string): Promise<boolean>;
  catatPemakaian(input: CatatPemakaianInput): Promise<void>;
}

export type HasilProses =
  | { status: "siap"; jumlahTopik: number; judul: string }
  | { status: "gagal"; pesan: string; sebab: string; tahap: TahapDokumen }
  | { status: "dihentikan"; tahap: TahapDokumen };

/** Galat terkendali dengan pesan siap tampil (MSG-U06/U07/U09). */
class GagalProses extends Error {
  constructor(
    readonly pesanGagal: string,
    readonly sebab: string,
  ) {
    super(sebab);
  }
}

/** Dokumen dihapus/ditandai macet di tengah jalan — berhenti tanpa menulis apa pun lagi. */
class Dihentikan extends Error {}

/** Tenggat pipeline habis (di luar panggilan AI; AI yang dibatalkan melempar AiGagalError). */
class TenggatHabis extends Error {}

/** Galat apa pun → teks pesan_gagal yang ramah (FT-02 §3.5). */
export function pesanGagalDari(e: unknown, maxHalaman: number): { pesan: string; sebab: string } {
  if (e instanceof GagalProses) return { pesan: e.pesanGagal, sebab: e.sebab };
  if (e instanceof TenggatHabis) return { pesan: PESAN["MSG-U09"], sebab: "BATAS_WAKTU" };
  if (isPdfError(e)) {
    switch (e.kode) {
      case "HALAMAN_MELEBIHI": // BR-03
        return {
          pesan: pesan("MSG-U06", { n: e.jumlahHalaman ?? "lebih dari " + maxHalaman, max_halaman: maxHalaman }),
          sebab: e.kode,
        };
      case "PDF_SCAN": // BR-05
        return { pesan: PESAN["MSG-U07"], sebab: e.kode };
      default: // PDF_RUSAK / PDF_TERKUNCI (sandi) → gangguan umum sesuai AI-RAG.md §1
        return { pesan: PESAN["MSG-U09"], sebab: e.kode };
    }
  }
  if (e instanceof AiGagalError) return { pesan: PESAN["MSG-U09"], sebab: "AI_GAGAL" }; // BR-32 sudah coba ulang
  return { pesan: PESAN["MSG-U09"], sebab: e instanceof Error ? e.name || "Error" : "TIDAK_DIKENAL" };
}

/**
 * Menjalankan seluruh BP-04 untuk satu dokumen yang sudah diklaim. Tidak pernah melempar:
 * semua kegagalan berakhir di fn_gagalkan_dokumen + hasil `gagal`.
 */
export async function prosesDokumen(dok: DokumenProses, deps: DepsProses): Promise<HasilProses> {
  let tahap: TahapDokumen = "membaca";
  let fiturAi: FiturAI | null = null; // fitur AI yang sedang berjalan → log is_sukses=false

  // Titik periksa tenggat: sebelum setiap tahap & setiap penulisan besar.
  const cekTenggat = () => {
    if (deps.signal?.aborted) throw new TenggatHabis("Tenggat pengolahan habis.");
  };
  const maju = async (berikut: TahapDokumen, data?: { jumlahHalaman?: number }) => {
    cekTenggat();
    if (!(await deps.majukanTahap(dok.id, berikut, data))) throw new Dihentikan();
    tahap = berikut;
  };

  try {
    // 1. Membaca: unduh + ekstrak per halaman. Batas halaman dicek sebelum ekstraksi penuh (BR-03).
    const buffer = await deps.unduhPdf(dok.pathFile);
    const { jumlahHalaman, halaman } = await deps.ekstrakTeks(buffer, deps.maxHalaman);

    // 2. Mengekstrak: PDF berbasis teks? (BR-05)
    await maju("mengekstrak", { jumlahHalaman });
    if (deps.isPdfScan(halaman)) throw new GagalProses(PESAN["MSG-U07"], "PDF_SCAN");

    // 3. Memotong (BR-08).
    await maju("memotong");
    const chunks = deps.buatChunk(halaman);
    if (chunks.length === 0) throw new GagalProses(PESAN["MSG-U07"], "TANPA_TEKS");

    // 4. Mengindeks (A5): embedding batch → t_chunk. Biaya dicatat segera setelah AI berhasil.
    await maju("mengindeks");
    fiturAi = "indeks";
    const emb = await deps.embedTeks(chunks.map((c) => c.isi));
    fiturAi = null;
    await deps.catatPemakaian({ userId: dok.userId, fitur: "indeks", dokumenId: dok.id, pemakaian: emb.pemakaian, isSukses: true });
    cekTenggat();
    const tersimpan = await deps.simpanChunk(
      chunks.map((c, i) => ({
        dokumen_id: dok.id,
        urutan: c.urutan,
        halaman_awal: c.halaman_awal,
        halaman_akhir: c.halaman_akhir,
        judul_bagian: c.judul_bagian,
        isi: c.isi,
        jumlah_token: c.jumlah_token,
        embedding: deps.keVektorPg(emb.vektor[i]),
      })),
    );
    if (!tersimpan) throw new Dihentikan();

    // 5. Menyusun topik (BR-09, B4) → status siap.
    await maju("menyusun_topik");
    fiturAi = "topik";
    const hasilTopik = await deps.susunTopik(halaman, jumlahHalaman);
    fiturAi = null;
    await deps.catatPemakaian({ userId: dok.userId, fitur: "topik", dokumenId: dok.id, pemakaian: hasilTopik.pemakaian, isSukses: true });
    cekTenggat();
    const selesai = await deps.selesaikan(
      dok.id,
      hasilTopik.topik.map(({ urutan, judul, halaman_awal, halaman_akhir }) => ({ urutan, judul, halaman_awal, halaman_akhir })),
    );
    if (!selesai) throw new Dihentikan();
    return { status: "siap", jumlahTopik: selesai.jumlahTopik, judul: selesai.judul };
  } catch (e) {
    if (e instanceof Dihentikan) return { status: "dihentikan", tahap };

    if (e instanceof AiGagalError && fiturAi) {
      await deps.catatPemakaian({
        userId: dok.userId,
        fitur: fiturAi,
        dokumenId: dok.id,
        pemakaian: e.pemakaian,
        isSukses: false,
        pesanError: e.message,
      });
    }
    const dasar = pesanGagalDari(e, deps.maxHalaman);
    // AI yang dibatalkan tenggat tampil sebagai AI_GAGAL; catat sebab sebenarnya untuk log.
    const sebab = deps.signal?.aborted && dasar.sebab === "AI_GAGAL" ? "BATAS_WAKTU" : dasar.sebab;
    const pesanGagal = dasar.pesan;
    // Jangan log isi dokumen — cukup id, tahap, dan kode sebab (AGENTS.md).
    console.error(`[proses-dokumen] dokumen ${dok.id} gagal di tahap ${tahap}: ${sebab}`, e instanceof Error ? e.message : "");
    try {
      await deps.gagalkan(dok.id, pesanGagal);
    } catch (eGagal) {
      // Bila ini pun gagal, A8 menandai dokumen macet setelah 15 menit.
      console.error(`[proses-dokumen] fn_gagalkan_dokumen ${dok.id} gagal`, eGagal);
    }
    return { status: "gagal", pesan: pesanGagal, sebab, tahap };
  }
}

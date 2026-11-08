import "server-only";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { AiGagalError, buatSoal, catatPemakaianAI } from "@/lib/ai/generate";
import { JUMLAH_PILIHAN } from "@/lib/config";
import type { JawabanSoal } from "@/lib/validasi";
import type { StatusTopik } from "@/types/database";
import { getChunkTopik, siapkanDenganKlaim, type HasilSiapkan, type TopikMilik } from "@/lib/data/topik";

// Akses data latihan (FT-05). API & UI memakai indeks pilihan 0..3; DB memakai huruf A–D
// (t_soal.kunci, t_latihan_jawaban.dipilih). Pemetaan hanya terjadi di file ini.

const HURUF = ["A", "B", "C", "D"] as const;
type Huruf = (typeof HURUF)[number];

export function keHuruf(indeks: number): Huruf {
  const h = HURUF[indeks];
  if (!h) throw new RangeError(`Indeks pilihan di luar 0..${JUMLAH_PILIHAN - 1}`);
  return h;
}

export function keIndeks(huruf: string): number {
  return HURUF.findIndex((h) => h === huruf.trim().toUpperCase());
}

/** Soal yang boleh dilihat sebelum dijawab — TANPA kunci/pembahasan/halaman (RLS hak kolom, BR-11). */
export interface SoalLatihan {
  id: number;
  urutan: number;
  pertanyaan: string;
  pilihan: string[];
}

export interface HasilPeriksa {
  isBenar: boolean;
  kunci: number;
  pembahasan: string;
  halamanRujukan: number;
}

export interface HasilSimpanLatihan {
  latihanId: number;
  skor: number;
  jumlahBenar: number;
  jumlahSoal: number;
  statusTopik: StatusTopik;
}

export interface ItemHasilLatihan {
  soalId: number;
  urutan: number;
  pertanyaan: string;
  pilihan: string[];
  dipilih: number;
  kunci: number;
  isBenar: boolean;
  pembahasan: string;
  halamanRujukan: number;
}

export interface HasilLatihan {
  latihanId: number;
  topikId: number;
  judulTopik: string;
  skor: number;
  jumlahBenar: number;
  jumlahSoal: number;
  dibuatAt: string;
  item: ItemHasilLatihan[];
}

/** Galat RPC yang punya arti bagi pengguna (RAISE EXCEPTION '<KODE>'). */
export class LatihanError extends Error {
  constructor(readonly kode: "TIDAK_DITEMUKAN" | "JAWABAN_BELUM_LENGKAP") {
    super(kode);
    this.name = "LatihanError";
  }
}

function kodeGalat(pesan: string): LatihanError | null {
  if (pesan.includes("JAWABAN_BELUM_LENGKAP")) return new LatihanError("JAWABAN_BELUM_LENGKAP");
  if (pesan.includes("TIDAK_DITEMUKAN")) return new LatihanError("TIDAK_DITEMUKAN");
  return null;
}

function keStatusTopik(nilai: string | null): StatusTopik {
  return nilai === "selesai" || nilai === "lemah" ? nilai : "belum";
}

/** Bank soal topik (klien sesi; hanya kolom yang di-GRANT). Kosong = belum dibuat. */
export async function getSoalTopik(topikId: number): Promise<SoalLatihan[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("t_soal")
    .select("id, urutan, pertanyaan, pilihan_a, pilihan_b, pilihan_c, pilihan_d")
    .eq("topik_id", topikId)
    .order("urutan");
  if (error) throw error;
  return (data ?? []).map((s) => ({
    id: s.id,
    urutan: s.urutan,
    pertanyaan: s.pertanyaan,
    pilihan: [s.pilihan_a, s.pilihan_b, s.pilihan_c, s.pilihan_d],
  }));
}

/**
 * BP-06 / BR-11: buat 5 soal sekali (pola klaim A7), simpan, catat pemakaian AI.
 * Melempar bila AI/penyimpanan gagal (route membalas MSG-L02).
 */
export async function siapkanSoal(penggunaId: number, topik: TopikMilik): Promise<HasilSiapkan<SoalLatihan[]>> {
  const ambil = async () => {
    const soal = await getSoalTopik(topik.id);
    return soal.length > 0 ? soal : null;
  };
  return siapkanDenganKlaim({
    topikId: topik.id,
    jenis: "soal",
    ambil,
    buat: async () => {
      const chunks = await getChunkTopik(topik.dokumenId, topik.halamanAwal, topik.halamanAkhir);
      const rentang = { judul: topik.judul, halaman_awal: topik.halamanAwal, halaman_akhir: topik.halamanAkhir };
      let hasil;
      try {
        hasil = await buatSoal(rentang, chunks);
      } catch (e) {
        if (e instanceof AiGagalError) {
          await catatPemakaianAI({
            userId: penggunaId,
            fitur: "soal",
            dokumenId: topik.dokumenId,
            pemakaian: e.pemakaian,
            isSukses: false,
            pesanError: e.message,
          });
        }
        throw e;
      }

      const admin = createAdminClient();
      const { error } = await admin.rpc("fn_simpan_soal_topik", {
        p_topik_id: topik.id,
        p_soal: hasil.soal.map((s) => ({ ...s })),
      });
      await catatPemakaianAI({
        userId: penggunaId,
        fitur: "soal",
        dokumenId: topik.dokumenId,
        pemakaian: hasil.pemakaian,
        isSukses: !error,
        pesanError: error?.message,
      });
      if (error) throw error;

      // fn_simpan_soal_topik = false bila permintaan lain sudah menyimpan lebih dulu → baca dari DB.
      const tersimpan = await ambil();
      if (!tersimpan) throw new Error("Soal tidak terbaca setelah disimpan.");
      return tersimpan;
    },
  });
}

/** Buka kunci SATU soal yang sudah dijawab (BP-06 L-04). Tidak menyimpan apa pun (BR-33). */
export async function periksaJawaban(soalId: number, pilihan: number): Promise<HasilPeriksa> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("fn_periksa_jawaban", { p_soal_id: soalId, p_dipilih: keHuruf(pilihan) });
  if (error) throw kodeGalat(error.message) ?? error;
  const baris = data?.[0];
  if (!baris) throw new LatihanError("TIDAK_DITEMUKAN");
  return {
    isBenar: baris.is_benar,
    kunci: keIndeks(baris.kunci),
    pembahasan: baris.pembahasan,
    halamanRujukan: baris.halaman_rujukan,
  };
}

/**
 * Simpan percobaan selesai. Skor & benar dihitung ULANG di DB dari kunci (BR-12, KEPUTUSAN B8);
 * yang dikirim hanya pilihan pengguna.
 */
export async function simpanLatihan(topikId: number, jawaban: JawabanSoal[]): Promise<HasilSimpanLatihan> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("fn_simpan_latihan", {
    p_topik_id: topikId,
    p_jawaban: jawaban.map((j) => ({ soal_id: j.soalId, dipilih: keHuruf(j.pilihan) })),
  });
  if (error) throw kodeGalat(error.message) ?? error;
  const baris = data?.[0];
  if (!baris) throw new Error("fn_simpan_latihan tidak mengembalikan baris.");
  return {
    latihanId: baris.latihan_id,
    skor: baris.skor,
    jumlahBenar: baris.jumlah_benar,
    jumlahSoal: baris.jumlah_soal,
    statusTopik: keStatusTopik(baris.status_topik),
  };
}

/** Tinjauan S-10. null = bukan milik pemanggil / tidak ada (RPC menyaring user, BR-06). */
export async function getHasilLatihan(latihanId: number): Promise<HasilLatihan | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("fn_hasil_latihan", { p_latihan_id: latihanId });
  if (error) throw error;
  const baris = data ?? [];
  const pertama = baris[0];
  if (!pertama) return null;
  return {
    latihanId,
    topikId: pertama.topik_id,
    judulTopik: pertama.snapshot_judul_topik,
    skor: pertama.skor,
    jumlahBenar: pertama.jumlah_benar,
    jumlahSoal: pertama.jumlah_soal,
    dibuatAt: pertama.created_at,
    item: baris.map((b) => ({
      soalId: b.soal_id,
      urutan: b.urutan,
      pertanyaan: b.pertanyaan,
      pilihan: [b.pilihan_a, b.pilihan_b, b.pilihan_c, b.pilihan_d],
      dipilih: keIndeks(b.dipilih),
      kunci: keIndeks(b.kunci),
      isBenar: b.is_benar,
      pembahasan: b.pembahasan,
      halamanRujukan: b.halaman_rujukan,
    })),
  };
}

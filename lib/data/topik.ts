import "server-only";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { AiGagalError, buatRingkasan, catatPemakaianAI, type ChunkSumber } from "@/lib/ai/generate";
import type { Json, JenisKlaimTopik, StatusDokumen, StatusTopik } from "@/types/database";

// Akses data topik (FT-04). Baca memakai klien sesi (RLS = hanya pemilik, BR-06);
// tulis ringkasan/klaim memakai service role SETELAH kepemilikan diverifikasi.

export interface RujukanMateri {
  halaman: number;
  kutipan: string;
}

/** Ringkasan terstruktur topik (BR-10, KEPUTUSAN §4). */
export interface RingkasanTopik {
  konsepInti: string;
  poinPenting: string[];
  contoh: string;
  rujukan: RujukanMateri[];
}

export interface TopikRingkas {
  id: number;
  urutan: number;
  judul: string;
  status: StatusTopik;
}

export interface TopikMilik {
  id: number;
  dokumenId: number;
  urutan: number;
  judul: string;
  halamanAwal: number;
  halamanAkhir: number;
  dokumenStatus: StatusDokumen;
  judulDokumen: string;
}

export interface DataHalamanTopik {
  topik: TopikMilik;
  ringkasan: RingkasanTopik | null;
  status: StatusTopik;
  daftar: TopikRingkas[];
  sebelumnya: TopikRingkas | null;
  berikutnya: TopikRingkas | null;
}

const STATUS_VALID: readonly StatusTopik[] = ["belum", "lemah", "selesai"];

function keStatusTopik(nilai: string | null): StatusTopik {
  return STATUS_VALID.find((s) => s === nilai) ?? "belum";
}

function keStatusDokumen(nilai: string): StatusDokumen {
  return nilai === "siap" || nilai === "gagal" ? nilai : "diproses";
}

/** poin_penting jsonb → string[] (CHECK di DB menjamin array 3–5; tetap disaring di sini). */
function parsePoinPenting(json: Json | null): string[] {
  if (!Array.isArray(json)) return [];
  return json.filter((p): p is string => typeof p === "string" && p.trim() !== "");
}

/**
 * Topik milik pengguna beserta status dokumennya, atau null (tidak ada / milik orang lain → 404, BR-06).
 * user_id dicek eksplisit walau RLS sudah menyaring, karena hasilnya dipakai untuk memanggil service role.
 */
export async function getTopikMilik(penggunaId: number, topikId: number): Promise<TopikMilik | null> {
  const supabase = await createClient();
  const { data: topik, error } = await supabase
    .from("t_topik")
    .select("id, dokumen_id, urutan, judul, halaman_awal, halaman_akhir")
    .eq("id", topikId)
    .maybeSingle();
  if (error) throw error;
  if (!topik) return null;

  const { data: dokumen, error: errDok } = await supabase
    .from("t_dokumen")
    .select("id, judul, status, user_id")
    .eq("id", topik.dokumen_id)
    .eq("user_id", penggunaId)
    .maybeSingle();
  if (errDok) throw errDok;
  if (!dokumen) return null;

  return {
    id: topik.id,
    dokumenId: topik.dokumen_id,
    urutan: topik.urutan,
    judul: topik.judul,
    halamanAwal: topik.halaman_awal,
    halamanAkhir: topik.halaman_akhir,
    dokumenStatus: keStatusDokumen(dokumen.status),
    judulDokumen: dokumen.judul,
  };
}

/** Ringkasan tersimpan + rujukan (urut sesuai `urutan`), atau null bila belum dibuat (BR-10). */
export async function getRingkasan(topikId: number): Promise<RingkasanTopik | null> {
  const supabase = await createClient();
  const { data: topik, error } = await supabase
    .from("t_topik")
    .select("konsep_inti, poin_penting, contoh, ringkasan_dibuat_at")
    .eq("id", topikId)
    .maybeSingle();
  if (error) throw error;
  if (!topik?.ringkasan_dibuat_at || !topik.konsep_inti || !topik.contoh) return null;

  const { data: rujukan, error: errRuj } = await supabase
    .from("t_topik_rujukan")
    .select("halaman, kutipan, urutan")
    .eq("topik_id", topikId)
    .order("urutan");
  if (errRuj) throw errRuj;

  return {
    konsepInti: topik.konsep_inti,
    poinPenting: parsePoinPenting(topik.poin_penting),
    contoh: topik.contoh,
    rujukan: (rujukan ?? []).map((r) => ({ halaman: r.halaman, kutipan: r.kutipan })),
  };
}

/** Semua topik dokumen + status BR-13 dari v_progres_topik (hanya dokumen siap, BR-07). */
export async function getDaftarTopikDokumen(penggunaId: number, dokumenId: number): Promise<TopikRingkas[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("v_progres_topik")
    .select("topik_id, urutan, judul_topik, status")
    .eq("dokumen_id", dokumenId)
    .eq("user_id", penggunaId)
    .order("urutan");
  if (error) throw error;
  return (data ?? []).flatMap((r) =>
    r.topik_id === null || r.urutan === null
      ? []
      : [{ id: r.topik_id, urutan: r.urutan, judul: r.judul_topik ?? "", status: keStatusTopik(r.status) }],
  );
}

/** BR-35: topik pertama (urutan terkecil) berstatus belum/lemah, selain topik yang dikecualikan. */
export function topikDisarankan(daftar: TopikRingkas[], kecualiId?: number): TopikRingkas | null {
  return daftar.find((t) => t.id !== kecualiId && t.status !== "selesai") ?? null;
}

/**
 * Data S-08. null = tidak ada / bukan milik (404). Dokumen yang belum siap tetap dikembalikan
 * (topik.dokumenStatus) agar halaman bisa mengalihkan ke S-07 (BR-07).
 */
export async function getHalamanTopik(
  penggunaId: number,
  dokumenId: number,
  topikId: number,
): Promise<DataHalamanTopik | null> {
  const topik = await getTopikMilik(penggunaId, topikId);
  if (!topik || topik.dokumenId !== dokumenId) return null;
  if (topik.dokumenStatus !== "siap") {
    return { topik, ringkasan: null, status: "belum", daftar: [], sebelumnya: null, berikutnya: null };
  }
  const [ringkasan, daftar] = await Promise.all([getRingkasan(topikId), getDaftarTopikDokumen(penggunaId, dokumenId)]);
  const posisi = daftar.findIndex((t) => t.id === topikId);
  return {
    topik,
    ringkasan,
    status: daftar[posisi]?.status ?? "belum",
    daftar,
    sebelumnya: posisi > 0 ? daftar[posisi - 1] : null,
    berikutnya: posisi >= 0 && posisi < daftar.length - 1 ? daftar[posisi + 1] : null,
  };
}

/** BR-34 + KEPUTUSAN A2: membuka topik = aktivitas terakhir. Gagal mencatat tidak menggagalkan halaman. */
export async function catatBukaTopik(topikId: number): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("fn_catat_buka_topik", { p_topik_id: topikId });
  if (error) console.error("[catatBukaTopik]", error.message);
}

// ── Pembuatan sekali dengan klaim (KEPUTUSAN A7) ─────────────────────────

/**
 * Chunk yang beririsan rentang halaman topik. t_chunk tidak bisa dibaca klien sesi, jadi memakai
 * service role — WAJIB dipanggil dengan dokumenId yang sudah diverifikasi milik pengguna.
 */
export async function getChunkTopik(dokumenId: number, awal: number, akhir: number): Promise<ChunkSumber[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("t_chunk")
    .select("id, isi, halaman_awal, halaman_akhir, urutan")
    .eq("dokumen_id", dokumenId)
    .lte("halaman_awal", akhir)
    .gte("halaman_akhir", awal)
    .order("urutan");
  if (error) throw error;
  return data ?? [];
}

export type HasilSiapkan<T> = { status: "siap"; data: T } | { status: "diproses" };

/**
 * Pola A7: kembalikan yang sudah ada → klaim → buat. Klaim gagal berarti permintaan lain sedang
 * membuat (atau baru selesai) → "diproses" (API 202, browser polling). Bila `buat` melempar,
 * klaim dilepas supaya "Coba lagi" bisa langsung mengklaim ulang.
 */
export async function siapkanDenganKlaim<T>(opsi: {
  topikId: number;
  jenis: JenisKlaimTopik;
  ambil: () => Promise<T | null>;
  buat: () => Promise<T>;
}): Promise<HasilSiapkan<T>> {
  const ada = await opsi.ambil();
  if (ada) return { status: "siap", data: ada };

  const admin = createAdminClient();
  const { data: diklaim, error } = await admin.rpc("fn_klaim_topik", { p_topik_id: opsi.topikId, p_jenis: opsi.jenis });
  if (error) throw error;
  if (!diklaim) {
    const baru = await opsi.ambil();
    return baru ? { status: "siap", data: baru } : { status: "diproses" };
  }

  try {
    return { status: "siap", data: await opsi.buat() };
  } catch (e) {
    const { error: errLepas } = await admin.rpc("fn_lepas_klaim_topik", { p_topik_id: opsi.topikId, p_jenis: opsi.jenis });
    if (errLepas) console.error("[siapkanDenganKlaim] gagal melepas klaim:", errLepas.message);
    throw e;
  }
}

/**
 * BP-05 / BR-10: buat ringkasan sekali dari chunk rentang topik, simpan, catat pemakaian AI.
 * Melempar bila AI/penyimpanan gagal (route membalas MSG-B01).
 */
export async function siapkanRingkasan(penggunaId: number, topik: TopikMilik): Promise<HasilSiapkan<RingkasanTopik>> {
  return siapkanDenganKlaim({
    topikId: topik.id,
    jenis: "ringkasan",
    ambil: () => getRingkasan(topik.id),
    buat: async () => {
      const chunks = await getChunkTopik(topik.dokumenId, topik.halamanAwal, topik.halamanAkhir);
      const rentang = { judul: topik.judul, halaman_awal: topik.halamanAwal, halaman_akhir: topik.halamanAkhir };
      let hasil;
      try {
        hasil = await buatRingkasan(rentang, chunks);
      } catch (e) {
        if (e instanceof AiGagalError) {
          await catatPemakaianAI({
            userId: penggunaId,
            fitur: "ringkasan",
            dokumenId: topik.dokumenId,
            pemakaian: e.pemakaian,
            isSukses: false,
            pesanError: e.message,
          });
        }
        throw e;
      }

      const admin = createAdminClient();
      const { error } = await admin.rpc("fn_simpan_ringkasan_topik", {
        p_topik_id: topik.id,
        p_konsep_inti: hasil.konsep_inti,
        p_poin_penting: hasil.poin_penting,
        p_contoh: hasil.contoh,
        p_rujukan: hasil.rujukan.map((r) => ({ halaman: r.halaman, kutipan: r.kutipan, chunk_id: r.chunk_id })),
      });
      // Biaya AI tetap terjadi walau simpan gagal → tetap dicatat, ditandai gagal.
      await catatPemakaianAI({
        userId: penggunaId,
        fitur: "ringkasan",
        dokumenId: topik.dokumenId,
        pemakaian: hasil.pemakaian,
        isSukses: !error,
        pesanError: error?.message,
      });
      if (error) throw error;

      // Baca ulang dari DB: bila permintaan lain menang lebih dulu (is_baru=false), yang tampil
      // adalah versi tersimpan, bukan hasil panggilan ini (BR-10 tidak pernah menimpa).
      const tersimpan = await getRingkasan(topik.id);
      if (!tersimpan) throw new Error("Ringkasan tidak terbaca setelah disimpan.");
      return tersimpan;
    },
  });
}

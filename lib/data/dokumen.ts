import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { createAdminClient } from "@/lib/supabase/admin";
import { BUCKET_DOKUMEN, DEFAULT_MAX_HALAMAN, DEFAULT_MAX_UKURAN_MB } from "@/lib/config";
import type { Tables, Views } from "@/types/database";
import { hapusSampulDokumen } from "@/lib/data/materi";
import {
  keStatusDokumen,
  keStatusTopik,
  keTahapDokumen,
  type DetailDokumen,
  type KuotaDokumen,
  type RingkasanDokumen,
  type StatusDokumenApi,
  type TopikDokumen,
} from "@/lib/dokumen/tipe";

// Akses data dokumen untuk S-06, S-07, S-11 & API FT-02/03. Memakai klien sesi (RLS):
// baris milik orang lain tidak terbaca → diperlakukan "tidak ada" (BR-06).

type KlienSesi = Awaited<ReturnType<typeof createClient>>;

const KOLOM_DOKUMEN =
  "id, kode, judul, nama_file, path_file, ukuran_byte, jumlah_halaman, jumlah_topik, status, tahap, pesan_gagal, created_at, aktivitas_terakhir_at, updated_by" as const;
type BarisDokumen = Pick<
  Tables<"t_dokumen">,
  | "id"
  | "kode"
  | "judul"
  | "nama_file"
  | "path_file"
  | "ukuran_byte"
  | "jumlah_halaman"
  | "jumlah_topik"
  | "status"
  | "tahap"
  | "pesan_gagal"
  | "created_at"
  | "aktivitas_terakhir_at"
  | "updated_by"
>;

function keStatusApi(d: BarisDokumen): StatusDokumenApi {
  return {
    id: d.id,
    kode: d.kode,
    judul: d.judul,
    status: keStatusDokumen(d.status),
    tahap: keTahapDokumen(d.tahap),
    pesanGagal: d.pesan_gagal,
    jumlahHalaman: d.jumlah_halaman,
    jumlahTopik: d.jumlah_topik,
  };
}

function keRingkasan(d: BarisDokumen, p: Views<"v_progres_dokumen"> | undefined): RingkasanDokumen {
  return {
    ...keStatusApi(d),
    namaFile: d.nama_file,
    createdAt: d.created_at,
    aktivitasTerakhirAt: d.aktivitas_terakhir_at,
    topikSelesai: p?.topik_selesai ?? 0,
    totalTopik: p?.total_topik ?? d.jumlah_topik ?? 0,
    topikLemah: p?.topik_lemah ?? 0,
    persenSelesai: p?.persen_selesai ?? 0,
  };
}

/** A8: dokumen `diproses` > 15 menit → gagal. Gagal di sini tidak boleh memblokir halaman. */
export async function tandaiDokumenMacet(supabase: KlienSesi): Promise<void> {
  const { error } = await supabase.rpc("fn_tandai_dokumen_macet", {});
  if (error) console.error("[dokumen] fn_tandai_dokumen_macet", error.message);
}

/** A9: hapus dokumen `gagal` > 7 hari lalu hapus file Storage-nya (fungsi DB tidak menyentuh Storage). */
async function bersihkanDokumenGagal(supabase: KlienSesi): Promise<void> {
  const { data, error } = await supabase.rpc("fn_bersihkan_dokumen_gagal", {});
  if (error) {
    console.error("[dokumen] fn_bersihkan_dokumen_gagal", error.message);
    return;
  }
  const paths = (data ?? []).map((d) => d.path_file);
  if (paths.length === 0) return;
  const { error: eStorage } = await supabase.storage.from(BUCKET_DOKUMEN).remove(paths);
  if (eStorage) console.error("[dokumen] hapus file dokumen gagal (A9)", eStorage.message);
}

async function pengaturanInt(supabase: KlienSesi, kode: string, cadangan: number): Promise<number> {
  const { data, error } = await supabase.rpc("fn_pengaturan_int", { p_kode: kode });
  if (error || typeof data !== "number") return cadangan;
  return data;
}

export async function getKuotaDokumen(supabase?: KlienSesi): Promise<KuotaDokumen> {
  const db = supabase ?? (await createClient());
  const { data, error } = await db.rpc("fn_kuota_dokumen", {});
  if (error) throw error;
  const k = data?.[0];
  return { terpakai: k?.terpakai ?? 0, maks: k?.maks ?? 0 };
}

/** Batas unggah (BR-02/03) dibaca saat halaman dibuka (BR-28). */
export async function getPengaturanUnggah(supabase?: KlienSesi): Promise<{ maxUkuranMb: number; maxHalaman: number }> {
  const db = supabase ?? (await createClient());
  const [maxUkuranMb, maxHalaman] = await Promise.all([
    pengaturanInt(db, "max_ukuran_mb", DEFAULT_MAX_UKURAN_MB),
    pengaturanInt(db, "max_halaman", DEFAULT_MAX_HALAMAN),
  ]);
  return { maxUkuranMb, maxHalaman };
}

/** Baris mentah milik pengguna (untuk API: cek pemilik & status). null = tidak ada / bukan milik. */
export async function getBarisDokumen(id: number, supabase?: KlienSesi): Promise<BarisDokumen | null> {
  const db = supabase ?? (await createClient());
  const { data, error } = await db.from("t_dokumen").select(KOLOM_DOKUMEN).eq("id", id).maybeSingle();
  if (error) throw error;
  return data;
}

/** Status untuk polling (GET /api/dokumen/[id]); menandai macet dulu (A8). */
export async function getStatusDokumen(id: number): Promise<StatusDokumenApi | null> {
  const supabase = await createClient();
  await tandaiDokumenMacet(supabase);
  const d = await getBarisDokumen(id, supabase);
  return d ? keStatusApi(d) : null;
}

export interface LanjutkanBelajar {
  dokumenId: number;
  judulDokumen: string;
  topikId: number;
  urutan: number;
  judulTopik: string;
  halamanAwal: number;
  halamanAkhir: number;
  skorTerakhir: number | null;
  totalTopik: number;
}

export interface DataBeranda {
  dokumen: RingkasanDokumen[];
  kuota: KuotaDokumen;
  lanjutkan: LanjutkanBelajar | null;
  maxUkuranMb: number;
  /** Rata-rata skor terakhir semua topik yang pernah dilatih (BR-15 lintas dokumen). */
  rataRataSkor: number | null;
}

/** Semua data S-06. Membereskan dokumen macet (A8) & gagal lama (A9) sebelum membaca. */
export async function getDataBeranda(): Promise<DataBeranda> {
  const supabase = await createClient();
  await tandaiDokumenMacet(supabase);
  await bersihkanDokumenGagal(supabase);

  const [dok, progres, skor, kuota, lanjut, maxUkuranMb] = await Promise.all([
    supabase.from("t_dokumen").select(KOLOM_DOKUMEN).order("created_at", { ascending: false }),
    supabase.from("v_progres_dokumen").select("*"),
    supabase.from("v_progres_topik").select("skor_terakhir").not("skor_terakhir", "is", null),
    getKuotaDokumen(supabase),
    supabase.rpc("fn_lanjutkan_belajar"),
    pengaturanInt(supabase, "max_ukuran_mb", DEFAULT_MAX_UKURAN_MB),
  ]);
  if (dok.error) throw dok.error;
  if (progres.error) throw progres.error;
  if (skor.error) throw skor.error;
  if (lanjut.error) throw lanjut.error;

  const perDokumen = new Map((progres.data ?? []).map((p) => [p.dokumen_id, p]));
  const dokumen = (dok.data ?? []).map((d) => keRingkasan(d, perDokumen.get(d.id)));

  const daftarSkor = (skor.data ?? []).map((s) => s.skor_terakhir).filter((s): s is number => s !== null);
  const rataRataSkor = daftarSkor.length ? Math.round(daftarSkor.reduce((a, b) => a + b, 0) / daftarSkor.length) : null;

  const l = lanjut.data?.[0];
  const lanjutkan: LanjutkanBelajar | null = l
    ? {
        dokumenId: l.dokumen_id,
        judulDokumen: l.judul_dokumen,
        topikId: l.topik_id,
        urutan: l.urutan,
        judulTopik: l.judul_topik,
        halamanAwal: l.halaman_awal,
        halamanAkhir: l.halaman_akhir,
        skorTerakhir: l.skor_terakhir ?? null,
        totalTopik: dokumen.find((d) => d.id === l.dokumen_id)?.totalTopik ?? 0,
      }
    : null;

  return { dokumen, kuota, lanjutkan, maxUkuranMb, rataRataSkor };
}

/** BR-35 (+ KEPUTUSAN B5): topik disarankan. */
export function pilihTopikDisarankan(topik: TopikDokumen[]): { id: number | null; semuaSelesai: boolean } {
  const pertama = topik.find((t) => t.status !== "selesai");
  if (pertama) return { id: pertama.id, semuaSelesai: false };
  if (topik.length === 0) return { id: null, semuaSelesai: false };
  // B5: semua selesai → sarankan skor terakhir terendah untuk penguatan.
  const terendah = [...topik].sort((a, b) => (a.skorTerakhir ?? 0) - (b.skorTerakhir ?? 0) || a.urutan - b.urutan)[0];
  return { id: terendah.id, semuaSelesai: true };
}

/** Data S-07. null = tidak ada / bukan milik pengguna → 404. */
export async function getDetailDokumen(id: number): Promise<DetailDokumen | null> {
  const supabase = await createClient();
  await tandaiDokumenMacet(supabase);
  const d = await getBarisDokumen(id, supabase);
  if (!d) return null;

  let topik: TopikDokumen[] = [];
  let progres: Views<"v_progres_dokumen"> | undefined;
  if (d.status === "siap") {
    const [t, p] = await Promise.all([
      supabase.from("v_progres_topik").select("*").eq("dokumen_id", id).order("urutan"),
      supabase.from("v_progres_dokumen").select("*").eq("dokumen_id", id).maybeSingle(),
    ]);
    if (t.error) throw t.error;
    if (p.error) throw p.error;
    progres = p.data ?? undefined;
    topik = (t.data ?? []).flatMap((r) =>
      r.topik_id === null
        ? []
        : [
            {
              id: r.topik_id,
              urutan: r.urutan ?? 0,
              judul: r.judul_topik ?? "",
              halamanAwal: r.halaman_awal ?? 1,
              halamanAkhir: r.halaman_akhir ?? 1,
              status: keStatusTopik(r.status),
              skorTerakhir: r.skor_terakhir,
            },
          ],
    );
  }
  const saran = pilihTopikDisarankan(topik);
  return {
    ...keRingkasan(d, progres),
    ukuranByte: d.ukuran_byte,
    rataRataSkor: progres?.rata_rata_skor ?? null,
    topik,
    topikDisarankanId: saran.id,
    semuaSelesai: saran.semuaSelesai,
  };
}

// ── Hapus dokumen & cek file (FT-02/03) ───────────────────────────────────────

type KlienAdmin = ReturnType<typeof createAdminClient>;

export type HasilHapusDokumen =
  | { status: "terhapus"; pathFile: string }
  | { status: "tidak_ditemukan" }
  | { status: "diproses" };

/**
 * BP-09/BR-20: hapus BARIS dulu lewat fn_hapus_dokumen (aturan "tidak sedang diolah" + A8 di DB,
 * mengembalikan path_file), baru kemudian file Storage (hapusFileDokumen). Urutan ini menjamin
 * tidak ada baris yang menunjuk file yang sudah hilang; kegagalan hapus file hanya meninggalkan
 * file yatim yang dicatat di log server.
 */
export async function hapusDokumenMilik(supabase: KlienSesi, id: number): Promise<HasilHapusDokumen> {
  const { data, error } = await supabase.rpc("fn_hapus_dokumen", { p_dokumen_id: id });
  if (error) {
    if (error.message.startsWith("TIDAK_DITEMUKAN")) return { status: "tidak_ditemukan" };
    if (error.message.startsWith("DOKUMEN_DIPROSES")) return { status: "diproses" };
    throw error;
  }
  const baris = data?.[0];
  return baris ? { status: "terhapus", pathFile: baris.path_file } : { status: "tidak_ditemukan" };
}

/** Hapus file Storage setelah barisnya terhapus. Tidak melempar: gagal = file yatim (dicatat). */
export async function hapusFileDokumen(admin: KlienAdmin, pathFile: string, konteks: string): Promise<void> {
  await hapusSampulDokumen(pathFile, konteks); // sampul topik di bucket `sampul` (KEPUTUSAN §4)
  try {
    const { error } = await admin.storage.from(BUCKET_DOKUMEN).remove([pathFile]);
    if (error) console.error(`[${konteks}] FILE YATIM — baris terhapus tetapi file Storage gagal dihapus: ${pathFile}`, error.message);
  } catch (e) {
    console.error(`[${konteks}] FILE YATIM — ${pathFile}`, e instanceof Error ? e.message : e);
  }
}

export interface InfoFileDokumen {
  ada: boolean;
  /** Ukuran nyata di Storage (storage.objects.metadata.size); null = metadata belum tersedia. */
  ukuranByte: number | null;
  maksByte: number;
  isTerlaluBesar: boolean;
}

/** BR-02: ukuran NYATA file yang diunggah (fn_periksa_file_dokumen, service role). */
export async function periksaFileDokumen(admin: KlienAdmin, id: number): Promise<InfoFileDokumen> {
  const { data, error } = await admin.rpc("fn_periksa_file_dokumen", { p_dokumen_id: id });
  if (error) throw error;
  const b = data?.[0];
  if (!b) throw new Error("fn_periksa_file_dokumen tidak mengembalikan baris.");
  return { ada: b.ada, ukuranByte: b.ukuran_byte, maksByte: b.maks_byte, isTerlaluBesar: b.is_terlalu_besar };
}

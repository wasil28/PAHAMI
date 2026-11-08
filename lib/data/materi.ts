import "server-only";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { AiGagalError, catatPemakaianAI, type Pemakaian } from "@/lib/ai/generate";
import { buatIsiMateri, buatKerangkaMateri } from "@/lib/ai/materi";
import { buatSampul } from "@/lib/ai/sampul";
import {
  getChunkTopik,
  getDaftarTopikDokumen,
  getTopikMilik,
  siapkanDenganKlaim,
  type HasilSiapkan,
  type TopikMilik,
} from "@/lib/data/topik";
import { skemaDiagram, type IsiMateri, type MateriRingkas } from "@/lib/materi/tipe";
import type { FiturAi, Json, StatusTopik } from "@/types/database";

// Akses data fitur Materi (KEPUTUSAN §4). Baca memakai klien sesi (RLS pemilik); tulis memakai
// service role SETELAH kepemilikan diverifikasi (pola sama dengan lib/data/topik.ts).

export const BUCKET_SAMPUL = "sampul";
const MASA_URL_SAMPUL_DETIK = 60 * 60;

type BarisMateri = {
  id: number;
  topik_id: number;
  urutan: number;
  judul: string;
  halaman_awal: number;
  halaman_akhir: number;
  isi_dibuat_at: string | null;
  dibaca_at: string | null;
};

const KOLOM_RINGKAS = "id, topik_id, urutan, judul, halaman_awal, halaman_akhir, isi_dibuat_at, dibaca_at";

function keRingkas(m: BarisMateri): MateriRingkas {
  return {
    id: m.id,
    urutan: m.urutan,
    judul: m.judul,
    halamanAwal: m.halaman_awal,
    halamanAkhir: m.halaman_akhir,
    isiSiap: m.isi_dibuat_at !== null,
    sudahDibaca: m.dibaca_at !== null,
  };
}

function keDaftarTeks(json: Json | null): string[] {
  return Array.isArray(json) ? json.filter((p): p is string => typeof p === "string" && p.trim() !== "") : [];
}

async function catatGagal(penggunaId: number, fitur: FiturAi, dokumenId: number, e: unknown): Promise<void> {
  if (e instanceof AiGagalError) {
    await catatPemakaianAI({ userId: penggunaId, fitur, dokumenId, pemakaian: e.pemakaian, isSukses: false, pesanError: e.message });
  }
}

// ── Kerangka (daftar materi) ─────────────────────────────────────────────

/** Daftar materi topik, urut. [] bila kerangka belum dibuat. */
export async function getDaftarMateri(topikId: number): Promise<MateriRingkas[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("t_materi").select(KOLOM_RINGKAS).eq("topik_id", topikId).order("urutan");
  if (error) throw error;
  return (data ?? []).map(keRingkas);
}

/** Buat kerangka sekali (klaim A7 jenis 'materi'), lalu kembalikan daftarnya. */
export async function siapkanKerangkaMateri(penggunaId: number, topik: TopikMilik): Promise<HasilSiapkan<MateriRingkas[]>> {
  const ambil = async () => {
    const daftar = await getDaftarMateri(topik.id);
    return daftar.length > 0 ? daftar : null;
  };
  return siapkanDenganKlaim({
    topikId: topik.id,
    jenis: "materi",
    ambil,
    buat: async () => {
      const chunks = await getChunkTopik(topik.dokumenId, topik.halamanAwal, topik.halamanAkhir);
      const rentang = { judul: topik.judul, halaman_awal: topik.halamanAwal, halaman_akhir: topik.halamanAkhir };
      let hasil;
      try {
        hasil = await buatKerangkaMateri(rentang, chunks);
      } catch (e) {
        await catatGagal(penggunaId, "materi", topik.dokumenId, e);
        throw e;
      }
      const admin = createAdminClient();
      const { error } = await admin.rpc("fn_simpan_kerangka_materi", { p_topik_id: topik.id, p_materi: hasil.materi as unknown as Json });
      if (hasil.pemakaian) {
        await catatPemakaianAI({
          userId: penggunaId,
          fitur: "materi",
          dokumenId: topik.dokumenId,
          pemakaian: hasil.pemakaian,
          isSukses: !error,
          pesanError: error?.message,
        });
      }
      if (error) throw error;
      const tersimpan = await ambil();
      if (!tersimpan) throw new Error("Kerangka materi tidak terbaca setelah disimpan.");
      return tersimpan;
    },
  });
}

// ── Isi satu materi ──────────────────────────────────────────────────────

export interface MateriMilik {
  materi: MateriRingkas;
  topik: TopikMilik;
}

/** Materi milik pengguna beserta topiknya, atau null (404, BR-06). */
export async function getMateriMilik(penggunaId: number, materiId: number): Promise<MateriMilik | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("t_materi").select(KOLOM_RINGKAS).eq("id", materiId).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const topik = await getTopikMilik(penggunaId, data.topik_id);
  return topik ? { materi: keRingkas(data), topik } : null;
}

/** Isi tersimpan + rujukan, atau null bila belum dibuat. */
export async function getIsiMateri(materiId: number): Promise<IsiMateri | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("t_materi")
    .select("penjelasan, poin_penting, contoh, diagram, isi_dibuat_at")
    .eq("id", materiId)
    .maybeSingle();
  if (error) throw error;
  if (!data?.isi_dibuat_at || !data.penjelasan || !data.contoh) return null;

  const { data: rujukan, error: errRuj } = await supabase
    .from("t_materi_rujukan")
    .select("halaman, kutipan, urutan")
    .eq("materi_id", materiId)
    .order("urutan");
  if (errRuj) throw errRuj;

  const diagram = data.diagram ? skemaDiagram.safeParse(data.diagram) : null;
  return {
    penjelasan: data.penjelasan,
    poinPenting: keDaftarTeks(data.poin_penting),
    contoh: data.contoh,
    diagram: diagram?.success ? diagram.data : null,
    rujukan: (rujukan ?? []).map((r) => ({ halaman: r.halaman, kutipan: r.kutipan })),
  };
}

/** Klaim per materi (pola A7) → buat isi sekali → simpan → catat biaya. */
export async function siapkanIsiMateri(penggunaId: number, data: MateriMilik): Promise<HasilSiapkan<IsiMateri>> {
  const { materi, topik } = data;
  const ada = await getIsiMateri(materi.id);
  if (ada) return { status: "siap", data: ada };

  const admin = createAdminClient();
  const { data: diklaim, error: errKlaim } = await admin.rpc("fn_klaim_materi", { p_materi_id: materi.id });
  if (errKlaim) throw errKlaim;
  if (!diklaim) {
    const baru = await getIsiMateri(materi.id);
    return baru ? { status: "siap", data: baru } : { status: "diproses" };
  }

  try {
    const chunks = await getChunkTopik(topik.dokumenId, materi.halamanAwal, materi.halamanAkhir);
    let hasil;
    try {
      hasil = await buatIsiMateri(
        { judul: topik.judul },
        { judul: materi.judul, halaman_awal: materi.halamanAwal, halaman_akhir: materi.halamanAkhir },
        chunks,
      );
    } catch (e) {
      await catatGagal(penggunaId, "materi", topik.dokumenId, e);
      throw e;
    }
    const { error } = await admin.rpc("fn_simpan_isi_materi", {
      p_materi_id: materi.id,
      p_penjelasan: hasil.penjelasan,
      p_poin_penting: hasil.poin_penting,
      p_contoh: hasil.contoh,
      p_diagram: hasil.diagram as Json | null,
      p_rujukan: hasil.rujukan.map((r) => ({ halaman: r.halaman, kutipan: r.kutipan, chunk_id: r.chunk_id })),
    });
    await catatPemakaianAI({
      userId: penggunaId,
      fitur: "materi",
      dokumenId: topik.dokumenId,
      pemakaian: hasil.pemakaian,
      isSukses: !error,
      pesanError: error?.message,
    });
    if (error) throw error;
    const tersimpan = await getIsiMateri(materi.id);
    if (!tersimpan) throw new Error("Isi materi tidak terbaca setelah disimpan.");
    return { status: "siap", data: tersimpan };
  } catch (e) {
    const { error: errLepas } = await admin.rpc("fn_lepas_klaim_materi", { p_materi_id: materi.id });
    if (errLepas) console.error("[siapkanIsiMateri] gagal melepas klaim:", errLepas.message);
    throw e;
  }
}

/** Tandai materi dibaca. Gagal mencatat tidak menggagalkan halaman. */
export async function catatBacaMateri(materiId: number): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("fn_catat_baca_materi", { p_materi_id: materiId });
  if (error) console.error("[catatBacaMateri]", error.message);
}

// ── Halaman materi (S-08b) ───────────────────────────────────────────────

export interface DataHalamanMateri {
  topik: TopikMilik;
  status: StatusTopik;
  totalTopik: number;
  materi: MateriRingkas;
  isi: IsiMateri | null;
  daftarMateri: MateriRingkas[];
  sebelumnya: MateriRingkas | null;
  berikutnya: MateriRingkas | null;
}

/** null = tidak ada / bukan milik / tidak cocok dengan URL (404). */
export async function getHalamanMateri(
  penggunaId: number,
  dokumenId: number,
  topikId: number,
  materiId: number,
): Promise<DataHalamanMateri | null> {
  const milik = await getMateriMilik(penggunaId, materiId);
  if (!milik || milik.topik.id !== topikId || milik.topik.dokumenId !== dokumenId) return null;
  const { topik } = milik;
  if (topik.dokumenStatus !== "siap") {
    return { topik, status: "belum", totalTopik: 0, materi: milik.materi, isi: null, daftarMateri: [], sebelumnya: null, berikutnya: null };
  }
  const [isi, daftarMateri, daftarTopik] = await Promise.all([
    getIsiMateri(materiId),
    getDaftarMateri(topikId),
    getDaftarTopikDokumen(penggunaId, dokumenId),
  ]);
  const posisi = daftarMateri.findIndex((m) => m.id === materiId);
  return {
    topik,
    status: daftarTopik.find((t) => t.id === topikId)?.status ?? "belum",
    totalTopik: daftarTopik.length,
    materi: daftarMateri[posisi] ?? milik.materi,
    isi,
    daftarMateri,
    sebelumnya: posisi > 0 ? daftarMateri[posisi - 1] : null,
    berikutnya: posisi >= 0 && posisi < daftarMateri.length - 1 ? daftarMateri[posisi + 1] : null,
  };
}

// ── Sampul topik ─────────────────────────────────────────────────────────

type InfoSampul = { sampul_path: string | null; sampul_gagal_at: string | null; konsep_inti: string | null };

async function getInfoSampul(topikId: number): Promise<InfoSampul | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("t_topik")
    .select("sampul_path, sampul_gagal_at, konsep_inti")
    .eq("id", topikId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function urlBertanda(path: string): Promise<string | null> {
  const admin = createAdminClient();
  const { data, error } = await admin.storage.from(BUCKET_SAMPUL).createSignedUrl(path, MASA_URL_SAMPUL_DETIK);
  if (error) {
    console.error("[sampul] signed URL", error.message);
    return null;
  }
  return data.signedUrl;
}

/** Signed URL sampul tersimpan, atau null. Tidak pernah melempar (dekoratif). */
export async function getSampulTersimpan(penggunaId: number, topikId: number): Promise<string | null> {
  try {
    const topik = await getTopikMilik(penggunaId, topikId);
    if (!topik) return null;
    const info = await getInfoSampul(topikId);
    return info?.sampul_path ? await urlBertanda(info.sampul_path) : null;
  } catch (e) {
    console.error("[getSampulTersimpan]", e instanceof Error ? e.message : e);
    return null;
  }
}

/** Folder sampul dokumen: path PDF `{uid}/{kode}.pdf` → `{uid}/{kode}`. */
export function folderSampul(pathFileDokumen: string): string {
  return pathFileDokumen.replace(/\.pdf$/i, "");
}

/**
 * Sampul topik: ada → URL; belum → klaim → buat → unggah → URL. Gagal → url null (dekoratif,
 * tidak dicoba ulang selama 1 hari; lihat fn_klaim_topik). "diproses" = permintaan lain sedang membuat.
 */
export async function siapkanSampul(penggunaId: number, topik: TopikMilik): Promise<HasilSiapkan<string | null>> {
  const info = await getInfoSampul(topik.id);
  if (info?.sampul_path) return { status: "siap", data: await urlBertanda(info.sampul_path) };

  const admin = createAdminClient();
  const { data: diklaim, error } = await admin.rpc("fn_klaim_topik", { p_topik_id: topik.id, p_jenis: "sampul" });
  if (error) throw error;
  if (!diklaim) {
    const lagi = await getInfoSampul(topik.id);
    if (lagi?.sampul_path) return { status: "siap", data: await urlBertanda(lagi.sampul_path) };
    return lagi?.sampul_gagal_at ? { status: "siap", data: null } : { status: "diproses" };
  }

  let pemakaian: Pemakaian | null = null;
  try {
    const { data: dok, error: errDok } = await admin
      .from("t_dokumen")
      .select("path_file")
      .eq("id", topik.dokumenId)
      .maybeSingle();
    if (errDok) throw errDok;
    if (!dok?.path_file) throw new Error("Path dokumen tidak ditemukan.");

    const daftar = await getDaftarMateri(topik.id).catch(() => []);
    const gagasan = (info?.konsep_inti ?? daftar.map((m) => m.judul).join("; ")).slice(0, 400) || topik.judul;
    const gambar = await buatSampul(topik.judul, gagasan);
    pemakaian = gambar.pemakaian;

    const path = `${folderSampul(dok.path_file)}/topik-${topik.id}.${gambar.ekstensi}`;
    const { error: errUnggah } = await admin.storage
      .from(BUCKET_SAMPUL)
      .upload(path, gambar.data, { contentType: gambar.mime, upsert: true });
    if (errUnggah) throw errUnggah;
    const { error: errSimpan } = await admin.rpc("fn_simpan_sampul_topik", { p_topik_id: topik.id, p_path: path });
    if (errSimpan) throw errSimpan;

    await catatPemakaianAI({ userId: penggunaId, fitur: "sampul", dokumenId: topik.dokumenId, pemakaian, isSukses: true });
    return { status: "siap", data: await urlBertanda(path) };
  } catch (e) {
    console.error("[siapkanSampul]", e instanceof Error ? e.message : e);
    const p = pemakaian ?? (e instanceof AiGagalError ? e.pemakaian : null);
    if (p) {
      await catatPemakaianAI({
        userId: penggunaId,
        fitur: "sampul",
        dokumenId: topik.dokumenId,
        pemakaian: p,
        isSukses: false,
        pesanError: e instanceof Error ? e.message : String(e),
      });
    }
    const { error: errLepas } = await admin.rpc("fn_lepas_klaim_topik", { p_topik_id: topik.id, p_jenis: "sampul" });
    if (errLepas) console.error("[siapkanSampul] gagal melepas klaim:", errLepas.message);
    return { status: "siap", data: null };
  }
}

/** Hapus semua sampul satu dokumen. Tidak melempar: gagal = file yatim (dicatat). */
export async function hapusSampulDokumen(pathFileDokumen: string, konteks: string): Promise<void> {
  try {
    const admin = createAdminClient();
    const folder = folderSampul(pathFileDokumen);
    const { data, error } = await admin.storage.from(BUCKET_SAMPUL).list(folder, { limit: 100 });
    if (error) throw error;
    const paths = (data ?? []).map((f) => `${folder}/${f.name}`);
    if (paths.length === 0) return;
    const { error: errHapus } = await admin.storage.from(BUCKET_SAMPUL).remove(paths);
    if (errHapus) throw errHapus;
  } catch (e) {
    console.error(`[${konteks}] SAMPUL YATIM — ${pathFileDokumen}`, e instanceof Error ? e.message : e);
  }
}

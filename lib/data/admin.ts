// Akses data area admin (FT-09 Kelola Pengguna, FT-10 Pengaturan Kuota, FT-11 Statistik).
// Semua lewat RPC SECURITY DEFINER yang memeriksa fn_is_admin() dan HANYA mengembalikan angka
// atau kolom akun — tidak pernah judul/isi dokumen (BR-06). Server saja.
import "server-only";
import type { PostgrestError } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  KODE_PENGATURAN,
  PENGGUNA_PER_HALAMAN,
  RENTANG_PENGATURAN,
  type KodePengaturan,
  type QueryDaftarPengguna,
  type RentangStatistik,
} from "@/lib/validasi/admin";
import type { Json } from "@/types/database";

// ── Tipe hasil (camelCase; diimpor klien dengan `import type`) ────────────

export type GagalData =
  | { jenis: "tidak_berhak"; kode?: string }
  | { jenis: "tidak_ditemukan" }
  | { jenis: "input"; detail?: string }
  | { jenis: "konflik" }
  | { jenis: "server"; error: unknown };
export type HasilData<T> = { ok: true; data: T } | { ok: false; gagal: GagalData };

export interface RingkasanPengguna {
  total: number;
  aktif: number;
  nonaktif: number;
}

export interface PenggunaBaris {
  id: number;
  nama: string;
  email: string;
  peran: "mahasiswa" | "admin";
  jumlahDokumen: number; // agregat saja (BR-06)
  bergabungAt: string;
  terakhirAktifAt: string | null;
  isActive: boolean;
}

export interface DaftarPengguna {
  baris: PenggunaBaris[];
  total: number;
  halaman: number;
  totalHalaman: number;
}

export interface StatistikDashboard {
  rentang: { hari: number; tanggalAwal: string; tanggalAkhir: string };
  pengguna: { total: number; aktif7Hari: number; baru7Hari: number };
  dokumen: { total: number; siap: number; diproses: number; gagal: number };
  ai: {
    pertanyaan: number;
    biayaTotalRp: number;
    biayaTanyaAiRp: number;
    rataBiayaPerPertanyaan: number | null;
    biayaPerFiturRp: Record<string, number>;
  };
}

export interface TitikSeriHarian {
  tanggal: string; // YYYY-MM-DD (kalender WIB)
  jumlah: number;
  biayaRp: number;
}

export interface PenggunaTerbaru {
  id: number;
  nama: string;
  bergabungAt: string;
  jumlahDokumen: number;
  isActive: boolean;
}

export interface ItemPengaturan {
  kode: KodePengaturan;
  nilai: number;
  nilaiDefault: number;
  min: number;
  maks: number;
}

export interface PengaturanKuota {
  item: ItemPengaturan[];
  /** max(updated_at) — dikirim balik saat simpan untuk deteksi konflik (B14). */
  versi: string | null;
  terakhirDiubah: { oleh: string; at: string } | null;
}

export interface EstimasiBiaya {
  mahasiswaAktif: number;
  rataBiayaPerPertanyaan: number | null; // null = belum ada data biaya
  estimasiHarianMaksRp: number | null;
}

/** Galat per kolom dari fn_ubah_pengaturan (DETAIL = JSON array). */
export interface GalatPengaturan {
  kode: string;
  alasan: "KODE_TIDAK_DIKENAL" | "BUKAN_BILANGAN_BULAT" | "DI_LUAR_RENTANG";
  min?: number;
  maks?: number;
}

// ── Pemetaan error PostgREST ─────────────────────────────────────────────

function petakanError(error: PostgrestError): GagalData {
  if (error.code === "42501") return { jenis: "tidak_berhak", kode: error.message };
  if (error.code === "P0002") return { jenis: "tidak_ditemukan" };
  if (error.code === "PT409") return { jenis: "konflik" };
  if (error.code === "22023") return { jenis: "input", detail: error.details ?? undefined };
  return { jenis: "server", error };
}

const angka = (v: unknown): number => (typeof v === "number" ? v : Number(v ?? 0) || 0);
const angkaAtauNull = (v: unknown): number | null => (v === null || v === undefined ? null : angka(v));
const objek = (v: Json | undefined): Record<string, Json | undefined> =>
  v && typeof v === "object" && !Array.isArray(v) ? v : {};

// ── Statistik (S-14) ─────────────────────────────────────────────────────

export async function getStatistikDashboard(rentang: RentangStatistik): Promise<HasilData<StatistikDashboard>> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("fn_statistik_dashboard", { p_rentang_hari: rentang });
  if (error) return { ok: false, gagal: petakanError(error) };
  const akar = objek(data);
  const r = objek(akar.rentang);
  const p = objek(akar.pengguna);
  const d = objek(akar.dokumen);
  const ai = objek(akar.ai);
  const perFitur = objek(ai.biaya_per_fitur_rp);
  return {
    ok: true,
    data: {
      rentang: { hari: angka(r.hari), tanggalAwal: String(r.tanggal_awal ?? ""), tanggalAkhir: String(r.tanggal_akhir ?? "") },
      pengguna: { total: angka(p.total), aktif7Hari: angka(p.aktif_7_hari), baru7Hari: angka(p.baru_7_hari) },
      dokumen: { total: angka(d.total), siap: angka(d.siap), diproses: angka(d.diproses), gagal: angka(d.gagal) },
      ai: {
        pertanyaan: angka(ai.pertanyaan),
        biayaTotalRp: angka(ai.biaya_total_rp),
        biayaTanyaAiRp: angka(ai.biaya_tanya_ai_rp),
        rataBiayaPerPertanyaan: angkaAtauNull(ai.rata_biaya_per_pertanyaan),
        biayaPerFiturRp: Object.fromEntries(Object.entries(perFitur).map(([k, v]) => [k, angka(v)])),
      },
    },
  };
}

export async function getSeriPertanyaanHarian(rentang: RentangStatistik): Promise<HasilData<TitikSeriHarian[]>> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("fn_seri_pertanyaan_harian", { p_rentang_hari: rentang });
  if (error) return { ok: false, gagal: petakanError(error) };
  return {
    ok: true,
    data: (data ?? []).map((t) => ({ tanggal: t.tanggal, jumlah: angka(t.jumlah_pertanyaan), biayaRp: angka(t.biaya_tanya_ai_rp) })),
  };
}

export async function getPenggunaTerbaru(limit = 5): Promise<HasilData<PenggunaTerbaru[]>> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("fn_pengguna_terbaru", { p_limit: limit });
  if (error) return { ok: false, gagal: petakanError(error) };
  return {
    ok: true,
    data: (data ?? []).map((u) => ({
      id: u.id,
      nama: u.nama,
      bergabungAt: u.created_at,
      jumlahDokumen: angka(u.jumlah_dokumen),
      isActive: u.is_active,
    })),
  };
}

// ── Kelola pengguna (S-15) ───────────────────────────────────────────────

export async function getRingkasanPengguna(): Promise<HasilData<RingkasanPengguna>> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("fn_ringkasan_pengguna");
  if (error) return { ok: false, gagal: petakanError(error) };
  const b = data?.[0];
  return { ok: true, data: { total: angka(b?.total), aktif: angka(b?.aktif), nonaktif: angka(b?.nonaktif) } };
}

/** Urutan selalu "bergabung terbaru" (KEPUTUSAN C7); `urut` di query belum didukung RPC. */
export async function getDaftarPengguna(q: Pick<QueryDaftarPengguna, "q" | "status" | "halaman">): Promise<HasilData<DaftarPengguna>> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("fn_daftar_pengguna", {
    p_cari: q.q || undefined,
    p_status: q.status,
    p_halaman: q.halaman,
    p_per_halaman: PENGGUNA_PER_HALAMAN,
  });
  if (error) return { ok: false, gagal: petakanError(error) };
  const rows = data ?? [];
  const total = angka(rows[0]?.total_baris);
  return {
    ok: true,
    data: {
      baris: rows.map((u) => ({
        id: u.id,
        nama: u.nama,
        email: u.email,
        peran: u.is_admin ? "admin" : "mahasiswa",
        jumlahDokumen: angka(u.jumlah_dokumen),
        bergabungAt: u.created_at,
        // Kolom DB boleh NULL (belum pernah login) walau tipe hasil generator menulis string.
        terakhirAktifAt: (u.last_active_at as string | null) ?? null,
        isActive: u.is_active,
      })),
      total,
      halaman: q.halaman,
      totalHalaman: Math.max(1, Math.ceil(total / PENGGUNA_PER_HALAMAN)),
    },
  };
}

export interface HasilUbahStatus {
  id: number;
  nama: string;
  authId: string;
  isActive: boolean;
  isBerubah: boolean;
}

/** BR-23/24: RPC mengubah status + log dalam satu transaksi; BR-24 ditegakkan trigger DB. */
export async function ubahStatusPengguna(userId: number, isActive: boolean, ip: string | null): Promise<HasilData<HasilUbahStatus>> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("fn_ubah_status_pengguna", {
    p_user_id: userId,
    p_is_active: isActive,
    p_ip: ip ?? undefined,
  });
  if (error) return { ok: false, gagal: petakanError(error) };
  const b = data?.[0];
  if (!b) return { ok: false, gagal: { jenis: "tidak_ditemukan" } };
  return { ok: true, data: { id: b.id, nama: b.nama, authId: b.auth_id, isActive: b.is_active, isBerubah: b.is_berubah } };
}

/**
 * KEPUTUSAN B1: blokir/buka blokir akun di Supabase Auth agar refresh token ditolak (BR-23).
 * Dipanggil SETELAH DB sukses — DB adalah sumber kebenaran; kegagalan di sini tidak membatalkan DB.
 */
export async function terapkanBlokirAuth(authId: string, isActive: boolean): Promise<{ ok: boolean }> {
  try {
    const admin = createAdminClient();
    const { error } = await admin.auth.admin.updateUserById(authId, { ban_duration: isActive ? "none" : "876000h" });
    if (error) {
      console.error("[terapkanBlokirAuth]", error.message);
      return { ok: false };
    }
    return { ok: true };
  } catch (err) {
    console.error("[terapkanBlokirAuth]", err);
    return { ok: false };
  }
}

// ── Pengaturan kuota (S-16) ──────────────────────────────────────────────

export async function getPengaturanKuota(): Promise<HasilData<PengaturanKuota>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("m_pengaturan_sistem")
    .select("kode, nilai, nilai_default, nilai_min, nilai_max, is_tampil, updated_by, updated_at")
    .order("id");
  if (error) return { ok: false, gagal: petakanError(error) };
  const semua = data ?? [];
  // Versi = max(updated_at) SEMUA baris, sama dengan pembanding di fn_ubah_pengaturan.
  const terbaru = semua.reduce<(typeof semua)[number] | null>((m, b) => (!m || b.updated_at > m.updated_at ? b : m), null);

  const item: ItemPengaturan[] = KODE_PENGATURAN.flatMap((kode) => {
    const b = semua.find((x) => x.kode === kode && x.is_tampil);
    if (!b) return [];
    const r = RENTANG_PENGATURAN[kode];
    return [{ kode, nilai: angka(b.nilai), nilaiDefault: angka(b.nilai_default), min: b.nilai_min ?? r.min, maks: b.nilai_max ?? r.maks }];
  });

  let terakhirDiubah: PengaturanKuota["terakhirDiubah"] = null;
  const diubah = semua.filter((b) => b.updated_by).sort((a, b) => (a.updated_at < b.updated_at ? 1 : -1))[0];
  if (diubah?.updated_by) {
    const { data: admin } = await supabase.from("m_users").select("nama").eq("email", diubah.updated_by).maybeSingle();
    terakhirDiubah = { oleh: admin?.nama ?? diubah.updated_by, at: diubah.updated_at };
  }
  return { ok: true, data: { item, versi: terbaru?.updated_at ?? null, terakhirDiubah } };
}

/** BR-28/29: validasi + simpan + audit di fn_ubah_pengaturan; `versi` basi → konflik (B14). */
export async function ubahPengaturan(
  nilai: Partial<Record<KodePengaturan, number>>,
  versi: string | null | undefined,
  ip: string | null,
): Promise<HasilData<{ versi: string | null }> | { ok: false; gagal: { jenis: "galat_kolom"; galat: GalatPengaturan[] } }> {
  const supabase = await createClient();
  const pNilai: Record<string, string> = {};
  for (const [k, v] of Object.entries(nilai)) if (v !== undefined) pNilai[k] = String(v);
  const { data, error } = await supabase.rpc("fn_ubah_pengaturan", {
    p_nilai: pNilai,
    p_ip: ip ?? undefined,
    p_versi: versi ?? undefined,
  });
  if (error) {
    if (error.code === "22023" && error.message.includes("KUOTA_TIDAK_VALID") && error.details) {
      try {
        return { ok: false, gagal: { jenis: "galat_kolom", galat: JSON.parse(error.details) as GalatPengaturan[] } };
      } catch {
        /* jatuh ke pemetaan umum */
      }
    }
    return { ok: false, gagal: petakanError(error) };
  }
  // Hasil RPC hanya baris is_tampil; versi diambil ulang agar mencakup semua baris.
  const versiBaru = (data ?? []).reduce<string | null>((m, b) => (!m || b.updated_at > m ? b.updated_at : m), null);
  const { data: maks } = await supabase.from("m_pengaturan_sistem").select("updated_at").order("updated_at", { ascending: false }).limit(1).maybeSingle();
  return { ok: true, data: { versi: maks?.updated_at ?? versiBaru } };
}

export async function getEstimasiBiaya(maxPertanyaan?: number): Promise<HasilData<EstimasiBiaya>> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("fn_estimasi_biaya_kuota", { p_max_pertanyaan: maxPertanyaan });
  if (error) return { ok: false, gagal: petakanError(error) };
  const b = data?.[0];
  return {
    ok: true,
    data: {
      mahasiswaAktif: angka(b?.mahasiswa_aktif),
      rataBiayaPerPertanyaan: angkaAtauNull(b?.rata_biaya_per_pertanyaan),
      estimasiHarianMaksRp: angkaAtauNull(b?.estimasi_harian_maks_rp),
    },
  };
}

import "server-only";
import { createClient as createClientMurni } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { DEFAULT_MAX_HALAMAN, DEFAULT_MAX_UKURAN_MB } from "@/lib/config";
import type { Database } from "@/types/database";

// Akses data profil & kuota (FT-08, S-13). m_users tidak punya hak UPDATE untuk klien —
// nama diubah lewat RPC fn_ubah_profil (BR-22 + audit log_system dalam satu transaksi).

export interface DetailProfil {
  bergabungAt: string; // m_users.created_at
}

export interface KuotaPemakaian {
  terpakai: number;
  maks: number;
  sisa: number;
}

export interface KuotaPengguna {
  dokumen: KuotaPemakaian; // BR-04
  tanya: KuotaPemakaian & { resetAt: string }; // BR-17, reset 00.00 WIB
  maxUkuranMb: number; // BR-02
  maxHalaman: number; // BR-03
}

export async function getDetailProfil(userId: number): Promise<DetailProfil> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("m_users").select("created_at").eq("id", userId).single();
  if (error) throw new Error(`[getDetailProfil] ${error.message}`);
  return { bergabungAt: data.created_at };
}

/**
 * Kuota mahasiswa. Angka dibaca dari fungsi DB yang sama dengan penegak kuota
 * (fn_kuota_dokumen / fn_sisa_kuota_tanya), jadi tampilan tidak bisa berbeda dari aturan.
 * null bila gagal → kartu kuota menampilkan MSG-G02 tanpa menggagalkan seluruh halaman (FT-08 §3A.6).
 */
export async function getKuotaPengguna(): Promise<KuotaPengguna | null> {
  const supabase = await createClient();
  const [dok, tanya, atur] = await Promise.all([
    supabase.rpc("fn_kuota_dokumen"),
    supabase.rpc("fn_sisa_kuota_tanya"),
    supabase.from("m_pengaturan_sistem").select("kode, nilai").in("kode", ["max_ukuran_mb", "max_halaman"]),
  ]);
  const d = dok.data?.[0];
  const t = tanya.data?.[0];
  if (dok.error || tanya.error || !d || !t) {
    console.error("[getKuotaPengguna]", dok.error ?? tanya.error ?? "baris kosong");
    return null;
  }
  // Nilai pengaturan disimpan teks (KEPUTUSAN A6); bila gagal dibaca pakai default lib/config.
  const nilai = (kode: string, cadangan: number) => {
    const n = Number(atur.data?.find((p) => p.kode === kode)?.nilai);
    return Number.isFinite(n) && n > 0 ? n : cadangan;
  };
  return {
    dokumen: { terpakai: d.terpakai, maks: d.maks, sisa: d.sisa },
    tanya: { terpakai: t.terpakai, maks: t.maks, sisa: t.sisa, resetAt: t.reset_at },
    maxUkuranMb: nilai("max_ukuran_mb", DEFAULT_MAX_UKURAN_MB),
    maxHalaman: nilai("max_halaman", DEFAULT_MAX_HALAMAN),
  };
}

/** Kode error PostgreSQL dari RAISE di fn_ubah_profil. */
export type HasilUbahNama =
  | { ok: true; nama: string; updatedAt: string }
  | { ok: false; alasan: "NAMA_TIDAK_VALID" | "BELUM_LOGIN" | "SERVER"; detail?: unknown };

export async function ubahNama(nama: string, ip: string | null): Promise<HasilUbahNama> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("fn_ubah_profil", { p_nama: nama, ...(ip ? { p_ip: ip } : {}) });
  if (error) {
    if (error.code === "22023") return { ok: false, alasan: "NAMA_TIDAK_VALID" };
    if (error.code === "28000") return { ok: false, alasan: "BELUM_LOGIN" };
    return { ok: false, alasan: "SERVER", detail: error };
  }
  const baris = data?.[0];
  if (!baris) return { ok: false, alasan: "SERVER", detail: "fn_ubah_profil tanpa baris" };
  return { ok: true, nama: baris.nama, updatedAt: baris.updated_at };
}

/**
 * Verifikasi sandi lama dengan login ulang (FT-08 MSG-P03). Memakai klien terpisah tanpa
 * penyimpanan sesi agar cookie sesi pengguna yang sedang aktif tidak tertimpa; sesi hasil
 * verifikasi langsung dicabut (scope "local" → hanya sesi verifikasi ini, bukan semua perangkat).
 */
export async function verifikasiSandi(email: string, authId: string, sandi: string): Promise<boolean> {
  const klien = createClientMurni<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } },
  );
  const { data, error } = await klien.auth.signInWithPassword({ email, password: sandi });
  if (error || !data.user) return false;
  await klien.auth.signOut({ scope: "local" });
  return data.user.id === authId;
}

export type HasilGantiSandi = { ok: true } | { ok: false; alasan: "SANDI_SAMA" | "SANDI_LEMAH" | "SERVER"; detail?: unknown };

/** Ganti sandi akun yang sedang login lewat Supabase Auth (bukan tabel kita). */
export async function gantiSandi(sandiBaru: string): Promise<HasilGantiSandi> {
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: sandiBaru });
  if (!error) return { ok: true };
  if (error.code === "same_password") return { ok: false, alasan: "SANDI_SAMA" };
  if (error.code === "weak_password") return { ok: false, alasan: "SANDI_LEMAH" };
  return { ok: false, alasan: "SERVER", detail: error };
}

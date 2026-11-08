import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { PERAN, type Peran } from "@/lib/config";
import type { Database, Json } from "@/types/database";

// Akses data akun untuk alur FT-01 (masuk, daftar, keluar, atur ulang sandi).

export interface ProfilAuth {
  id: number; // m_users.id
  isActive: boolean;
  peran: Peran;
}

/**
 * Profil & peran milik auth user yang baru saja login. Baris m_users sendiri tetap terbaca
 * walau akun nonaktif (RLS, DATABASE.md §4) sehingga BR-23 bisa diperiksa di sini.
 */
export async function getProfilAuth(
  supabase: SupabaseClient<Database>,
  authId: string,
): Promise<ProfilAuth | null> {
  const { data, error } = await supabase
    .from("m_users")
    .select("id, is_active, m_user_role(m_role(kode))")
    .eq("auth_id", authId)
    .is("deleted_at", null)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  // Embed bisa berupa array atau objek (lihat lib/auth/sesi.ts) — terima keduanya.
  type Relasi = { m_role: { kode: string } | null };
  const mentah = data.m_user_role as unknown as Relasi[] | Relasi | null;
  const relasi = Array.isArray(mentah) ? mentah[0] : mentah;
  return {
    id: data.id,
    isActive: data.is_active,
    peran: relasi?.m_role?.kode === PERAN.ADMIN ? PERAN.ADMIN : PERAN.MAHASISWA,
  };
}

/** Perbarui last_active_at (KEPUTUSAN B2). Gagal tidak menggagalkan login — cukup dicatat. */
export async function perbaruiAktif(supabase: SupabaseClient<Database>): Promise<void> {
  const { error } = await supabase.rpc("fn_perbarui_aktif", { p_paksa: true });
  if (error) console.error("[perbaruiAktif]", error.message);
}

export type AksiLogAuth = "LOGIN" | "LOGOUT" | "UPDATE";

/**
 * Catat audit modul `auth` (FT-01 L-15, L-21, L-36). Tidak ada RPC untuk ini dan `authenticated`
 * tidak punya hak INSERT log_system, jadi lewat service role dengan user_id yang sudah diverifikasi.
 * Gagal mencatat tidak boleh membatalkan login/logout.
 */
export async function catatLogAuth(opsi: {
  userId: number;
  aksi: AksiLogAuth;
  ip: string | null;
  detail?: Json;
}): Promise<void> {
  try {
    const { error } = await createAdminClient()
      .from("log_system")
      .insert({
        user_id: opsi.userId,
        action: opsi.aksi,
        modul: "auth",
        target_id: String(opsi.userId),
        detail: opsi.detail ?? null,
        ip_address: opsi.ip ? opsi.ip.slice(0, 50) : null,
      });
    if (error) console.error("[catatLogAuth]", error.message);
  } catch (err) {
    console.error("[catatLogAuth]", err);
  }
}

/** IP klien dari header proxy (Vercel mengisi x-forwarded-for). */
export function ipDariRequest(req: Request): string | null {
  const diteruskan = req.headers.get("x-forwarded-for");
  if (diteruskan) return diteruskan.split(",")[0]?.trim() || null;
  return req.headers.get("x-real-ip");
}

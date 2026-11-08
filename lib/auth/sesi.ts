import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { gagal, gagalServer } from "@/lib/api/respon";
import { PERAN, RUTE_AWAL, type Peran } from "@/lib/config";

export interface Pengguna {
  id: number; // m_users.id
  authId: string; // auth.users.id
  email: string;
  nama: string;
  peran: Peran;
  isActive: boolean;
  /** Anggota tim QC: boleh mengirim Laporan QC (admin selalu boleh). */
  isPenguji: boolean;
}

/**
 * Pengguna yang sedang login beserta perannya, atau null (tanpa sesi / tanpa baris m_users).
 * Melempar error bila kueri database gagal. Di-cache per permintaan.
 * Satu pengguna = satu peran (KEPUTUSAN B15).
 */
export const getPengguna = cache(async (): Promise<Pengguna | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("m_users")
    .select("id, auth_id, email, nama, is_active, is_penguji, m_user_role(m_role(kode))")
    .eq("auth_id", user.id)
    .is("deleted_at", null)
    .maybeSingle();
  // Galat DB DILEMPAR, bukan null: null berarti "belum login" sehingga wajibLogin akan me-redirect ke
  // /masuk, sementara proxy masih melihat sesi aktif dan mengembalikannya → loop. Biarkan error.tsx /
  // wajibLoginApi (500) yang menangani.
  if (error) throw new Error(`[getPengguna] ${error.message}`, { cause: error });
  if (!data) return null;

  // PostgREST bisa mengembalikan array atau objek tunggal tergantung jenis relasi — terima keduanya.
  type Relasi = { m_role: { kode: string } | null };
  const mentah = data.m_user_role as unknown as Relasi[] | Relasi | null;
  const relasi = Array.isArray(mentah) ? mentah[0] : mentah;
  const kode = relasi?.m_role?.kode;
  return {
    id: data.id,
    authId: data.auth_id,
    email: data.email,
    nama: data.nama,
    peran: kode === PERAN.ADMIN ? PERAN.ADMIN : PERAN.MAHASISWA,
    isActive: data.is_active,
    isPenguji: data.is_penguji,
  };
});

/**
 * Untuk halaman (Server Component). Belum login → /masuk. Akun nonaktif → /masuk?nonaktif=1 (BR-23).
 * Peran salah → diarahkan ke halaman awal perannya sendiri (BR-31).
 */
export async function wajibLogin(peran?: Peran): Promise<Pengguna> {
  const pengguna = await getPengguna();
  if (!pengguna) redirect("/masuk");
  if (!pengguna.isActive) redirect("/masuk?nonaktif=1");
  if (peran && pengguna.peran !== peran) redirect(RUTE_AWAL[pengguna.peran]);
  return pengguna;
}

/**
 * Untuk Route Handler. Mengembalikan pengguna, atau respons error siap-kirim.
 *   const hasil = await wajibLoginApi("admin"); if (hasil instanceof Response) return hasil;
 */
export async function wajibLoginApi(peran?: Peran): Promise<Pengguna | Response> {
  let pengguna: Pengguna | null;
  try {
    pengguna = await getPengguna();
  } catch (err) {
    // Galat DB bukan berarti belum login → 500, bukan 401 (agar klien tidak dipaksa masuk ulang).
    return gagalServer("wajibLoginApi", err);
  }
  if (!pengguna) return gagal(401, "BELUM_LOGIN", "Sesi kamu sudah berakhir. Silakan masuk lagi.");
  if (!pengguna.isActive)
    return gagal(403, "AKUN_NONAKTIF", "Akun kamu dinonaktifkan. Hubungi admin.");
  if (peran && pengguna.peran !== peran)
    return gagal(403, "TIDAK_BERHAK", "Kamu tidak memiliki akses ke fitur ini.");
  return pengguna;
}

import { createClient } from "@/lib/supabase/server";
import { gagal, gagalServer, ok } from "@/lib/api/respon";
import { parseBody } from "@/lib/validasi/permintaan";
import { skemaDaftar } from "@/lib/validasi";
import { PESAN } from "@/lib/pesan";
import { PERAN, RUTE_AWAL, type Peran } from "@/lib/config";
import { perbaruiAktif } from "@/lib/data/akun";

export type ResponDaftar = { peran: Peran; tujuan: string };

/**
 * POST /api/auth/daftar  body { nama, email, sandi, konfirmasiSandi }
 * 201 { data: { peran: "mahasiswa", tujuan } } · 400 validasi (detail.field) · 409 EMAIL_TERDAFTAR (MSG-A05)
 *
 * m_users + peran mahasiswa + log CREATE dibuat trigger fn_buat_pengguna_baru dalam transaksi yang
 * sama dengan auth.users, jadi tidak ada akun setengah jadi (FT-01 Pertanyaan Terbuka #2).
 * Field peran dari klien diabaikan — skema Zod membuang kolom asing (BR-25, TC-FT01-09).
 */
export async function POST(req: Request) {
  const hasil = await parseBody(req, skemaDaftar);
  if (hasil.error) return hasil.error;
  const { nama, email, sandi } = hasil.data;

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password: sandi,
      options: { data: { nama } },
    });

    if (error) {
      if (error.code === "user_already_exists" || error.code === "email_exists") {
        return emailTerdaftar();
      }
      if (error.code === "weak_password") {
        return gagal(400, "INPUT_TIDAK_VALID", PESAN["MSG-V04"], { field: "sandi" });
      }
      if (error.code === "email_address_invalid") {
        return gagal(400, "INPUT_TIDAK_VALID", PESAN["MSG-V02"], { field: "email" });
      }
      return gagalServer("auth/daftar", error);
    }

    // Bila konfirmasi email (tidak sengaja) aktif, Supabase membalas user palsu tanpa identitas
    // untuk email yang sudah ada — perlakukan sama dengan email terdaftar.
    if (data.user && data.user.identities?.length === 0) return emailTerdaftar();

    // KEPUTUSAN B3: konfirmasi email mati → sesi langsung aktif → ke Beranda (state kosong).
    // Cadangan bila konfigurasi berbeda: tidak ada sesi → arahkan ke halaman masuk.
    if (!data.session) return ok<ResponDaftar>({ peran: PERAN.MAHASISWA, tujuan: "/masuk" }, 201);

    await perbaruiAktif(supabase);
    return ok<ResponDaftar>({ peran: PERAN.MAHASISWA, tujuan: RUTE_AWAL[PERAN.MAHASISWA] }, 201);
  } catch (err) {
    return gagalServer("auth/daftar", err);
  }
}

function emailTerdaftar() {
  return gagal(409, "EMAIL_TERDAFTAR", PESAN["MSG-A05"], { field: "email" });
}

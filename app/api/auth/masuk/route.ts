import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { gagal, gagalServer, ok } from "@/lib/api/respon";
import { parseBody } from "@/lib/validasi/permintaan";
import { skemaMasuk } from "@/lib/validasi";
import { PESAN } from "@/lib/pesan";
import type { Peran } from "@/lib/config";
import { catatLogAuth, getProfilAuth, ipDariRequest, perbaruiAktif } from "@/lib/data/akun";
import { PARAM, tujuanSetelahMasuk } from "@/components/auth/rute";

export type ResponMasuk = { peran: Peran; tujuan: string };

/**
 * POST /api/auth/masuk[?lanjut=/path]  body { email, sandi }
 * 200 { data: { peran, tujuan } } · 400 validasi · 401 KREDENSIAL_SALAH (MSG-A01) · 403 AKUN_NONAKTIF (MSG-A02)
 */
export async function POST(req: NextRequest) {
  const hasil = await parseBody(req, skemaMasuk);
  if (hasil.error) return hasil.error;
  const { email, sandi } = hasil.data;

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password: sandi });

    if (error || !data.user) {
      // Akun diblokir di Auth oleh FT-09 saat dinonaktifkan (BR-23).
      if (error?.code === "user_banned") return gagal(403, "AKUN_NONAKTIF", PESAN["MSG-A02"]);
      // Pesan seragam untuk email tak terdaftar & sandi salah — cegah enumerasi akun (NF-01).
      if (!error || error.code === "invalid_credentials" || error.code === "email_not_confirmed" || error.status === 400) {
        return gagal(401, "KREDENSIAL_SALAH", PESAN["MSG-A01"]);
      }
      return gagalServer("auth/masuk", error);
    }

    const profil = await getProfilAuth(supabase, data.user.id);
    // BR-23: kredensial benar tetapi akun nonaktif → sesi yang baru dibuat langsung diakhiri.
    if (!profil || !profil.isActive) {
      await supabase.auth.signOut();
      if (!profil) console.error("[auth/masuk] auth user tanpa baris m_users", data.user.id);
      return gagal(403, "AKUN_NONAKTIF", PESAN["MSG-A02"]);
    }

    await Promise.all([
      perbaruiAktif(supabase),
      catatLogAuth({ userId: profil.id, aksi: "LOGIN", ip: ipDariRequest(req) }),
    ]);

    const tujuan = tujuanSetelahMasuk(profil.peran, req.nextUrl.searchParams.get(PARAM.lanjut));
    return ok<ResponMasuk>({ peran: profil.peran, tujuan });
  } catch (err) {
    return gagalServer("auth/masuk", err);
  }
}

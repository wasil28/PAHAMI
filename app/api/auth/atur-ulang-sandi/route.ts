import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { gagal, gagalServer, ok } from "@/lib/api/respon";
import { parseBody } from "@/lib/validasi/permintaan";
import { skemaAturUlangSandi } from "@/lib/validasi";
import { PESAN } from "@/lib/pesan";
import { catatLogAuth, getProfilAuth, ipDariRequest } from "@/lib/data/akun";
import { verifikasiTokenPemulihan } from "@/lib/auth/pemulihan";
import { COOKIE_PEMULIHAN, PARAM } from "@/components/auth/rute";
import { TEKS_AUTH } from "@/components/auth/teks";

export type ResponAturUlangSandi = { tujuan: string };

/**
 * POST /api/auth/atur-ulang-sandi  body { sandi, konfirmasiSandi }
 * Butuh sesi pemulihan dari /auth/konfirmasi (sesi + cookie penanda bertanda tangan). Tanpa itu → 401
 * TAUTAN_TIDAK_BERLAKU (MSG-A08). Sukses → sesi diakhiri, 200 { data: { tujuan: "/masuk?sandi=diubah" } }
 * agar pengguna masuk ulang dengan sandi baru (FT-01 L-37, MSG-A07).
 */
export async function POST(req: Request) {
  const hasil = await parseBody(req, skemaAturUlangSandi);
  if (hasil.error) return hasil.error;

  try {
    const toples = await cookies();
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    // Cookie penanda (HMAC: sub + kedaluwarsa + tanda tangan, lib/auth/pemulihan.ts) mencegah sesi login
    // biasa memakai jalur ini untuk mengganti sandi tanpa sandi lama.
    if (!user || !verifikasiTokenPemulihan(toples.get(COOKIE_PEMULIHAN)?.value, user.id)) {
      if (toples.has(COOKIE_PEMULIHAN)) toples.delete(COOKIE_PEMULIHAN);
      return gagal(401, "TAUTAN_TIDAK_BERLAKU", PESAN["MSG-A08"]);
    }

    const { error } = await supabase.auth.updateUser({ password: hasil.data.sandi });
    if (error) {
      if (error.code === "same_password") {
        return gagal(400, "INPUT_TIDAK_VALID", TEKS_AUTH.atur.sandiSama, { field: "sandi" });
      }
      if (error.code === "weak_password") {
        return gagal(400, "INPUT_TIDAK_VALID", PESAN["MSG-V04"], { field: "sandi" });
      }
      if (error.code === "session_expired" || error.code === "session_not_found" || error.status === 401) {
        return gagal(401, "TAUTAN_TIDAK_BERLAKU", PESAN["MSG-A08"]);
      }
      return gagalServer("auth/atur-ulang-sandi", error);
    }

    const profil = await getProfilAuth(supabase, user.id).catch(() => null);
    if (profil) {
      await catatLogAuth({
        userId: profil.id,
        aksi: "UPDATE",
        ip: ipDariRequest(req),
        detail: { kolom: "kata_sandi", sumber: "atur_ulang" },
      });
    }

    toples.delete(COOKIE_PEMULIHAN);
    await supabase.auth.signOut();
    return ok<ResponAturUlangSandi>({ tujuan: `/masuk?${PARAM.sandi}=diubah` });
  } catch (err) {
    return gagalServer("auth/atur-ulang-sandi", err);
  }
}

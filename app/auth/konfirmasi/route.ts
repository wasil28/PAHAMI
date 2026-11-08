import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { buatTokenPemulihan } from "@/lib/auth/pemulihan";
import {
  COOKIE_PEMULIHAN,
  MASA_PEMULIHAN_DETIK,
  PARAM,
  RUTE_TERLINDUNG,
  cocokAwalan,
  pathInternalAman,
} from "@/components/auth/rute";

const TUJUAN_PEMULIHAN = "/atur-ulang-sandi";
/** Tujuan default non-pemulihan: "/" mengarahkan ke halaman awal sesuai peran. */
const TUJUAN_DEFAULT = "/";
const TIPE_OTP: readonly EmailOtpType[] = ["recovery", "signup", "invite", "magiclink", "email_change", "email"];

/**
 * GET /auth/konfirmasi — tujuan tautan email Supabase (reset sandi, BR-26).
 * Mendukung dua bentuk tautan:
 *  1. `?token_hash=…&type=recovery` (template email kustom, disarankan: berfungsi walau tautan
 *     dibuka di peramban/HP lain)
 *  2. `?code=…&next=/atur-ulang-sandi` (PKCE bawaan redirectTo dari /api/auth/lupa-sandi; hanya
 *     berfungsi di peramban yang meminta reset)
 * Pemulihan SELALU berakhir di /atur-ulang-sandi (parameter `next` diabaikan). Tipe lain hanya boleh
 * menuju rute di allow-list (cegah open redirect). Cookie penanda pemulihan hanya dibuat bila alurnya
 * memang pemulihan. Gagal / kedaluwarsa / sudah dipakai → /atur-ulang-sandi?status=tidak-berlaku (MSG-A08).
 */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const tokenHash = sp.get("token_hash");
  const tipe = sp.get("type");
  const kode = sp.get("code");
  const nextMentah = sp.get("next");

  const gagal = () =>
    NextResponse.redirect(new URL(`${TUJUAN_PEMULIHAN}?${PARAM.status}=tidak-berlaku`, req.url));

  // Supabase menaruh galat di query bila token sudah tidak berlaku (mis. otp_expired).
  if (sp.get("error") || sp.get("error_code")) return gagal();

  const supabase = await createClient();
  let authId: string;
  let pemulihan: boolean;

  if (tokenHash && tipe && (TIPE_OTP as readonly string[]).includes(tipe)) {
    const { data, error } = await supabase.auth.verifyOtp({ type: tipe as EmailOtpType, token_hash: tokenHash });
    if (error || !data.user) return gagal();
    authId = data.user.id;
    // Bentuk token_hash membawa jenisnya sendiri — hanya type=recovery yang dianggap pemulihan.
    pemulihan = tipe === "recovery";
  } else if (kode) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(kode);
    if (error || !data.user) return gagal();
    authId = data.user.id;
    // PKCE tidak membawa jenis alur; pemulihan hanya bila redirectTo kita sendiri menargetkannya persis.
    pemulihan = nextMentah === TUJUAN_PEMULIHAN;
  } else {
    return gagal();
  }

  if (pemulihan) {
    // Penanda bertanda tangan bahwa sesi ini berasal dari tautan reset — diperiksa S-05 & API atur-ulang-sandi.
    (await cookies()).set(COOKIE_PEMULIHAN, buatTokenPemulihan(authId), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: MASA_PEMULIHAN_DETIK,
    });
    return NextResponse.redirect(new URL(TUJUAN_PEMULIHAN, req.url));
  }
  return NextResponse.redirect(new URL(tujuanNonPemulihan(nextMentah), req.url));
}

/** Allow-list (strategi sama dengan tujuanSetelahMasuk): path internal aman di RUTE_TERLINDUNG saja. */
function tujuanNonPemulihan(nilai: string | null): string {
  const aman = pathInternalAman(nilai);
  if (!aman) return TUJUAN_DEFAULT;
  return cocokAwalan(aman.split(/[?#]/)[0], RUTE_TERLINDUNG) ? aman : TUJUAN_DEFAULT;
}

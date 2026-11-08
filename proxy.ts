import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/types/database";
import { PERAN, RUTE_AWAL } from "@/lib/config";
import { PARAM, RUTE_TAMU, RUTE_TERLINDUNG, cocokAwalan } from "@/components/auth/rute";

/**
 * Proxy (dulu "middleware"): memperbarui cookie sesi Supabase di setiap permintaan halaman dan
 * menjaga rute secara OPTIMIS. Pemeriksaan peran & is_active yang sebenarnya tetap di wajibLogin()
 * / wajibLoginApi() (BR-23, BR-31) — proxy tidak boleh menjadi satu-satunya penjaga.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  // Header no-store dari @supabase/ssr saat cookie sesi ditulis — ikut dibawa bila kita me-redirect.
  let headerSesi: Record<string, string> = {};

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(daftar, headers) {
          // Pola resmi @supabase/ssr: teruskan cookie baru ke request (untuk Server Component)
          // dan ke response (untuk browser), plus header no-store agar sesi tidak di-cache CDN.
          daftar.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          daftar.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
          headerSesi = { ...headerSesi, ...headers };
          Object.entries(headers).forEach(([k, v]) => response.headers.set(k, v));
        },
      },
    },
  );

  // JANGAN menaruh kode di antara createServerClient dan getClaims (bisa membuat sesi acak ter-logout).
  // getClaims memverifikasi JWT (lokal bila kunci asimetris) dan me-refresh token yang kedaluwarsa.
  const { data } = await supabase.auth.getClaims();
  const authId = data?.claims?.sub ?? null;

  const { pathname, searchParams } = request.nextUrl;

  /** Redirect yang tetap membawa cookie sesi hasil refresh di atas. */
  const alihkan = (tujuan: URL) => {
    const r = NextResponse.redirect(tujuan);
    response.cookies.getAll().forEach((c) => r.cookies.set(c));
    // Hanya header sesi; header internal NextResponse.next() (x-middleware-*) tidak boleh ikut.
    Object.entries(headerSesi).forEach(([k, v]) => r.headers.set(k, v));
    return r;
  };

  // 1) Tamu membuka rute login-saja → /masuk?lanjut=<path>.
  if (!authId && cocokAwalan(pathname, RUTE_TERLINDUNG)) {
    const url = request.nextUrl.clone();
    url.pathname = "/masuk";
    url.search = "";
    url.searchParams.set(PARAM.lanjut, pathname + request.nextUrl.search);
    // Cookie sesi Supabase ada tetapi tak lagi sah → sesi berakhir (MSG-A03), bukan sekadar belum login.
    if (request.cookies.getAll().some((c) => c.name.startsWith("sb-") && c.name.includes("-auth-token"))) {
      url.searchParams.set(PARAM.sesi, "habis");
    }
    return alihkan(url);
  }

  // 2) Pengguna login membuka halaman tamu → halaman awal perannya (TC-FT01-16).
  if (authId && cocokAwalan(pathname, RUTE_TAMU)) {
    const { data: baris, error: galat } = await supabase
      .from("m_users")
      .select("is_active, m_user_role(m_role(kode))")
      .eq("auth_id", authId)
      .is("deleted_at", null)
      .maybeSingle();
    // Galat DB ≠ profil hilang: jangan akhiri sesi, cukup tampilkan halaman tamu apa adanya.
    if (galat) {
      console.error("[proxy] m_users", galat.message);
      return response;
    }

    if (!baris || !baris.is_active) {
      // Akun nonaktif (dialihkan wajibLogin ke /masuk?nonaktif=1) atau profil hilang: akhiri sesi di
      // sini — proxy bisa menulis cookie, Server Component tidak — lalu biarkan halaman tampil (BR-23).
      await supabase.auth.signOut();
      if (pathname === "/masuk" && !searchParams.has(PARAM.nonaktif) && baris) {
        const url = request.nextUrl.clone();
        url.search = `?${PARAM.nonaktif}=1`;
        return alihkan(url);
      }
      return response;
    }

    type Relasi = { m_role: { kode: string } | null };
    const mentah = baris.m_user_role as unknown as Relasi[] | Relasi | null;
    const kode = (Array.isArray(mentah) ? mentah[0] : mentah)?.m_role?.kode;
    const url = request.nextUrl.clone();
    url.pathname = RUTE_AWAL[kode === PERAN.ADMIN ? PERAN.ADMIN : PERAN.MAHASISWA];
    url.search = "";
    return alihkan(url);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Semua halaman KECUALI:
     * - _next/static, _next/image, favicon & berkas statis (gambar, font, dll.)
     * - api/* : Route Handler memperbarui sesinya sendiri lewat lib/supabase/server.ts dan memeriksa
     *   login dengan wajibLoginApi(); melewatinya menghemat panggilan Auth pada polling status dokumen.
     * - auth/* : /auth/konfirmasi menukar token email menjadi sesi sendiri.
     */
    "/((?!_next/static|_next/image|api/|auth/|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml|woff2?)$).*)",
  ],
};

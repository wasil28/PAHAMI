import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { catatLogAuth, getProfilAuth, ipDariRequest } from "@/lib/data/akun";
import { PARAM } from "@/components/auth/rute";

/**
 * POST /api/auth/keluar — dipanggil form TombolKeluar (components/shell). Selalu 303 ke
 * /masuk?keluar=1 (snackbar MSG-G03), juga bila sesi sudah tidak ada atau Supabase tak terjangkau:
 * cookie sesi lokal tetap dihapus (UC-03 E1). Hanya POST agar tidak bisa dipicu lewat tautan/prefetch.
 */
export async function POST(req: Request) {
  const supabase = await createClient();
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const profil = await getProfilAuth(supabase, user.id).catch(() => null);
      if (profil) await catatLogAuth({ userId: profil.id, aksi: "LOGOUT", ip: ipDariRequest(req) });
    }
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  } catch (err) {
    console.error("[auth/keluar]", err);
    // Server Auth gagal dijangkau → tetap hapus sesi di browser ini saja.
    await supabase.auth.signOut({ scope: "local" }).catch(() => undefined);
  }
  // 303 agar browser mengikuti dengan GET (bukan mengulang POST).
  return NextResponse.redirect(new URL(`/masuk?${PARAM.keluar}=1`, req.url), 303);
}

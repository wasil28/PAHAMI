import { createClient } from "@/lib/supabase/server";
import { gagalServer, ok } from "@/lib/api/respon";
import { parseBody } from "@/lib/validasi/permintaan";
import { skemaLupaSandi } from "@/lib/validasi";

export type ResponLupaSandi = { terkirim: true };

/**
 * POST /api/auth/lupa-sandi  body { email }
 * 200 { data: { terkirim: true } } SELALU (kecuali 400 validasi) — terdaftar atau tidak, bahkan bila
 * pengiriman email gagal/kena batas, agar tidak membocorkan keberadaan akun (MSG-A06, NF-01, UC-04 E1).
 * Jeda kirim ulang 60 dtk dijaga di klien; Supabase Auth juga membatasi per email.
 */
export async function POST(req: Request) {
  const hasil = await parseBody(req, skemaLupaSandi);
  if (hasil.error) return hasil.error;

  try {
    const situs = urlSitus(req);
    if (!situs) {
      // Produksi tanpa NEXT_PUBLIC_SITE_URL: jangan kirim tautan berbasis header Host (bisa dipalsukan →
      // tautan reset menuju domain penyerang). Tetap balas sukses umum agar tidak membocorkan apa pun.
      console.error("[auth/lupa-sandi] NEXT_PUBLIC_SITE_URL belum diisi — email reset tidak dikirim");
      return ok<ResponLupaSandi>({ terkirim: true });
    }
    const supabase = await createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(hasil.data.email, {
      redirectTo: `${situs}/auth/konfirmasi?next=/atur-ulang-sandi`,
    });
    // Jangan sertakan email di log (data pribadi) — cukup kode galatnya.
    if (error) console.error("[auth/lupa-sandi]", error.code ?? error.status, error.message);
    return ok<ResponLupaSandi>({ terkirim: true });
  } catch (err) {
    return gagalServer("auth/lupa-sandi", err);
  }
}

/** URL dasar aplikasi. Fallback ke origin permintaan HANYA saat development. */
function urlSitus(req: Request): string | null {
  const env = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (env) return env.replace(/\/+$/, "");
  if (process.env.NODE_ENV === "development") return new URL(req.url).origin;
  return null;
}

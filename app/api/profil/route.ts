import { ok, gagal, gagalServer } from "@/lib/api/respon";
import { wajibLoginApi } from "@/lib/auth/sesi";
import { ubahNama } from "@/lib/data/profil";
import { PESAN } from "@/lib/pesan";
import { skemaUbahNama } from "@/lib/validasi";
import { parseBody } from "@/lib/validasi/permintaan";

/** IP klien untuk audit log_system (opsional; di Vercel ada di x-forwarded-for). */
function ipKlien(req: Request): string | null {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip");
}

/**
 * PATCH /api/profil { nama } → { data: { nama, updatedAt } }  (FT-08, BP-10, kedua peran).
 * Email sengaja tidak diterima (BR-36); nama 3–60 karakter (BR-22) dicek Zod lalu dicek ulang di DB.
 */
export async function PATCH(req: Request) {
  const pengguna = await wajibLoginApi();
  if (pengguna instanceof Response) return pengguna;

  const hasil = await parseBody(req, skemaUbahNama);
  if (hasil.error) return hasil.error;

  const ubah = await ubahNama(hasil.data.nama, ipKlien(req));
  if (ubah.ok) return ok({ nama: ubah.nama, updatedAt: ubah.updatedAt });
  if (ubah.alasan === "NAMA_TIDAK_VALID")
    return gagal(400, "INPUT_TIDAK_VALID", PESAN["MSG-V03"], { field: "nama" });
  if (ubah.alasan === "BELUM_LOGIN") return gagal(401, "BELUM_LOGIN", PESAN["MSG-A03"]);
  return gagalServer("PATCH /api/profil", ubah.detail);
}

import { wajibLoginApi } from "@/lib/auth/sesi";
import { gagal, gagalServer, ok } from "@/lib/api/respon";
import { aturPenguji } from "@/lib/data/qc";
import { parseBody } from "@/lib/validasi/permintaan";
import { skemaAturPenguji } from "@/lib/validasi/qc";

/**
 * POST /api/admin/penguji — tandai/lepas anggota tim QC berdasarkan email.
 * 200 { data: Penguji | null } · 404 TIDAK_DITEMUKAN (email belum terdaftar).
 */
export async function POST(req: Request) {
  const pengguna = await wajibLoginApi("admin");
  if (pengguna instanceof Response) return pengguna;
  const body = await parseBody(req, skemaAturPenguji);
  if (body.error) return body.error;
  try {
    const hasil = await aturPenguji(body.data.email, body.data.penguji);
    if (body.data.penguji && !hasil) {
      return gagal(404, "TIDAK_DITEMUKAN", "Email belum terdaftar — minta temanmu daftar dulu.", { field: "email" });
    }
    return ok(hasil);
  } catch (e) {
    return gagalServer("POST /api/admin/penguji", e);
  }
}

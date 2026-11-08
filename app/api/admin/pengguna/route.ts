// GET /api/admin/pengguna?q=&status=&halaman= → { ringkasan, baris, total, halaman, totalHalaman } (S-15).
// Urutan bergabung terbaru (KEPUTUSAN C7); jumlah dokumen berupa angka saja (BR-06).
import { ok } from "@/lib/api/respon";
import { wajibLoginApi } from "@/lib/auth/sesi";
import { getDaftarPengguna, getRingkasanPengguna } from "@/lib/data/admin";
import { skemaDaftarPenggunaQuery } from "@/lib/validasi";
import { parseSearchParams } from "@/lib/validasi/permintaan";
import { responsGagal } from "../_bantuan";

export async function GET(req: Request) {
  const sesi = await wajibLoginApi("admin");
  if (sesi instanceof Response) return sesi;
  const q = parseSearchParams(req.url, skemaDaftarPenggunaQuery);
  if (q.error) return q.error;

  const [ringkasan, daftar] = await Promise.all([getRingkasanPengguna(), getDaftarPengguna(q.data)]);
  if (!ringkasan.ok) return responsGagal("GET /api/admin/pengguna", ringkasan.gagal);
  if (!daftar.ok) return responsGagal("GET /api/admin/pengguna", daftar.gagal);
  return ok({ ringkasan: ringkasan.data, ...daftar.data });
}

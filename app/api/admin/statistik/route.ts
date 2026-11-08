// GET /api/admin/statistik?rentang=7|30 → { statistik, seri } (S-14, KEPUTUSAN B11). Hanya angka (BR-06).
import { ok } from "@/lib/api/respon";
import { wajibLoginApi } from "@/lib/auth/sesi";
import { getSeriPertanyaanHarian, getStatistikDashboard } from "@/lib/data/admin";
import { skemaStatistikQuery } from "@/lib/validasi";
import { parseSearchParams } from "@/lib/validasi/permintaan";
import { responsGagal } from "../_bantuan";

export async function GET(req: Request) {
  const sesi = await wajibLoginApi("admin");
  if (sesi instanceof Response) return sesi;
  const q = parseSearchParams(req.url, skemaStatistikQuery);
  if (q.error) return q.error;

  const [statistik, seri] = await Promise.all([getStatistikDashboard(q.data.rentang), getSeriPertanyaanHarian(q.data.rentang)]);
  if (!statistik.ok) return responsGagal("GET /api/admin/statistik", statistik.gagal);
  if (!seri.ok) return responsGagal("GET /api/admin/statistik", seri.gagal);
  return ok({ statistik: statistik.data, seri: seri.data });
}

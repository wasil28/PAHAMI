// GET /api/admin/pengaturan/estimasi-biaya?maxPertanyaan=40 → EstimasiBiaya
// = maks pertanyaan × mahasiswa aktif 7 hari (KEPUTUSAN B12) × rata-rata biaya per pertanyaan 30 hari.
import { ok } from "@/lib/api/respon";
import { wajibLoginApi } from "@/lib/auth/sesi";
import { getEstimasiBiaya } from "@/lib/data/admin";
import { skemaEstimasiBiayaQuery } from "@/lib/validasi";
import { parseSearchParams } from "@/lib/validasi/permintaan";
import { responsGagal } from "../../_bantuan";

export async function GET(req: Request) {
  const sesi = await wajibLoginApi("admin");
  if (sesi instanceof Response) return sesi;
  const q = parseSearchParams(req.url, skemaEstimasiBiayaQuery);
  if (q.error) return q.error;
  const hasil = await getEstimasiBiaya(q.data.maxPertanyaan);
  if (!hasil.ok) return responsGagal("GET /api/admin/pengaturan/estimasi-biaya", hasil.gagal);
  return ok(hasil.data);
}

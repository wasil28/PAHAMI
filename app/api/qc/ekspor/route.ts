import { wajibLoginApi } from "@/lib/auth/sesi";
import { gagalServer } from "@/lib/api/respon";
import { getSemuaLaporanQc, keCsv } from "@/lib/data/qc";
import { searchParamsKeObjek } from "@/lib/validasi/permintaan";
import { skemaFilterQc } from "@/lib/validasi/qc";

/** GET /api/qc/ekspor?status=&kategori= — admin, unduh CSV semua laporan sesuai filter. */
export async function GET(req: Request) {
  const pengguna = await wajibLoginApi("admin");
  if (pengguna instanceof Response) return pengguna;
  const filter = skemaFilterQc.parse(searchParamsKeObjek(new URL(req.url).searchParams));
  try {
    const csv = keCsv(await getSemuaLaporanQc({ status: filter.status, kategori: filter.kategori }));
    const tanggal = new Date().toISOString().slice(0, 10);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="laporan-qc-${tanggal}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    return gagalServer("GET /api/qc/ekspor", e);
  }
}

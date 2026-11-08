import { wajibLoginApi } from "@/lib/auth/sesi";
import { gagal, gagalServer, ok } from "@/lib/api/respon";
import { getLaporanQc, ubahLaporanQc } from "@/lib/data/qc";
import { parseIdParam } from "@/lib/validasi";
import { parseBody } from "@/lib/validasi/permintaan";
import { skemaUbahLaporanQc } from "@/lib/validasi/qc";

/** PATCH /api/qc/[id] — admin mengubah status/prioritas/catatan. 200 { data: LaporanQc } · 404. */
export async function PATCH(req: Request, ctx: RouteContext<"/api/qc/[id]">) {
  const pengguna = await wajibLoginApi("admin");
  if (pengguna instanceof Response) return pengguna;
  const id = parseIdParam((await ctx.params).id);
  if (id === null) return gagal(404, "TIDAK_DITEMUKAN", "Laporan tidak ditemukan.");
  const body = await parseBody(req, skemaUbahLaporanQc);
  if (body.error) return body.error;
  try {
    if ((await ubahLaporanQc(id, body.data)) === "tidak_ditemukan") {
      return gagal(404, "TIDAK_DITEMUKAN", "Laporan tidak ditemukan.");
    }
    const laporan = await getLaporanQc(id);
    if (!laporan) return gagal(404, "TIDAK_DITEMUKAN", "Laporan tidak ditemukan.");
    return ok(laporan);
  } catch (e) {
    return gagalServer("PATCH /api/qc/[id]", e);
  }
}

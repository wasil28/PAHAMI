import { wajibLoginApi } from "@/lib/auth/sesi";
import { gagal, gagalServer, ok } from "@/lib/api/respon";
import { parseIdParam } from "@/lib/validasi";
import { getTopikMilik } from "@/lib/data/topik";
import { siapkanSoal } from "@/lib/data/latihan";
import { PESAN, pesan } from "@/lib/pesan";

// Lihat catatan maxDuration di rute ringkasan (< sewa klaim 210 dtk, KEPUTUSAN A7).
export const maxDuration = 200;

/**
 * GET /api/topik/[id]/soal — bank soal topik, dibuat sekali bila belum ada (BP-06, BR-11).
 * 200 { data: { soal: SoalLatihan[] } } — TANPA kunci/pembahasan/halaman_rujukan
 * 202 { data: { status: "diproses" } } · 404 · 409 DOKUMEN_BELUM_SIAP · 502 SOAL_GAGAL (MSG-L02).
 */
export async function GET(_req: Request, ctx: RouteContext<"/api/topik/[id]/soal">) {
  const pengguna = await wajibLoginApi("mahasiswa");
  if (pengguna instanceof Response) return pengguna;

  const topikId = parseIdParam((await ctx.params).id);
  if (topikId === null) return gagal(404, "TIDAK_DITEMUKAN", pesan("MSG-G04", { objek: "Topik" }));

  let topik;
  try {
    topik = await getTopikMilik(pengguna.id, topikId);
  } catch (e) {
    return gagalServer("soal.topik", e);
  }
  if (!topik) return gagal(404, "TIDAK_DITEMUKAN", pesan("MSG-G04", { objek: "Topik" }));
  if (topik.dokumenStatus !== "siap") return gagal(409, "DOKUMEN_BELUM_SIAP", PESAN["MSG-D04"]);

  try {
    const hasil = await siapkanSoal(pengguna.id, topik);
    if (hasil.status === "diproses") return ok({ status: "diproses" as const }, 202);
    return ok({ soal: hasil.data });
  } catch (e) {
    console.error("[soal.buat]", e instanceof Error ? e.message : e);
    return gagal(502, "SOAL_GAGAL", PESAN["MSG-L02"]);
  }
}

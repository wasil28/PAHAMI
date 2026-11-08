import { wajibLoginApi } from "@/lib/auth/sesi";
import { gagal, gagalServer, ok } from "@/lib/api/respon";
import { parseIdParam } from "@/lib/validasi";
import { getTopikMilik } from "@/lib/data/topik";
import { siapkanKerangkaMateri } from "@/lib/data/materi";
import { PESAN, pesan } from "@/lib/pesan";

// Lihat catatan maxDuration di rute ringkasan (< sewa klaim 210 dtk, KEPUTUSAN A7).
export const maxDuration = 200;

/**
 * POST /api/topik/[id]/materi — daftar materi (sub-bab) topik, kerangka dibuat sekali (KEPUTUSAN §4).
 * 200 { data: { materi: MateriRingkas[] } } · 202 { data: { status: "diproses" } }
 * 404 TIDAK_DITEMUKAN · 409 DOKUMEN_BELUM_SIAP · 502 MATERI_GAGAL (MSG-B01).
 */
export async function POST(_req: Request, ctx: RouteContext<"/api/topik/[id]/materi">) {
  const pengguna = await wajibLoginApi("mahasiswa");
  if (pengguna instanceof Response) return pengguna;

  const topikId = parseIdParam((await ctx.params).id);
  if (topikId === null) return gagal(404, "TIDAK_DITEMUKAN", pesan("MSG-G04", { objek: "Topik" }));

  let topik;
  try {
    topik = await getTopikMilik(pengguna.id, topikId);
  } catch (e) {
    return gagalServer("materi.topik", e);
  }
  if (!topik) return gagal(404, "TIDAK_DITEMUKAN", pesan("MSG-G04", { objek: "Topik" }));
  if (topik.dokumenStatus !== "siap") return gagal(409, "DOKUMEN_BELUM_SIAP", PESAN["MSG-D04"]);

  try {
    const hasil = await siapkanKerangkaMateri(pengguna.id, topik);
    if (hasil.status === "diproses") return ok({ status: "diproses" as const }, 202);
    return ok({ materi: hasil.data });
  } catch (e) {
    console.error("[materi.kerangka]", e instanceof Error ? e.message : e);
    return gagal(502, "MATERI_GAGAL", PESAN["MSG-B01"]);
  }
}

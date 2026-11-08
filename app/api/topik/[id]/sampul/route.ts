import { wajibLoginApi } from "@/lib/auth/sesi";
import { gagal, gagalServer, ok } from "@/lib/api/respon";
import { parseIdParam } from "@/lib/validasi";
import { getTopikMilik } from "@/lib/data/topik";
import { siapkanSampul } from "@/lib/data/materi";
import { pesan } from "@/lib/pesan";

// Lihat catatan maxDuration di rute ringkasan (< sewa klaim 210 dtk, KEPUTUSAN A7).
export const maxDuration = 200;

/**
 * POST /api/topik/[id]/sampul — gambar sampul topik (dekoratif), dibuat sekali.
 * 200 { data: { url: string | null } } (null = tidak tersedia, tampilkan placeholder)
 * 202 { data: { status: "diproses" } } · 404 TIDAK_DITEMUKAN.
 */
export async function POST(_req: Request, ctx: RouteContext<"/api/topik/[id]/sampul">) {
  const pengguna = await wajibLoginApi("mahasiswa");
  if (pengguna instanceof Response) return pengguna;

  const topikId = parseIdParam((await ctx.params).id);
  if (topikId === null) return gagal(404, "TIDAK_DITEMUKAN", pesan("MSG-G04", { objek: "Topik" }));

  try {
    const topik = await getTopikMilik(pengguna.id, topikId);
    if (!topik) return gagal(404, "TIDAK_DITEMUKAN", pesan("MSG-G04", { objek: "Topik" }));
    if (topik.dokumenStatus !== "siap") return ok({ url: null });
    const hasil = await siapkanSampul(pengguna.id, topik);
    if (hasil.status === "diproses") return ok({ status: "diproses" as const }, 202);
    return ok({ url: hasil.data });
  } catch (e) {
    return gagalServer("sampul", e);
  }
}

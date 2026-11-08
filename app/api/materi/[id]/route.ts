import { wajibLoginApi } from "@/lib/auth/sesi";
import { gagal, gagalServer, ok } from "@/lib/api/respon";
import { parseIdParam } from "@/lib/validasi";
import { catatBacaMateri, getMateriMilik, siapkanIsiMateri } from "@/lib/data/materi";
import { PESAN, pesan } from "@/lib/pesan";

// Lihat catatan maxDuration di rute ringkasan (< sewa klaim 210 dtk, KEPUTUSAN A7).
export const maxDuration = 200;

/**
 * POST /api/materi/[id] — isi detail satu materi, dibuat sekali; sekaligus menandai dibaca.
 * 200 { data: IsiMateri } · 202 { data: { status: "diproses" } }
 * 404 TIDAK_DITEMUKAN · 409 DOKUMEN_BELUM_SIAP · 502 MATERI_GAGAL (MSG-B01).
 */
export async function POST(_req: Request, ctx: RouteContext<"/api/materi/[id]">) {
  const pengguna = await wajibLoginApi("mahasiswa");
  if (pengguna instanceof Response) return pengguna;

  const materiId = parseIdParam((await ctx.params).id);
  if (materiId === null) return gagal(404, "TIDAK_DITEMUKAN", pesan("MSG-G04", { objek: "Materi" }));

  let milik;
  try {
    milik = await getMateriMilik(pengguna.id, materiId);
  } catch (e) {
    return gagalServer("materi.milik", e);
  }
  if (!milik) return gagal(404, "TIDAK_DITEMUKAN", pesan("MSG-G04", { objek: "Materi" }));
  if (milik.topik.dokumenStatus !== "siap") return gagal(409, "DOKUMEN_BELUM_SIAP", PESAN["MSG-D04"]);

  try {
    const hasil = await siapkanIsiMateri(pengguna.id, milik);
    if (hasil.status === "diproses") return ok({ status: "diproses" as const }, 202);
    await catatBacaMateri(materiId);
    return ok(hasil.data);
  } catch (e) {
    console.error("[materi.isi]", e instanceof Error ? e.message : e);
    return gagal(502, "MATERI_GAGAL", PESAN["MSG-B01"]);
  }
}

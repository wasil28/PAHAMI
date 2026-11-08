import { wajibLoginApi } from "@/lib/auth/sesi";
import { gagal, gagalServer, ok } from "@/lib/api/respon";
import { parseIdParam } from "@/lib/validasi";
import { getTopikMilik, siapkanRingkasan } from "@/lib/data/topik";
import { PESAN, pesan } from "@/lib/pesan";

// Batas fungsi < sewa klaim 210 dtk (KEPUTUSAN A7): proses yang terputus pasti sudah mati
// sebelum klaimnya boleh direbut permintaan lain.
export const maxDuration = 200;

/**
 * POST /api/topik/[id]/ringkasan — ambil atau buat ringkasan topik (BP-05, BR-10).
 * 200 { data: RingkasanTopik } · 202 { data: { status: "diproses" } } (permintaan lain sedang membuat → polling)
 * 404 TIDAK_DITEMUKAN · 409 DOKUMEN_BELUM_SIAP (BR-07) · 502 RINGKASAN_GAGAL (MSG-B01).
 */
export async function POST(_req: Request, ctx: RouteContext<"/api/topik/[id]/ringkasan">) {
  const pengguna = await wajibLoginApi("mahasiswa");
  if (pengguna instanceof Response) return pengguna;

  const topikId = parseIdParam((await ctx.params).id);
  if (topikId === null) return gagal(404, "TIDAK_DITEMUKAN", pesan("MSG-G04", { objek: "Topik" }));

  let topik;
  try {
    topik = await getTopikMilik(pengguna.id, topikId);
  } catch (e) {
    return gagalServer("ringkasan.topik", e);
  }
  if (!topik) return gagal(404, "TIDAK_DITEMUKAN", pesan("MSG-G04", { objek: "Topik" }));
  if (topik.dokumenStatus !== "siap") return gagal(409, "DOKUMEN_BELUM_SIAP", PESAN["MSG-D04"]);

  try {
    const hasil = await siapkanRingkasan(pengguna.id, topik);
    if (hasil.status === "diproses") return ok({ status: "diproses" as const }, 202);
    return ok(hasil.data);
  } catch (e) {
    console.error("[ringkasan.buat]", e instanceof Error ? e.message : e);
    return gagal(502, "RINGKASAN_GAGAL", PESAN["MSG-B01"]);
  }
}

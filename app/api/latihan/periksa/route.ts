import { wajibLoginApi } from "@/lib/auth/sesi";
import { gagal, gagalServer, ok } from "@/lib/api/respon";
import { parseBody } from "@/lib/validasi/permintaan";
import { skemaPeriksaJawaban } from "@/lib/validasi";
import { LatihanError, periksaJawaban } from "@/lib/data/latihan";
import { pesan } from "@/lib/pesan";

/**
 * POST /api/latihan/periksa { soalId, pilihan: 0..3 } — umpan balik satu soal (S-09).
 * 200 { data: { isBenar, kunci: 0..3, pembahasan, halamanRujukan } } · 400 · 404 (bukan milik, BR-06).
 * Tidak menyimpan apa pun (BR-33); skor akhir tetap dihitung ulang saat simpan (B8).
 */
export async function POST(req: Request) {
  const pengguna = await wajibLoginApi("mahasiswa");
  if (pengguna instanceof Response) return pengguna;

  const body = await parseBody(req, skemaPeriksaJawaban);
  if (body.error) return body.error;

  try {
    return ok(await periksaJawaban(body.data.soalId, body.data.pilihan));
  } catch (e) {
    if (e instanceof LatihanError && e.kode === "TIDAK_DITEMUKAN") {
      return gagal(404, "TIDAK_DITEMUKAN", pesan("MSG-G04", { objek: "Soal" }));
    }
    return gagalServer("latihan.periksa", e);
  }
}

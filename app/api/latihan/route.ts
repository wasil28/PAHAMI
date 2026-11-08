import { wajibLoginApi } from "@/lib/auth/sesi";
import { gagal, gagalServer, ok } from "@/lib/api/respon";
import { parseBody } from "@/lib/validasi/permintaan";
import { skemaSimpanLatihan } from "@/lib/validasi";
import { LatihanError, simpanLatihan } from "@/lib/data/latihan";
import { PESAN, pesan } from "@/lib/pesan";

/**
 * POST /api/latihan { topikId, jawaban: [{ soalId, pilihan: 0..3 }] × JUMLAH_SOAL } — simpan percobaan.
 * 201 { data: { latihanId, skor, jumlahBenar, jumlahSoal, statusTopik } }
 * 400 INPUT_TIDAK_VALID / JAWABAN_BELUM_LENGKAP (BR-33, MSG-L07) · 404 (bukan milik / dokumen tidak siap).
 * Skor dihitung ulang di DB dari kunci, bukan dari klien (BR-12, KEPUTUSAN B8).
 */
export async function POST(req: Request) {
  const pengguna = await wajibLoginApi("mahasiswa");
  if (pengguna instanceof Response) return pengguna;

  const body = await parseBody(req, skemaSimpanLatihan);
  if (body.error) return body.error;

  try {
    return ok(await simpanLatihan(body.data.topikId, body.data.jawaban), 201);
  } catch (e) {
    if (e instanceof LatihanError) {
      return e.kode === "JAWABAN_BELUM_LENGKAP"
        ? gagal(400, "JAWABAN_BELUM_LENGKAP", PESAN["MSG-L07"])
        : gagal(404, "TIDAK_DITEMUKAN", pesan("MSG-G04", { objek: "Topik" }));
    }
    return gagalServer("latihan.simpan", e);
  }
}

import { wajibLoginApi } from "@/lib/auth/sesi";
import { gagal, gagalServer, gagalValidasi, ok } from "@/lib/api/respon";
import { buatLaporanQc } from "@/lib/data/qc";
import { kodeQc, LAMPIRAN_QC_MAKS_BYTE, LAMPIRAN_QC_TIPE } from "@/lib/qc/tipe";
import { skemaBuatLaporanQc } from "@/lib/validasi/qc";

/** Tanda tangan berkas gambar (cek isi, bukan hanya MIME dari browser). */
function tipeGambar(b: Uint8Array): (typeof LAMPIRAN_QC_TIPE)[number] | null {
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "image/png";
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return "image/webp";
  return null;
}

/**
 * POST /api/qc — kirim Laporan QC (multipart/form-data). Hanya penguji & admin (dicek di DB).
 * 201 { data: { id, kode } } · 400 INPUT_TIDAK_VALID · 403 BUKAN_PENGUJI · 413 FILE_TERLALU_BESAR.
 */
export async function POST(req: Request) {
  const pengguna = await wajibLoginApi();
  if (pengguna instanceof Response) return pengguna;
  if (!pengguna.isPenguji && pengguna.peran !== "admin") {
    return gagal(403, "BUKAN_PENGUJI", "Fitur ini khusus anggota tim QC.");
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return gagal(400, "INPUT_TIDAK_VALID", "Data laporan tidak bisa dibaca.");
  }
  const teks = (k: string) => {
    const v = form.get(k);
    return typeof v === "string" ? v : undefined;
  };
  const hasil = skemaBuatLaporanQc.safeParse({
    judul: teks("judul"),
    deskripsi: teks("deskripsi"),
    kategori: teks("kategori"),
    prioritas: teks("prioritas") || undefined,
    urlHalaman: teks("urlHalaman"),
    infoPerangkat: teks("infoPerangkat"),
  });
  if (!hasil.success) return gagalValidasi(hasil.error);

  let lampiran: { isi: ArrayBuffer; tipe: string } | null = null;
  const berkas = form.get("lampiran");
  if (berkas instanceof File && berkas.size > 0) {
    if (berkas.size > LAMPIRAN_QC_MAKS_BYTE) {
      return gagal(413, "FILE_TERLALU_BESAR", "Screenshot maksimal 5 MB.", { field: "lampiran" });
    }
    const isi = await berkas.arrayBuffer();
    const tipe = tipeGambar(new Uint8Array(isi.slice(0, 12)));
    if (!tipe) return gagal(400, "INPUT_TIDAK_VALID", "Screenshot harus berupa PNG, JPG, atau WebP.", { field: "lampiran" });
    lampiran = { isi, tipe };
  }

  try {
    const r = await buatLaporanQc(pengguna.id, hasil.data, lampiran);
    if (r.status === "bukan_penguji") return gagal(403, "BUKAN_PENGUJI", "Fitur ini khusus anggota tim QC.");
    return ok({ id: r.id, kode: kodeQc(r.id) }, 201);
  } catch (e) {
    return gagalServer("POST /api/qc", e);
  }
}

// GET /api/admin/pengaturan → PengaturanKuota { item[], versi, terakhirDiubah }
// PUT /api/admin/pengaturan body { nilai: {kode: n}, versi } → { versi } (S-16, BR-28/29, KEPUTUSAN B14)
//   400 + detail.kolom {kode: pesan} bila nilai ditolak DB · 409 KONFLIK_VERSI (MSG-K05) bila versi basi.
import { gagal, ok } from "@/lib/api/respon";
import { wajibLoginApi } from "@/lib/auth/sesi";
import { getPengaturanKuota, ubahPengaturan } from "@/lib/data/admin";
import { PESAN, pesan } from "@/lib/pesan";
import { RENTANG_PENGATURAN, skemaUbahPengaturan, type KodePengaturan } from "@/lib/validasi";
import { parseBody } from "@/lib/validasi/permintaan";
import { ipPermintaan, responsGagal } from "../_bantuan";

export async function GET() {
  const sesi = await wajibLoginApi("admin");
  if (sesi instanceof Response) return sesi;
  const hasil = await getPengaturanKuota();
  if (!hasil.ok) return responsGagal("GET /api/admin/pengaturan", hasil.gagal);
  return ok(hasil.data);
}

export async function PUT(req: Request) {
  const sesi = await wajibLoginApi("admin");
  if (sesi instanceof Response) return sesi;
  const body = await parseBody(req, skemaUbahPengaturan);
  if (body.error) return body.error;

  const hasil = await ubahPengaturan(body.data.nilai, body.data.versi, ipPermintaan(req));
  if (hasil.ok) return ok(hasil.data);
  if (hasil.gagal.jenis === "galat_kolom") {
    // Terjemahkan galat DB per kolom menjadi MSG-K02 agar form menandai kolom yang salah.
    const kolom: Record<string, string> = {};
    for (const g of hasil.gagal.galat) {
      const r = RENTANG_PENGATURAN[g.kode as KodePengaturan];
      kolom[g.kode] = r ? pesan("MSG-K02", { min: g.min ?? r.min, maks: g.maks ?? r.maks }) : PESAN["MSG-V06"];
    }
    const pertama = Object.values(kolom)[0] ?? PESAN["MSG-V06"];
    return gagal(400, "KUOTA_TIDAK_VALID", pertama, { kolom });
  }
  return responsGagal("PUT /api/admin/pengaturan", hasil.gagal);
}

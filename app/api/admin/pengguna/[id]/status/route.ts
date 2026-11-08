// PATCH /api/admin/pengguna/[id]/status  body { isActive } → { id, nama, isActive, isBerubah, peringatan? }
// Alur (BR-23, BR-24, KEPUTUSAN B1): admin → validasi → fn_ubah_status_pengguna (status + log, BR-24 di
// trigger DB) → blokir/buka blokir di Supabase Auth memakai auth_id yang dikembalikan.
//
// Bila blokir Auth gagal SETELAH DB sukses: status DB TIDAK dibatalkan (DB = sumber kebenaran, dan
// wajibLogin/RLS sudah menolak akun nonaktif), galat dicatat di log server, dan respons 200 membawa
// `peringatan` agar admin bisa menekan ulang — RPC idempoten sehingga ban diterapkan lagi tanpa log ganda.
import { gagal, ok } from "@/lib/api/respon";
import { wajibLoginApi } from "@/lib/auth/sesi";
import { terapkanBlokirAuth, ubahStatusPengguna } from "@/lib/data/admin";
import { PESAN, pesan } from "@/lib/pesan";
import { parseIdParam, skemaBodyUbahStatusPengguna } from "@/lib/validasi";
import { parseBody } from "@/lib/validasi/permintaan";
import { ipPermintaan, responsGagal } from "../../../_bantuan";

// Teks belum ada di katalog MSG — usulan masuk lib/pesan.ts (lihat laporan).
const PERINGATAN_SESI = "Status tersimpan, tetapi sesi pengguna belum berhasil diakhiri. Coba ulangi aksi ini.";

export async function PATCH(req: Request, ctx: RouteContext<"/api/admin/pengguna/[id]/status">) {
  const sesi = await wajibLoginApi("admin");
  if (sesi instanceof Response) return sesi;

  const id = parseIdParam((await ctx.params).id);
  if (id === null) return gagal(404, "TIDAK_DITEMUKAN", pesan("MSG-G04", { objek: "Pengguna" }));
  // BR-24: tolak lebih awal untuk akun sendiri (trigger DB tetap menjadi penjaga utama).
  if (id === sesi.id) return gagal(403, "TARGET_ADMIN", PESAN["MSG-M05"]);

  const body = await parseBody(req, skemaBodyUbahStatusPengguna);
  if (body.error) return body.error;

  const hasil = await ubahStatusPengguna(id, body.data.isActive, ipPermintaan(req));
  if (!hasil.ok) return responsGagal("PATCH /api/admin/pengguna/[id]/status", hasil.gagal);

  const { authId, nama, isActive, isBerubah } = hasil.data;
  const blokir = await terapkanBlokirAuth(authId, isActive);
  return ok({
    id,
    nama,
    isActive,
    isBerubah,
    ...(blokir.ok ? {} : { peringatan: PERINGATAN_SESI }),
  });
}

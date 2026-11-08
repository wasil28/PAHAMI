import { wajibLoginApi } from "@/lib/auth/sesi";
import { gagal, gagalServer, ok } from "@/lib/api/respon";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getBarisDokumen, getStatusDokumen, hapusDokumenMilik, hapusFileDokumen } from "@/lib/data/dokumen";
import { parseIdParam } from "@/lib/validasi/common";
import { skemaUbahJudul } from "@/lib/validasi/dokumen";
import { parseBody } from "@/lib/validasi/permintaan";
import { PESAN, pesan } from "@/lib/pesan";

// /api/dokumen/[id] — polling status (FT-02), ganti nama & hapus (BP-09, FT-03).
// Dokumen orang lain/tidak ada → 404 yang sama (BR-06).

const tidakDitemukan = () => gagal(404, "TIDAK_DITEMUKAN", pesan("MSG-G04", { objek: "Dokumen" }));

function ipKlien(req: Request): string | null {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || null;
}

/** GET → StatusDokumenApi. Menandai dokumen macet dulu (A8) agar polling tidak berputar selamanya. */
export async function GET(_req: Request, ctx: RouteContext<"/api/dokumen/[id]">) {
  const pengguna = await wajibLoginApi("mahasiswa");
  if (pengguna instanceof Response) return pengguna;
  const id = parseIdParam((await ctx.params).id);
  if (!id) return tidakDitemukan();
  try {
    const status = await getStatusDokumen(id);
    if (!status) return tidakDitemukan();
    return ok(status);
  } catch (e) {
    return gagalServer("GET /api/dokumen/[id]", e);
  }
}

/** PATCH { judul } → { id, judul }. Hanya dokumen `siap` (BR-21, RLS t_dokumen_update_pemilik). */
export async function PATCH(req: Request, ctx: RouteContext<"/api/dokumen/[id]">) {
  const pengguna = await wajibLoginApi("mahasiswa");
  if (pengguna instanceof Response) return pengguna;
  const id = parseIdParam((await ctx.params).id);
  if (!id) return tidakDitemukan();

  const hasil = await parseBody(req, skemaUbahJudul);
  if (hasil.error) return hasil.error;

  try {
    const supabase = await createClient();
    const dok = await getBarisDokumen(id, supabase);
    if (!dok) return tidakDitemukan();
    if (dok.status === "diproses") return gagal(409, "DOKUMEN_DIPROSES", PESAN["MSG-D04"]);
    if (dok.status !== "siap") return gagal(409, "KONFLIK", PESAN["MSG-V06"]); // dokumen gagal tidak diganti nama (S-07 K-03)

    const judul = hasil.data.judul.replace(/\s+/g, " ");
    const { data, error } = await supabase
      .from("t_dokumen")
      .update({ judul, updated_by: pengguna.email })
      .eq("id", id)
      .select("id, judul")
      .maybeSingle();
    if (error) {
      if (error.code === "23514") return gagal(400, "JUDUL_TIDAK_VALID", PESAN["MSG-U04"]); // ck_dokumen_judul
      return gagalServer("PATCH /api/dokumen/[id]", error);
    }
    if (!data) return gagal(409, "KONFLIK", PESAN["MSG-D04"]); // status berubah di antara cek & update

    // Audit (FT-03 analisis L-23): hanya kode, tanpa judul (BR-06, Panduan §3.8).
    const { error: eLog } = await createAdminClient()
      .from("log_system")
      .insert({ user_id: pengguna.id, action: "UPDATE", modul: "dokumen", target_id: dok.kode, detail: { kolom: "judul" }, ip_address: ipKlien(req) });
    if (eLog) console.error("[PATCH /api/dokumen/[id]] log_system", eLog.message);

    return ok(data);
  } catch (e) {
    return gagalServer("PATCH /api/dokumen/[id]", e);
  }
}

/**
 * DELETE → { id }. BR-20: BARIS dihapus dulu lewat fn_hapus_dokumen (cascade semua turunan;
 * trigger fn_log_hapus_dokumen mencatat log_system DELETE), baru kemudian file Storage — file
 * yatim (dicatat di log server) lebih aman daripada baris yang menunjuk file yang sudah hilang.
 * Aturan di dalam RPC (DELETE langsung lewat REST dicabut, DATABASE.md §4):
 * - `siap`/`gagal` → boleh; `diproses` macet > 15 menit → ditandai gagal dulu (A8) lalu boleh.
 * - `diproses` yang pipeline-nya belum diklaim (unggahan dibatalkan/terputus, NF-04) → boleh.
 * - `diproses` yang sedang diolah → 409 MSG-D04.
 */
export async function DELETE(_req: Request, ctx: RouteContext<"/api/dokumen/[id]">) {
  const pengguna = await wajibLoginApi("mahasiswa");
  if (pengguna instanceof Response) return pengguna;
  const id = parseIdParam((await ctx.params).id);
  if (!id) return tidakDitemukan();

  try {
    const hasil = await hapusDokumenMilik(await createClient(), id);
    if (hasil.status === "tidak_ditemukan") return tidakDitemukan();
    if (hasil.status === "diproses") return gagal(409, "DOKUMEN_DIPROSES", PESAN["MSG-D04"]);
    await hapusFileDokumen(createAdminClient(), hasil.pathFile, "DELETE /api/dokumen/[id]");
    return ok({ id });
  } catch (e) {
    return gagalServer("DELETE /api/dokumen/[id]", e);
  }
}

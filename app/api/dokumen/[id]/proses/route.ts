import { after } from "next/server";
import { wajibLoginApi } from "@/lib/auth/sesi";
import { gagal, gagalServer, ok } from "@/lib/api/respon";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { TENGGAT_PIPELINE_MS } from "@/lib/config";
import { buatTenggat } from "@/lib/ai/tenggat";
import { getBarisDokumen, hapusDokumenMilik, hapusFileDokumen, periksaFileDokumen } from "@/lib/data/dokumen";
import { jalankanProsesDokumen, klaimProsesDokumen } from "@/lib/dokumen/jalankan";
import { keStatusDokumen, keTahapDokumen } from "@/lib/dokumen/tipe";
import { parseIdParam } from "@/lib/validasi/common";
import { PESAN, pesan } from "@/lib/pesan";

// POST /api/dokumen/[id]/proses — memicu BP-04 setelah browser selesai mengunggah.
// Balas 202 segera; pipeline berjalan di after() (KEPUTUSAN §3) dan statusnya dipantau
// lewat GET /api/dokumen/[id]. Idempoten: polling klien boleh memanggil ulang bila pemicu pertama
// hilang di jaringan (components/dokumen/use-status-dokumen.ts).

/**
 * Batas waktu fungsi (detik) — pipeline 500 halaman (ekstrak + embedding + topik) butuh waktu.
 * Pipeline sendiri berhenti di TENGGAT_PIPELINE_MS (270 dtk) agar sempat menandai gagal.
 */
export const maxDuration = 300;

export async function POST(_req: Request, ctx: RouteContext<"/api/dokumen/[id]/proses">) {
  // Dihitung sejak permintaan masuk — maxDuration juga dihitung dari sini (after() termasuk).
  const tenggat = buatTenggat(TENGGAT_PIPELINE_MS);
  let diserahkan = false;
  try {
    const pengguna = await wajibLoginApi("mahasiswa");
    if (pengguna instanceof Response) return pengguna;
    const id = parseIdParam((await ctx.params).id);
    if (!id) return gagal(404, "TIDAK_DITEMUKAN", pesan("MSG-G04", { objek: "Dokumen" }));

    const supabase = await createClient();
    const dok = await getBarisDokumen(id, supabase); // RLS: hanya pemilik (BR-06)
    if (!dok) return gagal(404, "TIDAK_DITEMUKAN", pesan("MSG-G04", { objek: "Dokumen" }));

    const status = { id: dok.id, status: keStatusDokumen(dok.status), tahap: keTahapDokumen(dok.tahap) };
    // Sudah selesai/gagal → tidak ada yang perlu dipicu; klien langsung membaca status akhir.
    if (status.status !== "diproses") return ok(status);

    // File harus sudah ada di Storage; bila belum, unggahan dianggap terputus (MSG-U05).
    const admin = createAdminClient();
    const file = await periksaFileDokumen(admin, id);
    if (!file.ada) return gagal(409, "FILE_BELUM_DIUNGGAH", PESAN["MSG-U05"]);

    // BR-02: ukuran yang dikirim browser ke POST /api/dokumen bisa dipalsukan dan signed upload URL
    // hanya dibatasi batas fisik bucket (100 MB) → ukuran NYATA dicek sebelum pipeline dimulai.
    // Terlalu besar → baris & file dihapus (kuota BR-04 kembali), pipeline tidak dijalankan.
    if (file.isTerlaluBesar) {
      const hapus = await hapusDokumenMilik(supabase, id);
      if (hapus.status === "terhapus") await hapusFileDokumen(admin, hapus.pathFile, "POST /api/dokumen/[id]/proses");
      else console.warn(`[proses] dokumen ${id} terlalu besar tetapi tidak terhapus: ${hapus.status}`);
      return gagal(413, "FILE_TERLALU_BESAR", pesan("MSG-U02", { max_ukuran_mb: Math.round(file.maksByte / 1024 / 1024) }));
    }
    if (file.ukuranByte === null) console.warn(`[proses] dokumen ${id}: metadata ukuran Storage belum tersedia`);

    const menang = await klaimProsesDokumen(id, pengguna.id);
    if (menang) {
      diserahkan = true;
      after(async () => {
        try {
          const hasil = await jalankanProsesDokumen({ id, userId: pengguna.id, pathFile: dok.path_file }, tenggat);
          if (hasil.status !== "siap") console.warn(`[proses] dokumen ${id} berakhir ${hasil.status} di tahap ${hasil.tahap}`);
        } catch (e) {
          // jalankanProsesDokumen tidak melempar; ini hanya jaring pengaman (A8 akan menandai macet).
          console.error(`[proses] dokumen ${id} galat tak terduga`, e);
        }
      });
    }
    // Idempoten: klaim kalah = pipeline sudah berjalan dari permintaan lain.
    return ok(status, 202);
  } catch (e) {
    return gagalServer("POST /api/dokumen/[id]/proses", e);
  } finally {
    if (!diserahkan) tenggat.hentikan();
  }
}

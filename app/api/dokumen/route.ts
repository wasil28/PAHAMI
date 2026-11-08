import { wajibLoginApi } from "@/lib/auth/sesi";
import { gagal, gagalServer, gagalValidasi, ok } from "@/lib/api/respon";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { BUCKET_DOKUMEN } from "@/lib/config";
import { getPengaturanUnggah } from "@/lib/data/dokumen";
import { skemaBuatDokumen } from "@/lib/validasi/dokumen";
import { PESAN, pesan } from "@/lib/pesan";

// POST /api/dokumen — BP-03 langkah 3–4 (KEPUTUSAN §3):
// validasi + kuota (fn_buat_dokumen) → baris `diproses` → signed upload URL.
// Browser lalu mengunggah langsung ke Storage (batas body Vercel ±4,5 MB) dan memanggil
// POST /api/dokumen/[id]/proses.

/** Kode galat fn_buat_dokumen → HTTP + pesan (DATABASE.md §3, FT-02 ui-ux §7). */
function petaGalatRpc(kode: string, detail: string | undefined, maxUkuranMb: number) {
  if (kode.includes("KUOTA_PENUH")) return gagal(429, "KUOTA_PENUH", pesan("MSG-U03", { maks: detail ?? "" })); // BR-04
  if (kode.includes("FILE_TERLALU_BESAR"))
    return gagal(413, "FILE_TERLALU_BESAR", pesan("MSG-U02", { max_ukuran_mb: maxUkuranMb })); // BR-02
  if (kode.includes("BUKAN_PDF")) return gagal(400, "BUKAN_PDF", PESAN["MSG-U01"]); // BR-01
  if (kode.includes("JUDUL_TIDAK_VALID")) return gagal(400, "JUDUL_TIDAK_VALID", PESAN["MSG-U04"]); // BR-21
  if (kode.includes("TIDAK_BERHAK")) return gagal(403, "TIDAK_BERHAK", PESAN["MSG-G05"]);
  return null;
}

export async function POST(req: Request) {
  const pengguna = await wajibLoginApi("mahasiswa");
  if (pengguna instanceof Response) return pengguna;

  try {
    const supabase = await createClient();
    const { maxUkuranMb } = await getPengaturanUnggah(supabase); // BR-28: dibaca saat aksi

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return gagal(400, "INPUT_TIDAK_VALID", PESAN["MSG-V06"]);
    }
    const hasil = skemaBuatDokumen(maxUkuranMb).safeParse(body);
    if (!hasil.success) {
      const pertama = hasil.error.issues[0];
      // Ukuran berlebih memakai 413 (FT-02 ui-ux §3.5) walau berasal dari validasi skema.
      if (pertama?.path[0] === "ukuranByte" && pertama.code === "too_big") {
        return gagal(413, "FILE_TERLALU_BESAR", pertama.message);
      }
      return gagalValidasi(hasil.error);
    }
    const { judul, namaFile, ukuranByte } = hasil.data;

    // Kuota & aturan dicek ulang di DB dengan kunci advisory (aman dari dua tab).
    const { data, error } = await supabase.rpc("fn_buat_dokumen", {
      p_judul: judul,
      p_nama_file: namaFile,
      p_ukuran_byte: ukuranByte,
    });
    if (error) {
      const terpeta = petaGalatRpc(error.message, error.details ?? undefined, maxUkuranMb);
      if (terpeta) return terpeta;
      return gagalServer("POST /api/dokumen fn_buat_dokumen", error);
    }
    const dokumen = data?.[0];
    if (!dokumen) return gagalServer("POST /api/dokumen", new Error("fn_buat_dokumen tanpa baris"));

    // Signed upload URL dibuat server (service role) untuk path yang sudah dipesan.
    const admin = createAdminClient();
    const { data: unggah, error: eUnggah } = await admin.storage
      .from(BUCKET_DOKUMEN)
      .createSignedUploadUrl(dokumen.path_file);
    if (eUnggah || !unggah) {
      // Jangan tinggalkan baris `diproses` tanpa file (NF-04) — kuota langsung kembali.
      await admin.from("t_dokumen").delete().eq("id", dokumen.id).eq("user_id", pengguna.id);
      return gagalServer("POST /api/dokumen signed upload URL", eUnggah);
    }

    return ok(
      {
        dokumen: { id: dokumen.id, kode: dokumen.kode, judul, status: dokumen.status, tahap: dokumen.tahap },
        unggah: { signedUrl: unggah.signedUrl, token: unggah.token, path: unggah.path, bucket: BUCKET_DOKUMEN },
      },
      201,
    );
  } catch (e) {
    return gagalServer("POST /api/dokumen", e);
  }
}

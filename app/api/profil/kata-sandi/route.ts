import { ok, gagal, gagalServer } from "@/lib/api/respon";
import { wajibLoginApi } from "@/lib/auth/sesi";
import { gantiSandi, verifikasiSandi } from "@/lib/data/profil";
import { PESAN } from "@/lib/pesan";
import { skemaUbahSandi } from "@/lib/validasi";
import { parseBody } from "@/lib/validasi/permintaan";

// TODO integrator: tambahkan sebagai MSG-P04 di lib/pesan.ts (belum ada di katalog Breakdown §6).
const PESAN_SANDI_SAMA = "Kata sandi baru harus berbeda dari kata sandi lama.";
// TODO integrator: masukkan ke katalog lib/pesan.ts bila disetujui.
const PESAN_PERLU_MASUK_ULANG =
  "Demi keamanan, kamu perlu masuk ulang sebelum mengubah kata sandi. Keluar, masuk lagi, lalu coba kembali.";

/**
 * Bila "Secure password change" aktif di Supabase (docs/SETUP.md), updateUser menolak ganti sandi
 * untuk sesi berumur > 24 jam tanpa nonce reautentikasi (kode GoTrue di bawah). Kita tidak membangun
 * alur nonce; cukup minta pengguna masuk ulang (sesi baru → lolos) alih-alih 500 umum.
 */
const KODE_PERLU_REAUTENTIKASI = new Set(["reauthentication_needed", "reauthentication_not_valid", "reauth_nonce_missing"]);

function perluReautentikasi(detail: unknown): boolean {
  if (typeof detail !== "object" || detail === null || !("code" in detail)) return false;
  const kode = (detail as { code?: unknown }).code;
  return typeof kode === "string" && KODE_PERLU_REAUTENTIKASI.has(kode);
}

/**
 * POST /api/profil/kata-sandi { sandiLama, sandiBaru, konfirmasiSandi } → { data: { berhasil: true } }
 * (FT-08 UC-19, kedua peran). Gagal: 400 SANDI_LAMA_SALAH (MSG-P03, field sandiLama).
 * Sandi lama diverifikasi di server dengan login ulang, bukan dipercaya dari klien.
 */
export async function POST(req: Request) {
  const pengguna = await wajibLoginApi();
  if (pengguna instanceof Response) return pengguna;

  const hasil = await parseBody(req, skemaUbahSandi); // BR-22: ≥ 8, huruf + angka, konfirmasi sama
  if (hasil.error) return hasil.error;
  const { sandiLama, sandiBaru } = hasil.data;

  if (sandiLama === sandiBaru)
    return gagal(400, "INPUT_TIDAK_VALID", PESAN_SANDI_SAMA, { field: "sandiBaru" });

  const benar = await verifikasiSandi(pengguna.email, pengguna.authId, sandiLama);
  if (!benar) return gagal(400, "SANDI_LAMA_SALAH", PESAN["MSG-P03"], { field: "sandiLama" });

  const ganti = await gantiSandi(sandiBaru);
  if (ganti.ok) return ok({ berhasil: true });
  if (ganti.alasan === "SANDI_SAMA")
    return gagal(400, "INPUT_TIDAK_VALID", PESAN_SANDI_SAMA, { field: "sandiBaru" });
  if (ganti.alasan === "SANDI_LEMAH")
    return gagal(400, "INPUT_TIDAK_VALID", PESAN["MSG-V04"], { field: "sandiBaru" });
  if (perluReautentikasi(ganti.detail))
    return gagal(403, "PERLU_MASUK_ULANG", PESAN_PERLU_MASUK_ULANG);
  return gagalServer("POST /api/profil/kata-sandi", ganti.detail);
}

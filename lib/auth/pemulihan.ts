import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { MASA_PEMULIHAN_DETIK } from "@/components/auth/rute";

/**
 * Token cookie penanda sesi pemulihan sandi (BR-26): `<sub>.<kedaluwarsa-epoch-detik>.<hmac>`.
 * Ditandatangani HMAC-SHA256 agar tidak bisa dipalsukan — tanpa tanda tangan, pengguna yang sedang
 * login cukup menulis cookie berisi `sub` miliknya untuk mengganti sandi tanpa sandi lama.
 *
 * Kunci: env `PEMULIHAN_SECRET` (disarankan, acak ≥ 32 byte). Bila kosong, kunci diturunkan dari
 * `SUPABASE_SERVICE_ROLE_KEY` (HMAC dengan label tetap, jadi service key tidak dipakai langsung) —
 * cadangan yang didokumentasikan di docs/SETUP.md & .env.example.
 */
function kunci(): Buffer {
  const rahasia = process.env.PEMULIHAN_SECRET;
  if (rahasia) return Buffer.from(rahasia, "utf8");
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (service) return createHmac("sha256", service).update("pahami:pemulihan:v1").digest();
  throw new Error("PEMULIHAN_SECRET (atau SUPABASE_SERVICE_ROLE_KEY) belum diisi");
}

function tandaTangan(isi: string): string {
  return createHmac("sha256", kunci()).update(isi).digest("base64url");
}

/** Nilai cookie untuk auth user `sub`, berlaku MASA_PEMULIHAN_DETIK sejak sekarang. */
export function buatTokenPemulihan(sub: string, sekarangMs = Date.now()): string {
  const kedaluwarsa = Math.floor(sekarangMs / 1000) + MASA_PEMULIHAN_DETIK;
  const isi = `${sub}.${kedaluwarsa}`;
  return `${isi}.${tandaTangan(isi)}`;
}

/** true bila token sah, milik `sub`, dan belum kedaluwarsa. Perbandingan tanda tangan timing-safe. */
export function verifikasiTokenPemulihan(
  token: string | null | undefined,
  sub: string,
  sekarangMs = Date.now(),
): boolean {
  if (!token) return false;
  const bagian = token.split(".");
  if (bagian.length !== 3) return false;
  const [subToken, kedaluwarsaTeks, ttd] = bagian;
  if (subToken !== sub || !/^\d+$/.test(kedaluwarsaTeks)) return false;
  if (Number(kedaluwarsaTeks) * 1000 <= sekarangMs) return false;

  const harapan = Buffer.from(tandaTangan(`${subToken}.${kedaluwarsaTeks}`));
  const diterima = Buffer.from(ttd);
  return harapan.length === diterima.length && timingSafeEqual(harapan, diterima);
}

// Aturan rute area auth yang dipakai bersama oleh proxy.ts, Route Handler, dan halaman.
// Sengaja TANPA "server-only" & tanpa impor Supabase agar aman diimpor dari proxy maupun klien.

import { PERAN, RUTE_AWAL, type Peran } from "@/lib/config";

/** Awalan rute yang hanya untuk pengguna login (Breakdown §3.2). Penjagaan peran tetap di wajibLogin(). */
export const RUTE_TERLINDUNG = ["/beranda", "/upload", "/progres", "/profil", "/dokumen", "/admin"] as const;

/** Halaman tamu: pengguna yang sudah login dialihkan ke halaman awal perannya (TC-FT01-16). */
export const RUTE_TAMU = ["/masuk", "/daftar", "/lupa-sandi"] as const;

/** Nama query string yang dipakai antar-area (didokumentasikan di laporan FT-01). */
export const PARAM = {
  /** Tujuan setelah login, mis. /masuk?lanjut=/dokumen/DOK-2026-000001 */
  lanjut: "lanjut",
  /** /masuk?nonaktif=1 → banner MSG-A02 (dipakai wajibLogin, BR-23). */
  nonaktif: "nonaktif",
  /** /masuk?keluar=1 → snackbar MSG-G03 setelah logout. */
  keluar: "keluar",
  /** /masuk?sesi=habis → banner MSG-A03 (cookie sesi ada tetapi sudah tidak berlaku). */
  sesi: "sesi",
  /** /masuk?sandi=diubah → banner sukses MSG-A07 (setelah S-05). */
  sandi: "sandi",
  /** /lupa-sandi?email=… → kolom email terisi otomatis dari S-02. */
  email: "email",
  /** /atur-ulang-sandi?status=tidak-berlaku → state MSG-A08. */
  status: "status",
} as const;

/** Cookie penanda sesi pemulihan sandi (dibuat /auth/konfirmasi, dihapus setelah sandi disimpan). */
export const COOKIE_PEMULIHAN = "pahami_pemulihan";
/** Selaras masa berlaku tautan reset (BR-26: 60 menit). */
export const MASA_PEMULIHAN_DETIK = 60 * 60;

/** Jeda tombol "Kirim ulang" di S-04 (BR-26, MSG-A04). */
export const JEDA_KIRIM_ULANG_DETIK = 60;

export function cocokAwalan(pathname: string, daftar: readonly string[]): boolean {
  return daftar.some((awal) => pathname === awal || pathname.startsWith(`${awal}/`));
}

/** Karakter kontrol (termasuk tab/newline yang dibuang parser URL WHATWG) — selalu ditolak. */
const KARAKTER_KONTROL = /[\u0000-\u001F\u007F]/;
const ASAL_UJI = "http://pahami.invalid";

/**
 * Path internal yang aman untuk redirect, atau null. Menolak "//host", backslash (peramban
 * memperlakukan "\\" seperti "/"), karakter kontrol ("/\t/evil.com" → "//evil.com" setelah tab
 * dibuang), dan apa pun yang setelah di-parse berpindah origin. Allow-list rute tetap tugas pemanggil.
 */
export function pathInternalAman(nilai: string | null | undefined): string | null {
  if (!nilai || !nilai.startsWith("/") || nilai.startsWith("//")) return null;
  if (nilai.includes("\\") || KARAKTER_KONTROL.test(nilai)) return null;
  try {
    if (new URL(nilai, ASAL_UJI).origin !== ASAL_UJI) return null;
  } catch {
    return null;
  }
  return nilai;
}

/**
 * Tujuan setelah login. `lanjut` hanya dipakai bila berupa path internal aman (pathInternalAman —
 * mencegah open redirect), termasuk allow-list RUTE_TERLINDUNG, dan sesuai peran (BR-31: admin tidak
 * ke rute mahasiswa & sebaliknya).
 */
export function tujuanSetelahMasuk(peran: Peran, lanjut: string | null | undefined): string {
  const aman = pathInternalAman(lanjut);
  if (!aman) return RUTE_AWAL[peran];
  const path = aman.split(/[?#]/)[0];
  if (!cocokAwalan(path, RUTE_TERLINDUNG)) return RUTE_AWAL[peran];
  const ruteAdmin = cocokAwalan(path, ["/admin"]);
  const bersama = cocokAwalan(path, ["/profil"]); // /profil dipakai kedua peran
  if (peran === PERAN.ADMIN && !ruteAdmin && !bersama) return RUTE_AWAL[peran];
  if (peran === PERAN.MAHASISWA && ruteAdmin) return RUTE_AWAL[peran];
  return aman;
}

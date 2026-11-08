// URL S-15 dari filter (q, status, halaman) — filter tersimpan di URL agar bisa dibagikan (FT-09 §3A.1).
import type { QueryDaftarPengguna } from "@/lib/validasi/admin";

export type FilterPengguna = Pick<QueryDaftarPengguna, "q" | "status" | "halaman">;

export const RUTE_PENGGUNA = "/admin/pengguna";

/** Nilai default (q kosong, status semua, halaman 1) dibuang agar URL tetap pendek. */
export function hrefPengguna({ q, status, halaman }: Partial<FilterPengguna>): string {
  const sp = new URLSearchParams();
  if (q) sp.set("q", q);
  if (status && status !== "semua") sp.set("status", status);
  if (halaman && halaman > 1) sp.set("halaman", String(halaman));
  const s = sp.toString();
  return s ? `${RUTE_PENGGUNA}?${s}` : RUTE_PENGGUNA;
}

// Data menu navigasi utama (Breakdown §4.2–4.3, KEPUTUSAN C1). Bisa diserialisasi
// sehingga aman dioper dari Server Component ke komponen navigasi client.

export type ItemNav = {
  href: string;
  label: string;
  /** Nama ikon Material Symbols (outlined saat tidak aktif, filled saat aktif — Panduan §1.8). */
  ikon: string;
  /** Prefix rute lain yang juga mengaktifkan menu ini (mis. detail dokumen → Beranda). */
  alias?: string[];
  /** Hanya aktif bila path sama persis (mis. /admin agar tidak aktif di /admin/pengguna). */
  persis?: boolean;
  /** Label lebih pendek untuk navigation bar bawah & rail (kolom sempit, ±72dp per item). */
  labelPendek?: string;
};

export const MENU_MAHASISWA: ItemNav[] = [
  { href: "/beranda", label: "Beranda", ikon: "home", alias: ["/dokumen", "/topik", "/latihan"] },
  { href: "/upload", label: "Upload PDF", ikon: "upload_file" },
  { href: "/progres", label: "Progres", ikon: "insights" },
  { href: "/profil", label: "Profil", ikon: "account_circle" },
];

export const MENU_ADMIN: ItemNav[] = [
  { href: "/admin", label: "Dashboard", ikon: "dashboard", persis: true },
  { href: "/admin/pengguna", label: "Pengguna", ikon: "group" },
  { href: "/admin/pengaturan", label: "Pengaturan", ikon: "settings" },
  { href: "/admin/laporan-qc", label: "Laporan QC", ikon: "fact_check" },
  { href: "/profil", label: "Profil", ikon: "account_circle" },
];

/**
 * Menu tambahan penguji QC non-admin (fitur Laporan QC), disisipkan sebelum Profil. Menu mahasiswa
 * jadi 5 item — batas atas navigation bar M3 — sehingga label bar dipersingkat.
 */
export const MENU_PENGUJI_TAMBAHAN: ItemNav = { href: "/laporan-qc", label: "Laporan saya", labelPendek: "Laporan", ikon: "fact_check" };

/** Sisipkan item tambahan sebelum item terakhir (Profil) agar Profil tetap paling bawah/kanan. */
export function sisipkanSebelumProfil(menu: ItemNav[], tambahan: ItemNav[]): ItemNav[] {
  if (tambahan.length === 0) return menu;
  return [...menu.slice(0, -1), ...tambahan, ...menu.slice(-1)];
}

const cocok = (path: string, prefix: string) => path === prefix || path.startsWith(prefix + "/");

export function isAktif(pathname: string, item: ItemNav): boolean {
  if (item.persis) return pathname === item.href;
  return cocok(pathname, item.href) || (item.alias ?? []).some((a) => cocok(pathname, a));
}

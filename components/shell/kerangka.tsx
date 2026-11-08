import type { ReactNode } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { TombolLaporkan } from "@/components/qc/tombol-laporkan";
import { Logo } from "./logo";
import type { ItemNav } from "./menu";
import { NavItems } from "./navigasi";
import { TombolKeluar } from "./tombol-keluar";

export type PenggunaShell = {
  nama: string;
  email: string;
  peran: "mahasiswa" | "admin";
  /** Penguji QC atau admin → tampilkan tombol "Laporkan" (fitur Laporan QC). */
  bolehLapor?: boolean;
};

export type KerangkaProps = {
  pengguna: PenggunaShell;
  menu: ItemNav[];
  /** Tujuan klik logo (beranda per peran). */
  hrefLogo: string;
  children: ReactNode;
};

/*
 * Kerangka responsif (Panduan §1.7):
 * compact  < 600  : header ringkas + navigation bar bawah (80dp)
 * medium   600–839: navigation rail kiri (80dp)
 * expanded ≥ 840  : navigation drawer kiri (280dp)
 * Margin konten 16dp (compact) / 24dp (lebih besar); lebar isi maks. 1040px.
 */
export function Kerangka({ pengguna, menu, hrefLogo, children }: KerangkaProps) {
  const admin = pengguna.peran === "admin";
  return (
    <div className="min-h-dvh bg-surface">
      <a
        href="#konten"
        className="sr-only z-[60] rounded-full bg-primary px-4 py-2 text-label-large text-on-primary focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        Lewati ke konten
      </a>

      {/* Compact: header ringkas */}
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between bg-surface/95 px-4 backdrop-blur medium:hidden">
        <div className="flex items-center gap-2">
          <Logo href={hrefLogo} />
          {admin && <Badge nada="tertiary">Admin</Badge>}
        </div>
        <Avatar nama={pengguna.nama} ukuran="sm" />
      </header>

      {/* Medium: navigation rail */}
      <aside aria-label="Navigasi utama" className="fixed inset-y-0 left-0 z-30 hidden w-20 flex-col items-center bg-surface py-4 medium:flex expanded:hidden">
        <Logo href={hrefLogo} hanyaTanda className="mb-8" />
        <nav aria-label="Menu utama" className="w-full flex-1">
          <NavItems menu={menu} gaya="rail" />
        </nav>
        <TombolKeluar gaya="rail" className="w-full" />
      </aside>

      {/* Expanded: navigation drawer */}
      <aside
        aria-label="Navigasi utama"
        className="fixed inset-y-0 left-0 z-30 hidden w-[280px] flex-col bg-surface-container-low px-3 py-4 expanded:flex"
      >
        <div className="mb-6 flex items-center gap-2 px-4 pt-1">
          <Logo href={hrefLogo} />
          {admin && <Badge nada="tertiary">Admin</Badge>}
        </div>
        <nav aria-label="Menu utama" className="flex-1">
          <NavItems menu={menu} gaya="drawer" />
        </nav>
        <div className="mt-4 border-t border-outline-variant pt-3">
          <div className="flex items-center gap-3 px-4 py-3">
            <Avatar nama={pengguna.nama} dekoratif />
            <div className="min-w-0">
              <p className="truncate text-title-small text-on-surface">{pengguna.nama}</p>
              <p className="truncate text-body-small text-on-surface-variant">{pengguna.email}</p>
            </div>
          </div>
          <TombolKeluar gaya="drawer" />
        </div>
      </aside>

      <main
        id="konten"
        tabIndex={-1}
        className="px-4 pt-2 pb-[calc(80px+24px+env(safe-area-inset-bottom))] outline-none medium:ml-20 medium:px-6 medium:pt-6 medium:pb-10 expanded:ml-[280px]"
      >
        <div className="mx-auto w-full max-w-[1040px]">{children}</div>
      </main>

      {/* Compact: navigation bar bawah */}
      <nav
        aria-label="Menu utama"
        className="fixed inset-x-0 bottom-0 z-30 h-[calc(80px+env(safe-area-inset-bottom))] bg-surface-container pb-[env(safe-area-inset-bottom)] medium:hidden"
      >
        <NavItems menu={menu} gaya="bar" />
      </nav>

      {pengguna.bolehLapor && <TombolLaporkan />}
    </div>
  );
}

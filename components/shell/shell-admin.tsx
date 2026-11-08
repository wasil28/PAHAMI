import type { ReactNode } from "react";
import { RUTE_AWAL } from "@/lib/config";
import { Kerangka, type PenggunaShell } from "./kerangka";
import { MENU_ADMIN } from "./menu";

/** Kerangka navigasi admin (Dashboard, Pengguna, Pengaturan, Laporan QC, Profil + Keluar). Pakai di app/(admin)/admin/layout.tsx. */
export function ShellAdmin({ pengguna, children }: { pengguna: PenggunaShell; children: ReactNode }) {
  return (
    <Kerangka pengguna={pengguna} menu={MENU_ADMIN} hrefLogo={RUTE_AWAL.admin}>
      {children}
    </Kerangka>
  );
}

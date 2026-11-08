import type { ReactNode } from "react";
import { RUTE_AWAL } from "@/lib/config";
import { Kerangka, type PenggunaShell } from "./kerangka";
import { MENU_MAHASISWA, sisipkanSebelumProfil, type ItemNav } from "./menu";

/**
 * Kerangka navigasi mahasiswa (Beranda, Upload PDF, Progres, Profil + Keluar). Pakai di app/(mahasiswa)/layout.tsx.
 * `menuTambahan` disisipkan sebelum Profil (mis. "Laporan saya" untuk penguji QC).
 */
export function ShellMahasiswa({ pengguna, menuTambahan = [], children }: { pengguna: PenggunaShell; menuTambahan?: ItemNav[]; children: ReactNode }) {
  return (
    <Kerangka pengguna={pengguna} menu={sisipkanSebelumProfil(MENU_MAHASISWA, menuTambahan)} hrefLogo={RUTE_AWAL.mahasiswa}>
      {children}
    </Kerangka>
  );
}

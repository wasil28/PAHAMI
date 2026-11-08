import type { ReactNode } from "react";
import { MENU_PENGUJI_TAMBAHAN, ShellAdmin, ShellMahasiswa } from "@/components/shell";
import { bolehLaporQc } from "@/components/qc/akses";
import { wajibLogin } from "@/lib/auth/sesi";
import { PERAN } from "@/lib/config";

/**
 * Grup rute yang dipakai KEDUA peran (/profil S-13, /laporan-qc). Shell dipilih dari peran
 * pengguna (satu pengguna = satu peran, KEPUTUSAN B15) agar menu navigasi sesuai (BR-31).
 */
export default async function LayoutAkun({ children }: { children: ReactNode }) {
  const pengguna = await wajibLogin();
  const shell = { nama: pengguna.nama, email: pengguna.email, peran: pengguna.peran, bolehLapor: bolehLaporQc(pengguna) };
  return pengguna.peran === PERAN.ADMIN ? (
    <ShellAdmin pengguna={shell}>{children}</ShellAdmin>
  ) : (
    <ShellMahasiswa pengguna={shell} menuTambahan={pengguna.isPenguji ? [MENU_PENGUJI_TAMBAHAN] : []}>
      {children}
    </ShellMahasiswa>
  );
}

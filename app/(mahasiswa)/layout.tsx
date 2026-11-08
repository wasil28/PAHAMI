import { MENU_PENGUJI_TAMBAHAN, ShellMahasiswa } from "@/components/shell";
import { bolehLaporQc } from "@/components/qc/akses";
import { wajibLogin } from "@/lib/auth/sesi";

// Semua halaman mahasiswa: wajib login + peran mahasiswa (BR-31; admin diarahkan ke /admin,
// akun nonaktif ke /masuk — BR-23). Penguji QC mendapat tombol "Laporkan" + menu "Laporan saya".
export default async function LayoutMahasiswa({ children }: LayoutProps<"/">) {
  const pengguna = await wajibLogin("mahasiswa");
  const bolehLapor = bolehLaporQc(pengguna);
  return (
    <ShellMahasiswa
      pengguna={{ nama: pengguna.nama, email: pengguna.email, peran: pengguna.peran, bolehLapor }}
      menuTambahan={pengguna.isPenguji ? [MENU_PENGUJI_TAMBAHAN] : []}
    >
      {children}
    </ShellMahasiswa>
  );
}

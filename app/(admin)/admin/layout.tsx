import { ShellAdmin } from "@/components/shell";
import { bolehLaporQc } from "@/components/qc/akses";
import { wajibLogin } from "@/lib/auth/sesi";

// Semua rute /admin/** hanya untuk admin aktif (BR-31); mahasiswa diarahkan ke berandanya.
export default async function LayoutAdmin({ children }: LayoutProps<"/admin">) {
  const pengguna = await wajibLogin("admin");
  return (
    <ShellAdmin pengguna={{ nama: pengguna.nama, email: pengguna.email, peran: pengguna.peran, bolehLapor: bolehLaporQc(pengguna) }}>
      {children}
    </ShellAdmin>
  );
}

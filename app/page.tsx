import { unstable_rethrow } from "next/navigation";
import { getPengguna } from "@/lib/auth/sesi";
import { PERAN, RUTE_AWAL } from "@/lib/config";
import { HeroLanding, NavLanding, type AksesLanding } from "@/components/landing/hero";
import { CaraKerja, FiturLanding, PembedaLanding } from "@/components/landing/bagian";
import { AjakanAkhir, FooterLanding } from "@/components/landing/penutup";

/**
 * S-01 Landing (M-T1). Tamu melihat ajakan Daftar/Masuk; pengguna yang sudah login (dan aktif)
 * melihat satu tombol ke halaman awal perannya (BR-31) alih-alih dialihkan paksa.
 */
export default async function HalamanLanding() {
  // Landing tetap tampil sebagai tamu bila database sedang bermasalah.
  const pengguna = await getPengguna().catch((err: unknown) => {
    unstable_rethrow(err); // sinyal internal Next (render dinamis/redirect) harus diteruskan
    console.error("[landing] getPengguna", err);
    return null;
  });
  const akses: AksesLanding =
    pengguna && pengguna.isActive
      ? {
          href: RUTE_AWAL[pengguna.peran],
          label: pengguna.peran === PERAN.ADMIN ? "Buka Dashboard" : "Buka Beranda",
        }
      : null;

  return (
    <div className="flex min-h-dvh flex-col bg-surface">
      <NavLanding akses={akses} />
      <main className="flex-1">
        <HeroLanding akses={akses} />
        <CaraKerja />
        <FiturLanding />
        <PembedaLanding />
        <AjakanAkhir akses={akses} />
      </main>
      <FooterLanding />
    </div>
  );
}

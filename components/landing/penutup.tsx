import Link from "next/link";
import { Logo } from "@/components/shell/logo";
import { kelasTombol } from "@/components/ui";
import type { AksesLanding } from "./hero";

const KELAS_OUTLINED_DI_PRIMARY =
  "state-layer relative inline-flex h-14 items-center justify-center rounded-full border border-on-primary/50 px-8 text-title-medium text-on-primary";

/** Ajakan akhir di atas latar primary. */
export function AjakanAkhir({ akses }: { akses: AksesLanding }) {
  return (
    <section aria-labelledby="ajakan" className="px-4 pb-16 medium:px-6 medium:pb-24">
      <div className="relative mx-auto max-w-[1120px] overflow-hidden rounded-xl bg-primary px-6 py-12 text-center text-on-primary medium:px-12 medium:py-16">
        <div aria-hidden className="absolute -right-16 -top-16 size-56 rounded-full bg-on-primary/10" />
        <div aria-hidden className="absolute -bottom-20 -left-10 size-48 rounded-full bg-primary-container/25" />
        <h2 id="ajakan" className="relative text-headline-small font-bold tracking-tight medium:text-headline-medium">
          Modul semester ini menunggu untuk dipahami.
        </h2>
        <p className="relative mx-auto mt-3 max-w-md text-body-large opacity-90">
          {akses ? "Lanjutkan dari topik terakhirmu." : "Buat akun dalam satu menit, lalu unggah PDF pertamamu."}
        </p>
        <div className="relative mt-8 flex flex-col justify-center gap-3 medium:flex-row">
          {akses ? (
            <Link href={akses.href} className={kelasTombol({ varian: "elevated", ukuran: "lg" })}>
              {akses.label}
            </Link>
          ) : (
            <>
              <Link href="/daftar" className={kelasTombol({ varian: "elevated", ukuran: "lg" })}>
                Mulai gratis
              </Link>
              {/* Outlined versi latar primary — kelasTombol tidak bisa ditimpa warnanya karena cn() tidak merge. */}
              <Link href="/masuk" className={KELAS_OUTLINED_DI_PRIMARY}>
                Saya sudah punya akun
              </Link>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

/** Footer: identitas capstone (Breakdown S-01). */
export function FooterLanding() {
  return (
    <footer className="bg-surface-container-low">
      <div className="mx-auto flex max-w-[1120px] flex-col items-center gap-3 px-4 py-8 text-center medium:flex-row medium:justify-between medium:px-6 medium:text-left">
        <Logo />
        <p className="text-body-small text-on-surface-variant">
          Capstone Project STSI4440 · Sistem Informasi · Universitas Terbuka · 2026
        </p>
      </div>
    </footer>
  );
}

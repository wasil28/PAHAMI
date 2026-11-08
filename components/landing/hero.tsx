import { TombolLink } from "@/components/ui";
import { Ikon } from "@/components/ui/ikon";
import { Logo } from "@/components/shell/logo";
import { LABEL } from "@/lib/pesan";
import { NAMA_APLIKASI } from "@/lib/config";
import { IlustrasiBelajar } from "./ilustrasi-belajar";

/** Tujuan "Buka Beranda/Dashboard" bila pengunjung sudah login; null = tamu. */
export type AksesLanding = { href: string; label: string } | null;

/** Navigasi atas S-01: logo + Masuk/Daftar (tamu) atau satu tombol ke halaman awal (sudah login). */
export function NavLanding({ akses }: { akses: AksesLanding }) {
  return (
    <header className="sticky top-0 z-20 bg-surface/90 backdrop-blur">
      <nav aria-label="Navigasi utama" className="mx-auto flex h-16 max-w-[1120px] items-center justify-between gap-2 px-4 medium:px-6">
        <Logo />
        <div className="flex items-center gap-1 medium:gap-2">
          {akses ? (
            <TombolLink href={akses.href} ikonKanan="arrow_forward">
              {akses.label}
            </TombolLink>
          ) : (
            <>
              <TombolLink href="/masuk" varian="text">
                {LABEL.masuk}
              </TombolLink>
              <TombolLink href="/daftar">{LABEL.daftar}</TombolLink>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}

const JAMINAN = [
  { ikon: "lock", teks: "Dokumenmu tetap privat" },
  { ikon: "menu_book", teks: "Jawaban dari bukumu sendiri" },
  { ikon: "smartphone", teks: "Nyaman dari HP" },
] as const;

/** Hero S-01: nilai utama + satu ajakan utama "Mulai gratis" (Breakdown S-01 catatan UI/UX). */
export function HeroLanding({ akses }: { akses: AksesLanding }) {
  return (
    <section aria-labelledby="judul-hero" className="relative overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute -right-40 -top-40 size-[520px] rounded-full bg-primary-container/50 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -left-32 top-1/2 size-[360px] rounded-full bg-tertiary-container/40 blur-3xl" />

      <div className="relative mx-auto grid max-w-[1120px] items-center gap-12 px-4 pb-16 pt-8 medium:px-6 medium:pt-14 expanded:grid-cols-[1.05fr_1fr] expanded:gap-16 expanded:pb-24 expanded:pt-20">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full bg-secondary-container px-3 py-1.5 text-label-large text-on-secondary-container">
            <Ikon nama="school" ukuran={18} />
            Teman belajar mandiri mahasiswa UT
          </p>
          <h1
            id="judul-hero"
            className="mt-5 text-display-small font-bold tracking-tight text-on-surface medium:text-display-medium large:text-display-large"
          >
            Dari PDF tebal jadi <span className="text-primary">belajar bertahap</span> yang jelas arahnya.
          </h1>
          <p className="mt-5 max-w-xl text-body-large text-on-surface-variant medium:text-title-medium medium:font-normal">
            Unggah modul atau buku dalam format PDF. {NAMA_APLIKASI} menyusunnya menjadi topik berurutan, ringkasan,
            dan latihan soal — plus Tanya AI yang menjawab{" "}
            <strong className="font-semibold text-on-surface">hanya dari isi dokumenmu</strong>, lengkap dengan nomor
            halamannya.
          </p>

          <div className="mt-8 flex flex-col gap-3 medium:flex-row">
            {akses ? (
              <TombolLink href={akses.href} ukuran="lg" ikonKanan="arrow_forward">
                {akses.label}
              </TombolLink>
            ) : (
              <>
                <TombolLink href="/daftar" ukuran="lg" ikonKanan="arrow_forward">
                  Mulai gratis
                </TombolLink>
                <TombolLink href="/masuk" ukuran="lg" varian="outlined">
                  {LABEL.masuk}
                </TombolLink>
              </>
            )}
          </div>

          <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-body-medium text-on-surface-variant">
            {JAMINAN.map((j) => (
              <li key={j.teks} className="flex items-center gap-2">
                <Ikon nama={j.ikon} ukuran={18} className="text-primary" />
                {j.teks}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative mx-auto w-full max-w-[480px] expanded:max-w-none">
          <div aria-hidden className="absolute -inset-6 -z-10 rounded-xl bg-surface-container-low" />
          <IlustrasiBelajar className="p-2 medium:p-4" />
        </div>
      </div>
    </section>
  );
}

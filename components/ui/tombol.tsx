import Link from "next/link";
import type { ButtonHTMLAttributes, ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/tema/cn";
import { Ikon } from "./ikon";
import { ProgressCircular } from "./progress";

export type VarianTombol = "filled" | "tonal" | "outlined" | "text" | "elevated" | "danger";
export type UkuranTombol = "sm" | "md" | "lg";

const varianKelas: Record<VarianTombol, string> = {
  filled: "bg-primary text-on-primary hover:shadow-1",
  tonal: "bg-secondary-container text-on-secondary-container hover:shadow-1",
  outlined: "border border-outline text-primary",
  text: "text-primary",
  elevated: "bg-surface-container-low text-primary shadow-1 hover:shadow-2",
  danger: "bg-error text-on-error hover:shadow-1",
};

// Tinggi visual 40dp (M3), area sentuh tetap ≥ 48dp lewat pseudo `after` (Panduan §1.7).
const ukuranKelas: Record<UkuranTombol, string> = {
  sm: "h-8 gap-1.5 text-label-large",
  md: "h-10 gap-2 text-label-large",
  lg: "h-14 gap-2 text-title-medium",
};
const paddingKelas: Record<UkuranTombol, [biasa: string, teks: string]> = {
  sm: ["px-4", "px-3"],
  md: ["px-6", "px-3"],
  lg: ["px-8", "px-4"],
};

export type OpsiGayaTombol = {
  varian?: VarianTombol;
  ukuran?: UkuranTombol;
  lebarPenuh?: boolean;
  className?: string;
};

/** Class tombol M3 — dipakai Tombol, TombolLink, atau elemen lain (mis. <summary>). */
export function kelasTombol({ varian = "filled", ukuran = "md", lebarPenuh = false, className }: OpsiGayaTombol = {}) {
  return cn(
    "state-layer relative inline-flex shrink-0 select-none items-center justify-center whitespace-nowrap rounded-full",
    "transition-[box-shadow,background-color] duration-150 ease-standard",
    "after:absolute after:-inset-y-1 after:inset-x-0 after:content-['']",
    "disabled:pointer-events-none disabled:shadow-none aria-disabled:pointer-events-none",
    // Nonaktif M3: container on-surface 12%, isi on-surface 38%.
    varian === "text"
      ? "disabled:text-on-surface/38 aria-disabled:text-on-surface/38"
      : varian === "outlined"
        ? "disabled:border-on-surface/12 disabled:text-on-surface/38 aria-disabled:border-on-surface/12 aria-disabled:text-on-surface/38"
        : "disabled:bg-on-surface/12 disabled:text-on-surface/38 aria-disabled:bg-on-surface/12 aria-disabled:text-on-surface/38",
    varianKelas[varian],
    ukuranKelas[ukuran],
    paddingKelas[ukuran][varian === "text" ? 1 : 0],
    lebarPenuh && "w-full",
    className,
  );
}

type IsiTombolProps = { ikon?: string; ikonKanan?: string; memuat?: boolean; teksMemuat?: ReactNode; children?: ReactNode; ukuran: UkuranTombol };

function IsiTombol({ ikon, ikonKanan, memuat, teksMemuat, children, ukuran }: IsiTombolProps) {
  const besarIkon = ukuran === "sm" ? 18 : 20;
  return (
    <>
      {memuat ? (
        <ProgressCircular ukuran={besarIkon} tebal={2.5} warnaSaatIni />
      ) : (
        ikon && <Ikon nama={ikon} ukuran={besarIkon} className="-ml-1" />
      )}
      <span>{memuat && teksMemuat ? teksMemuat : children}</span>
      {ikonKanan && !memuat && <Ikon nama={ikonKanan} ukuran={besarIkon} className="-mr-1" />}
    </>
  );
}

export type TombolProps = ButtonHTMLAttributes<HTMLButtonElement> &
  OpsiGayaTombol & {
    /** Ikon Material Symbols di kiri label. */
    ikon?: string;
    ikonKanan?: string;
    /** Menampilkan indikator lingkar & menonaktifkan tombol (mis. "Sedang masuk…"). */
    memuat?: boolean;
    /** Teks pengganti saat memuat. */
    teksMemuat?: ReactNode;
  };

/** Tombol M3. Default `type="button"`; set `type="submit"` untuk form. */
export function Tombol({
  varian,
  ukuran = "md",
  lebarPenuh,
  className,
  ikon,
  ikonKanan,
  memuat = false,
  teksMemuat,
  disabled,
  type = "button",
  children,
  ...rest
}: TombolProps) {
  return (
    <button
      type={type}
      disabled={disabled || memuat}
      aria-busy={memuat || undefined}
      className={kelasTombol({ varian, ukuran, lebarPenuh, className })}
      {...rest}
    >
      <IsiTombol ikon={ikon} ikonKanan={ikonKanan} memuat={memuat} teksMemuat={teksMemuat} ukuran={ukuran}>
        {children}
      </IsiTombol>
    </button>
  );
}

export type TombolLinkProps = ComponentProps<typeof Link> &
  OpsiGayaTombol & { ikon?: string; ikonKanan?: string; nonaktif?: boolean };

/** Tautan bergaya tombol (next/link) — untuk navigasi, mis. "Upload PDF". */
export function TombolLink({ varian, ukuran = "md", lebarPenuh, className, ikon, ikonKanan, nonaktif, children, ...rest }: TombolLinkProps) {
  return (
    <Link
      aria-disabled={nonaktif || undefined}
      tabIndex={nonaktif ? -1 : undefined}
      className={kelasTombol({ varian, ukuran, lebarPenuh, className })}
      {...rest}
    >
      <IsiTombol ikon={ikon} ikonKanan={ikonKanan} ukuran={ukuran}>
        {children}
      </IsiTombol>
    </Link>
  );
}

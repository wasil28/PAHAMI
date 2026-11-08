import Link from "next/link";
import type { ButtonHTMLAttributes, ComponentProps } from "react";
import { cn } from "@/lib/tema/cn";
import { Ikon } from "./ikon";

export type VarianIconButton = "standard" | "filled" | "tonal" | "outlined";

type OpsiIconButton = {
  /** Nama ikon Material Symbols. */
  ikon: string;
  /** Wajib: label aksesibel (juga jadi tooltip bawaan via `title`). */
  label: string;
  varian?: VarianIconButton;
  /** Untuk toggle (mis. tampilkan sandi): ikon terisi & warna aktif. */
  terpilih?: boolean;
  className?: string;
};

function kelasIconButton(varian: VarianIconButton, terpilih: boolean | undefined, className?: string) {
  const warna: Record<VarianIconButton, string> = {
    standard: terpilih ? "text-primary" : "text-on-surface-variant",
    filled: terpilih === false ? "bg-surface-container-highest text-primary" : "bg-primary text-on-primary",
    tonal: terpilih ? "bg-secondary text-on-secondary" : "bg-secondary-container text-on-secondary-container",
    outlined: terpilih ? "bg-inverse-surface text-inverse-on-surface" : "border border-outline-variant text-on-surface-variant",
  };
  // Visual 40dp, area sentuh 48dp lewat `after`.
  return cn(
    "state-layer relative inline-flex size-10 shrink-0 items-center justify-center rounded-full transition-colors",
    "after:absolute after:-inset-1 after:content-['']",
    "disabled:pointer-events-none disabled:bg-transparent disabled:text-on-surface/38",
    varian !== "standard" && varian !== "outlined" && "disabled:bg-on-surface/12",
    warna[varian],
    className,
  );
}

export type IconButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & OpsiIconButton;

/** Icon button M3 (standard/filled/tonal/outlined), area sentuh 48dp. */
export function IconButton({ ikon, label, varian = "standard", terpilih, className, type = "button", ...rest }: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      aria-pressed={terpilih}
      className={kelasIconButton(varian, terpilih, className)}
      {...rest}
    >
      <Ikon nama={ikon} isi={terpilih} />
    </button>
  );
}

export type IconButtonLinkProps = Omit<ComponentProps<typeof Link>, "children"> & OpsiIconButton;

/** Icon button sebagai tautan (mis. tombol kembali). */
export function IconButtonLink({ ikon, label, varian = "standard", terpilih, className, ...rest }: IconButtonLinkProps) {
  return (
    <Link aria-label={label} title={label} className={kelasIconButton(varian, terpilih, className)} {...rest}>
      <Ikon nama={ikon} isi={terpilih} />
    </Link>
  );
}

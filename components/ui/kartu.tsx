import Link from "next/link";
import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/tema/cn";

export type VarianKartu = "filled" | "outlined" | "elevated";
export type PaddingKartu = "none" | "sm" | "md" | "lg";

const varianKelas: Record<VarianKartu, string> = {
  // G1 Tonal Lembut: kartu filled di surface-container-low (KEPUTUSAN §2).
  filled: "bg-surface-container-low",
  outlined: "border border-outline-variant bg-surface",
  elevated: "bg-surface-container-low shadow-1",
};
const paddingKelas: Record<PaddingKartu, string> = { none: "", sm: "p-3", md: "p-4", lg: "p-6" };

export type KartuProps = Omit<HTMLAttributes<HTMLElement>, "children"> & {
  varian?: VarianKartu;
  padding?: PaddingKartu;
  /** Radius: `md` 12dp (default) atau `lg` 16dp untuk kartu besar. */
  radius?: "md" | "lg";
  /** Bila diisi, seluruh kartu menjadi tautan dengan state layer. */
  href?: string;
  /** Elemen pembungkus (default `div`; `article`/`section` untuk semantik). */
  as?: "div" | "article" | "section" | "li";
  children?: ReactNode;
};

/**
 * Kartu M3. Kartu ber-`href` sebaiknya tidak berisi tombol lain di dalamnya;
 * bila perlu (mis. menu ⋮), pakai `KartuTautan` di dalam kartu biasa.
 */
export function Kartu({ varian = "filled", padding = "md", radius = "md", href, as = "div", className, children, ...rest }: KartuProps) {
  const kelas = cn(
    "text-on-surface",
    radius === "lg" ? "rounded-lg" : "rounded-md",
    varianKelas[varian],
    paddingKelas[padding],
    className,
  );
  if (href) {
    return (
      <Link
        href={href}
        className={cn(kelas, "state-layer block transition-shadow duration-150", varian === "elevated" ? "hover:shadow-2" : "hover:shadow-1")}
        {...(rest as HTMLAttributes<HTMLAnchorElement>)}
      >
        {children}
      </Link>
    );
  }
  const Tag = as;
  return (
    <Tag className={kelas} {...rest}>
      {children}
    </Tag>
  );
}

/**
 * Tautan yang menutupi seluruh kartu induk (pola "stretched link"), sehingga
 * kartu bisa diklik sekaligus memuat tombol lain (beri tombol itu `relative z-10`).
 * Induk wajib `relative` + `state-layer` bila ingin efek hover.
 */
export function KartuTautan({ href, children, className }: { href: string; children: ReactNode; className?: string }) {
  return (
    <Link href={href} className={cn("rounded-[inherit] after:absolute after:inset-0 after:rounded-[inherit] after:content-['']", className)}>
      {children}
    </Link>
  );
}

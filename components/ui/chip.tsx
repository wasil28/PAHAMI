import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/tema/cn";
import { Ikon } from "./ikon";

/**
 * Chip M3:
 * - `assist` / `suggestion`: saran aksi, mis. saran pertanyaan Tanya AI
 * - `filter`: pilihan filter (pakai `terpilih`; ikon centang otomatis)
 * - `input`: nilai yang dimasukkan, dengan tombol hapus (`onHapus`)
 * - `info`: chip statis non-interaktif (mis. "hal. 12–18")
 */
export type VarianChip = "assist" | "suggestion" | "filter" | "input" | "info";

export type ChipProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
  varian?: VarianChip;
  label: ReactNode;
  ikon?: string;
  terpilih?: boolean;
  /** Bila diisi, chip dirender sebagai tautan. */
  href?: string;
  /** Khusus `input`: dipanggil saat tombol hapus diklik. */
  onHapus?: () => void;
  /** Label aksesibel tombol hapus, default "Hapus". */
  labelHapus?: string;
};

export function Chip({ varian = "assist", label, ikon, terpilih, href, onHapus, labelHapus = "Hapus", className, type = "button", ...rest }: ChipProps) {
  const aktif = varian === "filter" && terpilih;
  const kelas = cn(
    "inline-flex h-8 shrink-0 items-center gap-2 rounded-sm px-4 text-label-large transition-colors",
    aktif
      ? "bg-secondary-container text-on-secondary-container"
      : varian === "info"
        ? "bg-surface-container-high text-on-surface-variant"
        : "border border-outline-variant text-on-surface-variant",
    varian !== "info" && "state-layer relative after:absolute after:-inset-y-2 after:inset-x-0 after:content-['']",
    (ikon || aktif) && "pl-2",
    varian === "input" && onHapus && "pr-2",
    "disabled:pointer-events-none disabled:opacity-38",
    className,
  );
  const ikonKiri = aktif ? "check" : ikon;
  const isi = (
    <>
      {ikonKiri && <Ikon nama={ikonKiri} ukuran={18} className={aktif ? "" : "text-primary"} />}
      <span>{label}</span>
    </>
  );

  if (varian === "info") return <span className={kelas}>{isi}</span>;
  if (href) {
    return (
      <Link href={href} className={kelas}>
        {isi}
      </Link>
    );
  }
  if (varian === "input" && onHapus) {
    // Dua target terpisah: chip (opsional) & tombol hapus.
    return (
      <span className={cn(kelas, "pr-1")}>
        {isi}
        <button
          type="button"
          onClick={onHapus}
          aria-label={`${labelHapus} ${typeof label === "string" ? label : ""}`.trim()}
          className="state-layer relative grid size-6 place-items-center rounded-full"
        >
          <Ikon nama="close" ukuran={18} />
        </button>
      </span>
    );
  }
  return (
    <button type={type} aria-pressed={varian === "filter" ? Boolean(terpilih) : undefined} className={kelas} {...rest}>
      {isi}
    </button>
  );
}

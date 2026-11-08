import type { ReactNode } from "react";
import { cn } from "@/lib/tema/cn";
import { IconButtonLink } from "./icon-button";

export type TopAppBarProps = {
  judul: ReactNode;
  /** Bila diisi, tampil tombol kembali (ikon arrow_back) ke URL ini. */
  kembaliHref?: string;
  labelKembali?: string;
  /** Icon button aksi di kanan (maks. 3). */
  aksi?: ReactNode;
  /** `center` untuk judul rata tengah (layar sederhana di HP). */
  varian?: "small" | "center";
  /** Menempel di atas saat digulir. */
  lengket?: boolean;
  className?: string;
};

/** Top app bar M3 (small / center-aligned), tinggi 64dp. */
export function TopAppBar({ judul, kembaliHref, labelKembali = "Kembali", aksi, varian = "small", lengket = true, className }: TopAppBarProps) {
  return (
    <header
      className={cn(
        "z-20 flex h-16 items-center gap-1 bg-surface px-1 text-on-surface",
        lengket && "sticky top-0",
        varian === "center" && "justify-between",
        className,
      )}
    >
      {kembaliHref ? <IconButtonLink href={kembaliHref} ikon="arrow_back" label={labelKembali} className="mx-1" /> : varian === "center" && <span className="size-12" />}
      <h1 className={cn("min-w-0 truncate text-title-large", varian === "center" ? "flex-1 text-center" : "flex-1 px-3", kembaliHref && varian === "small" && "px-1")}>
        {judul}
      </h1>
      <div className="flex shrink-0 items-center gap-1 pr-1">{aksi ?? (varian === "center" && <span className="size-12" />)}</div>
    </header>
  );
}

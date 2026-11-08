import type { ReactNode } from "react";
import { cn } from "@/lib/tema/cn";
import { Ikon } from "./ikon";

export type NadaBanner = "info" | "success" | "warning" | "error";

const gaya: Record<NadaBanner, { kelas: string; ikon: string }> = {
  info: { kelas: "bg-secondary-container text-on-secondary-container", ikon: "info" },
  success: { kelas: "bg-success-container text-on-success-container", ikon: "check_circle" },
  warning: { kelas: "bg-warning-container text-on-warning-container", ikon: "warning" },
  error: { kelas: "bg-error-container text-on-error-container", ikon: "error" },
};

export type BannerProps = {
  nada?: NadaBanner;
  judul?: ReactNode;
  children?: ReactNode;
  /** Ganti ikon default nada. */
  ikon?: string;
  /** Tombol aksi (text/tonal button) di kanan/bawah. */
  aksi?: ReactNode;
  className?: string;
};

/**
 * Banner/alert inline (kartu pesan K-03 di form, peringatan kuota, dll).
 * `error`/`warning` memakai role="alert" agar langsung dibacakan.
 */
export function Banner({ nada = "info", judul, children, ikon, aksi, className }: BannerProps) {
  const g = gaya[nada];
  return (
    <div
      role={nada === "error" || nada === "warning" ? "alert" : "status"}
      className={cn("flex flex-wrap items-start gap-3 rounded-sm px-4 py-3", g.kelas, className)}
    >
      <Ikon nama={ikon ?? g.ikon} isi ukuran={20} className="mt-0.5" />
      <div className="min-w-0 flex-1 text-body-medium">
        {judul && <p className="text-title-small">{judul}</p>}
        {children && <div className={cn(judul && "mt-0.5")}>{children}</div>}
      </div>
      {aksi && <div className="-my-1 ml-auto flex shrink-0 items-center gap-2">{aksi}</div>}
    </div>
  );
}

import type { ReactNode } from "react";
import { cn } from "@/lib/tema/cn";
import { Ikon } from "./ikon";

export type NadaStat = "primary" | "secondary" | "tertiary" | "success" | "warning" | "error";

const nadaIkon: Record<NadaStat, string> = {
  primary: "bg-primary-container text-on-primary-container",
  secondary: "bg-secondary-container text-on-secondary-container",
  tertiary: "bg-tertiary-container text-on-tertiary-container",
  success: "bg-success-container text-on-success-container",
  warning: "bg-warning-container text-on-warning-container",
  error: "bg-error-container text-on-error-container",
};

export type StatCardProps = {
  label: ReactNode;
  /** Angka besar yang sudah diformat (mis. "Rp18.500", "33%"). */
  nilai: ReactNode;
  ikon?: string;
  nada?: NadaStat;
  /** Keterangan kecil di bawah (mis. "dari 5 dokumen", "+12% minggu ini"). */
  keterangan?: ReactNode;
  /** Elemen tambahan di bawah (mis. ProgressLinear). */
  children?: ReactNode;
  className?: string;
};

/** Kartu statistik: ikon tonal + angka besar + label (beranda, progres, dashboard admin). */
export function StatCard({ label, nilai, ikon, nada = "primary", keterangan, children, className }: StatCardProps) {
  return (
    <div className={cn("flex flex-col gap-3 rounded-lg bg-surface-container-low p-4", className)}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-label-large text-on-surface-variant">{label}</p>
        {ikon && (
          <span className={cn("grid size-10 shrink-0 place-items-center rounded-md", nadaIkon[nada])}>
            <Ikon nama={ikon} ukuran={22} />
          </span>
        )}
      </div>
      <p className="text-headline-medium font-semibold tabular-nums text-on-surface">{nilai}</p>
      {keterangan && <p className="-mt-2 text-body-small text-on-surface-variant">{keterangan}</p>}
      {children}
    </div>
  );
}

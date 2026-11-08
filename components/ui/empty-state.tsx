import type { ReactNode } from "react";
import { cn } from "@/lib/tema/cn";
import { Ikon } from "./ikon";

export type EmptyStateProps = {
  ikon: string;
  judul: ReactNode;
  teks?: ReactNode;
  /** Tombol/TombolLink aksi, mis. "Upload PDF". */
  aksi?: ReactNode;
  /** `ringkas` untuk di dalam kartu/panel. */
  ringkas?: boolean;
  className?: string;
};

/** State kosong: ikon dalam lingkaran tonal + judul + teks + aksi. */
export function EmptyState({ ikon, judul, teks, aksi, ringkas, className }: EmptyStateProps) {
  return (
    <div className={cn("mx-auto flex max-w-md flex-col items-center text-center", ringkas ? "gap-2 py-6" : "gap-3 py-12", className)}>
      <span className={cn("grid place-items-center rounded-full bg-secondary-container text-on-secondary-container", ringkas ? "mb-1 size-14" : "mb-2 size-20")}>
        <Ikon nama={ikon} ukuran={ringkas ? 28 : 40} />
      </span>
      <h2 className={cn("text-on-surface", ringkas ? "text-title-medium" : "text-title-large")}>{judul}</h2>
      {teks && <p className="text-body-medium text-on-surface-variant">{teks}</p>}
      {aksi && <div className="mt-3 flex flex-wrap justify-center gap-2">{aksi}</div>}
    </div>
  );
}

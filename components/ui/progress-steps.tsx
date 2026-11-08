import type { ReactNode } from "react";
import { cn } from "@/lib/tema/cn";
import { Ikon } from "./ikon";
import { ProgressCircular } from "./progress";

export type LangkahProses = { label: ReactNode; keterangan?: ReactNode };

export type ProgressStepsProps = {
  langkah: LangkahProses[];
  /** Indeks langkah yang sedang berjalan (0-based). Langkah sebelumnya dianggap selesai. */
  aktif: number;
  /** `gagal` menandai langkah aktif gagal; `selesai` menandai semua langkah selesai. */
  status?: "berjalan" | "gagal" | "selesai";
  /** Label aksesibel daftar, mis. "Tahap pengolahan dokumen". */
  label: string;
  /** `horizontal` untuk layar lebar (stepper linear), default vertikal. */
  orientasi?: "vertikal" | "horizontal";
  className?: string;
};

type Keadaan = "selesai" | "aktif" | "gagal" | "menunggu";

const teksKeadaan: Record<Keadaan, string> = { selesai: "selesai", aktif: "sedang berjalan", gagal: "gagal", menunggu: "menunggu" };

function Penanda({ keadaan, nomor }: { keadaan: Keadaan; nomor: number }) {
  if (keadaan === "selesai")
    return (
      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary text-on-primary">
        <Ikon nama="check" ukuran={18} />
      </span>
    );
  if (keadaan === "gagal")
    return (
      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-error text-on-error">
        <Ikon nama="priority_high" ukuran={18} />
      </span>
    );
  if (keadaan === "aktif")
    return (
      <span className="relative grid size-8 shrink-0 place-items-center rounded-full bg-primary-container text-label-large text-on-primary-container">
        <ProgressCircular ukuran={32} tebal={2.5} className="absolute inset-0" />
        {nomor}
      </span>
    );
  return (
    <span className="grid size-8 shrink-0 place-items-center rounded-full border-2 border-outline-variant text-label-large text-on-surface-variant">{nomor}</span>
  );
}

/** Langkah proses (mis. tahap pengolahan PDF: Unggah → Baca teks → Susun topik → Siap). */
export function ProgressSteps({ langkah, aktif, status = "berjalan", label, orientasi = "vertikal", className }: ProgressStepsProps) {
  const keadaanKe = (i: number): Keadaan =>
    status === "selesai" || i < aktif ? "selesai" : i === aktif ? (status === "gagal" ? "gagal" : "aktif") : "menunggu";
  const horizontal = orientasi === "horizontal";
  return (
    <ol aria-label={label} className={cn(horizontal ? "flex items-start" : "flex flex-col", className)}>
      {langkah.map((l, i) => {
        const k = keadaanKe(i);
        const terakhir = i === langkah.length - 1;
        return (
          <li
            key={i}
            aria-current={k === "aktif" ? "step" : undefined}
            className={cn("relative flex", horizontal ? "flex-1 flex-col items-center px-1 text-center" : "gap-4 pb-6 last:pb-0")}
          >
            {!terakhir && (
              <span
                aria-hidden
                className={cn(
                  "absolute",
                  horizontal ? "top-4 left-[calc(50%+24px)] h-0.5 w-[calc(100%-48px)]" : "top-10 bottom-2 left-[15px] w-0.5",
                  k === "selesai" ? "bg-primary" : "bg-outline-variant",
                )}
              />
            )}
            <Penanda keadaan={k} nomor={i + 1} />
            <div className={cn("min-w-0", horizontal ? "mt-2" : "pt-1")}>
              <p className={cn("text-title-small", k === "menunggu" ? "text-on-surface-variant" : k === "gagal" ? "text-error" : "text-on-surface")}>
                {l.label}
                <span className="sr-only"> ({teksKeadaan[k]})</span>
              </p>
              {l.keterangan && <p className="mt-0.5 text-body-small text-on-surface-variant">{l.keterangan}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

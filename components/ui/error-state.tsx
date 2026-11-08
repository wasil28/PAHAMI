import type { ReactNode } from "react";
import { cn } from "@/lib/tema/cn";
import { Ikon } from "./ikon";
import { Tombol } from "./tombol";

export type ErrorStateProps = {
  judul?: ReactNode;
  /** Apa yang terjadi + cara memperbaiki (Panduan §2), ambil dari lib/pesan.ts. */
  teks?: ReactNode;
  /** Handler "Coba lagi" (komponen pemanggil harus client). Untuk muat ulang halaman server, pakai `router.refresh()`. */
  onCobaLagi?: () => void;
  labelCobaLagi?: string;
  /** Aksi tambahan/kustom (mis. TombolLink kembali). */
  aksi?: ReactNode;
  ringkas?: boolean;
  className?: string;
};

/** State error dengan aksi "Coba lagi". */
export function ErrorState({ judul = "Gagal memuat data", teks, onCobaLagi, labelCobaLagi = "Coba lagi", aksi, ringkas, className }: ErrorStateProps) {
  return (
    <div role="alert" className={cn("mx-auto flex max-w-md flex-col items-center text-center", ringkas ? "gap-2 py-6" : "gap-3 py-12", className)}>
      <span className={cn("grid place-items-center rounded-full bg-error-container text-on-error-container", ringkas ? "mb-1 size-14" : "mb-2 size-20")}>
        <Ikon nama="cloud_off" ukuran={ringkas ? 28 : 40} />
      </span>
      <h2 className={cn("text-on-surface", ringkas ? "text-title-medium" : "text-title-large")}>{judul}</h2>
      {teks && <p className="text-body-medium text-on-surface-variant">{teks}</p>}
      {(onCobaLagi || aksi) && (
        <div className="mt-3 flex flex-wrap justify-center gap-2">
          {onCobaLagi && (
            <Tombol varian="tonal" ikon="refresh" onClick={onCobaLagi}>
              {labelCobaLagi}
            </Tombol>
          )}
          {aksi}
        </div>
      )}
    </div>
  );
}

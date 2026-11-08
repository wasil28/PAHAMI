import type { CSSProperties } from "react";
import { cn } from "@/lib/tema/cn";

export type IkonProps = {
  /** Nama Material Symbols (snake_case), mis. "upload", "check_circle". */
  nama: string;
  /** Versi terisi (FILL 1) — dipakai untuk menu aktif/status. */
  isi?: boolean;
  /** Ukuran dalam px (default 24). */
  ukuran?: number;
  /** Bila diisi, ikon dianggap bermakna dan dibacakan pembaca layar. Tanpa label → dekoratif. */
  label?: string;
  className?: string;
};

/** Ikon Material Symbols Rounded. Contoh: `<Ikon nama="upload" />`. */
export function Ikon({ nama, isi = false, ukuran = 24, label, className }: IkonProps) {
  const style: CSSProperties | undefined = ukuran === 24 ? undefined : { fontSize: ukuran };
  return (
    <span
      className={cn("ikon", isi && "ikon-isi", className)}
      style={style}
      {...(label ? { role: "img", "aria-label": label } : { "aria-hidden": true })}
    >
      {nama}
    </span>
  );
}

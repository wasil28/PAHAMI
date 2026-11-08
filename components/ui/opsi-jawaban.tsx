import { useId, type InputHTMLAttributes, type ReactNode, type Ref } from "react";
import { cn } from "@/lib/tema/cn";
import { Ikon } from "./ikon";

/**
 * Status setelah jawaban diperiksa (FT-05):
 * - `netral`: belum diperiksa / opsi lain
 * - `benar`: opsi yang dipilih & benar
 * - `salah`: opsi yang dipilih & salah
 * - `kunci`: jawaban benar yang tidak dipilih (ditunjukkan setelah salah)
 */
export type StatusOpsi = "netral" | "benar" | "salah" | "kunci";

export type OpsiJawabanProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  /** Huruf pilihan, mis. "A". */
  huruf: string;
  label: ReactNode;
  status?: StatusOpsi;
  ref?: Ref<HTMLInputElement>;
  className?: string;
};

const gaya: Record<StatusOpsi, { kartu: string; huruf: string; ikon?: string; teks?: string }> = {
  netral: {
    kartu:
      "border-outline-variant bg-surface-container-low has-checked:border-primary has-checked:bg-primary-container has-checked:text-on-primary-container",
    huruf: "bg-surface-container-highest text-on-surface-variant group-has-checked:bg-primary group-has-checked:text-on-primary",
  },
  benar: { kartu: "border-success bg-success-container text-on-success-container", huruf: "bg-success text-on-success", ikon: "check_circle", teks: "Jawaban benar" },
  salah: { kartu: "border-error bg-error-container text-on-error-container", huruf: "bg-error text-on-error", ikon: "cancel", teks: "Jawaban kamu salah" },
  kunci: { kartu: "border-success border-dashed bg-surface-container-low", huruf: "bg-success-container text-on-success-container", ikon: "check_circle", teks: "Jawaban yang benar" },
};

/**
 * Pilihan jawaban soal pilihan ganda berbentuk kartu (radio native di dalamnya).
 * Status selalu disertai ikon + teks tersembunyi, bukan hanya warna (Panduan §1.9).
 * Bungkus dengan `RadioGroup legend="Soal 1"` dan beri `name` yang sama.
 */
export function OpsiJawaban({ huruf, label, status = "netral", id, className, disabled, ref, ...rest }: OpsiJawabanProps) {
  const autoId = useId();
  const idInput = id ?? autoId;
  const g = gaya[status];
  const terkunci = status !== "netral";
  return (
    <label
      htmlFor={idInput}
      className={cn(
        "group state-layer flex min-h-14 cursor-pointer items-center gap-3 rounded-md border px-4 py-3 text-on-surface transition-colors",
        "has-focus-visible:outline-3 has-focus-visible:outline-offset-2 has-focus-visible:outline-secondary",
        g.kartu,
        (disabled || terkunci) && "cursor-default",
        className,
      )}
    >
      <input ref={ref} id={idInput} type="radio" disabled={disabled} className="sr-only" {...rest} />
      <span className={cn("grid size-8 shrink-0 place-items-center rounded-full text-label-large transition-colors", g.huruf)} aria-hidden>
        {huruf}
      </span>
      <span className="min-w-0 flex-1 text-body-large">{label}</span>
      {g.ikon && <Ikon nama={g.ikon} isi className={status === "salah" ? "text-error" : "text-success"} />}
      {g.teks && <span className="sr-only">({g.teks})</span>}
    </label>
  );
}

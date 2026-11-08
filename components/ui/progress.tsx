import { cn } from "@/lib/tema/cn";

type NadaProgress = "primary" | "success" | "warning" | "error";

const warnaIsi: Record<NadaProgress, string> = {
  primary: "bg-primary",
  success: "bg-success",
  warning: "bg-warning",
  error: "bg-error",
};
const warnaGaris: Record<NadaProgress, string> = {
  primary: "stroke-primary",
  success: "stroke-success",
  warning: "stroke-warning",
  error: "stroke-error",
};

export type ProgressLinearProps = {
  /** 0–100. Kosongkan untuk mode indeterminate (proses tanpa persentase). */
  nilai?: number;
  /** Label aksesibel, mis. "Progres dokumen". */
  label: string;
  nada?: NadaProgress;
  className?: string;
};

/** Linear progress M3: trek `surface-container-highest`, isi `primary` (atau nada status). */
export function ProgressLinear({ nilai, label, nada = "primary", className }: ProgressLinearProps) {
  const tentu = typeof nilai === "number";
  const persen = tentu ? Math.min(100, Math.max(0, nilai)) : 0;
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={tentu ? Math.round(persen) : undefined}
      className={cn("relative h-1 w-full overflow-hidden rounded-full bg-surface-container-highest", className)}
    >
      {tentu ? (
        <div
          className={cn("h-full rounded-full transition-[width] duration-300 ease-standard", warnaIsi[nada])}
          style={{ width: `${persen}%` }}
        />
      ) : (
        <div className={cn("absolute inset-y-0 rounded-full animate-indeterminate", warnaIsi[nada])} />
      )}
    </div>
  );
}

export type ProgressCircularProps = {
  /** 0–100. Kosongkan untuk mode indeterminate (berputar). */
  nilai?: number;
  /** Diameter px (default 40; 20 untuk di dalam tombol). */
  ukuran?: number;
  /** Tebal garis px (default 4). */
  tebal?: number;
  /** Label aksesibel. Kosongkan bila dekoratif (mis. di tombol yang sudah berteks "Memproses…"). */
  label?: string;
  nada?: NadaProgress;
  /** `current` = ikut warna teks (dipakai di tombol). */
  warnaSaatIni?: boolean;
  className?: string;
};

/** Circular progress M3, determinate atau indeterminate. */
export function ProgressCircular({
  nilai,
  ukuran = 40,
  tebal = 4,
  label,
  nada = "primary",
  warnaSaatIni = false,
  className,
}: ProgressCircularProps) {
  const tentu = typeof nilai === "number";
  const r = (ukuran - tebal) / 2;
  const keliling = 2 * Math.PI * r;
  const persen = tentu ? Math.min(100, Math.max(0, nilai)) : 30;
  const garis = warnaSaatIni ? "stroke-current" : warnaGaris[nada];
  return (
    <span
      {...(label
        ? {
            role: "progressbar",
            "aria-label": label,
            "aria-valuemin": 0,
            "aria-valuemax": 100,
            "aria-valuenow": tentu ? Math.round(persen) : undefined,
          }
        : { "aria-hidden": true })}
      className={cn("inline-flex shrink-0", className)}
      style={{ width: ukuran, height: ukuran }}
    >
      <svg viewBox={`0 0 ${ukuran} ${ukuran}`} className={cn("size-full -rotate-90", !tentu && "animate-spin")}>
        {tentu && (
          <circle cx={ukuran / 2} cy={ukuran / 2} r={r} fill="none" strokeWidth={tebal} className="stroke-surface-container-highest" />
        )}
        <circle
          cx={ukuran / 2}
          cy={ukuran / 2}
          r={r}
          fill="none"
          strokeWidth={tebal}
          strokeLinecap="round"
          strokeDasharray={keliling}
          strokeDashoffset={keliling * (1 - persen / 100)}
          className={cn(garis, "transition-[stroke-dashoffset] duration-300")}
        />
      </svg>
    </span>
  );
}

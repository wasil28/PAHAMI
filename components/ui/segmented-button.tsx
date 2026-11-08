import { useId, type ChangeEvent } from "react";
import { cn } from "@/lib/tema/cn";
import { Ikon } from "./ikon";

export type OpsiSegmen = { nilai: string; label: string; ikon?: string };

export type SegmentedButtonProps = {
  /** Label aksesibel kelompok, mis. "Rentang waktu". */
  label: string;
  opsi: OpsiSegmen[];
  /** Nama input (agar ikut terkirim di <form>). */
  name?: string;
  /** Mode terkontrol (wajib bersama onUbah). */
  nilai?: string;
  nilaiAwal?: string;
  onUbah?: (nilai: string) => void;
  className?: string;
};

/**
 * Segmented button M3 pilihan tunggal (2–5 opsi), dibangun dari radio native
 * sehingga bisa dipakai tanpa JS dalam form GET (mis. filter rentang waktu).
 */
export function SegmentedButton({ label, opsi, name, nilai, nilaiAwal, onUbah, className }: SegmentedButtonProps) {
  const id = useId();
  const nama = name ?? id;
  return (
    <div role="radiogroup" aria-label={label} className={cn("inline-flex h-10 w-fit max-w-full self-start overflow-hidden rounded-full border border-outline", className)}>
      {opsi.map((o, i) => {
        const terkontrol = nilai !== undefined;
        return (
          <label
            key={o.nilai}
            className={cn(
              "state-layer relative flex min-w-12 flex-1 cursor-pointer items-center justify-center gap-2 px-3 text-label-large whitespace-nowrap text-on-surface",
              "has-checked:bg-secondary-container has-checked:text-on-secondary-container",
              "has-focus-visible:outline-3 has-focus-visible:-outline-offset-3 has-focus-visible:outline-secondary",
              i > 0 && "border-l border-outline",
            )}
          >
            <input
              type="radio"
              name={nama}
              value={o.nilai}
              className="peer sr-only"
              {...(terkontrol ? { checked: nilai === o.nilai } : { defaultChecked: nilaiAwal === o.nilai })}
              onChange={(e: ChangeEvent<HTMLInputElement>) => onUbah?.(e.target.value)}
              readOnly={terkontrol && !onUbah}
            />
            <Ikon nama="check" ukuran={18} className="hidden peer-checked:inline-block" />
            {o.ikon && <Ikon nama={o.ikon} ukuran={18} className="peer-checked:hidden" />}
            <span>{o.label}</span>
          </label>
        );
      })}
    </div>
  );
}

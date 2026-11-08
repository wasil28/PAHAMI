import { useId, type FieldsetHTMLAttributes, type InputHTMLAttributes, type ReactNode, type Ref } from "react";
import { cn } from "@/lib/tema/cn";

export type RadioProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  label: ReactNode;
  deskripsi?: ReactNode;
  ref?: Ref<HTMLInputElement>;
  className?: string;
};

/** Radio button M3 (native input). Kelompokkan dengan `RadioGroup` atau `name` yang sama. */
export function Radio({ label, deskripsi, id, className, disabled, ref, ...rest }: RadioProps) {
  const autoId = useId();
  const idInput = id ?? autoId;
  return (
    <label htmlFor={idInput} className={cn("flex min-h-12 cursor-pointer items-center gap-3 py-1", disabled && "cursor-not-allowed opacity-38", className)}>
      <span className="state-layer relative grid size-10 shrink-0 place-items-center rounded-full text-on-surface has-checked:text-primary">
        <input
          ref={ref}
          id={idInput}
          type="radio"
          disabled={disabled}
          className="peer size-5 cursor-pointer appearance-none rounded-full border-2 border-on-surface-variant transition-colors checked:border-primary focus-visible:outline-offset-4"
          {...rest}
        />
        <span className="pointer-events-none absolute size-2.5 scale-0 rounded-full bg-primary transition-transform peer-checked:scale-100" />
      </span>
      <span className="min-w-0">
        <span className="block text-body-large text-on-surface">{label}</span>
        {deskripsi && <span className="block text-body-medium text-on-surface-variant">{deskripsi}</span>}
      </span>
    </label>
  );
}

export type RadioGroupProps = FieldsetHTMLAttributes<HTMLFieldSetElement> & {
  /** Judul kelompok (legend) — wajib demi aksesibilitas. */
  legend: ReactNode;
  legendTersembunyi?: boolean;
  error?: ReactNode;
  children: ReactNode;
};

/** Pembungkus fieldset + legend untuk kelompok Radio / OpsiJawaban. */
export function RadioGroup({ legend, legendTersembunyi, error, className, children, ...rest }: RadioGroupProps) {
  return (
    <fieldset className={cn("min-w-0", className)} {...rest}>
      <legend className={cn(legendTersembunyi ? "sr-only" : "mb-2 text-title-medium text-on-surface")}>{legend}</legend>
      <div className="flex flex-col gap-2">{children}</div>
      {error && (
        <p role="alert" className="mt-1 text-body-small text-error">
          {error}
        </p>
      )}
    </fieldset>
  );
}

import { useId, type InputHTMLAttributes, type ReactNode, type Ref } from "react";
import { cn } from "@/lib/tema/cn";
import { Ikon } from "./ikon";

export type CheckboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  label: ReactNode;
  /** Keterangan kecil di bawah label. */
  deskripsi?: ReactNode;
  error?: boolean;
  ref?: Ref<HTMLInputElement>;
  className?: string;
};

/** Checkbox M3 berbasis input native (bisa dipakai di Server Component & form biasa). */
export function Checkbox({ label, deskripsi, error, id, className, disabled, ref, ...rest }: CheckboxProps) {
  const autoId = useId();
  const idInput = id ?? autoId;
  return (
    <label
      htmlFor={idInput}
      className={cn("flex min-h-12 cursor-pointer items-center gap-3 py-1", disabled && "cursor-not-allowed opacity-38", className)}
    >
      <span className="state-layer relative grid size-10 shrink-0 place-items-center rounded-full text-on-surface has-checked:text-primary">
        <input
          ref={ref}
          id={idInput}
          type="checkbox"
          disabled={disabled}
          aria-invalid={error || undefined}
          className={cn(
            "peer size-[18px] cursor-pointer appearance-none rounded-[2px] border-2 transition-colors focus-visible:outline-offset-4",
            error ? "border-error checked:bg-error" : "border-on-surface-variant checked:border-primary checked:bg-primary",
          )}
          {...rest}
        />
        <Ikon
          nama="check"
          ukuran={16}
          className="pointer-events-none absolute text-on-primary opacity-0 [font-variation-settings:'wght'_700] peer-checked:opacity-100"
        />
      </span>
      <span className="min-w-0">
        <span className="block text-body-large text-on-surface">{label}</span>
        {deskripsi && <span className="block text-body-medium text-on-surface-variant">{deskripsi}</span>}
      </span>
    </label>
  );
}

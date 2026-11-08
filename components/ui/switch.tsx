import { useId, type InputHTMLAttributes, type ReactNode, type Ref } from "react";
import { cn } from "@/lib/tema/cn";
import { Ikon } from "./ikon";

export type SwitchProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  label: ReactNode;
  deskripsi?: ReactNode;
  ref?: Ref<HTMLInputElement>;
  className?: string;
};

/** Switch M3 (input checkbox `role="switch"`), label di kiri, switch di kanan. */
export function Switch({ label, deskripsi, id, className, disabled, ref, ...rest }: SwitchProps) {
  const autoId = useId();
  const idInput = id ?? autoId;
  return (
    <label htmlFor={idInput} className={cn("flex min-h-12 cursor-pointer items-center justify-between gap-4", disabled && "cursor-not-allowed opacity-38", className)}>
      <span className="min-w-0">
        <span className="block text-body-large text-on-surface">{label}</span>
        {deskripsi && <span className="block text-body-medium text-on-surface-variant">{deskripsi}</span>}
      </span>
      <span className="relative inline-flex h-8 w-13 shrink-0 items-center">
        <input
          ref={ref}
          id={idInput}
          type="checkbox"
          role="switch"
          disabled={disabled}
          className="peer absolute inset-0 cursor-pointer appearance-none rounded-full border-2 border-outline bg-surface-container-highest transition-colors checked:border-primary checked:bg-primary"
          {...rest}
        />
        <span className="pointer-events-none absolute left-2 grid size-4 place-items-center rounded-full bg-outline transition-all duration-200 ease-standard peer-checked:left-6 peer-checked:size-6 peer-checked:bg-on-primary peer-checked:[&>span]:opacity-100 peer-active:size-7">
          <Ikon nama="check" ukuran={16} className="text-on-primary-container opacity-0 transition-opacity" />
        </span>
      </span>
    </label>
  );
}

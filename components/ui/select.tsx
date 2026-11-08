import { useId, type ReactNode, type Ref, type SelectHTMLAttributes } from "react";
import { cn } from "@/lib/tema/cn";
import { Ikon } from "./ikon";
import { IkonField, LabelField, TeksPendukung, kelasWadahField, type VarianField } from "./field-dasar";

export type OpsiSelect = { nilai: string; label: string; nonaktif?: boolean };

export type SelectProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, "children"> & {
  label: ReactNode;
  opsi: OpsiSelect[];
  /** Teks opsi kosong pertama (mis. "Pilih dokumen"). */
  placeholder?: string;
  varian?: VarianField;
  teksPendukung?: ReactNode;
  error?: ReactNode;
  ikonDepan?: string;
  ref?: Ref<HTMLSelectElement>;
  className?: string;
};

/** Select native bergaya M3 (aksesibel & ramah HP). */
export function Select({
  label,
  opsi,
  placeholder,
  varian = "outlined",
  teksPendukung,
  error,
  ikonDepan,
  id,
  required,
  disabled,
  className,
  ref,
  ...rest
}: SelectProps) {
  const autoId = useId();
  const idInput = id ?? autoId;
  const idPendukung = `${idInput}-pendukung`;
  const adaError = Boolean(error);
  return (
    <div className={cn("w-full", className)}>
      <LabelField htmlFor={idInput} error={adaError} wajib={required}>
        {label}
      </LabelField>
      <div className={cn(kelasWadahField(varian, adaError, disabled), "h-14 pl-4")}>
        {ikonDepan && <IkonField nama={ikonDepan} error={adaError} />}
        <select
          ref={ref}
          id={idInput}
          required={required}
          disabled={disabled}
          aria-invalid={adaError || undefined}
          aria-describedby={error || teksPendukung ? idPendukung : undefined}
          className="h-full min-w-0 flex-1 cursor-pointer appearance-none bg-transparent pr-12 text-body-large text-on-surface outline-none focus-visible:outline-none"
          {...rest}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {opsi.map((o) => (
            <option key={o.nilai} value={o.nilai} disabled={o.nonaktif}>
              {o.label}
            </option>
          ))}
        </select>
        <Ikon nama="arrow_drop_down" className="pointer-events-none absolute right-3 text-on-surface-variant" />
      </div>
      <TeksPendukung id={idPendukung} error={error} teks={teksPendukung} />
    </div>
  );
}

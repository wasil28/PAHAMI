"use client";

import { useId, useState, type ReactNode, type Ref, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/tema/cn";
import { LabelField, TeksPendukung, kelasInputField, kelasWadahField, type VarianField } from "./field-dasar";

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: ReactNode;
  /** Sembunyikan label secara visual (tetap dibacakan), mis. kolom tanya AI. */
  labelTersembunyi?: boolean;
  varian?: VarianField;
  teksPendukung?: ReactNode;
  error?: ReactNode;
  penghitung?: boolean;
  /** Tinggi menyesuaikan isi (CSS field-sizing) hingga `maxBaris`. */
  otomatis?: boolean;
  ref?: Ref<HTMLTextAreaElement>;
  className?: string;
};

/** Textarea M3 dengan label, teks pendukung/error, dan penghitung karakter. */
export function Textarea({
  label,
  labelTersembunyi,
  varian = "outlined",
  teksPendukung,
  error,
  penghitung,
  otomatis,
  id,
  rows = 4,
  maxLength,
  required,
  disabled,
  className,
  onChange,
  ref,
  ...rest
}: TextareaProps) {
  const autoId = useId();
  const idInput = id ?? autoId;
  const idPendukung = `${idInput}-pendukung`;
  const [panjang, setPanjang] = useState(() => String(rest.value ?? rest.defaultValue ?? "").length);
  const panjangTampil = rest.value !== undefined ? String(rest.value).length : panjang;
  const adaError = Boolean(error);

  return (
    <div className={cn("w-full", className)}>
      {labelTersembunyi ? (
        <label htmlFor={idInput} className="sr-only">
          {label}
        </label>
      ) : (
        <LabelField htmlFor={idInput} error={adaError} wajib={required}>
          {label}
        </LabelField>
      )}
      <div className={cn(kelasWadahField(varian, adaError, disabled), "px-4 py-3")}>
        <textarea
          ref={ref}
          id={idInput}
          rows={rows}
          maxLength={maxLength}
          required={required}
          disabled={disabled}
          aria-invalid={adaError || undefined}
          aria-describedby={error || teksPendukung || penghitung ? idPendukung : undefined}
          className={cn(kelasInputField, "resize-none scrollbar-tipis", otomatis && "field-sizing-content max-h-60")}
          onChange={(e) => {
            setPanjang(e.target.value.length);
            onChange?.(e);
          }}
          {...rest}
        />
      </div>
      <TeksPendukung
        id={idPendukung}
        error={error}
        teks={teksPendukung}
        penghitung={penghitung && maxLength ? `${panjangTampil}/${maxLength}` : undefined}
      />
    </div>
  );
}

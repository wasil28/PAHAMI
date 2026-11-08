"use client";

import { useId, useState, type InputHTMLAttributes, type ReactNode, type Ref } from "react";
import { cn } from "@/lib/tema/cn";
import { IkonField, LabelField, TeksPendukung, kelasInputField, kelasWadahField, type VarianField } from "./field-dasar";
import { IconButton } from "./icon-button";

export type TextFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, "size"> & {
  label: ReactNode;
  varian?: VarianField;
  /** Teks bantuan di bawah kolom. */
  teksPendukung?: ReactNode;
  /** Pesan error (menggantikan teks pendukung, kolom ditandai `aria-invalid`). */
  error?: ReactNode;
  /** Tampilkan penghitung "x/maxLength" (butuh `maxLength`). */
  penghitung?: boolean;
  ikonDepan?: string;
  /** Ikon/elemen di kanan (diabaikan untuk type="password", yang memakai toggle mata). */
  ikonBelakang?: string | ReactNode;
  ref?: Ref<HTMLInputElement>;
  className?: string;
};

/**
 * Text field M3 dengan label di atas. `type="password"` otomatis punya tombol
 * tampilkan/sembunyikan sandi (aria-pressed, area sentuh 48dp).
 */
export function TextField({
  label,
  varian = "outlined",
  teksPendukung,
  error,
  penghitung,
  ikonDepan,
  ikonBelakang,
  id,
  type = "text",
  maxLength,
  required,
  disabled,
  className,
  onChange,
  ref,
  ...rest
}: TextFieldProps) {
  const autoId = useId();
  const idInput = id ?? autoId;
  const idPendukung = `${idInput}-pendukung`;
  const [tampilSandi, setTampilSandi] = useState(false);
  const [panjang, setPanjang] = useState(() => String(rest.value ?? rest.defaultValue ?? "").length);
  const isSandi = type === "password";
  const adaError = Boolean(error);
  const panjangTampil = rest.value !== undefined ? String(rest.value).length : panjang;

  return (
    <div className={cn("w-full", className)}>
      <LabelField htmlFor={idInput} error={adaError} wajib={required}>
        {label}
      </LabelField>
      <div className={cn(kelasWadahField(varian, adaError, disabled), "h-14 px-4", (isSandi || ikonBelakang) && "pr-1")}>
        {ikonDepan && <IkonField nama={ikonDepan} error={adaError} />}
        <input
          ref={ref}
          id={idInput}
          type={isSandi && tampilSandi ? "text" : type}
          maxLength={maxLength}
          required={required}
          disabled={disabled}
          aria-invalid={adaError || undefined}
          aria-describedby={error || teksPendukung || penghitung ? idPendukung : undefined}
          className={cn(kelasInputField, "h-full")}
          onChange={(e) => {
            setPanjang(e.target.value.length);
            onChange?.(e);
          }}
          {...rest}
        />
        {isSandi ? (
          <IconButton
            ikon={tampilSandi ? "visibility_off" : "visibility"}
            label={tampilSandi ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
            terpilih={tampilSandi}
            onClick={() => setTampilSandi((v) => !v)}
            disabled={disabled}
          />
        ) : typeof ikonBelakang === "string" ? (
          <span className="mr-3">
            <IkonField nama={ikonBelakang} error={adaError} />
          </span>
        ) : (
          ikonBelakang
        )}
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

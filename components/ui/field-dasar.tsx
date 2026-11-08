import type { ReactNode } from "react";
import { cn } from "@/lib/tema/cn";
import { Ikon } from "./ikon";

/*
 * Bagian bersama TextField/Textarea/Select: label di atas (Panduan §1.8 "label di atas,
 * pesan error di bawah"), wadah outlined/filled, dan baris teks pendukung + penghitung.
 */

export type VarianField = "outlined" | "filled";

export function kelasWadahField(varian: VarianField, error: boolean, nonaktif?: boolean) {
  return cn(
    "group/field relative flex w-full items-center gap-3 text-on-surface transition-colors",
    varian === "outlined"
      ? cn(
          "rounded-sm border bg-transparent",
          error
            ? "border-error focus-within:border-2 focus-within:border-error"
            : "border-outline hover:border-on-surface focus-within:border-2 focus-within:border-primary focus-within:hover:border-primary",
        )
      : cn(
          "rounded-t-sm border-b bg-surface-container-highest",
          error ? "border-error focus-within:border-b-2" : "border-on-surface-variant focus-within:border-b-2 focus-within:border-primary",
        ),
    nonaktif && "pointer-events-none opacity-60",
  );
}

/** Elemen input sendiri tidak punya outline; fokus ditandai oleh garis wadah. */
export const kelasInputField =
  "min-w-0 flex-1 bg-transparent text-body-large text-on-surface outline-none placeholder:text-on-surface-variant/70 focus-visible:outline-none disabled:cursor-not-allowed";

export function LabelField({ htmlFor, children, error, wajib }: { htmlFor: string; children: ReactNode; error?: boolean; wajib?: boolean }) {
  return (
    <label htmlFor={htmlFor} className={cn("mb-1.5 block text-label-large", error ? "text-error" : "text-on-surface-variant")}>
      {children}
      {wajib && (
        <span aria-hidden className="text-error">
          {" "}
          *
        </span>
      )}
    </label>
  );
}

export function IkonField({ nama, error }: { nama: string; error?: boolean }) {
  return <Ikon nama={nama} className={cn(error ? "text-error" : "text-on-surface-variant")} />;
}

export function TeksPendukung({
  id,
  error,
  teks,
  penghitung,
}: {
  id: string;
  error?: ReactNode;
  teks?: ReactNode;
  penghitung?: string;
}) {
  if (!error && !teks && !penghitung) return null;
  return (
    <div className="mt-1 flex gap-4 px-4 text-body-small">
      <p id={id} className={cn("flex-1", error ? "flex items-start gap-1 text-error" : "text-on-surface-variant")} {...(error ? { role: "alert" } : {})}>
        {error ? (
          <>
            <Ikon nama="error" ukuran={16} isi />
            <span>{error}</span>
          </>
        ) : (
          teks
        )}
      </p>
      {penghitung && (
        <span className="shrink-0 tabular-nums text-on-surface-variant" aria-live="polite">
          {penghitung}
        </span>
      )}
    </div>
  );
}

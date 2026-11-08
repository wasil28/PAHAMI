"use client";

import { useEffect, useId, useRef, useState } from "react";
import { IconButton, Tombol, formatUkuranFile } from "@/components/ui";
import { LAMPIRAN_QC_TIPE } from "@/lib/qc/tipe";
import { TEKS_QC } from "./teks";

type Props = {
  file: File | null;
  onUbah: (file: File | null) => void;
  error?: string | null;
  disabled?: boolean;
};

/**
 * Lampiran screenshot opsional: pilih file atau tempel dari clipboard (penanganan paste ada di
 * form induk agar berlaku di seluruh dialog). Pratinjau memakai object URL yang dicabut saat berganti.
 */
export function FieldScreenshot({ file, onUbah, error, disabled }: Props) {
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [pratinjau, setPratinjau] = useState<string | null>(null);

  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    // Sinkron dengan sumber eksternal (object URL); dicabut saat file berganti/dilepas.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPratinjau(url);
    return () => {
      URL.revokeObjectURL(url);
      setPratinjau(null);
    };
  }, [file]);

  return (
    <div className="flex flex-col gap-2">
      <span id={`${id}-label`} className="-mb-0.5 text-label-large text-on-surface-variant">
        {TEKS_QC.screenshot}
      </span>
      <input
        ref={inputRef}
        id={id}
        type="file"
        accept={LAMPIRAN_QC_TIPE.join(",")}
        className="sr-only"
        aria-labelledby={`${id}-label`}
        disabled={disabled}
        onChange={(e) => {
          onUbah(e.target.files?.[0] ?? null);
          e.target.value = ""; // agar memilih file yang sama lagi tetap memicu onChange
        }}
      />
      {file && pratinjau ? (
        <div className="flex items-center gap-3 rounded-md border border-outline-variant p-2">
          {/* eslint-disable-next-line @next/next/no-img-element -- object URL lokal, bukan aset statis */}
          <img src={pratinjau} alt={TEKS_QC.pratinjauScreenshot} className="h-16 w-24 shrink-0 rounded-xs bg-surface-container object-cover" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-body-medium text-on-surface">{file.name || "clipboard.png"}</p>
            <p className="text-body-small text-on-surface-variant">{formatUkuranFile(file.size)}</p>
          </div>
          <IconButton ikon="close" label={TEKS_QC.hapusScreenshot} onClick={() => onUbah(null)} disabled={disabled} />
        </div>
      ) : (
        <div>
          <Tombol varian="outlined" ukuran="sm" ikon="add_photo_alternate" onClick={() => inputRef.current?.click()} disabled={disabled}>
            {TEKS_QC.pilihGambar}
          </Tombol>
        </div>
      )}
      {error ? (
        <p role="alert" className="text-body-small text-error">
          {error}
        </p>
      ) : (
        <p className="text-body-small text-on-surface-variant">{TEKS_QC.petunjukScreenshot}</p>
      )}
    </div>
  );
}

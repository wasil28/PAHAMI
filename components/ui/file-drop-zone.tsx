"use client";

import { useId, useRef, useState, type DragEvent, type ReactNode } from "react";
import { cn } from "@/lib/tema/cn";
import { Ikon } from "./ikon";
import { IconButton } from "./icon-button";
import { formatUkuranFile } from "@/lib/tema/format";

export type FileDropZoneProps = {
  /** Atribut accept input file, mis. "application/pdf". */
  accept?: string;
  /** Nama input agar ikut terkirim di <form> (opsional). */
  name?: string;
  /** Judul area, mis. "Pilih atau seret file PDF ke sini". */
  judul?: ReactNode;
  /** Teks bantuan, mis. "PDF berteks, maks. 20 MB · 300 halaman". */
  teksBantuan?: ReactNode;
  /** Dipanggil saat file dipilih/diganti (null saat dihapus). Validasi ukuran/tipe dilakukan pemanggil. */
  onPilih?: (file: File | null) => void;
  /** Pesan error dari validasi pemanggil (lib/pesan.ts). */
  error?: ReactNode;
  nonaktif?: boolean;
  className?: string;
};

/** Area unggah: klik atau seret-lepas satu file; menampilkan file terpilih + tombol hapus. */
export function FileDropZone({
  accept = "application/pdf",
  name,
  judul = "Pilih atau seret file PDF ke sini",
  teksBantuan,
  onPilih,
  error,
  nonaktif,
  className,
}: FileDropZoneProps) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [seret, setSeret] = useState(false);

  const ganti = (f: File | null) => {
    setFile(f);
    onPilih?.(f);
    if (!f && input.current) input.current.value = "";
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setSeret(false);
    if (nonaktif) return;
    const f = e.dataTransfer.files[0];
    if (!f) return;
    // Sinkronkan ke input agar ikut terkirim bila dipakai dalam <form>.
    if (input.current) {
      const dt = new DataTransfer();
      dt.items.add(f);
      input.current.files = dt.files;
    }
    ganti(f);
  };

  return (
    <div className={className}>
      <input
        ref={input}
        id={id}
        type="file"
        name={name}
        accept={accept}
        disabled={nonaktif}
        className="sr-only"
        aria-describedby={`${id}-bantuan`}
        aria-invalid={error ? true : undefined}
        onChange={(e) => ganti(e.target.files?.[0] ?? null)}
      />
      {file ? (
        <div className={cn("flex items-center gap-3 rounded-lg border p-3 pl-4", error ? "border-error bg-error-container/40" : "border-outline-variant bg-surface-container-low")}>
          <span className="grid size-12 shrink-0 place-items-center rounded-md bg-primary-container text-on-primary-container">
            <Ikon nama="picture_as_pdf" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-title-small text-on-surface">{file.name}</p>
            <p className="text-body-small text-on-surface-variant">{formatUkuranFile(file.size)}</p>
          </div>
          <label htmlFor={id} className={cn("state-layer relative cursor-pointer rounded-full px-3 py-2.5 text-label-large text-primary", nonaktif && "pointer-events-none opacity-38")}>
            Ganti
          </label>
          <IconButton ikon="close" label="Hapus file terpilih" onClick={() => ganti(null)} disabled={nonaktif} />
        </div>
      ) : (
        <label
          htmlFor={id}
          onDragOver={(e) => {
            e.preventDefault();
            if (!nonaktif) setSeret(true);
          }}
          onDragLeave={() => setSeret(false)}
          onDrop={onDrop}
          data-seret={seret}
          className={cn(
            "state-layer relative flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed px-6 py-10 text-center transition-colors",
            "has-focus-visible:outline-3 has-focus-visible:outline-offset-2 has-focus-visible:outline-secondary",
            seret ? "border-primary bg-primary-container/50 text-primary" : error ? "border-error text-on-surface" : "border-outline-variant text-on-surface",
            nonaktif && "pointer-events-none opacity-38",
          )}
        >
          <span className="mb-1 grid size-14 place-items-center rounded-full bg-secondary-container text-on-secondary-container">
            <Ikon nama={seret ? "file_download" : "upload_file"} ukuran={28} />
          </span>
          <span className="text-title-medium text-on-surface">{seret ? "Lepaskan untuk memilih file" : judul}</span>
          <span className="text-label-large text-primary">atau klik untuk memilih</span>
        </label>
      )}
      <p id={`${id}-bantuan`} className={cn("mt-2 px-4 text-body-small", error ? "flex items-start gap-1 text-error" : "text-on-surface-variant")} {...(error ? { role: "alert" } : {})}>
        {error ? (
          <>
            <Ikon nama="error" ukuran={16} isi />
            <span>{error}</span>
          </>
        ) : (
          teksBantuan
        )}
      </p>
    </div>
  );
}

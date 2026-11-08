"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { cn } from "@/lib/tema/cn";
import { Ikon } from "./ikon";
import { Tombol } from "./tombol";

export type DialogProps = {
  terbuka: boolean;
  /** Dipanggil saat Esc, klik latar, atau tombol tutup. */
  onTutup: () => void;
  judul: ReactNode;
  /** Ikon hero di atas judul (judul jadi rata tengah, gaya M3). */
  ikon?: string;
  /** Warna ikon hero; `error` untuk aksi berbahaya. */
  nadaIkon?: "secondary" | "error";
  children?: ReactNode;
  /** Tombol aksi di kanan bawah (urutan: Batal lalu aksi utama). */
  aksi?: ReactNode;
  /** Lebar maksimum: `sm` 400px (konfirmasi), `md` 560px (form). */
  lebar?: "sm" | "md";
  /** Cegah tutup lewat Esc/latar (mis. saat sedang menyimpan). */
  kunci?: boolean;
  className?: string;
};

/**
 * Dialog modal M3 memakai elemen <dialog> native: fokus terkunci di dalam,
 * Esc menutup, fokus kembali ke pemicu saat ditutup.
 */
export function Dialog({ terbuka, onTutup, judul, ikon, nadaIkon = "secondary", children, aksi, lebar = "sm", kunci, className }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const idJudul = useId();
  const idIsi = useId();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (terbuka && !el.open) el.showModal();
    if (!terbuka && el.open) el.close();
  }, [terbuka]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={idJudul}
      aria-describedby={children ? idIsi : undefined}
      onCancel={(e) => {
        e.preventDefault();
        if (!kunci) onTutup();
      }}
      onClick={(e) => {
        // Klik di luar panel (pada ::backdrop) → target adalah <dialog> itu sendiri.
        if (e.target === e.currentTarget && !kunci) onTutup();
      }}
      className={cn(
        "m-auto w-[calc(100%-48px)] rounded-xl bg-surface-container-high p-0 text-on-surface shadow-3",
        "open:animate-masuk backdrop:backdrop-blur-[1px]",
        lebar === "sm" ? "max-w-[400px]" : "max-w-[560px]",
        className,
      )}
    >
      <div className="flex max-h-[calc(100dvh-96px)] flex-col p-6">
        {ikon && (
          <Ikon nama={ikon} className={cn("mx-auto mb-4", nadaIkon === "error" ? "text-error" : "text-secondary")} />
        )}
        <h2 id={idJudul} className={cn("text-headline-small text-on-surface", ikon && "text-center")}>
          {judul}
        </h2>
        {children && (
          <div id={idIsi} className="scrollbar-tipis -mx-6 mt-4 overflow-y-auto px-6 text-body-medium text-on-surface-variant">
            {children}
          </div>
        )}
        {aksi && <div className="mt-6 flex flex-wrap justify-end gap-2">{aksi}</div>}
      </div>
    </dialog>
  );
}

export type ConfirmDialogProps = {
  terbuka: boolean;
  onTutup: () => void;
  onKonfirmasi: () => void;
  judul: ReactNode;
  pesan: ReactNode;
  /** Kata kerja jelas, mis. "Hapus permanen" (Panduan §2). */
  labelKonfirmasi: string;
  labelBatal?: string;
  /** Aksi destruktif: ikon & tombol warna error. */
  berbahaya?: boolean;
  ikon?: string;
  memuat?: boolean;
  teksMemuat?: string;
};

/** Dialog konfirmasi siap pakai (mis. hapus dokumen, nonaktifkan akun). */
export function ConfirmDialog({
  terbuka,
  onTutup,
  onKonfirmasi,
  judul,
  pesan,
  labelKonfirmasi,
  labelBatal = "Batal",
  berbahaya,
  ikon,
  memuat,
  teksMemuat,
}: ConfirmDialogProps) {
  return (
    <Dialog
      terbuka={terbuka}
      onTutup={onTutup}
      judul={judul}
      ikon={ikon ?? (berbahaya ? "delete" : undefined)}
      nadaIkon={berbahaya ? "error" : "secondary"}
      kunci={memuat}
      aksi={
        <>
          <Tombol varian="text" onClick={onTutup} disabled={memuat}>
            {labelBatal}
          </Tombol>
          <Tombol varian={berbahaya ? "danger" : "filled"} onClick={onKonfirmasi} memuat={memuat} teksMemuat={teksMemuat}>
            {labelKonfirmasi}
          </Tombol>
        </>
      }
    >
      {pesan}
    </Dialog>
  );
}

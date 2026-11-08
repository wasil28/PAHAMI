"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { cn } from "@/lib/tema/cn";
import { Ikon } from "./ikon";
import { IconButton } from "./icon-button";

export type ItemMenu = {
  label: string;
  ikon?: string;
  /** Aksi saat dipilih (diabaikan bila `href` diisi). */
  onPilih?: () => void;
  href?: string;
  /** Aksi berbahaya (mis. Hapus) → warna error. */
  berbahaya?: boolean;
  nonaktif?: boolean;
};

const PILIH_ITEM = "[role=menuitem]:not([aria-disabled=true])";

function fokusItem(daftar: HTMLElement | null, i: number) {
  const el = daftar?.querySelectorAll<HTMLElement>(PILIH_ITEM);
  if (el && el.length) el[(i + el.length) % el.length].focus();
}

export type MenuProps = {
  item: ItemMenu[];
  /** Label tombol pemicu, mis. "Opsi dokumen". */
  label: string;
  ikonPemicu?: string;
  /** Sisi rata menu terhadap pemicu. */
  rata?: "kanan" | "kiri";
  className?: string;
};

/** Menu dropdown M3 dengan pemicu icon button (default ⋮). Keyboard: ↑ ↓ Home End Esc. */
export function Menu({ item, label, ikonPemicu = "more_vert", rata = "kanan", className }: MenuProps) {
  const [buka, setBuka] = useState(false);
  const id = useId();
  const wadah = useRef<HTMLDivElement>(null);
  const daftar = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!buka) return;
    fokusItem(daftar.current, 0);
    const luar = (e: PointerEvent) => {
      if (!wadah.current?.contains(e.target as Node)) setBuka(false);
    };
    document.addEventListener("pointerdown", luar);
    return () => document.removeEventListener("pointerdown", luar);
  }, [buka]);

  const tutup = () => {
    setBuka(false);
    wadah.current?.querySelector<HTMLElement>("button")?.focus();
  };

  const onKey = (e: KeyboardEvent) => {
    const d = daftar.current;
    const el = Array.from(d?.querySelectorAll<HTMLElement>(PILIH_ITEM) ?? []);
    const i = el.indexOf(document.activeElement as HTMLElement);
    if (e.key === "ArrowDown") fokusItem(d, i + 1);
    else if (e.key === "ArrowUp") fokusItem(d, i - 1);
    else if (e.key === "Home") fokusItem(d, 0);
    else if (e.key === "End") fokusItem(d, -1);
    else if (e.key === "Escape" || e.key === "Tab") tutup();
    else return;
    e.preventDefault();
  };

  return (
    <div ref={wadah} className={cn("relative inline-flex", className)}>
      <IconButton
        ikon={ikonPemicu}
        label={label}
        aria-haspopup="menu"
        aria-expanded={buka}
        aria-controls={buka ? id : undefined}
        onClick={() => setBuka((b) => !b)}
      />
      {buka && (
        <div
          ref={daftar}
          id={id}
          role="menu"
          aria-label={label}
          onKeyDown={onKey}
          className={cn(
            "absolute top-full z-40 mt-1 min-w-[180px] max-w-[280px] animate-masuk rounded-xs bg-surface-container py-2 shadow-2",
            rata === "kanan" ? "right-0" : "left-0",
          )}
        >
          {item.map((it) => {
            const kelas = cn(
              "state-layer relative flex h-12 w-full items-center gap-3 px-3 text-left text-label-large focus-visible:-outline-offset-2",
              it.berbahaya ? "text-error" : "text-on-surface",
              it.nonaktif && "pointer-events-none opacity-38",
            );
            const isi = (
              <>
                {it.ikon && <Ikon nama={it.ikon} className={it.berbahaya ? "text-error" : "text-on-surface-variant"} />}
                <span className="truncate">{it.label}</span>
              </>
            );
            return it.href ? (
              <Link key={it.label} href={it.href} role="menuitem" tabIndex={-1} aria-disabled={it.nonaktif || undefined} className={kelas} onClick={() => setBuka(false)}>
                {isi}
              </Link>
            ) : (
              <button
                key={it.label}
                type="button"
                role="menuitem"
                tabIndex={-1}
                aria-disabled={it.nonaktif || undefined}
                className={kelas}
                onClick={() => {
                  tutup();
                  it.onPilih?.();
                }}
              >
                {isi}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

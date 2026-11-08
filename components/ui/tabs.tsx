"use client";

import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { cn } from "@/lib/tema/cn";
import { Ikon } from "./ikon";

export type ItemTab = { id: string; label: string; ikon?: string; konten: ReactNode };

export type TabsProps = {
  tab: ItemTab[];
  /** id tab awal (uncontrolled). */
  awal?: string;
  /** Mode terkontrol. */
  aktif?: string;
  onUbah?: (id: string) => void;
  /** `primary` (indikator di bawah konten label) atau `secondary` (indikator selebar tab). */
  varian?: "primary" | "secondary";
  /** Label aksesibel daftar tab. */
  label: string;
  className?: string;
  /** Kelas untuk panel konten. */
  kelasPanel?: string;
};

/**
 * Tabs M3 (mis. "Materi / Tanya AI" di HP). Panel tidak aktif hanya disembunyikan
 * (`hidden`), sehingga state di dalamnya (riwayat chat, posisi gulir) tetap terjaga.
 * Keyboard: ← → Home End.
 */
export function Tabs({ tab, awal, aktif, onUbah, varian = "primary", label, className, kelasPanel }: TabsProps) {
  const dasar = useId();
  const [internal, setInternal] = useState(awal ?? tab[0]?.id);
  const pilihan = aktif ?? internal;
  const refTombol = useRef<(HTMLButtonElement | null)[]>([]);

  const pilih = (id: string) => {
    setInternal(id);
    onUbah?.(id);
  };

  const onKey = (e: KeyboardEvent, i: number) => {
    const n = tab.length;
    const target = { ArrowRight: (i + 1) % n, ArrowLeft: (i - 1 + n) % n, Home: 0, End: n - 1 }[e.key];
    if (target === undefined) return;
    e.preventDefault();
    refTombol.current[target]?.focus();
    pilih(tab[target].id);
  };

  return (
    <div className={className}>
      <div role="tablist" aria-label={label} className="flex border-b border-surface-variant">
        {tab.map((t, i) => {
          const dipilih = t.id === pilihan;
          return (
            <button
              key={t.id}
              ref={(el) => {
                refTombol.current[i] = el;
              }}
              role="tab"
              type="button"
              id={`${dasar}-tab-${t.id}`}
              aria-selected={dipilih}
              aria-controls={`${dasar}-panel-${t.id}`}
              tabIndex={dipilih ? 0 : -1}
              onClick={() => pilih(t.id)}
              onKeyDown={(e) => onKey(e, i)}
              className={cn(
                "state-layer relative flex h-12 flex-1 items-center justify-center gap-2 px-4 text-title-small transition-colors focus-visible:-outline-offset-3",
                dipilih ? (varian === "primary" ? "text-primary" : "text-on-surface") : "text-on-surface-variant",
              )}
            >
              <span className="relative flex h-full items-center gap-2">
                {t.ikon && <Ikon nama={t.ikon} isi={dipilih} ukuran={20} />}
                {t.label}
                {dipilih && varian === "primary" && <span className="absolute inset-x-0.5 bottom-0 h-[3px] rounded-t-full bg-primary" />}
              </span>
              {dipilih && varian === "secondary" && <span className="absolute inset-x-0 bottom-0 h-0.5 bg-primary" />}
            </button>
          );
        })}
      </div>
      {tab.map((t) => (
        <div
          key={t.id}
          role="tabpanel"
          id={`${dasar}-panel-${t.id}`}
          aria-labelledby={`${dasar}-tab-${t.id}`}
          hidden={t.id !== pilihan}
          tabIndex={0}
          className={cn("focus-visible:outline-offset-[-3px]", kelasPanel)}
        >
          {t.konten}
        </div>
      ))}
    </div>
  );
}

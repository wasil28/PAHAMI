"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/tema/cn";
import { Ikon } from "./ikon";

export type OpsiSnackbar = {
  pesan: string;
  /** Teks tombol aksi, mis. "Urungkan". */
  labelAksi?: string;
  onAksi?: () => void;
  /** Durasi ms (default 4000; 0 = tidak hilang otomatis). Dengan aksi minimal 6000. */
  durasi?: number;
  /** Tampilkan tombol tutup (X). */
  bisaDitutup?: boolean;
};

type ItemSnackbar = OpsiSnackbar & { id: number };
type NilaiKonteks = { tampilkan: (opsi: OpsiSnackbar | string) => void; tutup: () => void };

const KonteksSnackbar = createContext<NilaiKonteks | null>(null);

/**
 * Penyedia snackbar (sudah dipasang di app/layout.tsx). Satu snackbar tampil
 * sekaligus; yang baru menggantikan yang lama (perilaku M3).
 */
export function SnackbarProvider({ children }: { children: ReactNode }) {
  const [item, setItem] = useState<ItemSnackbar | null>(null);
  const idRef = useRef(0);

  const tutup = useCallback(() => setItem(null), []);
  const tampilkan = useCallback((opsi: OpsiSnackbar | string) => {
    const o = typeof opsi === "string" ? { pesan: opsi } : opsi;
    idRef.current += 1;
    setItem({ ...o, id: idRef.current });
  }, []);

  useEffect(() => {
    if (!item) return;
    const durasi = item.durasi ?? (item.labelAksi ? 6000 : 4000);
    if (durasi === 0) return;
    const t = setTimeout(() => setItem((s) => (s?.id === item.id ? null : s)), durasi);
    return () => clearTimeout(t);
  }, [item]);

  const nilai = useMemo(() => ({ tampilkan, tutup }), [tampilkan, tutup]);

  return (
    <KonteksSnackbar.Provider value={nilai}>
      {children}
      {/* Wilayah live selalu ada agar pembaca layar mengumumkan pesan baru. Di atas bar navigasi (compact). */}
      <div
        aria-live="polite"
        role="status"
        className="pointer-events-none fixed inset-x-0 bottom-[calc(80px+16px+env(safe-area-inset-bottom))] z-50 flex justify-center px-4 medium:bottom-6 medium:justify-start medium:pl-28 expanded:pl-[304px]"
      >
        {item && (
          <div
            key={item.id}
            className={cn(
              "pointer-events-auto flex min-h-12 w-full max-w-[560px] animate-masuk items-center gap-2 rounded-xs bg-inverse-surface py-1 pl-4 pr-2 text-body-medium text-inverse-on-surface shadow-3",
              !item.labelAksi && !item.bisaDitutup && "pr-4",
            )}
          >
            <p className="flex-1 py-2">{item.pesan}</p>
            {item.labelAksi && (
              <button
                type="button"
                onClick={() => {
                  item.onAksi?.();
                  tutup();
                }}
                className="state-layer relative h-10 shrink-0 rounded-full px-3 text-label-large text-inverse-primary"
              >
                {item.labelAksi}
              </button>
            )}
            {item.bisaDitutup && (
              <button type="button" onClick={tutup} aria-label="Tutup" className="state-layer relative grid size-10 shrink-0 place-items-center rounded-full">
                <Ikon nama="close" />
              </button>
            )}
          </div>
        )}
      </div>
    </KonteksSnackbar.Provider>
  );
}

/** `const { tampilkan } = useSnackbar(); tampilkan("Profil berhasil disimpan.")` */
export function useSnackbar(): NilaiKonteks {
  const ctx = useContext(KonteksSnackbar);
  if (!ctx) throw new Error("useSnackbar harus dipakai di dalam <SnackbarProvider>.");
  return ctx;
}

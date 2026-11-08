"use client";

import { useEffect, useRef } from "react";
import { JUMLAH_PILIHAN } from "@/lib/config";

type Opsi = {
  /** true saat dialog terbuka — dialog native menangani Esc/Enter sendiri. */
  nonaktif: boolean;
  pilihPosisi: (posisi: number) => void;
  enter: () => void;
  esc: () => void;
  /** Ada jawaban yang belum disimpan → peringatan bawaan browser saat menutup tab (FT-05 §3.4). */
  adaInteraksi: boolean;
};

/**
 * Pintasan S-09: 1–4 memilih (BR-11/S-09), Enter = periksa / lanjut, Esc = minta keluar.
 * Enter pada tombol/tautan yang sedang fokus dibiarkan ke perilaku bawaan agar tidak terpicu dua kali.
 */
export function useTombolLatihan(opsi: Opsi) {
  const ref = useRef(opsi);
  useEffect(() => {
    ref.current = opsi;
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const o = ref.current;
      if (o.nonaktif || e.altKey || e.ctrlKey || e.metaKey) return;
      const target = e.target instanceof HTMLElement ? e.target : null;
      if (target?.closest("textarea, input:not([type=radio]), [contenteditable=true]")) return;

      const angka = Number(e.key);
      if (Number.isInteger(angka) && angka >= 1 && angka <= JUMLAH_PILIHAN) {
        e.preventDefault();
        o.pilihPosisi(angka - 1);
      } else if (e.key === "Enter" && !target?.closest("button, a")) {
        e.preventDefault();
        o.enter();
      } else if (e.key === "Escape") {
        o.esc();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!opsi.adaInteraksi) return;
    const onUnload = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", onUnload);
    return () => window.removeEventListener("beforeunload", onUnload);
  }, [opsi.adaInteraksi]);
}

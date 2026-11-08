"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ConfirmDialog } from "@/components/ui";
import { LABEL, PESAN } from "@/lib/pesan";

/**
 * KEPUTUSAN C8 (FT-10 K-14): peringatan meninggalkan S-16 dengan perubahan belum disimpan.
 * - Tutup tab / muat ulang / form Keluar → dialog bawaan browser (beforeunload).
 * - Klik tautan internal (menu, logo) → dicegat di fase capture pada window (sebelum handler
 *   <Link> React) lalu tampil dialog MSG-K04. Tombol Kembali browser (popstate) tidak dicegat.
 */
export function PenjagaPerubahan({ aktif }: { aktif: boolean }) {
  const router = useRouter();
  const [tujuan, setTujuan] = useState<string | null>(null);

  useEffect(() => {
    if (!aktif) return;
    const sebelumTutup = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    const klik = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a[href]");
      if (!(a instanceof HTMLAnchorElement) || a.target === "_blank" || a.hasAttribute("download")) return;
      const url = new URL(a.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;
      e.preventDefault();
      e.stopPropagation();
      setTujuan(url.pathname + url.search + url.hash);
    };
    window.addEventListener("beforeunload", sebelumTutup);
    window.addEventListener("click", klik, true);
    return () => {
      window.removeEventListener("beforeunload", sebelumTutup);
      window.removeEventListener("click", klik, true);
    };
  }, [aktif]);

  return (
    <ConfirmDialog
      terbuka={tujuan !== null}
      onTutup={() => setTujuan(null)}
      onKonfirmasi={() => {
        const ke = tujuan;
        setTujuan(null);
        if (ke) router.push(ke);
      }}
      judul="Tinggalkan halaman?"
      ikon="warning"
      pesan={PESAN["MSG-K04"]}
      labelBatal={LABEL.tetapDiSini}
      labelKonfirmasi={LABEL.tinggalkan}
    />
  );
}

"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Ikon, cn } from "@/components/ui";
import { DialogLaporQc } from "./dialog-lapor-qc";
import { ambilUrlHalaman } from "./perangkat";
import { TEKS_QC } from "./teks";

// Halaman topik/materi punya panel Tanya AI (kolom kanan di Expanded, tab penuh di Medium) yang
// kotak pertanyaannya ada di pojok kanan bawah — tombol dipindah ke kiri agar tidak menutupinya.
const RUTE_TANYA_AI = /^\/dokumen\/\d+\/topik\/\d+(\/materi\/\d+)?$/;

/**
 * Tombol "Laporkan" untuk penguji & admin (fitur Laporan QC), satu elemen dengan posisi per ukuran layar:
 * - Compact (< 600): ikon 40dp di header atas yang menempel (sebelah avatar). Di bawah sudah ada
 *   navigation bar + bar aksi menempel (latihan, pengaturan) + kotak Tanya AI, jadi FAB bawah pasti menutupi sesuatu.
 * - Medium/Expanded: FAB 56dp kanan bawah (label "Laporkan" tampil di Expanded); di halaman
 *   topik/materi pindah ke kiri bawah area konten.
 */
export function TombolLaporkan() {
  const pathname = usePathname();
  const [terbuka, setTerbuka] = useState(false);
  const [urlHalaman, setUrlHalaman] = useState("");
  const adaTanyaAi = RUTE_TANYA_AI.test(pathname);

  function buka() {
    setUrlHalaman(ambilUrlHalaman());
    setTerbuka(true);
  }

  return (
    <>
      <button
        type="button"
        onClick={buka}
        aria-label={TEKS_QC.laporkanTemuan}
        aria-haspopup="dialog"
        title={TEKS_QC.laporkanTemuan}
        className={cn(
          "state-layer fixed z-40 inline-flex items-center justify-center gap-2 bg-tertiary-container text-on-tertiary-container outline-none",
          "focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-secondary",
          // Compact: di header (h-16, px-4, avatar 32dp) → tepat di kiri avatar.
          "top-3 right-14 size-10 rounded-full",
          // Medium+: FAB kanan bawah.
          "medium:top-auto medium:right-6 medium:bottom-6 medium:size-14 medium:rounded-lg medium:shadow-3 medium:hover:shadow-4",
          "expanded:w-auto expanded:px-4",
          adaTanyaAi && "medium:right-auto medium:left-[104px] expanded:left-[304px]",
        )}
      >
        <Ikon nama="bug_report" />
        <span className="hidden text-label-large expanded:inline">{TEKS_QC.laporkan}</span>
      </button>
      <DialogLaporQc terbuka={terbuka} onTutup={() => setTerbuka(false)} urlHalaman={urlHalaman} />
    </>
  );
}

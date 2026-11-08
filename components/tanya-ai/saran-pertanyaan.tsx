"use client";

import { Chip } from "@/components/ui";
import { isiPlaceholder } from "@/lib/pesan";
import { cn } from "@/lib/tema/cn";
import { MAKS_JUDUL_SARAN, TEKS_TANYA } from "./teks";

const JUMLAH_SARAN = 3;

function potong(judul: string): string {
  const t = judul.trim();
  return t.length <= MAKS_JUDUL_SARAN ? t : `${t.slice(0, MAKS_JUDUL_SARAN - 1).trimEnd()}…`;
}

/**
 * 3 saran (K-10). Dibuat di klien tanpa AI (tidak memakan kuota/biaya). KEPUTUSAN B10: saran ke-3
 * diturunkan dari judul topik. `saranPertanyaan` dari halaman Belajar (bila ada) didahulukan.
 */
export function daftarSaran(judulTopik: string, saranPertanyaan?: readonly string[]): string[] {
  const judul = potong(judulTopik);
  const bawaan = [
    isiPlaceholder(TEKS_TANYA.saranJelaskan, { judul }),
    TEKS_TANYA.saranContoh,
    isiPlaceholder(TEKS_TANYA.saranPoin, { judul }),
  ];
  const tambahan = (saranPertanyaan ?? []).map((s) => s.trim()).filter(Boolean);
  return [...new Set([...tambahan, ...bawaan])].slice(0, JUMLAH_SARAN);
}

/** Klik saran = langsung kirim (B10). `vertikal` di state kosong, baris gulir horizontal di atas input. */
export function SaranPertanyaan({
  saran,
  tata,
  onPilih,
}: {
  saran: readonly string[];
  tata: "vertikal" | "horizontal";
  onPilih: (teks: string) => void;
}) {
  return (
    <ul
      className={cn(
        "flex gap-2",
        tata === "vertikal" ? "flex-col items-stretch" : "scrollbar-tipis -mx-1 overflow-x-auto px-1 py-2",
      )}
    >
      {saran.map((s) => (
        <li key={s} className={cn(tata === "vertikal" ? "flex" : "min-w-0 shrink-0")}>
          <Chip
            varian="suggestion"
            ikon="lightbulb"
            label={s}
            onClick={() => onPilih(s)}
            title={tata === "horizontal" ? s : undefined}
            className={cn(
              tata === "vertikal"
                ? "h-auto min-h-8 w-full justify-start py-1.5 text-left"
                : "max-w-60 whitespace-nowrap [&>span]:truncate",
            )}
          />
        </li>
      ))}
    </ul>
  );
}

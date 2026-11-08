"use client";

import { useState } from "react";
import { Chip } from "@/components/ui";
import { isiPlaceholder } from "@/lib/pesan";
import type { RujukanMateri } from "@/lib/data/topik";
import { LembarRujukan } from "./lembar-rujukan";
import { TEKS_BELAJAR } from "./teks";

/** K-09: chip "hal. X" + kutipan singkat (2 baris). Klik → K-14. Minimal 1 rujukan (BR-10). */
export function DaftarRujukan({ rujukan, judulDokumen }: { rujukan: RujukanMateri[]; judulDokumen: string }) {
  const [dipilih, setDipilih] = useState<RujukanMateri | null>(null);
  return (
    <section aria-labelledby="judul-rujukan" className="mt-8">
      <h2 id="judul-rujukan" className="mb-3 text-title-medium text-on-surface">
        {TEKS_BELAJAR.rujukanHalaman}
      </h2>
      <ul className="flex flex-col gap-3">
        {rujukan.map((r, i) => (
          <li key={`${r.halaman}-${i}`} className="flex items-start gap-3">
            <Chip
              ikon="bookmark"
              label={`hal. ${r.halaman}`}
              aria-label={isiPlaceholder(TEKS_BELAJAR.lihatRujukan, { halaman: r.halaman })}
              onClick={() => setDipilih(r)}
            />
            <button
              type="button"
              onClick={() => setDipilih(r)}
              aria-label={isiPlaceholder(TEKS_BELAJAR.lihatRujukan, { halaman: r.halaman })}
              className="line-clamp-2 min-w-0 flex-1 rounded-xs border-l-2 border-outline-variant pl-3 text-left text-body-medium text-on-surface-variant italic hover:text-on-surface"
            >
              “{r.kutipan}”
            </button>
          </li>
        ))}
      </ul>
      <LembarRujukan rujukan={dipilih} judulDokumen={judulDokumen} onTutup={() => setDipilih(null)} />
    </section>
  );
}

import { Chip, Ikon } from "@/components/ui";
import type { ItemHasilLatihan } from "@/lib/data/latihan";
import { cn } from "@/lib/tema/cn";
import { HURUF_TAMPIL } from "./acak";
import { TEKS_LATIHAN } from "./teks";

function teksPilihan(item: ItemHasilLatihan, indeks: number): string {
  return `${HURUF_TAMPIL[indeks] ?? "?"}. ${item.pilihan[indeks] ?? ""}`;
}

/**
 * K-05: tinjauan per soal sebagai <details> (aria-expanded & keyboard bawaan browser).
 * Soal salah terbuka otomatis. Huruf memakai urutan ASLI soal (pertanyaan terbuka #3) + teks pilihan.
 */
export function TinjauanJawaban({ item }: { item: ItemHasilLatihan[] }) {
  return (
    <section aria-labelledby="judul-tinjauan">
      <h2 id="judul-tinjauan" className="mb-3 text-title-large text-on-surface">
        {TEKS_LATIHAN.tinjauan}
      </h2>
      <ul className="flex flex-col gap-2">
        {item.map((it, i) => (
          <li key={it.soalId}>
            <details open={!it.isBenar} className="group rounded-md bg-surface-container-low">
              <summary className="state-layer relative flex cursor-pointer list-none items-start gap-3 rounded-md p-4 [&::-webkit-details-marker]:hidden">
                <span className="text-title-small text-on-surface tabular-nums">{i + 1}</span>
                <span className="min-w-0 flex-1">
                  <span className={cn("flex items-center gap-1 text-title-small", it.isBenar ? "text-success" : "text-error")}>
                    <Ikon nama={it.isBenar ? "check_circle" : "cancel"} isi ukuran={20} />
                    {it.isBenar ? TEKS_LATIHAN.benarSingkat : TEKS_LATIHAN.salahSingkat}
                  </span>
                  <span className="mt-1 line-clamp-2 block text-body-medium text-on-surface group-open:line-clamp-none">
                    {it.pertanyaan}
                  </span>
                </span>
                <Ikon nama="expand_more" className="text-on-surface-variant transition-transform group-open:rotate-180" />
              </summary>
              <div className="flex flex-col gap-2 px-4 pb-4 pl-11 text-body-medium text-on-surface">
                <p>
                  <span className="text-on-surface-variant">{TEKS_LATIHAN.jawabanmuLabel}</span> {teksPilihan(it, it.dipilih)}
                </p>
                {!it.isBenar && (
                  <p>
                    <span className="text-on-surface-variant">{TEKS_LATIHAN.jawabanBenarLabel}</span> {teksPilihan(it, it.kunci)}
                  </p>
                )}
                <p className="mt-1 text-title-small">{TEKS_LATIHAN.pembahasan}</p>
                <p>{it.pembahasan}</p>
                <div>
                  <Chip varian="info" ikon="menu_book" label={`hal. ${it.halamanRujukan}`} />
                </div>
              </div>
            </details>
          </li>
        ))}
      </ul>
    </section>
  );
}

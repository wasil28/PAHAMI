import { Ikon, Kartu, ProgressLinear } from "@/components/ui";
import { formatPersen } from "@/lib/format";
import { isiPlaceholder } from "@/lib/pesan";
import type { ProgresDokumen } from "@/lib/data/progres";
import { hrefDokumen } from "./rute";
import { TEKS_PROGRES as T } from "./teks";

/** Kartu progres satu dokumen siap (FT-07 K-05): % selesai BR-14, rata-rata BR-15, tautan ke S-07. */
export function KartuProgresDokumen({ dokumen: d }: { dokumen: ProgresDokumen }) {
  const keterangan = [
    isiPlaceholder(T.topikSelesaiDari, { x: d.topikSelesai, y: d.totalTopik }),
    d.rataRataSkor !== null ? isiPlaceholder(T.rataRata, { n: d.rataRataSkor }) : null,
  ]
    .filter(Boolean)
    .join(" · ");
  return (
    <Kartu href={hrefDokumen(d.id)} className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <h3 className="line-clamp-2 text-title-medium text-on-surface">{d.judul}</h3>
        <Ikon nama="chevron_right" className="shrink-0 text-on-surface-variant" />
      </div>
      <div className="flex items-center gap-3">
        <ProgressLinear nilai={d.persen} label={`Progres ${d.judul}`} className="flex-1" />
        <span className="text-label-large tabular-nums text-on-surface">{formatPersen(d.persen)}</span>
      </div>
      <p className="text-body-small text-on-surface-variant">{keterangan}</p>
    </Kartu>
  );
}

/** Daftar progres per dokumen (K-04/K-05), urut aktivitas terakhir terbaru. */
export function DaftarProgresDokumen({ dokumen }: { dokumen: ProgresDokumen[] }) {
  return (
    <section aria-labelledby="judul-progres-dokumen" className="flex flex-col gap-3">
      <h2 id="judul-progres-dokumen" className="text-title-large text-on-surface">
        {T.bagianDokumen}
      </h2>
      <ul role="list" className="grid gap-3 medium:grid-cols-2 expanded:grid-cols-1">
        {dokumen.map((d) => (
          <li key={d.id}>
            <KartuProgresDokumen dokumen={d} />
          </li>
        ))}
      </ul>
    </section>
  );
}

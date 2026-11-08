import { BadgeStatus, Ikon, Kartu, TombolLink } from "@/components/ui";
import { formatRentangHalaman } from "@/lib/format";
import { isiPlaceholder, LABEL, PESAN } from "@/lib/pesan";
import type { TopikLemah } from "@/lib/data/progres";
import { hrefLatihan, hrefTopik } from "./rute";
import { TEKS_PROGRES as T } from "./teks";

const MAKS_TAMPIL = 5; // FT-07 K-12: tampil 5, sisanya di "Lihat semua (n)"

function KartuTopikLemah({ topik: t }: { topik: TopikLemah }) {
  return (
    <Kartu as="li" className="flex flex-col gap-2">
      <h3 className="text-title-medium text-on-surface">{t.judul}</h3>
      <p className="text-body-small text-on-surface-variant">
        {t.judulDokumen} · {formatRentangHalaman(t.halamanAwal, t.halamanAkhir)}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <BadgeStatus status="lemah" />
        {t.skorTerakhir !== null && (
          <span className="text-body-small text-on-surface-variant">{isiPlaceholder(T.skorTerakhir, { n: t.skorTerakhir })}</span>
        )}
      </div>
      {/* BP-08 langkah 3: langsung ke latihan ulang (S-09) atau baca lagi (S-08). */}
      <div className="mt-1 flex flex-wrap gap-2">
        <TombolLink href={hrefLatihan(t.dokumenId, t.topikId)} varian="tonal" ukuran="sm" ikon="replay">
          {LABEL.ulangiLatihan}
        </TombolLink>
        <TombolLink href={hrefTopik(t.dokumenId, t.topikId)} varian="outlined" ukuran="sm" ikon="menu_book">
          {LABEL.pelajariLagi}
        </TombolLink>
      </div>
    </Kartu>
  );
}

/** Daftar topik berstatus lemah (BR-13, FT-07 K-11/K-12); kosong → MSG-E03. */
export function DaftarTopikLemah({ topik }: { topik: TopikLemah[] }) {
  const awal = topik.slice(0, MAKS_TAMPIL);
  const sisa = topik.slice(MAKS_TAMPIL);
  return (
    <section aria-labelledby="judul-topik-lemah" className="flex flex-col gap-3">
      <h2 id="judul-topik-lemah" className="text-title-large text-on-surface">
        {T.bagianLemah}
        {topik.length > 0 && <span className="text-on-surface-variant"> ({topik.length})</span>}
      </h2>
      {topik.length === 0 ? (
        <div role="status" className="flex items-center gap-3 rounded-md bg-success-container p-4 text-body-large text-on-success-container">
          <Ikon nama="celebration" />
          {PESAN["MSG-E03"]}
        </div>
      ) : (
        <>
          <ul role="list" className="flex flex-col gap-3">
            {awal.map((t) => (
              <KartuTopikLemah key={t.topikId} topik={t} />
            ))}
          </ul>
          {sisa.length > 0 && (
            // <details> agar "Lihat semua" jalan tanpa JavaScript.
            <details className="group">
              <summary className="state-layer relative inline-flex h-10 cursor-pointer list-none items-center gap-1 rounded-full px-3 text-label-large text-primary">
                {isiPlaceholder(T.lihatSemua, { n: topik.length })}
                <Ikon nama="expand_more" ukuran={20} className="transition-transform group-open:rotate-180" />
              </summary>
              <ul role="list" className="mt-3 flex flex-col gap-3">
                {sisa.map((t) => (
                  <KartuTopikLemah key={t.topikId} topik={t} />
                ))}
              </ul>
            </details>
          )}
        </>
      )}
    </section>
  );
}

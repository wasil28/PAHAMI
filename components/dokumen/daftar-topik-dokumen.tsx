import { Badge, BadgeStatus, Ikon, TombolLink } from "@/components/ui";
import { cn } from "@/lib/tema/cn";
import { LABEL, TEKS, isiPlaceholder } from "@/lib/pesan";
import { formatRentangHalaman } from "@/lib/format";
import { rute } from "@/lib/dokumen/tahap";
import type { TopikDokumen } from "@/lib/dokumen/tipe";
import { TEKS_DOKUMEN } from "./teks";

type Props = { dokumenId: number; topik: TopikDokumen[]; topikDisarankanId: number | null };

/**
 * Jalur belajar S-07 (FT-03 K-06/K-07). Baris bukan target klik — hanya tombol Pelajari & Latihan.
 * Topik disarankan (BR-35, B5): label "Disarankan" + Pelajari Filled (satu-satunya Filled).
 */
export function DaftarTopikDokumen({ dokumenId, topik, topikDisarankanId }: Props) {
  return (
    <ol className="flex flex-col">
      {topik.map((t, i) => {
        const disarankan = t.id === topikDisarankanId;
        const terakhir = i === topik.length - 1;
        return (
          <li key={t.id} className={cn("relative flex gap-4", !terakhir && "pb-4")}>
            {!terakhir && <span aria-hidden className="absolute top-10 bottom-0 left-[15px] w-0.5 bg-outline-variant" />}
            <span
              aria-hidden
              className={cn(
                "relative grid size-8 shrink-0 place-items-center rounded-full text-label-large",
                t.status === "selesai"
                  ? "bg-primary text-on-primary"
                  : disarankan
                    ? "bg-primary-container text-on-primary-container"
                    : "bg-surface-container-highest text-on-surface-variant",
              )}
            >
              {t.status === "selesai" ? <Ikon nama="check" ukuran={18} /> : t.urutan}
            </span>
            <div className="flex min-w-0 flex-1 flex-col gap-2 rounded-md bg-surface-container-low p-4">
              <div className="flex flex-wrap items-center gap-2">
                <BadgeStatus status={t.status} />
                {disarankan && (
                  <Badge nada="tertiary" ikon="flag">
                    {TEKS.disarankan}
                  </Badge>
                )}
              </div>
              <h3 className="text-title-medium text-on-surface">
                <span className="sr-only">{isiPlaceholder(TEKS.topikKe, { n: t.urutan, total: topik.length })}: </span>
                {t.judul}
              </h3>
              <p className="text-body-small text-on-surface-variant">
                {formatRentangHalaman(t.halamanAwal, t.halamanAkhir)}
                {t.skorTerakhir !== null && ` · ${isiPlaceholder(TEKS_DOKUMEN.skorTerakhir, { n: t.skorTerakhir })}`}
              </p>
              <div className="flex flex-wrap gap-2">
                <TombolLink href={rute.topik(dokumenId, t.id)} varian={disarankan ? "filled" : "tonal"} ukuran="sm" ikon="menu_book">
                  {LABEL.pelajari}
                </TombolLink>
                <TombolLink href={rute.latihan(dokumenId, t.id)} varian="outlined" ukuran="sm" ikon="quiz">
                  {LABEL.latihan}
                </TombolLink>
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

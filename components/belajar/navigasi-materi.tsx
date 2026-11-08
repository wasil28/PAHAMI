import Link from "next/link";
import { Ikon } from "@/components/ui";
import type { MateriRingkas } from "@/lib/materi/tipe";
import { cn } from "@/lib/tema/cn";
import type { StatusTopik } from "@/types/database";
import { AjakanLatihan } from "./ajakan-latihan";
import { hrefMateri, hrefTopik } from "./tautan-materi";
import { TEKS_BELAJAR } from "./teks";

const kelasItem =
  "state-layer relative flex min-h-16 min-w-0 flex-1 items-center gap-2 rounded-md border border-outline px-4 py-2 text-primary";

type Props = {
  dokumenId: number;
  topikId: number;
  sebelumnya: MateriRingkas | null;
  berikutnya: MateriRingkas | null;
  status: StatusTopik;
};

/**
 * Materi sebelumnya / berikutnya (pola K-11). Materi pertama → kiri menjadi "Kembali ke ringkasan
 * topik"; materi terakhir → kanan diganti ajakan latihan topik (K-10).
 */
export function NavigasiMateri({ dokumenId, topikId, sebelumnya, berikutnya, status }: Props) {
  const hrefLatihan = `/dokumen/${dokumenId}/topik/${topikId}/latihan`;
  return (
    <>
      {!berikutnya && (
        <div className="mt-10 max-w-[70ch]">
          <p className="flex items-center gap-2 text-body-medium text-on-surface-variant">
            <Ikon nama="flag" ukuran={18} className="text-primary" />
            {TEKS_BELAJAR.materiTerakhir}
          </p>
          <AjakanLatihan hrefLatihan={hrefLatihan} status={status} />
        </div>
      )}
      <nav aria-label={TEKS_BELAJAR.navigasiMateri} className="mt-8 flex max-w-[70ch] gap-3">
        {sebelumnya ? (
          <Link
            href={hrefMateri(dokumenId, topikId, sebelumnya.id)}
            aria-label={`${TEKS_BELAJAR.materiSebelumnya}: ${sebelumnya.judul}`}
            className={kelasItem}
          >
            <Ikon nama="chevron_left" className="shrink-0" />
            <span className="min-w-0">
              <span className="block text-label-large">{TEKS_BELAJAR.materiSebelumnya}</span>
              <span className="block truncate text-body-small text-on-surface-variant">{sebelumnya.judul}</span>
            </span>
          </Link>
        ) : (
          <Link href={hrefTopik(dokumenId, topikId)} className={kelasItem}>
            <Ikon nama="chevron_left" className="shrink-0" />
            <span className="text-label-large">{TEKS_BELAJAR.kembaliKeRingkasan}</span>
          </Link>
        )}
        {berikutnya ? (
          <Link
            href={hrefMateri(dokumenId, topikId, berikutnya.id)}
            aria-label={`${TEKS_BELAJAR.materiBerikutnya}: ${berikutnya.judul}`}
            className={cn(kelasItem, "justify-end text-right")}
          >
            <span className="min-w-0">
              <span className="block text-label-large">{TEKS_BELAJAR.materiBerikutnya}</span>
              <span className="block truncate text-body-small text-on-surface-variant">{berikutnya.judul}</span>
            </span>
            <Ikon nama="chevron_right" className="shrink-0" />
          </Link>
        ) : sebelumnya ? (
          <Link href={hrefTopik(dokumenId, topikId)} className={cn(kelasItem, "justify-end text-right")}>
            <span className="text-label-large">{TEKS_BELAJAR.keTopik}</span>
            <Ikon nama="chevron_right" className="shrink-0" />
          </Link>
        ) : (
          // Hanya satu materi: tautan ke ringkasan sudah ada di kiri.
          <span className="hidden flex-1 medium:block" />
        )}
      </nav>
      {sebelumnya && berikutnya && (
        <Link
          href={hrefTopik(dokumenId, topikId)}
          className="mt-4 inline-flex items-center gap-1 rounded-xs text-label-large text-primary hover:underline"
        >
          <Ikon nama="arrow_upward" ukuran={18} />
          {TEKS_BELAJAR.kembaliKeRingkasan}
        </Link>
      )}
    </>
  );
}

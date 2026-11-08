import Link from "next/link";
import { Ikon } from "@/components/ui";
import { LABEL } from "@/lib/pesan";
import { cn } from "@/lib/tema/cn";
import type { TopikRingkas } from "@/lib/data/topik";
import { TEKS_BELAJAR } from "./teks";

const kelasItem =
  "state-layer relative flex min-h-16 min-w-0 flex-1 items-center gap-2 rounded-md border border-outline px-4 py-2 text-primary";

/**
 * K-11: topik sebelumnya / berikutnya (2 baris). Topik pertama → kiri disembunyikan;
 * topik terakhir → kanan menjadi "Kembali ke dokumen".
 */
export function NavigasiTopik({
  dokumenId,
  sebelumnya,
  berikutnya,
}: {
  dokumenId: number;
  sebelumnya: TopikRingkas | null;
  berikutnya: TopikRingkas | null;
}) {
  const href = (t: TopikRingkas) => `/dokumen/${dokumenId}/topik/${t.id}`;
  return (
    <nav aria-label={TEKS_BELAJAR.navigasiTopik} className="mt-8 flex max-w-[70ch] gap-3">
      {sebelumnya ? (
        <Link href={href(sebelumnya)} aria-label={`${LABEL.topikSebelumnya}: ${sebelumnya.judul}`} className={kelasItem}>
          <Ikon nama="chevron_left" className="shrink-0" />
          <span className="min-w-0">
            <span className="block text-label-large">{LABEL.topikSebelumnya}</span>
            <span className="block truncate text-body-small text-on-surface-variant">{sebelumnya.judul}</span>
          </span>
        </Link>
      ) : (
        <span className="hidden flex-1 medium:block" />
      )}
      {berikutnya ? (
        <Link
          href={href(berikutnya)}
          aria-label={`${LABEL.topikBerikutnya}: ${berikutnya.judul}`}
          className={cn(kelasItem, "justify-end text-right")}
        >
          <span className="min-w-0">
            <span className="block text-label-large">{LABEL.topikBerikutnya}</span>
            <span className="block truncate text-body-small text-on-surface-variant">{berikutnya.judul}</span>
          </span>
          <Ikon nama="chevron_right" className="shrink-0" />
        </Link>
      ) : (
        <Link href={`/dokumen/${dokumenId}`} className={cn(kelasItem, "justify-end text-right")}>
          <span className="text-label-large">{LABEL.kembaliKeDokumen}</span>
          <Ikon nama="chevron_right" className="shrink-0" />
        </Link>
      )}
    </nav>
  );
}

import { Badge, BadgeStatus, Chip } from "@/components/ui";
import { formatRentangHalaman } from "@/lib/format";
import { TEKS, isiPlaceholder } from "@/lib/pesan";
import type { StatusTopik } from "@/types/database";

type Props = {
  urutan: number;
  total: number;
  judul: string;
  halamanAwal: number;
  halamanAkhir: number;
  status: StatusTopik;
};

/** K-04 + K-05: "Topik n dari total", judul (satu-satunya h1), rentang halaman, status BR-13, label sumber BR-30. */
export function HeaderTopik({ urutan, total, judul, halamanAwal, halamanAkhir, status }: Props) {
  return (
    <header className="mb-6">
      <p className="mb-1 text-label-large text-on-surface-variant">{isiPlaceholder(TEKS.topikKe, { n: urutan, total })}</p>
      <h1 className="text-headline-small text-on-surface expanded:text-headline-medium">{judul}</h1>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Chip varian="info" ikon="menu_book" label={formatRentangHalaman(halamanAwal, halamanAkhir)} />
        <BadgeStatus status={status} />
        <Badge nada="info" ikon="verified">
          {TEKS.diambilDariBuku}
        </Badge>
      </div>
    </header>
  );
}

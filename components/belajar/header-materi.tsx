import { Badge, Chip } from "@/components/ui";
import { formatRentangHalaman } from "@/lib/format";
import { TEKS, isiPlaceholder } from "@/lib/pesan";
import { TEKS_BELAJAR } from "./teks";

type Props = {
  urutanMateri: number;
  totalMateri: number;
  urutanTopik: number;
  judul: string;
  halamanAwal: number;
  halamanAkhir: number;
};

/** Header halaman materi: "Materi m dari x · Topik n", judul (satu-satunya h1), rentang halaman, label sumber BR-30. */
export function HeaderMateri({ urutanMateri, totalMateri, urutanTopik, judul, halamanAwal, halamanAkhir }: Props) {
  return (
    <header className="mb-8 max-w-[70ch]">
      <p className="mb-1 text-label-large text-primary">
        {isiPlaceholder(TEKS_BELAJAR.materiKe, { n: urutanMateri, total: totalMateri })}
        <span className="text-on-surface-variant"> · {isiPlaceholder(TEKS_BELAJAR.topikN, { n: urutanTopik })}</span>
      </p>
      <h1 className="text-headline-small text-on-surface expanded:text-headline-medium">{judul}</h1>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Chip varian="info" ikon="menu_book" label={formatRentangHalaman(halamanAwal, halamanAkhir)} />
        <Badge nada="info" ikon="verified">
          {TEKS.diambilDariBuku}
        </Badge>
      </div>
    </header>
  );
}

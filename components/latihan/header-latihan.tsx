import { IconButton, ProgressLinear } from "@/components/ui";
import { TEKS, isiPlaceholder } from "@/lib/pesan";
import { TEKS_LATIHAN } from "./teks";

type Props = {
  judulTopik: string;
  nomor: number;
  total: number;
  jumlahDiperiksa: number;
  onKeluar: () => void;
};

/** K-01 + K-02: tombol ✕, judul topik, "Soal n dari total", progress = soal diperiksa ÷ total. */
export function HeaderLatihan({ judulTopik, nomor, total, jumlahDiperiksa, onKeluar }: Props) {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-2">
        <IconButton ikon="close" label={TEKS_LATIHAN.keluarLatihan} onClick={onKeluar} className="-ml-2" />
        <p className="min-w-0 flex-1 truncate text-title-medium text-on-surface">{judulTopik}</p>
        {total > 0 && (
          <p className="shrink-0 text-label-large text-on-surface-variant" aria-live="polite">
            {isiPlaceholder(TEKS.soalKe, { n: nomor, total })}
          </p>
        )}
      </div>
      {total > 0 && (
        <ProgressLinear
          className="mt-3"
          nilai={(jumlahDiperiksa / total) * 100}
          label={isiPlaceholder(TEKS_LATIHAN.diperiksa, { n: jumlahDiperiksa, total })}
        />
      )}
    </div>
  );
}

import { Ikon, Kartu, ProgressLinear, Tombol } from "@/components/ui";
import { isiPlaceholder } from "@/lib/pesan";
import { formatUkuranFile, hitungPersen } from "@/lib/format";
import { TEKS_DOKUMEN } from "./teks";

type Props = { judul: string; terkirim: number; total: number; onBatal: () => void };

/** ProgresUnggahan (FT-02 K-10): persen nyata dari XHR upload (BP-03 langkah 5). */
export function ProgresUnggahan({ judul, terkirim, total, onBatal }: Props) {
  const persen = hitungPersen(terkirim, total);
  return (
    <div className="flex flex-col gap-3">
      <Kartu padding="lg" className="flex flex-col gap-3">
        <p className="flex items-center gap-3 text-title-small text-on-surface">
          <Ikon nama="picture_as_pdf" className="text-primary" />
          <span className="min-w-0 truncate" title={judul}>
            {judul}
          </span>
        </p>
        <p className="text-body-medium text-on-surface">{isiPlaceholder(TEKS_DOKUMEN.mengunggah, { p: persen })}</p>
        <ProgressLinear nilai={persen} label={TEKS_DOKUMEN.progresUnggahan} />
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-body-small text-on-surface-variant">
            {isiPlaceholder(TEKS_DOKUMEN.terkirimDari, { x: formatUkuranFile(terkirim), y: formatUkuranFile(total) })}
          </span>
          <Tombol varian="text" onClick={onBatal}>
            {TEKS_DOKUMEN.batalkanUnggahan}
          </Tombol>
        </div>
      </Kartu>
      <p className="px-1 text-body-small text-on-surface-variant">{TEKS_DOKUMEN.janganTutup}</p>
    </div>
  );
}

import { ProgressCircular } from "@/components/ui";
import { isiPlaceholder } from "@/lib/pesan";
import { TEKS_LATIHAN } from "./teks";

const UKURAN_CINCIN = 120; // FT-05 S-10 K-02: cincin 120 dp, tebal 8 dp
const TEBAL_CINCIN = 8;

/** K-02: skor besar (Display Medium) di dalam cincin determinate. Cincin dekoratif; angka dibaca utuh. */
export function CincinSkor({ skor, jumlahBenar, jumlahSoal }: { skor: number; jumlahBenar: number; jumlahSoal: number }) {
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative grid place-items-center" style={{ width: UKURAN_CINCIN, height: UKURAN_CINCIN }}>
        <ProgressCircular nilai={skor} ukuran={UKURAN_CINCIN} tebal={TEBAL_CINCIN} className="absolute inset-0" />
        <p className="flex flex-col items-center leading-none">
          <span aria-hidden className="text-display-medium text-on-surface tabular-nums">
            {skor}
          </span>
          <span aria-hidden className="text-title-medium text-on-surface-variant">
            /100
          </span>
          <span className="sr-only">{isiPlaceholder(TEKS_LATIHAN.skorDari, { skor })}</span>
        </p>
      </div>
      <p className="text-body-large text-on-surface">
        {isiPlaceholder(TEKS_LATIHAN.ringkasBenar, { benar: jumlahBenar, jumlah: jumlahSoal })}
      </p>
    </div>
  );
}

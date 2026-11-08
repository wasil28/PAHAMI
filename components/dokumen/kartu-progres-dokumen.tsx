import { Kartu, ProgressLinear, TombolLink } from "@/components/ui";
import { TEKS, isiPlaceholder } from "@/lib/pesan";
import { rute } from "@/lib/dokumen/tahap";
import { TEKS_DOKUMEN } from "./teks";

type Props = {
  persen: number;
  topikSelesai: number;
  totalTopik: number;
  rataRataSkor: number | null;
  perluDiulang: number;
  className?: string;
};

/** KartuProgresDokumen (FT-03 S-07 K-05): BR-14 persen, BR-15 rata-rata skor terakhir. */
export function KartuProgresDokumen({ persen, topikSelesai, totalTopik, rataRataSkor, perluDiulang, className }: Props) {
  return (
    <Kartu as="section" className={`flex flex-col gap-3 bg-surface-container! ${className ?? ""}`} aria-labelledby="judul-progres-dokumen">
      <h2 id="judul-progres-dokumen" className="text-title-small text-on-surface-variant">
        {TEKS_DOKUMEN.progresBelajar}
      </h2>
      <p className="text-headline-small text-on-surface">{persen}%</p>
      <ProgressLinear nilai={persen} label={TEKS_DOKUMEN.progresBelajar} />
      <ul className="flex flex-col gap-1 text-body-medium text-on-surface">
        <li>{isiPlaceholder(TEKS_DOKUMEN.topikSelesaiDari, { x: topikSelesai, y: totalTopik })}</li>
        <li>{isiPlaceholder(TEKS_DOKUMEN.rataRataSkor, { n: rataRataSkor ?? TEKS.kosong })}</li>
        {perluDiulang > 0 && <li>{isiPlaceholder(TEKS_DOKUMEN.perluDiulang, { n: perluDiulang })}</li>}
      </ul>
      <TombolLink href={rute.progres} varian="text" ikonKanan="arrow_forward" className="self-start">
        {TEKS_DOKUMEN.lihatProgres}
      </TombolLink>
    </Kartu>
  );
}

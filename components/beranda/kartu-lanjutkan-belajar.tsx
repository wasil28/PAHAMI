import { Kartu, TombolLink } from "@/components/ui";
import { LABEL, TEKS, isiPlaceholder } from "@/lib/pesan";
import { formatRentangHalaman } from "@/lib/format";
import { rute } from "@/lib/dokumen/tahap";
import type { LanjutkanBelajar } from "@/lib/data/dokumen";
import { TEKS_DOKUMEN } from "@/components/dokumen/teks";

/**
 * KartuLanjutkanBelajar (FT-03 K-05, BR-34, A2). Data dari fn_lanjutkan_belajar; tidak dirender
 * bila belum ada aktivitas. Tombolnya satu-satunya Filled di S-06 (KEPUTUSAN C2).
 */
export function KartuLanjutkanBelajar({ data }: { data: LanjutkanBelajar }) {
  const meta = [
    data.judulDokumen,
    data.totalTopik ? isiPlaceholder(TEKS.topikKe, { n: data.urutan, total: data.totalTopik }) : null,
    formatRentangHalaman(data.halamanAwal, data.halamanAkhir),
  ]
    .filter(Boolean)
    .join(" · ");
  return (
    <Kartu radius="lg" padding="lg" as="section" className="bg-primary-container text-on-primary-container">
      <div className="flex flex-col gap-4 medium:flex-row medium:items-center medium:justify-between">
        <div className="min-w-0">
          <p className="text-label-large">{TEKS_DOKUMEN.lanjutkanBelajar}</p>
          <h2 className="mt-1 text-title-medium">{data.judulTopik}</h2>
          <p className="mt-1 text-body-small">{meta}</p>
          {data.skorTerakhir !== null && (
            <p className="mt-1 text-body-small">{isiPlaceholder(TEKS_DOKUMEN.skorTerakhir, { n: data.skorTerakhir })}</p>
          )}
        </div>
        <TombolLink href={rute.topik(data.dokumenId, data.topikId)} varian="filled" ikonKanan="arrow_forward">
          {LABEL.lanjutBelajar}
        </TombolLink>
      </div>
    </Kartu>
  );
}

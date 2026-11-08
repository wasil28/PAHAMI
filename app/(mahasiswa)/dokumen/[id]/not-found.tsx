import { EmptyState, TombolLink } from "@/components/ui";
import { TEKS_DOKUMEN } from "@/components/dokumen/teks";
import { rute } from "@/lib/dokumen/tahap";

/** 404 S-07 (FT-03 K-10): sama untuk dokumen yang tidak ada maupun milik orang lain (BR-06). */
export default function DokumenTidakDitemukan() {
  return (
    <EmptyState
      ikon="search_off"
      judul={TEKS_DOKUMEN.tidakDitemukanJudul}
      teks={TEKS_DOKUMEN.tidakDitemukanTeks}
      aksi={
        <TombolLink href={rute.beranda} varian="filled">
          {TEKS_DOKUMEN.kembaliKeBeranda}
        </TombolLink>
      }
    />
  );
}

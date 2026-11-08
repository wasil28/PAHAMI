import { EmptyState, TombolLink } from "@/components/ui";
import { TEKS_BELAJAR } from "@/components/belajar/teks";
import { LABEL } from "@/lib/pesan";

/** K-17: topik tidak ada / bukan milik pengguna (BR-06 — keberadaan data tidak dibocorkan). */
export default function TopikTidakDitemukan() {
  return (
    <EmptyState
      ikon="search_off"
      judul={TEKS_BELAJAR.topikTidakDitemukan}
      teks={TEKS_BELAJAR.teksTidakDitemukan}
      aksi={
        <TombolLink href="/beranda" varian="tonal" ikon="home">
          {LABEL.keBeranda}
        </TombolLink>
      }
    />
  );
}

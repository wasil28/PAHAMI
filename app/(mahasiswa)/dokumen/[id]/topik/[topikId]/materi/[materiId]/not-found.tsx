import { EmptyState, TombolLink } from "@/components/ui";
import { TEKS_BELAJAR } from "@/components/belajar/teks";
import { LABEL } from "@/lib/pesan";

/** Materi tidak ada / bukan milik pengguna (BR-06 — keberadaan data tidak dibocorkan). */
export default function MateriTidakDitemukan() {
  return (
    <EmptyState
      ikon="search_off"
      judul={TEKS_BELAJAR.materiTidakDitemukan}
      teks={TEKS_BELAJAR.teksMateriTidakDitemukan}
      aksi={
        <TombolLink href="/beranda" varian="tonal" ikon="home">
          {LABEL.keBeranda}
        </TombolLink>
      }
    />
  );
}

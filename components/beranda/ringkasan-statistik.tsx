import { StatCard } from "@/components/ui";
import { TEKS, isiPlaceholder } from "@/lib/pesan";
import type { RingkasanDokumen } from "@/lib/dokumen/tipe";
import { TEKS_DOKUMEN } from "@/components/dokumen/teks";

/** RingkasanStatistik (FT-03 K-06): BR-13/14/15 dari dokumen `siap`; angka sudah dihitung di view DB. */
export function RingkasanStatistik({ dokumen, rataRataSkor }: { dokumen: RingkasanDokumen[]; rataRataSkor: number | null }) {
  const siap = dokumen.filter((d) => d.status === "siap");
  const topikSelesai = siap.reduce((n, d) => n + d.topikSelesai, 0);
  const totalTopik = siap.reduce((n, d) => n + d.totalTopik, 0);
  const perluDiulang = siap.reduce((n, d) => n + d.topikLemah, 0);
  return (
    <div className="grid grid-cols-2 gap-3 expanded:grid-cols-4">
      <StatCard
        label={TEKS_DOKUMEN.statDokumen}
        nilai={dokumen.length}
        ikon="description"
        keterangan={isiPlaceholder(TEKS_DOKUMEN.statSiap, { n: siap.length })}
      />
      <StatCard label={TEKS_DOKUMEN.statTopikSelesai} nilai={`${topikSelesai}/${totalTopik}`} ikon="check_circle" nada="success" />
      <StatCard
        label={TEKS_DOKUMEN.statRataSkor}
        nilai={rataRataSkor ?? TEKS.kosong}
        ikon="star"
        nada="tertiary"
        keterangan={rataRataSkor === null ? TEKS.belumAdaLatihan : undefined}
      />
      <StatCard
        label={TEKS_DOKUMEN.statPerluDiulang}
        nilai={isiPlaceholder(TEKS_DOKUMEN.statTopik, { n: perluDiulang })}
        ikon="replay"
        nada="warning"
      />
    </div>
  );
}

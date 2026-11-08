import { StatCard } from "@/components/ui";
import { formatAngka, formatPersen } from "@/lib/format";
import { isiPlaceholder, TEKS } from "@/lib/pesan";
import type { RingkasanProgres as DataRingkasan } from "@/lib/data/progres";
import { TEKS_PROGRES as T } from "./teks";

/** Empat kartu ringkasan S-12 (FT-07 K-03): dokumen, topik selesai (BR-13/14), rata-rata (BR-15), latihan. */
export function RingkasanProgres({ ringkasan: r }: { ringkasan: DataRingkasan }) {
  return (
    <section aria-label="Ringkasan progres" className="grid grid-cols-2 gap-3 expanded:grid-cols-4 expanded:gap-4">
      <StatCard
        label={T.statDokumen}
        ikon="description"
        nilai={formatAngka(r.jumlahDokumen)}
        keterangan={T.statDokumenKet}
      />
      <StatCard
        label={T.statTopikSelesai}
        ikon="task_alt"
        nada="success"
        nilai={
          <>
            <span aria-hidden>
              {formatAngka(r.topikSelesai)}
              <span className="text-title-medium text-on-surface-variant">/{formatAngka(r.totalTopik)}</span>
            </span>
            <span className="sr-only">{`${r.topikSelesai} dari ${r.totalTopik}`}</span>
          </>
        }
        keterangan={isiPlaceholder(T.statTopikSelesaiKet, { p: formatPersen(r.persenSelesai) })}
      />
      <StatCard
        label={T.statRataRata}
        ikon="grade"
        nada="tertiary"
        nilai={r.rataRataSkor ?? TEKS.kosong}
        // BR-15: "—" + keterangan bila belum ada topik yang dilatih (FT-07 §3A.5, Q-03).
        keterangan={r.rataRataSkor === null ? T.belumAdaLatihan : T.statRataRataKet}
      />
      <StatCard
        label={T.statLatihan}
        ikon="edit_note"
        nada="secondary"
        nilai={formatAngka(r.jumlahLatihan)}
        keterangan={T.statLatihanKet}
      />
    </section>
  );
}

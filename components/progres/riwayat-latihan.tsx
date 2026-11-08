import Link from "next/link";
import { BadgeSkor, DataTable, Kartu, Pagination, type KolomTabel } from "@/components/ui";
import { formatRelatif, formatTanggalWaktu } from "@/lib/format";
import { isiPlaceholder, TEKS } from "@/lib/pesan";
import type { BarisRiwayat, HalamanRiwayat } from "@/lib/data/progres";
import { RIWAYAT_PER_HALAMAN } from "@/lib/data/progres";
import { hrefTopik } from "./rute";
import { TEKS_PROGRES as T } from "./teks";

function Tanggal({ iso }: { iso: string }) {
  return (
    <time dateTime={iso} title={formatTanggalWaktu(iso)} className="whitespace-nowrap">
      {formatRelatif(iso)}
    </time>
  );
}

function JudulTopik({ b }: { b: BarisRiwayat }) {
  if (b.dokumenId === null) return <>{b.judulTopik}</>;
  return (
    <Link href={hrefTopik(b.dokumenId, b.topikId)} className="text-on-surface underline-offset-2 hover:underline">
      {b.judulTopik}
    </Link>
  );
}

const KOLOM: KolomTabel<BarisRiwayat>[] = [
  { kunci: "tanggal", judul: T.kolomTanggal, render: (b) => <Tanggal iso={b.tanggal} /> },
  { kunci: "topik", judul: T.kolomTopik, render: (b) => <JudulTopik b={b} /> },
  { kunci: "dokumen", judul: T.kolomDokumen, render: (b) => b.judulDokumen ?? TEKS.kosong },
  { kunci: "skor", judul: T.kolomSkorRiwayat, rata: "kanan", render: (b) => <BadgeSkor skor={b.skor} /> },
];

/**
 * Riwayat percobaan latihan, terbaru di atas, 10 per halaman (FT-07 K-13..K-15).
 * Paging lewat ?halaman= (navigasi server, jalan tanpa JS). Badge skor memakai tingkat skor
 * percobaan itu sendiri — berbeda dengan grafik yang mengikuti status topik (KEPUTUSAN C3).
 */
export function RiwayatLatihan({ riwayat }: { riwayat: HalamanRiwayat }) {
  const { baris, total, halaman, totalHalaman } = riwayat;
  const a = (halaman - 1) * RIWAYAT_PER_HALAMAN + 1;
  const b = a + baris.length - 1;
  return (
    <section aria-labelledby="judul-riwayat" className="flex scroll-mt-20 flex-col gap-3" id="riwayat">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="judul-riwayat" className="text-title-large text-on-surface">
          {T.bagianRiwayat}
        </h2>
        {total > 0 && (
          <p className="text-body-small text-on-surface-variant">{isiPlaceholder(T.rentangRiwayat, { a, b, total })}</p>
        )}
      </div>
      <DataTable
        kolom={KOLOM}
        data={baris}
        kunciBaris={(r) => String(r.id)}
        keterangan={T.bagianRiwayat}
        kartuCompact={(r) => (
          <Kartu padding="sm" className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-body-small text-on-surface-variant">
                <Tanggal iso={r.tanggal} />
              </p>
              <p className="truncate text-body-medium text-on-surface">
                <JudulTopik b={r} />
              </p>
              {r.judulDokumen && <p className="truncate text-body-small text-on-surface-variant">{r.judulDokumen}</p>}
            </div>
            <BadgeSkor skor={r.skor} />
          </Kartu>
        )}
      />
      <Pagination halaman={halaman} totalHalaman={totalHalaman} buatHref={(n) => `?halaman=${n}#riwayat`} />
    </section>
  );
}

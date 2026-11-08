import type { ReactNode } from "react";
import { Ikon, Kartu, cn } from "@/components/ui";
import { formatTanggalWaktu } from "@/lib/format";
import type { LaporanQc } from "@/lib/qc/tipe";
import { BadgeKategoriQc, BadgePrioritasQc, BadgeStatusQc } from "./badge-qc";
import { TEKS_QC, isi } from "./teks";

type Props = {
  laporan: LaporanQc;
  /** Admin: tampilkan nama pelapor. */
  tampilPelapor?: boolean;
  /** Admin (compact): kartu menjadi tombol pembuka detail. */
  onBuka?: () => void;
  className?: string;
};

/** Kartu ringkas satu laporan — "Laporan saya" & daftar admin di layar compact. */
export function KartuLaporanQc({ laporan: l, tampilPelapor, onBuka, className }: Props) {
  const judul: ReactNode = onBuka ? (
    <button
      type="button"
      onClick={onBuka}
      aria-label={isi(TEKS_QC.bukaDetail, { kode: l.kode })}
      className="text-left after:absolute after:inset-0 after:rounded-[inherit] after:content-[''] focus-visible:outline-none"
    >
      {l.judul}
    </button>
  ) : (
    l.judul
  );

  return (
    <Kartu
      as="article"
      className={cn(onBuka && "state-layer relative has-focus-visible:outline-3 has-focus-visible:outline-secondary", className)}
    >
      <div className="flex gap-3">
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-label-large tabular-nums text-on-surface-variant">{l.kode}</span>
            <BadgeStatusQc status={l.status} />
          </div>
          <h3 className="text-title-medium break-words text-on-surface">{judul}</h3>
          <div className="flex flex-wrap gap-2">
            <BadgeKategoriQc kategori={l.kategori} />
            <BadgePrioritasQc prioritas={l.prioritas} />
          </div>
          <p className="text-body-small text-on-surface-variant">
            {isi(TEKS_QC.dilaporkan, { tanggal: formatTanggalWaktu(l.createdAt) })}
            {tampilPelapor && <> · {isi(TEKS_QC.oleh, { nama: l.pelapor.nama })}</>}
          </p>
          {!onBuka && l.catatanTim && (
            <div className="rounded-sm bg-surface-container px-3 py-2">
              <p className="text-label-medium text-on-surface-variant">{TEKS_QC.catatanTim}</p>
              <p className="text-body-medium whitespace-pre-wrap text-on-surface">{l.catatanTim}</p>
            </div>
          )}
        </div>
        {l.lampiranUrl && !onBuka && (
          <a
            href={l.lampiranUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="state-layer relative block size-20 shrink-0 overflow-hidden rounded-sm bg-surface-container medium:h-20 medium:w-28"
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- signed URL Supabase berumur pendek, tidak lewat next/image */}
            <img src={l.lampiranUrl} alt={isi(TEKS_QC.screenshotDari, { kode: l.kode })} className="size-full object-cover" loading="lazy" />
            <span className="sr-only">{TEKS_QC.lihatScreenshot}</span>
          </a>
        )}
        {l.lampiranUrl && onBuka && <Ikon nama="image" className="shrink-0 text-on-surface-variant" label={TEKS_QC.adaScreenshot} />}
      </div>
    </Kartu>
  );
}

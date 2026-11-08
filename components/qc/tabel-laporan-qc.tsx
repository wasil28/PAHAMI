"use client";

import { useState } from "react";
import { DataTable, Ikon, type KolomTabel } from "@/components/ui";
import { formatTanggal } from "@/lib/format";
import type { LaporanQc } from "@/lib/qc/tipe";
import { BadgeKategoriQc, BadgePrioritasQc, BadgeStatusQc } from "./badge-qc";
import { DialogDetailQc } from "./dialog-detail-qc";
import { KartuLaporanQc } from "./kartu-laporan-qc";
import { TEKS_QC, isi } from "./teks";

/** Daftar laporan admin: tabel (≥ 600) / kartu (compact); klik judul/kartu → dialog detail & tindak lanjut. */
export function TabelLaporanQc({ laporan, keterangan }: { laporan: LaporanQc[]; keterangan: string }) {
  const [dipilihId, setDipilihId] = useState<number | null>(null);
  const dipilih = laporan.find((l) => l.id === dipilihId) ?? null;

  const kolom: KolomTabel<LaporanQc>[] = [
    { kunci: "kode", judul: TEKS_QC.kolKode, className: "whitespace-nowrap tabular-nums text-on-surface-variant", render: (l) => l.kode },
    {
      kunci: "judul",
      judul: TEKS_QC.kolJudul,
      className: "min-w-[220px]",
      render: (l) => (
        <button
          type="button"
          onClick={() => setDipilihId(l.id)}
          aria-label={`${l.judul} — ${isi(TEKS_QC.bukaDetail, { kode: l.kode })}`}
          className="inline-flex items-center gap-1 rounded-xs text-left text-title-small text-on-surface outline-none hover:text-primary hover:underline focus-visible:outline-3 focus-visible:outline-secondary"
        >
          <span className="line-clamp-2">{l.judul}</span>
          {l.lampiranUrl && <Ikon nama="image" ukuran={16} className="shrink-0 text-on-surface-variant" label={TEKS_QC.adaScreenshot} />}
        </button>
      ),
    },
    { kunci: "pelapor", judul: TEKS_QC.kolPelapor, className: "whitespace-nowrap", render: (l) => l.pelapor.nama },
    { kunci: "kategori", judul: TEKS_QC.kolKategori, render: (l) => <BadgeKategoriQc kategori={l.kategori} /> },
    { kunci: "prioritas", judul: TEKS_QC.kolPrioritas, render: (l) => <BadgePrioritasQc prioritas={l.prioritas} /> },
    { kunci: "status", judul: TEKS_QC.kolStatus, render: (l) => <BadgeStatusQc status={l.status} /> },
    { kunci: "tanggal", judul: TEKS_QC.kolTanggal, className: "whitespace-nowrap text-on-surface-variant", render: (l) => formatTanggal(l.createdAt) },
  ];

  return (
    <>
      <DataTable
        kolom={kolom}
        data={laporan}
        kunciBaris={(l) => String(l.id)}
        keterangan={keterangan}
        kartuCompact={(l) => <KartuLaporanQc laporan={l} tampilPelapor onBuka={() => setDipilihId(l.id)} />}
      />
      <DialogDetailQc laporan={dipilih} onTutup={() => setDipilihId(null)} />
    </>
  );
}

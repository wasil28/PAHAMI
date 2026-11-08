"use client";

import { useState } from "react";
import { Ikon, Select, Tombol, TombolLink } from "@/components/ui";
import { isiPlaceholder, STATUS_TOPIK, type StatusTopik } from "@/lib/pesan";
import type { SkorTopik } from "@/lib/data/progres";
import { GrafikBatang } from "./grafik-batang";
import { hrefDokumen } from "./rute";
import { TabelSkorTopik } from "./tabel-skor-topik";
import { TEKS_PROGRES as T } from "./teks";

export type DokumenGrafik = { id: number; judul: string; topik: SkorTopik[] };

const URUTAN_LEGENDA: StatusTopik[] = ["selesai", "lemah", "belum"];
// Kelas token yang sama dengan WARNA_STATUS pada batang (KEPUTUSAN C3).
const KELAS_LEGENDA: Record<StatusTopik, string> = {
  selesai: "text-success",
  lemah: "text-warning",
  belum: "text-outline-variant",
};

function ringkasan(d: DokumenGrafik): string {
  const hitung = (s: StatusTopik) => d.topik.filter((t) => t.status === s).length;
  return isiPlaceholder(T.ringkasGrafik, {
    n: d.topik.length,
    judul: d.judul,
    selesai: hitung("selesai"),
    lemah: hitung("lemah"),
    belum: hitung("belum"),
  });
}

/**
 * Skor terakhir per topik untuk SATU dokumen (FT-07 K-06..K-10). Pemilih dokumen disetujui di
 * KEPUTUSAN C6 agar grafik tidak memuat 75 batang sekaligus; default = dokumen aktivitas terakhir (BR-34).
 */
export function GrafikSkorTopik({ dokumen }: { dokumen: DokumenGrafik[] }) {
  const [idTerpilih, setIdTerpilih] = useState(dokumen[0]?.id);
  const [modeTabel, setModeTabel] = useState(false);
  const aktif = dokumen.find((d) => d.id === idTerpilih) ?? dokumen[0];
  if (!aktif) return null;
  const sudahLatihan = aktif.topik.some((t) => t.status !== "belum");

  return (
    <section aria-labelledby="judul-grafik" className="flex flex-col gap-4 rounded-lg bg-surface-container-low p-4 expanded:p-6">
      <h2 id="judul-grafik" className="text-title-large text-on-surface">
        {T.bagianGrafik}
      </h2>
      {/* Pemilih disembunyikan bila hanya ada 1 dokumen siap (FT-07 K-07). */}
      {dokumen.length > 1 && (
        <Select
          label={T.labelPemilih}
          opsi={dokumen.map((d) => ({ nilai: String(d.id), label: d.judul }))}
          value={String(aktif.id)}
          onChange={(e) => setIdTerpilih(Number(e.target.value))}
          className="max-w-md"
        />
      )}
      <p aria-live="polite" className="sr-only">
        {isiPlaceholder(T.menampilkanSkor, { judul: aktif.judul })}
      </p>

      {!sudahLatihan ? (
        <div className="flex flex-col items-start gap-2 py-4">
          <p className="text-body-medium text-on-surface-variant">{T.dokumenTanpaLatihan}</p>
          <TombolLink href={hrefDokumen(aktif.id)} varian="text" ikonKanan="chevron_right">
            {T.bukaDokumen}
          </TombolLink>
        </div>
      ) : modeTabel ? (
        <TabelSkorTopik topik={aktif.topik} judulDokumen={aktif.judul} />
      ) : (
        <div role="img" aria-label={ringkasan(aktif)} key={aktif.id} className="animate-masuk">
          <GrafikBatang topik={aktif.topik} dokumenId={aktif.id} />
        </div>
      )}

      {sudahLatihan && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <ul role="list" aria-label="Legenda" className="flex flex-wrap gap-x-4 gap-y-1 text-body-small text-on-surface-variant">
            {URUTAN_LEGENDA.map((s) => (
              <li key={s} className="flex items-center gap-1.5">
                <Ikon nama="circle" isi ukuran={12} className={KELAS_LEGENDA[s]} />
                {STATUS_TOPIK[s]}
              </li>
            ))}
          </ul>
          <Tombol varian="text" ikon={modeTabel ? "bar_chart" : "table"} onClick={() => setModeTabel((m) => !m)}>
            {modeTabel ? T.lihatGrafik : T.lihatTabel}
          </Tombol>
        </div>
      )}
    </section>
  );
}

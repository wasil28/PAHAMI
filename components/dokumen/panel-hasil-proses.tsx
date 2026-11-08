"use client";

import { useEffect, useRef } from "react";
import { Ikon, Kartu, Tombol, TombolLink } from "@/components/ui";
import { LABEL, pesan } from "@/lib/pesan";
import { rute } from "@/lib/dokumen/tahap";
import type { StatusDokumenApi } from "@/lib/dokumen/tipe";
import { DaftarTahapProses } from "./daftar-tahap-proses";
import { TEKS_DOKUMEN } from "./teks";

type Props = { dokumen: StatusDokumenApi; onUlang: () => void };

/** PanelHasilProses (FT-02 K-12 selesai / K-13 gagal). Fokus dipindah ke judul saat muncul (a11y §5). */
export function PanelHasilProses({ dokumen, onUlang }: Props) {
  const judulRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => judulRef.current?.focus(), []);
  const siap = dokumen.status === "siap";

  return (
    <Kartu radius="lg" padding="none" className="animate-masuk overflow-hidden">
      <div
        className={siap ? "bg-success-container p-6 text-on-success-container" : "bg-error-container p-6 text-on-error-container"}
        role={siap ? "status" : "alert"}
      >
        <Ikon nama={siap ? "check_circle" : "error"} ukuran={48} isi />
        <h2 ref={judulRef} tabIndex={-1} className="mt-2 text-title-large outline-none">
          {siap ? pesan("MSG-U08", { judul: dokumen.judul, jumlah: dokumen.jumlahTopik ?? 0 }) : TEKS_DOKUMEN.gagalDiprosesJudul}
        </h2>
        {!siap && dokumen.pesanGagal && <p className="mt-1 text-body-medium">{dokumen.pesanGagal}</p>}
      </div>
      <div className="flex flex-col gap-6 p-6">
        <DaftarTahapProses status={dokumen.status} tahap={dokumen.tahap} jumlahHalaman={dokumen.jumlahHalaman} orientasi="responsif" />
        {!siap && <p className="text-body-small text-on-surface-variant">{TEKS_DOKUMEN.tidakDihitungKuota}</p>}
        <div className="flex flex-col gap-2 medium:flex-row-reverse medium:justify-start">
          {siap ? (
            <>
              <TombolLink href={rute.dokumen(dokumen.id)} varian="filled" ikon="school">
                {LABEL.mulaiBelajar}
              </TombolLink>
              <Tombol varian="text" onClick={onUlang}>
                {TEKS_DOKUMEN.unggahLain}
              </Tombol>
            </>
          ) : (
            <>
              <Tombol varian="filled" ikon="upload_file" onClick={onUlang}>
                {LABEL.cobaFileLain}
              </Tombol>
              <TombolLink href={rute.beranda} varian="text">
                {LABEL.keBeranda}
              </TombolLink>
            </>
          )}
        </div>
      </div>
    </Kartu>
  );
}

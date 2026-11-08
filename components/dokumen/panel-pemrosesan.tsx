"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Banner, Kartu, ProgressLinear, Tombol, TombolLink, useSnackbar } from "@/components/ui";
import { LABEL, TAHAP_DOKUMEN, TEKS, isiPlaceholder, pesan } from "@/lib/pesan";
import { JUMLAH_TAHAP, indeksTahap, persenTahap, rute } from "@/lib/dokumen/tahap";
import type { StatusDokumenApi } from "@/lib/dokumen/tipe";
import { DaftarTahapProses } from "./daftar-tahap-proses";
import { PanelHasilProses } from "./panel-hasil-proses";
import { useStatusDokumen } from "./use-status-dokumen";
import { TEKS_DOKUMEN } from "./teks";

type Props = {
  dokumen: StatusDokumenApi;
  /**
   * `upload` (S-11): status akhir ditampilkan di panel ini.
   * `detail` (S-07): status akhir → router.refresh() agar halaman server menggambar ulang.
   */
  mode: "upload" | "detail";
  isKuotaTersedia?: boolean;
  onUlang?: () => void;
};

/** PanelPemrosesan (FT-02 K-11, FT-03 S-07 K-08): 5 tahap, diperbarui otomatis. */
export function PanelPemrosesan({ dokumen: awal, mode, isKuotaTersedia = false, onUlang }: Props) {
  const router = useRouter();
  const { tampilkan } = useSnackbar();
  const { dokumen, hilang } = useStatusDokumen(awal);
  const statusAwal = useRef(awal.status);

  // S-07: status berubah → muat ulang halaman + snackbar MSG-U08 (tanpa aksi "Buka").
  useEffect(() => {
    if (mode !== "detail" || statusAwal.current !== "diproses") return;
    if (hilang) router.push(rute.beranda);
    else if (dokumen.status !== "diproses") {
      if (dokumen.status === "siap") tampilkan(pesan("MSG-U08", { judul: dokumen.judul, jumlah: dokumen.jumlahTopik ?? 0 }));
      router.refresh();
    }
  }, [mode, dokumen.status, dokumen.judul, dokumen.jumlahTopik, hilang, router, tampilkan]);

  if (mode === "upload" && dokumen.status !== "diproses") {
    return <PanelHasilProses dokumen={dokumen} onUlang={() => onUlang?.()} />;
  }

  const i = indeksTahap(dokumen.tahap);
  const labelTahap = dokumen.tahap ? TAHAP_DOKUMEN[dokumen.tahap] : TAHAP_DOKUMEN.membaca;
  return (
    <Kartu radius="lg" padding="lg" className="flex flex-col gap-5">
      <div>
        <h2 className="text-title-medium text-on-surface">
          {mode === "upload" ? isiPlaceholder(TEKS_DOKUMEN.memproses, { judul: dokumen.judul }) : TEKS.memproses}
        </h2>
        <p className="mt-1 text-label-medium text-on-surface-variant" aria-live="polite">
          {isiPlaceholder(TEKS.tahapKe, { i: i + 1, total: JUMLAH_TAHAP })} · {labelTahap}
        </p>
      </div>
      <ProgressLinear nilai={persenTahap(dokumen.status, dokumen.tahap)} label={TEKS_DOKUMEN.progresPemrosesan} />
      <DaftarTahapProses
        status={dokumen.status}
        tahap={dokumen.tahap}
        jumlahHalaman={dokumen.jumlahHalaman}
        orientasi={mode === "upload" ? "responsif" : "vertikal"}
      />
      {mode === "upload" ? (
        <>
          <Banner nada="info">{TEKS_DOKUMEN.bolehTinggalkan}</Banner>
          <div className="flex flex-col gap-2 medium:flex-row">
            <TombolLink href={rute.beranda} varian="tonal">
              {LABEL.keBeranda}
            </TombolLink>
            {isKuotaTersedia && (
              <Tombol varian="text" onClick={() => onUlang?.()}>
                {TEKS_DOKUMEN.unggahLain}
              </Tombol>
            )}
          </div>
        </>
      ) : (
        <p className="text-body-medium text-on-surface-variant">{TEKS_DOKUMEN.topikMunculNanti}</p>
      )}
    </Kartu>
  );
}

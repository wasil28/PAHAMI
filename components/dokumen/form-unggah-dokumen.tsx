"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Banner, FileDropZone, TextField, Tombol, TombolLink, useSnackbar } from "@/components/ui";
import { JUDUL_DOKUMEN_MAX, TIPE_FILE_DIIZINKAN } from "@/lib/config";
import { LABEL, PESAN, isiPlaceholder, pesan } from "@/lib/pesan";
import { judulDariNamaFile, pesanValidasiFilePdf, skemaJudulDokumen } from "@/lib/validasi/dokumen";
import { rute } from "@/lib/dokumen/tahap";
import { isKuotaPenuh, type KuotaDokumen, type StatusDokumenApi } from "@/lib/dokumen/tipe";
import { PanelPemrosesan } from "./panel-pemrosesan";
import { ProgresUnggahan } from "./progres-unggahan";
import { useUnggahDokumen } from "./use-unggah-dokumen";
import { TEKS_DOKUMEN } from "./teks";

type Props = {
  maxUkuranMb: number;
  maxHalaman: number;
  kuota: KuotaDokumen;
  /** Dokumen dari /upload?dokumen={id} → langsung panel pemrosesan. */
  dokumenAwal?: StatusDokumenApi | null;
};

/** FormUnggahDokumen (S-11): pilih → validasi (BR-01/02/21) → unggah → pantau 5 tahap. */
export function FormUnggahDokumen({ maxUkuranMb, maxHalaman, kuota, dokumenAwal }: Props) {
  const router = useRouter();
  const { tampilkan } = useSnackbar();
  const { fase, mulai, batal, ulang } = useUnggahDokumen(dokumenAwal);
  const [file, setFile] = useState<File | null>(null);
  const [galatFile, setGalatFile] = useState<string | null>(null);
  const [judul, setJudul] = useState("");
  const [judulDisentuh, setJudulDisentuh] = useState(false);
  const [galatUmum, setGalatUmum] = useState<string | null>(null);
  const [kuotaPenuhLokal, setKuotaPenuhLokal] = useState(false);
  const [kunciZona, setKunciZona] = useState(0); // remount FileDropZone untuk mengosongkan pilihan

  const kuotaPenuh = kuotaPenuhLokal || isKuotaPenuh(kuota);
  // Judul kosong → nama file tanpa .pdf (BP-03 langkah 2), tetap wajib 3–100 (BR-21).
  const judulEfektif = judul.trim() || (file ? judulDariNamaFile(file.name) : "");
  const judulValid = skemaJudulDokumen.safeParse(judulEfektif).success;
  const galatJudul = judulDisentuh && file && !judulValid ? PESAN["MSG-U04"] : null;

  function reset() {
    setFile(null);
    setJudul("");
    setJudulDisentuh(false);
    setGalatFile(null);
    setGalatUmum(null);
    setKunciZona((k) => k + 1);
  }

  function pilihFile(f: File | null) {
    setGalatUmum(null);
    if (!f) return reset();
    const galat = pesanValidasiFilePdf(f, maxUkuranMb); // BR-01, BR-02 (server memvalidasi ulang)
    if (galat) {
      setFile(null);
      setGalatFile(galat);
      setKunciZona((k) => k + 1); // file ditolak tidak ditampilkan (FT-02 K-08)
      return;
    }
    setGalatFile(null);
    setFile(f);
    setJudul(judulDariNamaFile(f.name));
  }

  async function kirim(e?: FormEvent) {
    e?.preventDefault();
    setJudulDisentuh(true);
    if (!file || !judulValid || kuotaPenuh) return;
    setGalatUmum(null);
    const hasil = await mulai(file, judulEfektif);
    if (!hasil.ok) {
      if (hasil.kuotaPenuh) setKuotaPenuhLokal(true); // BR-04: penuh dari tab lain
      setGalatUmum(hasil.pesan);
      return;
    }
    router.refresh(); // kuota K-07 +1
  }

  if (fase.jenis === "mengunggah") {
    return (
      <ProgresUnggahan
        judul={fase.judul}
        terkirim={fase.terkirim}
        total={fase.total}
        onBatal={async () => {
          await batal();
          tampilkan(TEKS_DOKUMEN.unggahanDibatalkan);
        }}
      />
    );
  }
  if (fase.jenis === "memproses") {
    return (
      <PanelPemrosesan
        dokumen={fase.dokumen}
        mode="upload"
        isKuotaTersedia={!isKuotaPenuh(kuota)}
        onUlang={() => {
          reset();
          ulang();
          router.replace(rute.upload);
          router.refresh();
        }}
      />
    );
  }
  if (fase.jenis === "terputus") {
    return (
      <Banner
        nada="error"
        ikon="wifi_off"
        aksi={
          <>
            <Tombol varian="filled" onClick={() => kirim()}>
              {LABEL.cobaLagi}
            </Tombol>
            <Tombol varian="text" onClick={() => (reset(), ulang())}>
              {LABEL.cobaFileLain}
            </Tombol>
          </>
        }
      >
        {galatUmum ?? PESAN["MSG-U05"]}
      </Banner>
    );
  }

  return (
    <form onSubmit={kirim} className="flex flex-col gap-4" noValidate>
      {kuotaPenuh && (
        <Banner
          nada="error"
          ikon="block"
          aksi={
            <TombolLink href={rute.beranda} varian="tonal">
              {TEKS_DOKUMEN.kelolaDokumen}
            </TombolLink>
          }
        >
          {pesan("MSG-U03", { maks: kuota.maks })}
        </Banner>
      )}
      {galatUmum && !kuotaPenuh && <Banner nada="error">{galatUmum}</Banner>}
      <FileDropZone
        key={kunciZona}
        accept={`${TIPE_FILE_DIIZINKAN},.pdf`}
        judul={TEKS_DOKUMEN.judulAreaUnggah}
        teksBantuan={isiPlaceholder(TEKS_DOKUMEN.bantuanAreaUnggah, { mb: maxUkuranMb, halaman: maxHalaman })}
        onPilih={pilihFile}
        error={galatFile ?? undefined}
        nonaktif={kuotaPenuh}
      />
      {file && (
        <TextField
          label={TEKS_DOKUMEN.labelJudulOpsional}
          value={judul}
          maxLength={JUDUL_DOKUMEN_MAX}
          penghitung
          teksPendukung={TEKS_DOKUMEN.bantuanJudul}
          error={galatJudul ?? undefined}
          onChange={(e) => setJudul(e.target.value)}
          onBlur={() => setJudulDisentuh(true)}
        />
      )}
      <Tombol type="submit" varian="filled" ikon="auto_awesome" disabled={!file || !judulValid || kuotaPenuh} className="medium:self-end">
        {LABEL.prosesPdf}
      </Tombol>
    </form>
  );
}

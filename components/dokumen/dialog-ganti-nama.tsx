"use client";

import { useState } from "react";
import { Dialog, TextField, Tombol } from "@/components/ui";
import { JUDUL_DOKUMEN_MAX } from "@/lib/config";
import { LABEL, LABEL_KOLOM, PESAN, TEKS, pesanWajib } from "@/lib/pesan";
import { skemaJudulDokumen } from "@/lib/validasi/dokumen";
import { ubahJudulDokumen } from "@/lib/dokumen/klien";
import { TEKS_DOKUMEN } from "./teks";

type Props = {
  terbuka: boolean;
  dokumenId: number;
  judulSekarang: string;
  onTutup: () => void;
  onSukses: (judulBaru: string) => void;
};

/** Dialog Ganti nama (FT-03 K-20). BR-21: 3–100 karakter; hanya dokumen `siap`. Isi direset dengan `key`. */
export function DialogGantiNama({ terbuka, dokumenId, judulSekarang, onTutup, onSukses }: Props) {
  const [judul, setJudul] = useState(judulSekarang);
  const [disentuh, setDisentuh] = useState(false);
  const [menyimpan, setMenyimpan] = useState(false);
  const [galatServer, setGalatServer] = useState<string | null>(null);

  const rapi = judul.trim();
  const cek = skemaJudulDokumen.safeParse(judul);
  const galatKolom = !disentuh ? null : rapi === "" ? pesanWajib(LABEL_KOLOM.judul) : cek.success ? null : PESAN["MSG-U04"];
  const bisaSimpan = cek.success && rapi !== judulSekarang.trim() && !menyimpan;

  async function simpan() {
    setDisentuh(true);
    if (!bisaSimpan || !cek.success) return;
    setMenyimpan(true);
    setGalatServer(null);
    const hasil = await ubahJudulDokumen(dokumenId, cek.data);
    setMenyimpan(false);
    if (!hasil.ok) {
      setGalatServer(hasil.pesan);
      return;
    }
    onSukses(hasil.data.judul);
  }

  return (
    <Dialog
      terbuka={terbuka}
      onTutup={onTutup}
      judul={TEKS_DOKUMEN.gantiNamaJudul}
      lebar="md"
      kunci={menyimpan}
      aksi={
        <>
          <Tombol varian="text" onClick={onTutup} disabled={menyimpan}>
            {LABEL.batal}
          </Tombol>
          <Tombol varian="text" onClick={simpan} disabled={!bisaSimpan} memuat={menyimpan} teksMemuat={TEKS.menyimpan}>
            {LABEL.simpan}
          </Tombol>
        </>
      }
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void simpan();
        }}
      >
        <TextField
          label={LABEL_KOLOM.judul}
          value={judul}
          maxLength={JUDUL_DOKUMEN_MAX}
          penghitung
          autoFocus
          onFocus={(e) => e.currentTarget.select()}
          readOnly={menyimpan}
          onChange={(e) => setJudul(e.target.value)}
          onBlur={() => setDisentuh(true)}
          error={galatKolom ?? undefined}
        />
        {galatServer && (
          <p role="alert" className="mt-2 text-body-small text-error">
            {galatServer}
          </p>
        )}
      </form>
    </Dialog>
  );
}

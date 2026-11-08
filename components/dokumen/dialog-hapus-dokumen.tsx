"use client";

import { useState } from "react";
import { ConfirmDialog } from "@/components/ui";
import { LABEL, pesan } from "@/lib/pesan";
import { hapusDokumen } from "@/lib/dokumen/klien";
import { TEKS_DOKUMEN } from "./teks";

type Props = {
  terbuka: boolean;
  dokumenId: number;
  judul: string;
  onTutup: () => void;
  onSukses: () => void;
};

/** Dialog Hapus (FT-03 K-21). BR-20: permanen beserta semua turunan; MSG-D02. */
export function DialogHapusDokumen({ terbuka, dokumenId, judul, onTutup, onSukses }: Props) {
  const [menghapus, setMenghapus] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);

  async function hapus() {
    setMenghapus(true);
    setGalat(null);
    const hasil = await hapusDokumen(dokumenId);
    setMenghapus(false);
    if (!hasil.ok) {
      setGalat(hasil.pesan); // MSG-G01 / MSG-D04
      return;
    }
    onSukses();
  }

  return (
    <ConfirmDialog
      terbuka={terbuka}
      onTutup={() => {
        setGalat(null);
        onTutup();
      }}
      onKonfirmasi={hapus}
      judul={TEKS_DOKUMEN.hapusJudul}
      pesan={
        <>
          <span>{pesan("MSG-D02", { judul })}</span>
          {galat && (
            <span role="alert" className="mt-2 block text-body-small text-error">
              {galat}
            </span>
          )}
        </>
      }
      labelKonfirmasi={LABEL.hapusPermanen}
      berbahaya
      memuat={menghapus}
      teksMemuat={TEKS_DOKUMEN.menghapus}
    />
  );
}

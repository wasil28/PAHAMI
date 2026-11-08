"use client";

import { Dialog, Tombol } from "@/components/ui";
import { LABEL } from "@/lib/pesan";
import { TEKS_LATIHAN } from "./teks";

/**
 * K-11: MSG-L03 dipecah menjadi judul + isi (BR-33: percobaan belum disimpan).
 * Esc / scrim = Lanjut latihan. "Lanjut latihan" lebih dulu di DOM → fokus awal dialog native.
 */
export function DialogKeluarLatihan({ terbuka, onLanjut, onKeluar }: { terbuka: boolean; onLanjut: () => void; onKeluar: () => void }) {
  return (
    <Dialog
      terbuka={terbuka}
      onTutup={onLanjut}
      judul={TEKS_LATIHAN.judulKeluar}
      aksi={
        <>
          <Tombol varian="text" onClick={onLanjut} autoFocus>
            {LABEL.lanjutLatihan}
          </Tombol>
          <Tombol varian="text" onClick={onKeluar} className="text-error!">
            {LABEL.keluar}
          </Tombol>
        </>
      }
    >
      {TEKS_LATIHAN.isiKeluar}
    </Dialog>
  );
}

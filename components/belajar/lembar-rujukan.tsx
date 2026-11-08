"use client";

import { Dialog, Tombol } from "@/components/ui";
import { LABEL, isiPlaceholder } from "@/lib/pesan";
import type { RujukanMateri } from "@/lib/data/topik";
import { TEKS_BELAJAR } from "./teks";

type Props = {
  rujukan: RujukanMateri | null;
  judulDokumen: string;
  onTutup: () => void;
};

/**
 * K-14 Lembar rujukan halaman (KEPUTUSAN C6): kutipan lengkap dari buku. Dialog native mengunci
 * fokus, Esc/scrim menutup, fokus kembali ke chip pemicu. "Buka PDF di halaman X" belum dibuat
 * (butuh signed URL Storage dari area Dokumen).
 */
export function LembarRujukan({ rujukan, judulDokumen, onTutup }: Props) {
  return (
    <Dialog
      terbuka={rujukan !== null}
      onTutup={onTutup}
      lebar="md"
      judul={rujukan ? isiPlaceholder(TEKS_BELAJAR.rujukanHalamanKe, { halaman: rujukan.halaman }) : ""}
      aksi={
        <Tombol varian="text" onClick={onTutup}>
          {LABEL.tutup}
        </Tombol>
      }
    >
      {rujukan && (
        <>
          <p className="text-body-small text-on-surface-variant">{judulDokumen}</p>
          <blockquote className="mt-3 border-l-2 border-primary pl-4 text-body-large text-on-surface">
            “{rujukan.kutipan}”
          </blockquote>
        </>
      )}
    </Dialog>
  );
}

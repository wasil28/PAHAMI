"use client";

import { Ikon, TextField } from "@/components/ui";
import type { ItemPengaturan } from "@/lib/data/admin";
import { TEKS } from "@/lib/pesan";
import { RENTANG_PENGATURAN, type KodePengaturan } from "@/lib/validasi/admin";

// Info saat nilai diturunkan: BR-28 — perubahan tidak berlaku surut (FT-10 K-05c).
const INFO_PENURUNAN: Record<KodePengaturan, string> = {
  max_dokumen: "Mahasiswa yang sudah punya lebih banyak dokumen tetap menyimpannya, tetapi tidak bisa mengunggah lagi sampai di bawah batas.",
  max_halaman: "Hanya berlaku untuk unggahan berikutnya. Dokumen yang sudah ada tidak berubah.",
  max_ukuran_mb: "Hanya berlaku untuk unggahan berikutnya. Dokumen yang sudah ada tidak berubah.",
  max_pertanyaan_harian: "Berlaku mulai pertanyaan berikutnya hari ini.",
};

export const idKolom = (kode: KodePengaturan) => `kuota-${kode}`;

export type KolomKuotaProps = {
  item: ItemPengaturan;
  nilai: string;
  tersimpan: number;
  error?: string;
  readOnly?: boolean;
  onUbah: (nilai: string) => void;
  onBlur: () => void;
};

/** Satu kolom kuota (FT-10 K-05…K-08): angka + satuan, rentang BR-29, penanda "Diubah". */
export function KolomKuota({ item, nilai, tersimpan, error, readOnly, onUbah, onBlur }: KolomKuotaProps) {
  const r = RENTANG_PENGATURAN[item.kode];
  const diubah = nilai.trim() !== String(tersimpan);
  const angka = /^\d+$/.test(nilai.trim()) ? Number(nilai) : null;
  const turun = !error && angka !== null && angka < tersimpan;

  return (
    <div className="flex max-w-[360px] flex-col gap-1">
      <TextField
        id={idKolom(item.kode)}
        label={
          <span className="inline-flex items-center gap-2">
            {r.label}
            {diubah && (
              <span className="inline-flex items-center gap-1 text-label-small text-on-surface-variant">
                <span aria-hidden className="size-1.5 rounded-full bg-tertiary" />
                {TEKS.diubah}
              </span>
            )}
          </span>
        }
        inputMode="numeric"
        autoComplete="off"
        maxLength={9}
        required
        value={nilai}
        readOnly={readOnly}
        // Hanya digit yang masuk (FT-10 §3A.4); validasi rentang saat blur/simpan.
        onChange={(e) => onUbah(e.target.value.replace(/\D/g, ""))}
        onBlur={onBlur}
        error={error}
        teksPendukung={`Default ${item.nilaiDefault} · Rentang ${item.min}–${item.maks}`}
        ikonBelakang={<span className="mr-3 text-body-large text-on-surface-variant">{r.satuan}</span>}
      />
      <p className="px-4 text-body-small text-on-surface-variant">{r.dampak}</p>
      {turun && (
        <p className="mt-1 flex items-start gap-2 rounded-sm bg-secondary-container px-3 py-2 text-body-small text-on-secondary-container">
          <Ikon nama="info" ukuran={16} className="mt-0.5" />
          {INFO_PENURUNAN[item.kode]}
        </p>
      )}
    </div>
  );
}

"use client";

import { Ikon, Skeleton, TombolLink } from "@/components/ui";
import { isiPlaceholder } from "@/lib/pesan";
import { useDaftarMateri } from "./konteks-materi";
import { hrefMateri } from "./tautan-materi";
import { TEKS_BELAJAR } from "./teks";

/**
 * Ajakan utama S-08 di atas ringkasan: masuk ke materi pertama, atau melanjutkan materi pertama
 * yang belum dibaca. Saat kerangka materi masih disusun / gagal, status lengkapnya ada di kartu
 * "Isi topik" — di sini cukup kerangka tombol atau tidak tampil.
 */
export function MulaiMateri() {
  const { status, materi, dokumenId, topikId } = useDaftarMateri();

  if (status === "gagal") return null;
  if (status === "menyiapkan" || materi.length === 0) {
    return (
      <div aria-hidden className="mb-8 flex max-w-[70ch] flex-col gap-3 rounded-lg bg-surface-container p-4 medium:flex-row medium:items-center">
        <Skeleton className="h-4 flex-1" />
        <Skeleton className="h-10 w-full rounded-full medium:w-52" />
      </div>
    );
  }

  const dibaca = materi.filter((m) => m.sudahDibaca).length;
  const belum = materi.find((m) => !m.sudahDibaca);
  const tujuan = belum ?? materi[0];
  const label =
    dibaca === 0
      ? TEKS_BELAJAR.mulaiMateri
      : belum
        ? isiPlaceholder(TEKS_BELAJAR.lanjutkanMateri, { urutan: belum.urutan })
        : TEKS_BELAJAR.ulangiMateri;
  const teks =
    dibaca === 0
      ? isiPlaceholder(TEKS_BELAJAR.teksMulaiMateri, { jumlah: materi.length })
      : belum
        ? isiPlaceholder(TEKS_BELAJAR.teksLanjutkanMateri, { dibaca, jumlah: materi.length, judul: belum.judul })
        : TEKS_BELAJAR.teksSemuaDibaca;

  return (
    <div className="mb-8 flex max-w-[70ch] animate-masuk flex-col gap-3 rounded-lg bg-primary-container p-4 text-on-primary-container medium:flex-row medium:items-center">
      <p className="flex flex-1 items-start gap-2 text-body-large">
        <Ikon nama="school" className="shrink-0" />
        {teks}
      </p>
      <TombolLink
        href={hrefMateri(dokumenId, topikId, tujuan.id)}
        ikonKanan="arrow_forward"
        varian={belum ? "filled" : "tonal"}
        className="w-full shrink-0 medium:w-auto"
      >
        {label}
      </TombolLink>
    </div>
  );
}

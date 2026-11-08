import type { Metadata } from "next";
import { Ikon } from "@/components/ui";
import { KartuLanjutkanBelajar } from "@/components/beranda/kartu-lanjutkan-belajar";
import { RingkasanStatistik } from "@/components/beranda/ringkasan-statistik";
import { SapaanBeranda } from "@/components/beranda/sapaan-beranda";
import { StateKosongBeranda } from "@/components/beranda/state-kosong-beranda";
import { KartuDokumen } from "@/components/dokumen/kartu-dokumen";
import { PemantauDokumen } from "@/components/dokumen/pemantau-dokumen";
import { TombolUploadPdf } from "@/components/dokumen/tombol-upload-pdf";
import { TEKS_DOKUMEN } from "@/components/dokumen/teks";
import { wajibLogin } from "@/lib/auth/sesi";
import { getDataBeranda } from "@/lib/data/dokumen";
import { isKuotaPenuh } from "@/lib/dokumen/tipe";
import { namaDepan } from "@/lib/format";
import { TEKS, isiPlaceholder } from "@/lib/pesan";
import { cn } from "@/lib/tema/cn";

export const metadata: Metadata = { title: "Beranda" };

/**
 * S-06 Beranda. Memuat data sekaligus membereskan dokumen macet (A8) dan dokumen gagal
 * > 7 hari (A9). Dokumen terbaru di atas.
 */
export default async function HalamanBeranda() {
  const pengguna = await wajibLogin("mahasiswa");
  const { dokumen, kuota, lanjutkan, maxUkuranMb, rataRataSkor } = await getDataBeranda();
  const kosong = dokumen.length === 0;
  const penuh = isKuotaPenuh(kuota);
  const diproses = dokumen.filter((d) => d.status === "diproses").map((d) => ({ id: d.id, tahap: d.tahap }));

  return (
    <>
      <SapaanBeranda
        namaDepan={namaDepan(pengguna.nama)}
        isKosong={kosong}
        // KEPUTUSAN C2: Upload Tonal bila "Lanjut belajar" (Filled) tampil; disembunyikan saat kosong.
        aksi={kosong ? undefined : <TombolUploadPdf kuota={kuota} varian={lanjutkan ? "tonal" : "filled"} />}
      />

      {kosong ? (
        <StateKosongBeranda maxUkuranMb={maxUkuranMb} />
      ) : (
        <div className="flex flex-col gap-6">
          {lanjutkan && <KartuLanjutkanBelajar data={lanjutkan} />}
          <RingkasanStatistik dokumen={dokumen} rataRataSkor={rataRataSkor} />

          <section aria-labelledby="judul-dokumen-kamu" className="flex flex-col gap-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 id="judul-dokumen-kamu" className="text-title-large text-on-surface">
                {isiPlaceholder(TEKS_DOKUMEN.dokumenKamu, { n: dokumen.length })}
              </h2>
              {/* K-04 info kuota (BR-04); merah bila penuh. */}
              <p className={cn("flex items-center gap-1 text-body-small", penuh ? "text-error" : "text-on-surface-variant")}>
                <Ikon nama={penuh ? "block" : "folder"} ukuran={16} />
                {isiPlaceholder(TEKS.kuotaDokumen, { n: kuota.terpakai, maks: kuota.maks })}
              </p>
            </div>
            <ul className="grid gap-3 medium:grid-cols-2 large:grid-cols-3">
              {dokumen.map((d) => (
                <KartuDokumen key={d.id} dokumen={d} />
              ))}
            </ul>
          </section>
        </div>
      )}
      <PemantauDokumen dokumen={diproses} />
    </>
  );
}

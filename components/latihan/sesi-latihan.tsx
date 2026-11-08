"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Banner, Tombol } from "@/components/ui";
import type { SoalLatihan } from "@/lib/data/latihan";
import { PERTANYAAN_MAX } from "@/lib/config";
import { LABEL, TEKS, isiPlaceholder } from "@/lib/pesan";
import type { StatusTopik } from "@/types/database";
import { HURUF_TAMPIL } from "./acak";
import { DialogKeluarLatihan } from "./dialog-keluar-latihan";
import { DialogTanyaAI } from "./dialog-tanya-ai";
import { HeaderLatihan } from "./header-latihan";
import { KartuSoal } from "./kartu-soal";
import { TEKS_LATIHAN } from "./teks";
import { UmpanBalikJawaban } from "./umpan-balik-jawaban";
import { useSesiLatihan } from "./use-sesi-latihan";
import { useTombolLatihan } from "./use-tombol-latihan";

type Props = {
  dokumenId: number;
  topik: { id: number; judul: string };
  soal: SoalLatihan[];
  urutanPilihan: number[][];
  statusAwal: StatusTopik;
  hrefMateri: string;
};

/** S-09: satu soal per layar dengan umpan balik langsung (BP-06). */
export function SesiLatihan({ dokumenId, topik, soal, urutanPilihan, statusAwal, hrefMateri }: Props) {
  const router = useRouter();
  const hrefHasil = (id: number) => `/dokumen/${dokumenId}/topik/${topik.id}/latihan/hasil/${id}`;
  const s = useSesiLatihan({ topikId: topik.id, soal, hrefHasil, statusAwal });
  const [dialogKeluar, setDialogKeluar] = useState(false);
  const [dialogTanya, setDialogTanya] = useState(false);
  const refSoal = useRef<HTMLHeadingElement>(null);
  const refUmpan = useRef<HTMLParagraphElement>(null);
  const urutan = urutanPilihan[s.indeks] ?? [0, 1, 2, 3];

  // Tanpa interaksi tidak ada yang hilang → keluar langsung tanpa dialog (K-01).
  const mintaKeluar = () => (s.adaInteraksi ? setDialogKeluar(true) : router.push(hrefMateri));

  useTombolLatihan({
    nonaktif: dialogKeluar || dialogTanya,
    pilihPosisi: (posisi) => {
      const asli = urutan[posisi];
      if (asli !== undefined) s.pilih(asli);
    },
    enter: () => (s.hasilSekarang ? s.lanjut() : void s.periksa()),
    esc: mintaKeluar,
    adaInteraksi: s.adaInteraksi,
  });

  // Soal baru → fokus ke teks soal; setelah diperiksa → fokus ke kepala umpan balik (a11y §5).
  useEffect(() => {
    if (s.indeks > 0) refSoal.current?.focus();
  }, [s.indeks]);
  useEffect(() => {
    if (s.hasilSekarang) refUmpan.current?.focus();
  }, [s.hasilSekarang]);

  if (!s.sekarang) return null;
  const hasil = s.hasilSekarang;
  const posisiKunci = hasil ? urutan.indexOf(hasil.kunci) : -1;
  const teksKunci = hasil ? s.sekarang.pilihan[hasil.kunci] : "";
  const saran = [
    isiPlaceholder(TEKS_LATIHAN.saranTanya, { kunci: teksKunci, soal: s.sekarang.pertanyaan }).slice(0, PERTANYAAN_MAX),
    TEKS_LATIHAN.saranTanyaUmum,
  ];

  return (
    <>
      <HeaderLatihan
        judulTopik={topik.judul}
        nomor={s.indeks + 1}
        total={soal.length}
        jumlahDiperiksa={s.jumlahDiperiksa}
        onKeluar={mintaKeluar}
      />
      <div key={s.sekarang.id} className="animate-masuk">
        <KartuSoal
          soal={s.sekarang}
          urutan={urutan}
          dipilih={s.dipilih}
          hasil={hasil}
          terkunci={Boolean(hasil) || s.memeriksa}
          onPilih={s.pilih}
          refJudul={refSoal}
        />
        {hasil && (
          <UmpanBalikJawaban
            isBenar={hasil.isBenar}
            hurufBenar={HURUF_TAMPIL[posisiKunci] ?? ""}
            pembahasan={hasil.pembahasan}
            halamanRujukan={hasil.halamanRujukan}
            onTanyaAI={() => setDialogTanya(true)}
            refJudul={refUmpan}
          />
        )}
      </div>

      {s.galatPeriksa && <Banner nada="error" className="mt-4">{s.galatPeriksa}</Banner>}
      {s.galatSimpan && (
        <Banner
          nada="error"
          className="mt-4"
          aksi={
            <Tombol varian="text" onClick={() => void s.simpan()}>
              {LABEL.cobaLagi}
            </Tombol>
          }
        >
          {s.galatSimpan}
        </Banner>
      )}

      {/* K-05/K-07: menempel di bawah (di atas navigation bar) pada Compact; satu Filled di layar. */}
      <div className="sticky bottom-[calc(80px+env(safe-area-inset-bottom))] z-10 -mx-4 mt-6 flex flex-col items-stretch gap-2 bg-surface-container px-4 py-3 medium:static medium:mx-0 medium:items-end medium:bg-transparent medium:px-0">
        {hasil ? (
          <Tombol onClick={s.lanjut} memuat={s.menyimpan} teksMemuat={TEKS.menyimpanHasil} ikonKanan={s.terakhir ? undefined : "arrow_forward"}>
            {s.terakhir ? LABEL.lihatHasil : LABEL.soalBerikutnya}
          </Tombol>
        ) : (
          <>
            <Tombol
              onClick={() => void s.periksa()}
              disabled={s.dipilih === undefined}
              memuat={s.memeriksa}
              teksMemuat={TEKS.memeriksa}
              aria-describedby="petunjuk-pilih"
            >
              {LABEL.periksaJawaban}
            </Tombol>
            <p id="petunjuk-pilih" className="text-center text-body-small text-on-surface-variant medium:text-right">
              {s.dipilih === undefined ? TEKS_LATIHAN.pilihSatu : null}
              <span className="hidden pointer-fine:inline"> {TEKS_LATIHAN.petunjukTombol}</span>
            </p>
          </>
        )}
      </div>

      <DialogKeluarLatihan terbuka={dialogKeluar} onLanjut={() => setDialogKeluar(false)} onKeluar={() => router.push(hrefMateri)} />
      <DialogTanyaAI
        terbuka={dialogTanya}
        onTutup={() => setDialogTanya(false)}
        dokumenId={dokumenId}
        topikId={topik.id}
        judulTopik={topik.judul}
        saranPertanyaan={saran}
      />
    </>
  );
}

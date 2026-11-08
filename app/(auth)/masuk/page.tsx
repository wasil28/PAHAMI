import type { Metadata } from "next";
import Link from "next/link";
import { kelasTombol } from "@/components/ui";
import { BarisTautan, JudulAuth } from "@/components/auth/judul-auth";
import { FormMasuk, type PesanAwalMasuk } from "@/components/auth/form-masuk";
import { SnackbarKeluar } from "@/components/auth/snackbar-keluar";
import { PARAM } from "@/components/auth/rute";
import { TEKS_AUTH } from "@/components/auth/teks";
import { LABEL } from "@/lib/pesan";

export const metadata: Metadata = { title: TEKS_AUTH.masuk.judul };

type ParamCari = Record<string, string | string[] | undefined>;
const ambil = (sp: ParamCari, kunci: string) => {
  const v = sp[kunci];
  return Array.isArray(v) ? v[0] : v;
};

/**
 * S-02 Masuk. Query yang dikenali: ?lanjut=/path (tujuan setelah login), ?nonaktif=1 (MSG-A02, BR-23),
 * ?sesi=habis (MSG-A03), ?sandi=diubah (MSG-A07), ?keluar=1 (snackbar MSG-G03).
 * Pengguna yang sudah login dialihkan oleh proxy.ts sebelum halaman ini dirender.
 */
export default async function HalamanMasuk(props: PageProps<"/masuk">) {
  const sp = (await props.searchParams) as ParamCari;
  const pesanAwal: PesanAwalMasuk | undefined = ambil(sp, PARAM.nonaktif)
    ? "nonaktif"
    : ambil(sp, PARAM.sandi) === "diubah"
      ? "sandi-diubah"
      : ambil(sp, PARAM.sesi) === "habis"
        ? "sesi-habis"
        : undefined;

  return (
    <>
      <JudulAuth judul={TEKS_AUTH.masuk.judul} subjudul={TEKS_AUTH.masuk.subjudul} />
      <FormMasuk pesanAwal={pesanAwal} lanjut={ambil(sp, PARAM.lanjut)} />
      <BarisTautan teks={TEKS_AUTH.masuk.belumPunyaAkun}>
        <Link href="/daftar" className={kelasTombol({ varian: "text" })}>
          {LABEL.daftar}
        </Link>
      </BarisTautan>
      {ambil(sp, PARAM.keluar) && <SnackbarKeluar />}
    </>
  );
}

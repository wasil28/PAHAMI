import type { Metadata } from "next";
import Link from "next/link";
import { kelasTombol } from "@/components/ui";
import { BarisTautan, JudulAuth } from "@/components/auth/judul-auth";
import { FormDaftar } from "@/components/auth/form-daftar";
import { TEKS_AUTH } from "@/components/auth/teks";
import { LABEL } from "@/lib/pesan";

export const metadata: Metadata = { title: TEKS_AUTH.daftar.judul };

/** S-03 Daftar (BP-01). Pengguna yang sudah login dialihkan oleh proxy.ts. */
export default function HalamanDaftar() {
  return (
    <>
      <JudulAuth judul={TEKS_AUTH.daftar.judul} subjudul={TEKS_AUTH.daftar.subjudul} />
      <FormDaftar />
      <BarisTautan teks={TEKS_AUTH.daftar.sudahPunyaAkun}>
        <Link href="/masuk" className={kelasTombol({ varian: "text" })}>
          {LABEL.masuk}
        </Link>
      </BarisTautan>
    </>
  );
}

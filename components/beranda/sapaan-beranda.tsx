import type { ReactNode } from "react";
import { PageHeader } from "@/components/ui";
import { isiPlaceholder } from "@/lib/pesan";
import { TEKS_DOKUMEN } from "@/components/dokumen/teks";

/** SapaanBeranda (FT-03 K-02) — satu-satunya h1 S-06. */
export function SapaanBeranda({ namaDepan, isKosong, aksi }: { namaDepan: string; isKosong: boolean; aksi?: ReactNode }) {
  return (
    <PageHeader
      judul={isiPlaceholder(TEKS_DOKUMEN.sapaan, { nama: namaDepan })}
      deskripsi={isKosong ? TEKS_DOKUMEN.ajakMulai : TEKS_DOKUMEN.ajakLanjut}
      aksi={aksi}
    />
  );
}

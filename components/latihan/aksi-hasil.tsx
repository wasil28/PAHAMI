import { TombolLink } from "@/components/ui";
import { LABEL } from "@/lib/pesan";
import type { StatusTopik } from "@/types/database";
import { TEKS_LATIHAN } from "./teks";

type Props = {
  statusBaru: StatusTopik;
  hrefUlangi: string;
  hrefMateri: string;
  /** null = topik terakhir → "Ke halaman dokumen". */
  hrefBerikutnya: string | null;
  hrefDokumen: string;
};

/**
 * K-06. Status selesai → Filled "Topik berikutnya", Tonal "Ulangi", Outlined "Kembali ke materi".
 * Status lemah → Filled "Ulangi", Tonal "Kembali ke materi", Outlined "Topik berikutnya" (BR-13).
 */
export function AksiHasil({ statusBaru, hrefUlangi, hrefMateri, hrefBerikutnya, hrefDokumen }: Props) {
  const maju = hrefBerikutnya
    ? { href: hrefBerikutnya, label: LABEL.topikBerikutnya, ikon: "arrow_forward" }
    : { href: hrefDokumen, label: TEKS_LATIHAN.keHalamanDokumen, ikon: "description" };
  const selesai = statusBaru === "selesai";
  return (
    <div className="flex flex-col gap-2">
      {selesai ? (
        <>
          <TombolLink href={maju.href} ikonKanan={maju.ikon} lebarPenuh>
            {maju.label}
          </TombolLink>
          <TombolLink href={hrefUlangi} varian="tonal" ikon="replay" lebarPenuh>
            {LABEL.ulangiLatihan}
          </TombolLink>
          <TombolLink href={hrefMateri} varian="outlined" ikon="menu_book" lebarPenuh>
            {LABEL.kembaliKeMateri}
          </TombolLink>
        </>
      ) : (
        <>
          <TombolLink href={hrefUlangi} ikon="replay" lebarPenuh>
            {LABEL.ulangiLatihan}
          </TombolLink>
          <TombolLink href={hrefMateri} varian="tonal" ikon="menu_book" lebarPenuh>
            {LABEL.pelajariLagi}
          </TombolLink>
          <TombolLink href={maju.href} varian="outlined" ikonKanan={maju.ikon} lebarPenuh>
            {maju.label}
          </TombolLink>
        </>
      )}
    </div>
  );
}

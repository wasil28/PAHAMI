import { ProgressSteps } from "@/components/ui";
import { isiPlaceholder, TAHAP_DOKUMEN, type StatusDokumen, type TahapDokumen } from "@/lib/pesan";
import { indeksTahap, URUTAN_TAHAP } from "@/lib/dokumen/tahap";
import { TEKS_DOKUMEN } from "./teks";

type Props = {
  status: StatusDokumen;
  tahap: TahapDokumen | null;
  jumlahHalaman?: number | null;
  /** `responsif`: vertikal di compact/medium, stepper horizontal di expanded (FT-02 §4). */
  orientasi?: "vertikal" | "horizontal" | "responsif";
};

/** DaftarTahapProses (FT-02 K-11): 5 tahap Membaca → Menyusun topik, dipakai S-11 & S-07. */
export function DaftarTahapProses({ status, tahap, jumlahHalaman, orientasi = "vertikal" }: Props) {
  const aktif = indeksTahap(tahap);
  const langkah = URUTAN_TAHAP.map((t, i) => ({
    label: TAHAP_DOKUMEN[t],
    // Keterangan jumlah halaman setelah tahap Membaca selesai.
    keterangan:
      i === 0 && jumlahHalaman && (status === "siap" || aktif > 0)
        ? isiPlaceholder(TEKS_DOKUMEN.halamanTerbaca, { n: jumlahHalaman })
        : undefined,
  }));
  const statusLangkah = status === "siap" ? "selesai" : status === "gagal" ? "gagal" : "berjalan";
  const props = { langkah, aktif, status: statusLangkah, label: TEKS_DOKUMEN.tahapPengolahan } as const;

  if (orientasi !== "responsif") return <ProgressSteps {...props} orientasi={orientasi} />;
  return (
    <>
      <ProgressSteps {...props} className="expanded:hidden" />
      <ProgressSteps {...props} orientasi="horizontal" className="hidden expanded:flex" />
    </>
  );
}

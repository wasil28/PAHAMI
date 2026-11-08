import { TombolLink, Tooltip } from "@/components/ui";
import { LABEL, pesan } from "@/lib/pesan";
import { rute } from "@/lib/dokumen/tahap";
import { isKuotaPenuh, type KuotaDokumen } from "@/lib/dokumen/tipe";

/**
 * TombolUploadPdf (FT-03 K-03). KEPUTUSAN C2: Tonal bila kartu "Lanjutkan belajar" tampil,
 * Filled bila tidak. Kuota penuh (BR-04, B13) → nonaktif + tooltip MSG-U03.
 */
export function TombolUploadPdf({ kuota, varian }: { kuota: KuotaDokumen; varian: "filled" | "tonal" }) {
  if (!isKuotaPenuh(kuota)) {
    return (
      <TombolLink href={rute.upload} varian={varian} ikon="upload_file">
        {LABEL.uploadPdf}
      </TombolLink>
    );
  }
  const alasan = pesan("MSG-U03", { maks: kuota.maks });
  return (
    <Tooltip teks={alasan} posisi="bawah">
      {/* aria-disabled tetap bisa difokus agar tooltip terbaca (FT-02 §5). */}
      <span tabIndex={0} aria-label={`${LABEL.uploadPdf}. ${alasan}`} className="inline-flex rounded-full">
        <TombolLink href={rute.upload} varian={varian} ikon="upload_file" nonaktif aria-hidden>
          {LABEL.uploadPdf}
        </TombolLink>
      </span>
    </Tooltip>
  );
}

import { Ikon, Kartu, TombolLink } from "@/components/ui";
import { LABEL, PESAN } from "@/lib/pesan";
import { rute } from "@/lib/dokumen/tahap";
import type { StatusDokumenApi } from "@/lib/dokumen/tipe";
import { TombolHapusDokumen } from "./aksi-dokumen";
import { DaftarTahapProses } from "./daftar-tahap-proses";
import { TEKS_DOKUMEN } from "./teks";

/** PanelDokumenGagal (FT-03 S-07 K-09). BR-07: dokumen gagal hanya diunggah ulang atau dihapus. */
export function PanelDokumenGagal({ dokumen }: { dokumen: StatusDokumenApi }) {
  return (
    <Kartu radius="lg" padding="none" className="overflow-hidden">
      <div role="alert" className="bg-error-container p-6 text-on-error-container">
        <Ikon nama="error" ukuran={40} isi />
        <h2 className="mt-2 text-title-medium">{TEKS_DOKUMEN.gagalDiprosesJudul}</h2>
        <p className="mt-1 text-body-medium">{dokumen.pesanGagal ?? PESAN["MSG-U09"]}</p>
      </div>
      <div className="flex flex-col gap-5 p-6">
        <DaftarTahapProses status="gagal" tahap={dokumen.tahap} jumlahHalaman={dokumen.jumlahHalaman} />
        <p className="text-body-small text-on-surface-variant">{TEKS_DOKUMEN.tidakDihitungKuotaPendek}</p>
        <div className="flex flex-wrap gap-2">
          <TombolLink href={rute.upload} varian="filled" ikon="upload_file">
            {LABEL.unggahUlang}
          </TombolLink>
          <TombolHapusDokumen dokumen={{ id: dokumen.id, judul: dokumen.judul, status: dokumen.status }} setelahHapus="beranda" label={TEKS_DOKUMEN.hapusDokumen} />
        </div>
      </div>
    </Kartu>
  );
}

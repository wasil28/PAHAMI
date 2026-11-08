import type { Metadata } from "next";
import { PageHeader } from "@/components/ui";
import { FormUnggahDokumen } from "@/components/dokumen/form-unggah-dokumen";
import { KartuAturanUnggah } from "@/components/dokumen/kartu-aturan-unggah";
import { KartuKuotaDokumen } from "@/components/dokumen/kartu-kuota-dokumen";
import { TEKS_DOKUMEN } from "@/components/dokumen/teks";
import { getKuotaDokumen, getPengaturanUnggah, getStatusDokumen } from "@/lib/data/dokumen";
import { parseIdParam } from "@/lib/validasi/common";
import { LABEL } from "@/lib/pesan";
import { wajibLogin } from "@/lib/auth/sesi";

export const metadata: Metadata = { title: LABEL.uploadPdf };

/**
 * S-11 Upload PDF. Pengaturan & kuota dibaca saat halaman dibuka (BR-28).
 * `?dokumen={id}` membuka panel pemrosesan dokumen itu (dipakai kartu "Sedang diproses").
 */
export default async function HalamanUpload(props: PageProps<"/upload">) {
  // Layout & halaman dirender paralel di Next — halaman wajib memeriksa sendiri (BR-23, BR-31).
  await wajibLogin("mahasiswa");
  const { dokumen } = await props.searchParams;
  const idPantau = typeof dokumen === "string" ? parseIdParam(dokumen) : null;

  const [pengaturan, kuota, dokumenAwal] = await Promise.all([
    getPengaturanUnggah(),
    getKuotaDokumen(),
    idPantau ? getStatusDokumen(idPantau) : Promise.resolve(null),
  ]);

  return (
    <>
      <PageHeader judul={LABEL.uploadPdf} deskripsi={TEKS_DOKUMEN.subjudulUpload} />
      <div className="grid gap-4 expanded:grid-cols-12 expanded:gap-6">
        <KartuKuotaDokumen kuota={kuota} className="expanded:col-span-4 expanded:col-start-9 expanded:row-start-1 expanded:self-start" />
        <div className="expanded:col-span-8 expanded:col-start-1 expanded:row-span-2 expanded:row-start-1">
          <FormUnggahDokumen
            key={dokumenAwal?.id ?? "baru"}
            maxUkuranMb={pengaturan.maxUkuranMb}
            maxHalaman={pengaturan.maxHalaman}
            kuota={kuota}
            dokumenAwal={dokumenAwal}
          />
        </div>
        <KartuAturanUnggah
          maxHalaman={pengaturan.maxHalaman}
          maxUkuranMb={pengaturan.maxUkuranMb}
          className="expanded:col-span-4 expanded:col-start-9 expanded:row-start-2 expanded:self-start"
        />
      </div>
    </>
  );
}

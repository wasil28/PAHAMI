import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { wajibLogin } from "@/lib/auth/sesi";
import { parseIdParam } from "@/lib/validasi";
import { catatBukaTopik, getHalamanTopik } from "@/lib/data/topik";
import { getDaftarMateri, getSampulTersimpan } from "@/lib/data/materi";
import { AjakanLatihan } from "@/components/belajar/ajakan-latihan";
import { BreadcrumbTopik } from "@/components/belajar/breadcrumb-topik";
import { HeaderTopik } from "@/components/belajar/header-topik";
import { IsiTopik } from "@/components/belajar/isi-topik";
import { PenyediaMateri } from "@/components/belajar/konteks-materi";
import { LayoutHalamanTopik } from "@/components/belajar/layout-halaman-topik";
import { MateriTopik } from "@/components/belajar/materi-topik";
import { MulaiMateri } from "@/components/belajar/mulai-materi";
import { NavigasiTopik } from "@/components/belajar/navigasi-topik";
import { SampulTopik } from "@/components/belajar/sampul-topik";
import { PanelTanyaAI } from "@/components/tanya-ai/panel-tanya-ai";

export const metadata: Metadata = { title: "Topik" };

/**
 * S-08 Halaman Topik (FT-04). Pemilik saja (404 bila bukan, BR-06); dokumen belum siap →
 * dialihkan ke S-07 (BR-07). Membuka topik dicatat sebagai aktivitas terakhir (BR-34, A2).
 * Halaman ini menjadi ringkasan topik: sampul, ajakan masuk ke materi (sub-bab), "Isi topik".
 */
export default async function HalamanTopik(props: PageProps<"/dokumen/[id]/topik/[topikId]">) {
  const pengguna = await wajibLogin("mahasiswa");
  const { id, topikId: topikParam } = await props.params;
  const { tab } = await props.searchParams;
  const dokumenId = parseIdParam(id);
  const topikId = parseIdParam(topikParam);
  if (dokumenId === null || topikId === null) notFound();

  const data = await getHalamanTopik(pengguna.id, dokumenId, topikId);
  if (!data) notFound();
  if (data.topik.dokumenStatus !== "siap") redirect(`/dokumen/${dokumenId}`);
  const [, daftarMateri, sampul] = await Promise.all([
    catatBukaTopik(topikId),
    getDaftarMateri(topikId),
    getSampulTersimpan(pengguna.id, topikId),
  ]);

  const { topik, ringkasan, status, daftar, sebelumnya, berikutnya } = data;
  const hrefLatihan = `/dokumen/${dokumenId}/topik/${topikId}/latihan`;

  return (
    <>
      <BreadcrumbTopik dokumenId={dokumenId} judulDokumen={topik.judulDokumen} urutanTopik={topik.urutan} />
      <PenyediaMateri key={topikId} topikId={topikId} dokumenId={dokumenId} daftarAwal={daftarMateri}>
        <LayoutHalamanTopik
          tabAwal={tab === "tanya" ? "tanya" : "materi"}
          kepala={
            <>
              <SampulTopik key={topikId} topikId={topikId} urlAwal={sampul} />
              <HeaderTopik
                urutan={topik.urutan}
                total={daftar.length}
                judul={topik.judul}
                halamanAwal={topik.halamanAwal}
                halamanAkhir={topik.halamanAkhir}
                status={status}
              />
              <MulaiMateri />
            </>
          }
          isiTopik={<IsiTopik />}
          materi={
            <>
              <MateriTopik
                key={topikId}
                topikId={topikId}
                dokumenId={dokumenId}
                judulDokumen={topik.judulDokumen}
                ringkasanAwal={ringkasan}
                hrefLatihan={hrefLatihan}
                ajakan={<AjakanLatihan hrefLatihan={hrefLatihan} status={status} />}
              />
              <NavigasiTopik dokumenId={dokumenId} sebelumnya={sebelumnya} berikutnya={berikutnya} />
            </>
          }
          panelTanya={<PanelTanyaAI dokumenId={dokumenId} topikId={topikId} judulTopik={topik.judul} />}
        />
      </PenyediaMateri>
    </>
  );
}

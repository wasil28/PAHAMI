import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { wajibLogin } from "@/lib/auth/sesi";
import { parseIdParam } from "@/lib/validasi";
import { catatBukaTopik } from "@/lib/data/topik";
import { catatBacaMateri, getHalamanMateri } from "@/lib/data/materi";
import { isiPlaceholder } from "@/lib/pesan";
import { BreadcrumbTopik } from "@/components/belajar/breadcrumb-topik";
import { HeaderMateri } from "@/components/belajar/header-materi";
import { IsiTopik } from "@/components/belajar/isi-topik";
import { KontenMateri } from "@/components/belajar/konten-materi";
import { PenyediaMateri } from "@/components/belajar/konteks-materi";
import { LayoutHalamanTopik } from "@/components/belajar/layout-halaman-topik";
import { NavigasiMateri } from "@/components/belajar/navigasi-materi";
import { hrefTopik } from "@/components/belajar/tautan-materi";
import { TEKS_BELAJAR } from "@/components/belajar/teks";
import { PanelTanyaAI } from "@/components/tanya-ai/panel-tanya-ai";

export const metadata: Metadata = { title: "Materi" };

/**
 * Halaman materi (sub-bab topik, KEPUTUSAN §4). Aturan akses sama dengan S-08: pemilik saja (404,
 * BR-06), dokumen belum siap → S-07 (BR-07), membuka materi = membuka topik (BR-34, A2).
 */
export default async function HalamanMateri(props: PageProps<"/dokumen/[id]/topik/[topikId]/materi/[materiId]">) {
  const pengguna = await wajibLogin("mahasiswa");
  const { id, topikId: topikParam, materiId: materiParam } = await props.params;
  const { tab } = await props.searchParams;
  const dokumenId = parseIdParam(id);
  const topikId = parseIdParam(topikParam);
  const materiId = parseIdParam(materiParam);
  if (dokumenId === null || topikId === null || materiId === null) notFound();

  const data = await getHalamanMateri(pengguna.id, dokumenId, topikId, materiId);
  if (!data) notFound();
  if (data.topik.dokumenStatus !== "siap") redirect(`/dokumen/${dokumenId}`);
  const { topik, status, materi, isi, daftarMateri, sebelumnya, berikutnya } = data;
  // Isi sudah ada → tidak ada POST /api/materi/[id] yang mencatat baca, jadi dicatat di sini.
  await Promise.all([catatBukaTopik(topikId), isi ? catatBacaMateri(materiId) : null]);

  return (
    <>
      <BreadcrumbTopik
        dokumenId={dokumenId}
        judulDokumen={topik.judulDokumen}
        urutanTopik={topik.urutan}
        ekor={isiPlaceholder(TEKS_BELAJAR.materiN, { n: materi.urutan })}
        hrefTopik={hrefTopik(dokumenId, topikId)}
      />
      <PenyediaMateri key={topikId} topikId={topikId} dokumenId={dokumenId} daftarAwal={daftarMateri} aktifId={materiId}>
        <LayoutHalamanTopik
          tabAwal={tab === "tanya" ? "tanya" : "materi"}
          kepala={
            <HeaderMateri
              urutanMateri={materi.urutan}
              totalMateri={daftarMateri.length}
              urutanTopik={topik.urutan}
              judul={materi.judul}
              halamanAwal={materi.halamanAwal}
              halamanAkhir={materi.halamanAkhir}
            />
          }
          isiTopik={<IsiTopik lipatDiPonsel />}
          materi={
            <>
              <KontenMateri key={materiId} materiId={materiId} dokumenId={dokumenId} judulDokumen={topik.judulDokumen} isiAwal={isi} />
              <NavigasiMateri dokumenId={dokumenId} topikId={topikId} sebelumnya={sebelumnya} berikutnya={berikutnya} status={status} />
            </>
          }
          panelTanya={<PanelTanyaAI dokumenId={dokumenId} topikId={topikId} judulTopik={topik.judul} />}
        />
      </PenyediaMateri>
    </>
  );
}

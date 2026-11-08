import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { wajibLogin } from "@/lib/auth/sesi";
import { parseIdParam } from "@/lib/validasi";
import { getDaftarTopikDokumen, getTopikMilik, topikDisarankan } from "@/lib/data/topik";
import { getHasilLatihan } from "@/lib/data/latihan";
import { isiPlaceholder } from "@/lib/pesan";
import type { StatusTopik } from "@/types/database";
import { BreadcrumbTopik } from "@/components/belajar/breadcrumb-topik";
import { AksiHasil } from "@/components/latihan/aksi-hasil";
import { CincinSkor } from "@/components/latihan/cincin-skor";
import { PesanTingkatSkor } from "@/components/latihan/pesan-tingkat-skor";
import { StatusHasil } from "@/components/latihan/status-hasil";
import { TinjauanJawaban } from "@/components/latihan/tinjauan-jawaban";
import { TEKS_LATIHAN } from "@/components/latihan/teks";

export const metadata: Metadata = { title: "Hasil latihan" };

function keStatus(nilai: string | string[] | undefined): StatusTopik | null {
  return nilai === "belum" || nilai === "lemah" || nilai === "selesai" ? nilai : null;
}

/**
 * S-10 Hasil Latihan (FT-05). Hanya pemilik percobaan (fn_hasil_latihan menyaring user, BR-06).
 * Status topik dari v_progres_topik (BR-13); topik disarankan BR-35.
 */
export default async function HalamanHasilLatihan(props: PageProps<"/dokumen/[id]/topik/[topikId]/latihan/hasil/[latihanId]">) {
  const pengguna = await wajibLogin("mahasiswa");
  const { id, topikId: topikParam, latihanId: latihanParam } = await props.params;
  const { sebelum } = await props.searchParams;
  const dokumenId = parseIdParam(id);
  const topikId = parseIdParam(topikParam);
  const latihanId = parseIdParam(latihanParam);
  if (dokumenId === null || topikId === null || latihanId === null) notFound();

  const [hasil, topik] = await Promise.all([getHasilLatihan(latihanId), getTopikMilik(pengguna.id, topikId)]);
  if (!hasil || !topik || hasil.topikId !== topikId || topik.dokumenId !== dokumenId) notFound();

  const daftar = await getDaftarTopikDokumen(pengguna.id, dokumenId);
  const posisi = daftar.findIndex((t) => t.id === topikId);
  const statusBaru = daftar[posisi]?.status ?? "belum";
  const berikutnya = posisi >= 0 ? (daftar[posisi + 1] ?? null) : null;
  const saran = topikDisarankan(daftar, topikId);
  const hrefTopik = (tid: number) => `/dokumen/${dokumenId}/topik/${tid}`;

  return (
    <>
      <BreadcrumbTopik
        dokumenId={dokumenId}
        judulDokumen={topik.judulDokumen}
        urutanTopik={topik.urutan}
        ekor={TEKS_LATIHAN.hasilLatihan}
        hrefTopik={hrefTopik(topikId)}
      />
      <h1 className="mb-6 text-headline-small text-on-surface expanded:text-headline-medium">
        {TEKS_LATIHAN.hasilLatihan}
        <span className="mt-1 block text-body-large text-on-surface-variant">{hasil.judulTopik}</span>
      </h1>
      <div className="grid gap-8 expanded:grid-cols-12 expanded:items-start">
        <div className="flex flex-col gap-5 expanded:sticky expanded:top-6 expanded:col-span-5">
          <CincinSkor skor={hasil.skor} jumlahBenar={hasil.jumlahBenar} jumlahSoal={hasil.jumlahSoal} />
          <PesanTingkatSkor skor={hasil.skor} />
          <StatusHasil statusBaru={statusBaru} statusLama={keStatus(sebelum)} />
          <AksiHasil
            statusBaru={statusBaru}
            hrefUlangi={`${hrefTopik(topikId)}/latihan`}
            hrefMateri={hrefTopik(topikId)}
            hrefBerikutnya={berikutnya ? hrefTopik(berikutnya.id) : null}
            hrefDokumen={`/dokumen/${dokumenId}`}
          />
          {saran && saran.id !== berikutnya?.id && (
            <Link href={hrefTopik(saran.id)} className="text-label-large text-primary hover:underline">
              {isiPlaceholder(TEKS_LATIHAN.disarankan, { judul: saran.judul })}
            </Link>
          )}
        </div>
        <div className="expanded:col-span-7">
          <TinjauanJawaban item={hasil.item} />
        </div>
      </div>
    </>
  );
}

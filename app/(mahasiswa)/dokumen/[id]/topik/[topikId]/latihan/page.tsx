import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { wajibLogin } from "@/lib/auth/sesi";
import { parseIdParam } from "@/lib/validasi";
import { getDaftarTopikDokumen, getTopikMilik } from "@/lib/data/topik";
import { getSoalTopik } from "@/lib/data/latihan";
import { acakPilihan } from "@/components/latihan/acak";
import { LatihanTopik } from "@/components/latihan/latihan-topik";

export const metadata: Metadata = { title: "Latihan" };

/**
 * S-09 Latihan (FT-05). Pemilik dokumen siap saja (BR-06/07). Soal yang sudah ada dibaca langsung
 * (tanpa kunci, RLS hak kolom); urutan pilihan diacak di server per kunjungan (BR-11) sehingga
 * "Ulangi latihan" otomatis mendapat urutan baru.
 */
export default async function HalamanLatihan(props: PageProps<"/dokumen/[id]/topik/[topikId]/latihan">) {
  const pengguna = await wajibLogin("mahasiswa");
  const { id, topikId: topikParam } = await props.params;
  const dokumenId = parseIdParam(id);
  const topikId = parseIdParam(topikParam);
  if (dokumenId === null || topikId === null) notFound();

  const topik = await getTopikMilik(pengguna.id, topikId);
  if (!topik || topik.dokumenId !== dokumenId) notFound();
  if (topik.dokumenStatus !== "siap") redirect(`/dokumen/${dokumenId}`);

  const [soal, daftar] = await Promise.all([getSoalTopik(topikId), getDaftarTopikDokumen(pengguna.id, dokumenId)]);
  const statusAwal = daftar.find((t) => t.id === topikId)?.status ?? "belum";

  return (
    <div className="mx-auto w-full max-w-[720px]">
      <LatihanTopik
        dokumenId={dokumenId}
        topik={{ id: topik.id, judul: topik.judul }}
        bankAwal={soal.length > 0 ? { soal, urutan: acakPilihan(soal.length) } : null}
        statusAwal={statusAwal}
        hrefMateri={`/dokumen/${dokumenId}/topik/${topikId}`}
      />
    </div>
  );
}

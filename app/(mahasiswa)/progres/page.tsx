import type { Metadata } from "next";
import { EmptyState, PageHeader, TombolLink } from "@/components/ui";
import { DaftarProgresDokumen } from "@/components/progres/daftar-progres-dokumen";
import { DaftarTopikLemah } from "@/components/progres/daftar-topik-lemah";
import { GrafikSkorTopik } from "@/components/progres/grafik-skor-topik";
import { RingkasanProgres } from "@/components/progres/ringkasan-progres";
import { RiwayatLatihan } from "@/components/progres/riwayat-latihan";
import { TEKS_PROGRES as T } from "@/components/progres/teks";
import { wajibLogin } from "@/lib/auth/sesi";
import { PERAN, RUTE_AWAL } from "@/lib/config";
import { getProgres, getRiwayatLatihan } from "@/lib/data/progres";
import { LABEL, PESAN } from "@/lib/pesan";
import { skemaHalaman } from "@/lib/validasi";

export const metadata: Metadata = { title: T.judul };

/**
 * S-12 Progres (FT-07, BP-08). Hanya mahasiswa; admin diarahkan ke dashboard (BR-31).
 * Semua angka dihitung saat dibaca dari view DB (BR-13..15), jadi selalu segar setelah latihan.
 */
export default async function HalamanProgres(props: PageProps<"/progres">) {
  const pengguna = await wajibLogin(PERAN.MAHASISWA);
  const sp = await props.searchParams;
  const halaman = skemaHalaman.parse(Array.isArray(sp.halaman) ? sp.halaman[0] : sp.halaman);

  const [data, riwayat] = await Promise.all([getProgres(pengguna.id), getRiwayatLatihan(pengguna.id, halaman)]);
  const header = <PageHeader judul={T.judul} deskripsi={T.deskripsi} />;

  // Belum pernah latihan → state kosong MSG-E02; progres dokumen (0%) tetap tampil bila ada (FT-07 §3A.6).
  if (data.ringkasan.jumlahLatihan === 0) {
    return (
      <>
        {header}
        <EmptyState
          ikon="insights"
          judul={PESAN["MSG-E02"]}
          aksi={
            <TombolLink href={RUTE_AWAL.mahasiswa} ikon="home">
              {LABEL.keBeranda}
            </TombolLink>
          }
        />
        {data.dokumen.length > 0 && <DaftarProgresDokumen dokumen={data.dokumen} />}
      </>
    );
  }

  return (
    <>
      {header}
      <div className="flex flex-col gap-6">
        <RingkasanProgres ringkasan={data.ringkasan} />
        {/* Expanded: grafik 7 kolom | progres dokumen + topik lemah 5 kolom (FT-07 §4). */}
        <div className="grid gap-6 expanded:grid-cols-12">
          <div className="order-2 min-w-0 expanded:order-none expanded:col-span-7">
            <GrafikSkorTopik dokumen={data.dokumen.map(({ id, judul, topik }) => ({ id, judul, topik }))} />
          </div>
          <div className="contents expanded:col-span-5 expanded:flex expanded:flex-col expanded:gap-6">
            <div className="order-1 expanded:order-none">
              <DaftarProgresDokumen dokumen={data.dokumen} />
            </div>
            <div className="order-3 expanded:order-none">
              <DaftarTopikLemah topik={data.topikLemah} />
            </div>
          </div>
        </div>
        <RiwayatLatihan riwayat={riwayat} />
      </div>
    </>
  );
}

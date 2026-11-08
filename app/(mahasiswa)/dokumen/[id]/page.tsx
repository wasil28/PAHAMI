import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Banner, BadgeStatus, PageHeader, TombolLink } from "@/components/ui";
import { MenuDokumen } from "@/components/dokumen/aksi-dokumen";
import { DaftarTopikDokumen } from "@/components/dokumen/daftar-topik-dokumen";
import { KartuProgresDokumen } from "@/components/dokumen/kartu-progres-dokumen";
import { PanelDokumenGagal } from "@/components/dokumen/panel-dokumen-gagal";
import { PanelPemrosesan } from "@/components/dokumen/panel-pemrosesan";
import { TEKS_DOKUMEN } from "@/components/dokumen/teks";
import { getDetailDokumen } from "@/lib/data/dokumen";
import { rute } from "@/lib/dokumen/tahap";
import type { StatusDokumenApi } from "@/lib/dokumen/tipe";
import { formatTanggal, formatUkuranFile } from "@/lib/format";
import { TEKS, isiPlaceholder } from "@/lib/pesan";
import { parseIdParam } from "@/lib/validasi/common";
import { wajibLogin } from "@/lib/auth/sesi";

export const metadata: Metadata = { title: "Detail dokumen" };

/** S-07 Detail Dokumen. Bukan milik / tidak ada → 404 (BR-06). Hanya `siap` yang bisa dipelajari (BR-07). */
export default async function HalamanDetailDokumen(props: PageProps<"/dokumen/[id]">) {
  // Layout & halaman dirender paralel di Next — halaman wajib memeriksa sendiri (BR-23, BR-31).
  await wajibLogin("mahasiswa");
  const id = parseIdParam((await props.params).id);
  if (!id) notFound();
  const dok = await getDetailDokumen(id);
  if (!dok) notFound();

  const meta = isiPlaceholder(TEKS_DOKUMEN.meta, {
    file: dok.namaFile,
    halaman: dok.jumlahHalaman ?? TEKS.kosong,
    ukuran: formatUkuranFile(dok.ukuranByte),
    tgl: formatTanggal(dok.createdAt),
  });
  // Hanya kolom status yang dikirim ke komponen klien (tidak menyerialisasi daftar topik).
  const status: StatusDokumenApi = {
    id: dok.id,
    kode: dok.kode,
    judul: dok.judul,
    status: dok.status,
    tahap: dok.tahap,
    pesanGagal: dok.pesanGagal,
    jumlahHalaman: dok.jumlahHalaman,
    jumlahTopik: dok.jumlahTopik,
  };
  // B7: Tanya AI → topik disarankan (BR-35), atau topik pertama bila tidak ada saran.
  const topikTanya = dok.topikDisarankanId ?? dok.topik[0]?.id ?? null;

  return (
    <>
      <PageHeader
        kembali={{ href: rute.beranda, label: "Beranda" }}
        judul={dok.judul}
        badge={<BadgeStatus status={dok.status} />}
        deskripsi={meta}
        aksi={<MenuDokumen dokumen={{ id: dok.id, judul: dok.judul, status: dok.status }} setelahHapus="beranda" />}
      />

      {dok.status === "diproses" && <PanelPemrosesan dokumen={status} mode="detail" />}
      {dok.status === "gagal" && <PanelDokumenGagal dokumen={status} />}

      {dok.status === "siap" && (
        <div className="grid gap-6 expanded:grid-cols-12">
          <div className="flex flex-col gap-4 expanded:col-span-8">
            {topikTanya !== null && (
              <TombolLink href={rute.tanyaAi(dok.id, topikTanya)} varian="tonal" ikon="forum" className="self-start">
                {TEKS_DOKUMEN.tanyaAiDokumen}
              </TombolLink>
            )}
            {dok.semuaSelesai && <Banner nada="success">{TEKS_DOKUMEN.semuaSelesai}</Banner>}
            <section aria-labelledby="judul-jalur-belajar" className="flex flex-col gap-3">
              <h2 id="judul-jalur-belajar" className="text-title-large text-on-surface">
                {TEKS_DOKUMEN.jalurBelajar}
              </h2>
              <DaftarTopikDokumen dokumenId={dok.id} topik={dok.topik} topikDisarankanId={dok.topikDisarankanId} />
            </section>
          </div>
          <KartuProgresDokumen
            persen={dok.persenSelesai}
            topikSelesai={dok.topikSelesai}
            totalTopik={dok.totalTopik}
            rataRataSkor={dok.rataRataSkor}
            perluDiulang={dok.topikLemah}
            className="expanded:sticky expanded:top-6 expanded:col-span-4 expanded:self-start"
          />
        </div>
      )}
    </>
  );
}

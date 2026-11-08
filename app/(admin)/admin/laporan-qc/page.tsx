import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { DaftarPenguji } from "@/components/qc/daftar-penguji";
import { FilterKategoriQc } from "@/components/qc/filter-kategori-qc";
import { RingkasanStatusQc } from "@/components/qc/ringkasan-status-qc";
import { TabelLaporanQc } from "@/components/qc/tabel-laporan-qc";
import { TEKS_QC, isi } from "@/components/qc/teks";
import { RUTE_QC_ADMIN, bacaFilterQc, hrefEksporQc, hrefQc } from "@/components/qc/url";
import { EmptyState, Ikon, PageHeader, Pagination, TombolLink, kelasTombol } from "@/components/ui";
import { wajibLogin } from "@/lib/auth/sesi";
import { getDaftarLaporanQc, getDaftarPenguji } from "@/lib/data/qc";
import { formatAngka } from "@/lib/format";

export const metadata: Metadata = { title: TEKS_QC.laporanQc };

/** Admin · Laporan QC: pilah temuan penguji + kelola penguji. Filter di URL: ?status=&kategori=&halaman=. */
export default async function HalamanLaporanQcAdmin(props: PageProps<"/admin/laporan-qc">) {
  await wajibLogin("admin");
  const filter = bacaFilterQc(await props.searchParams);
  const [data, penguji] = await Promise.all([getDaftarLaporanQc(filter, { semua: true }), getDaftarPenguji()]);
  if (data.laporan.length === 0 && filter.halaman > 1) redirect(hrefQc(RUTE_QC_ADMIN, { ...filter, halaman: 1 }));
  const adaFilter = Boolean(filter.status || filter.kategori);

  return (
    <div className="flex flex-col gap-8">
      <section aria-labelledby="judul-laporan-qc" className="flex flex-col gap-4">
        <PageHeader
          judul={<span id="judul-laporan-qc">{TEKS_QC.laporanQc}</span>}
          deskripsi={TEKS_QC.deskAdmin}
          aksi={
            // <a> biasa (bukan next/link): unduhan CSV dari Route Handler, tidak perlu prefetch.
            <a href={hrefEksporQc(filter)} download className={kelasTombol({ varian: "outlined" })}>
              <Ikon nama="download" ukuran={20} className="-ml-1" />
              <span>{TEKS_QC.eksporCsv}</span>
            </a>
          }
          className="mb-2"
        />
        <RingkasanStatusQc ringkasan={data.ringkasan} filter={filter} />
        <div className="flex flex-col gap-2 medium:flex-row medium:items-end medium:justify-between">
          <FilterKategoriQc rute={RUTE_QC_ADMIN} filter={filter} />
          <p className="text-body-small text-on-surface-variant" aria-live="polite">
            {isi(TEKS_QC.infoJumlah, { total: formatAngka(data.total) })}
          </p>
        </div>

        {data.laporan.length === 0 ? (
          <EmptyState
            ringkas
            ikon={adaFilter ? "filter_alt_off" : "fact_check"}
            judul={adaFilter ? TEKS_QC.kosongFilter : TEKS_QC.kosongSaya}
            aksi={
              adaFilter && (
                <TombolLink href={RUTE_QC_ADMIN} varian="outlined">
                  {TEKS_QC.hapusFilter}
                </TombolLink>
              )
            }
          />
        ) : (
          <>
            <TabelLaporanQc laporan={data.laporan} keterangan={`${TEKS_QC.laporanQc}, halaman ${data.halaman} dari ${data.totalHalaman}`} />
            <Pagination halaman={data.halaman} totalHalaman={data.totalHalaman} buatHref={(n) => hrefQc(RUTE_QC_ADMIN, { ...filter, halaman: n })} />
          </>
        )}
      </section>

      <section aria-labelledby="judul-penguji" className="flex flex-col gap-3">
        <div>
          <h2 id="judul-penguji" className="text-title-large text-on-surface">
            {TEKS_QC.penguji}
          </h2>
          <p className="text-body-medium text-on-surface-variant">{TEKS_QC.deskPenguji}</p>
        </div>
        <DaftarPenguji penguji={penguji} />
      </section>
    </div>
  );
}

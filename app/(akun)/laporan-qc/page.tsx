import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { bolehLaporQc } from "@/components/qc/akses";
import { FilterStatusQc } from "@/components/qc/filter-status-qc";
import { KartuLaporanQc } from "@/components/qc/kartu-laporan-qc";
import { TEKS_QC } from "@/components/qc/teks";
import { RUTE_QC_SAYA, bacaFilterQc, hrefQc } from "@/components/qc/url";
import { EmptyState, PageHeader, Pagination, TombolLink } from "@/components/ui";
import { wajibLogin } from "@/lib/auth/sesi";
import { getDaftarLaporanQc } from "@/lib/data/qc";

export const metadata: Metadata = { title: TEKS_QC.laporanSaya };

/** "Laporan saya" (fitur Laporan QC): temuan milik penguji + tindak lanjut tim. Filter di URL. */
export default async function HalamanLaporanSaya(props: PageProps<"/laporan-qc">) {
  const pengguna = await wajibLogin();
  // Bukan penguji → 404, bukan 403: fitur internal tim tidak perlu diumumkan ke pengguna biasa.
  if (!bolehLaporQc(pengguna)) notFound();

  const filter = bacaFilterQc(await props.searchParams);
  const data = await getDaftarLaporanQc(filter, { pelaporId: pengguna.id });
  if (data.laporan.length === 0 && filter.halaman > 1) redirect(hrefQc(RUTE_QC_SAYA, { ...filter, halaman: 1 }));
  const totalSemua = Object.values(data.ringkasan).reduce((a, b) => a + b, 0);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader judul={TEKS_QC.laporanSaya} deskripsi={TEKS_QC.deskLaporanSaya} className="mb-2" />

      {totalSemua === 0 ? (
        <EmptyState ikon="bug_report" judul={TEKS_QC.kosongSaya} teks={TEKS_QC.teksKosongSaya} />
      ) : (
        <>
          <FilterStatusQc rute={RUTE_QC_SAYA} filter={filter} ringkasan={data.ringkasan} />
          {data.laporan.length === 0 ? (
            <EmptyState
              ringkas
              ikon="filter_alt_off"
              judul={TEKS_QC.kosongFilter}
              aksi={
                <TombolLink href={RUTE_QC_SAYA} varian="outlined">
                  {TEKS_QC.hapusFilter}
                </TombolLink>
              }
            />
          ) : (
            <ul role="list" aria-label={TEKS_QC.laporanSaya} className="flex flex-col gap-3">
              {data.laporan.map((l) => (
                <li key={l.id}>
                  <KartuLaporanQc laporan={l} />
                </li>
              ))}
            </ul>
          )}
          <Pagination halaman={data.halaman} totalHalaman={data.totalHalaman} buatHref={(n) => hrefQc(RUTE_QC_SAYA, { ...filter, halaman: n })} />
        </>
      )}
    </div>
  );
}

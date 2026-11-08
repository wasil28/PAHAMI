import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { DaftarPengguna } from "@/components/admin/pengguna/daftar-pengguna";
import { FilterStatusPengguna } from "@/components/admin/pengguna/filter-status-pengguna";
import { PencarianPengguna } from "@/components/admin/pengguna/pencarian-pengguna";
import { RingkasanPengguna } from "@/components/admin/pengguna/ringkasan-pengguna";
import { hrefPengguna } from "@/components/admin/pengguna/url";
import { EmptyState, PageHeader, Pagination, TombolLink } from "@/components/ui";
import { wajibLogin } from "@/lib/auth/sesi";
import { getDaftarPengguna, getRingkasanPengguna } from "@/lib/data/admin";
import { formatAngka } from "@/lib/format";
import { PESAN, pesan } from "@/lib/pesan";
import { PENGGUNA_PER_HALAMAN, skemaDaftarPenggunaQuery } from "@/lib/validasi";

export const metadata: Metadata = { title: "Kelola pengguna" };

/** S-15 Kelola Pengguna (FT-09, BP-11). Filter di URL: ?q=&status=semua|aktif|nonaktif&halaman=. */
export default async function HalamanKelolaPengguna(props: PageProps<"/admin/pengguna">) {
  const saya = await wajibLogin("admin");
  const sp = await props.searchParams;
  const mentah = Object.fromEntries(Object.entries(sp).flatMap(([k, v]) => (typeof v === "string" && v.trim() ? [[k, v]] : [])));
  const filter = skemaDaftarPenggunaQuery.parse(mentah);

  const [ringkasan, daftar] = await Promise.all([getRingkasanPengguna(), getDaftarPengguna(filter)]);
  if (!ringkasan.ok || !daftar.ok) throw new Error("Daftar pengguna gagal dimuat");
  const { baris, total, halaman, totalHalaman } = daftar.data;
  // Halaman di luar jangkauan (mis. URL lama) → kembali ke halaman 1.
  if (baris.length === 0 && halaman > 1) redirect(hrefPengguna({ ...filter, halaman: 1 }));

  const awal = (halaman - 1) * PENGGUNA_PER_HALAMAN + 1;
  const info = filter.q
    ? `${formatAngka(total)} pengguna cocok dengan "${filter.q}"`
    : `Menampilkan ${formatAngka(awal)}–${formatAngka(awal + baris.length - 1)} dari ${formatAngka(total)}`;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader judul="Kelola pengguna" className="mb-2" />
      <RingkasanPengguna ringkasan={ringkasan.data} q={filter.q} />

      <div className="flex flex-col gap-3 expanded:flex-row expanded:items-center expanded:justify-between">
        <PencarianPengguna filter={filter} />
        <FilterStatusPengguna filter={filter} ringkasan={ringkasan.data} />
      </div>

      {total === 0 ? (
        filter.q ? (
          <EmptyState
            ikon="person_search"
            judul={PESAN["MSG-E04"]}
            aksi={
              <TombolLink href={hrefPengguna({})} varian="outlined">
                Hapus pencarian
              </TombolLink>
            }
          />
        ) : (
          <EmptyState ikon="check_circle" judul={filter.status === "semua" ? PESAN["MSG-E04"] : pesan("MSG-E07", { status: filter.status })} />
        )
      ) : (
        <>
          <p className="text-body-small text-on-surface-variant" aria-live="polite">
            {info}
          </p>
          <DaftarPengguna baris={baris} idSaya={saya.id} keterangan={`Daftar pengguna, halaman ${halaman} dari ${totalHalaman}`} />
          <Pagination halaman={halaman} totalHalaman={totalHalaman} buatHref={(n) => hrefPengguna({ ...filter, halaman: n })} />
        </>
      )}
    </div>
  );
}

// DEV ONLY — pratinjau shell mahasiswa/admin. Tambahkan ?peran=admin untuk shell admin.
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ShellAdmin, ShellMahasiswa } from "@/components/shell";
import { FilterStatusQc } from "@/components/qc/filter-status-qc";
import { KartuLaporanQc } from "@/components/qc/kartu-laporan-qc";
import { RingkasanStatusQc } from "@/components/qc/ringkasan-status-qc";
import { TabelLaporanQc } from "@/components/qc/tabel-laporan-qc";
import { EmptyState, PageHeader, SkeletonKartu, TombolLink } from "@/components/ui";
import { CONTOH_LAPORAN_QC } from "./contoh-qc";

export const metadata: Metadata = { title: "Pratinjau shell" };

export default async function HalamanShell(props: PageProps<"/komponen/shell">) {
  if (process.env.NODE_ENV === "production") notFound();
  const { peran, qc } = await props.searchParams;
  const admin = peran === "admin";
  const Shell = admin ? ShellAdmin : ShellMahasiswa;
  return (
    <Shell pengguna={{ nama: "Siti Rahma", email: "siti@ecampus.ut.ac.id", peran: admin ? "admin" : "mahasiswa", bolehLapor: true }}>
      {qc === "1" && (
        <div className="mb-8 flex flex-col gap-4">
          <RingkasanStatusQc ringkasan={{ baru: 4, dikerjakan: 2, selesai: 7, ditolak: 1 }} filter={{ halaman: 1, status: "baru" }} />
          <FilterStatusQc rute="/komponen/shell" filter={{ halaman: 1 }} ringkasan={{ baru: 4, dikerjakan: 2, selesai: 7, ditolak: 1 }} />
          <TabelLaporanQc laporan={CONTOH_LAPORAN_QC} keterangan="Contoh laporan QC" />
          <KartuLaporanQc laporan={CONTOH_LAPORAN_QC[1]} />
        </div>
      )}
      <PageHeader
        judul={admin ? "Dashboard" : "Halo, Siti"}
        deskripsi="Pratinjau kerangka navigasi responsif (bar bawah · rail · drawer)."
        aksi={
          <TombolLink href={admin ? "/komponen/shell" : "/komponen/shell?peran=admin"} varian="tonal">
            {admin ? "Lihat shell mahasiswa" : "Lihat shell admin"}
          </TombolLink>
        }
      />
      <div className="grid gap-4 medium:grid-cols-2 expanded:grid-cols-3">
        <SkeletonKartu jumlah={3} />
      </div>
      <EmptyState ikon="upload_file" judul="Belum ada dokumen" teks="Unggah modul PDF pertamamu untuk mulai belajar." aksi={<TombolLink href="/komponen" ikon="upload">Upload PDF</TombolLink>} />
    </Shell>
  );
}

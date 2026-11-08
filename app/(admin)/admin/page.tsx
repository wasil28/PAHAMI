import type { Metadata } from "next";
import { DaftarPenggunaTerbaru } from "@/components/admin/dashboard/pengguna-terbaru";
import { AreaRentang } from "@/components/admin/dashboard/area-rentang";
import { GrafikPertanyaan } from "@/components/admin/dashboard/grafik-pertanyaan";
import { KartuAi, KartuRingkasan } from "@/components/admin/dashboard/kartu-ringkasan";
import { RincianBiaya } from "@/components/admin/dashboard/rincian-biaya";
import { ErrorState, Ikon, Kartu, PageHeader } from "@/components/ui";
import { wajibLogin } from "@/lib/auth/sesi";
import { getPenggunaTerbaru, getSeriPertanyaanHarian, getStatistikDashboard } from "@/lib/data/admin";
import { namaDepan } from "@/lib/format";
import { PESAN, TEKS } from "@/lib/pesan";
import { skemaStatistikQuery } from "@/lib/validasi";

export const metadata: Metadata = { title: "Dashboard" };

/** S-14 Dashboard Admin (FT-11). Admin hanya melihat angka agregat, bukan judul/isi dokumen (BR-06). */
export default async function HalamanDashboardAdmin(props: PageProps<"/admin">) {
  const pengguna = await wajibLogin("admin");
  const sp = await props.searchParams;
  const { rentang } = skemaStatistikQuery.parse({ rentang: typeof sp.rentang === "string" ? sp.rentang : undefined });

  const [statistik, seri, terbaru] = await Promise.all([
    getStatistikDashboard(rentang),
    getSeriPertanyaanHarian(rentang),
    getPenggunaTerbaru(5),
  ]);
  // Kartu utama gagal = seluruh dashboard tidak bermakna → batas error (MSG-G02 + Coba lagi).
  if (!statistik.ok) throw new Error("Statistik dashboard gagal dimuat");
  const s = statistik.data;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader judul={`Halo, ${namaDepan(pengguna.nama)}`} deskripsi="Ringkasan pemakaian aplikasi" />
      <KartuRingkasan statistik={s} />

      <AreaRentang rentang={rentang}>
        <KartuAi statistik={s} />
        <div className="grid grid-cols-1 gap-4 expanded:grid-cols-3">
          <div className="expanded:col-span-2">
            {seri.ok ? <GrafikPertanyaan seri={seri.data} hari={rentang} /> : <Kartu padding="md" radius="lg"><ErrorState ringkas judul={PESAN["MSG-G02"]} /></Kartu>}
          </div>
          <RincianBiaya perFitur={s.ai.biayaPerFiturRp} hari={rentang} />
        </div>
      </AreaRentang>

      <DaftarPenggunaTerbaru pengguna={terbaru.ok ? terbaru.data : null} />

      <p className="flex items-center gap-2 text-body-small text-on-surface-variant">
        <Ikon nama="lock" ukuran={16} /> {TEKS.privasiAdmin}
      </p>
    </div>
  );
}

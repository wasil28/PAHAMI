import Link from "next/link";
import { Ikon, StatCard } from "@/components/ui";
import type { StatistikDashboard } from "@/lib/data/admin";
import { formatAngka, formatPersen, formatRupiah, hitungPersen } from "@/lib/format";

/** Kartu pengguna & dokumen — tidak terpengaruh rentang (B11). Dokumen hanya angka (BR-06). */
export function KartuRingkasan({ statistik }: { statistik: StatistikDashboard }) {
  const { pengguna, dokumen } = statistik;
  return (
    <div className="grid grid-cols-2 gap-3 expanded:grid-cols-3">
      <Link href="/admin/pengguna" className="state-layer relative rounded-lg" aria-label={`Total mahasiswa ${formatAngka(pengguna.total)}, lihat semua pengguna`}>
        <StatCard
          label="Total mahasiswa"
          nilai={formatAngka(pengguna.total)}
          ikon="group"
          keterangan={pengguna.baru7Hari > 0 ? `+${formatAngka(pengguna.baru7Hari)} minggu ini` : undefined}
          className="h-full"
        />
      </Link>
      <StatCard
        label="Aktif 7 hari"
        nilai={formatAngka(pengguna.aktif7Hari)}
        ikon="bolt"
        nada="secondary"
        keterangan={`${formatPersen(hitungPersen(pengguna.aktif7Hari, pengguna.total))} dari mahasiswa`}
      />
      <StatCard label="Total dokumen" nilai={formatAngka(dokumen.total)} ikon="description" nada="tertiary" className="col-span-2 expanded:col-span-1">
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-label-medium text-on-surface">
          <li className="flex items-center gap-1">
            <Ikon nama="check_circle" ukuran={16} className="text-success" /> Siap {formatAngka(dokumen.siap)}
          </li>
          <li className="flex items-center gap-1">
            <Ikon nama="progress_activity" ukuran={16} className="text-secondary" /> Diproses {formatAngka(dokumen.diproses)}
          </li>
          <li className="flex items-center gap-1">
            <Ikon nama="error" ukuran={16} className="text-error" /> Gagal {formatAngka(dokumen.gagal)}
          </li>
        </ul>
      </StatCard>
    </div>
  );
}

/** Kartu AI yang mengikuti rentang 7/30 hari. Biaya = semua fitur AI (B11), estimasi (BR-27). */
export function KartuAi({ statistik }: { statistik: StatistikDashboard }) {
  const { ai, rentang } = statistik;
  const rata = ai.rataBiayaPerPertanyaan;
  return (
    <div className="grid grid-cols-1 gap-3 medium:grid-cols-2">
      <StatCard label={`Pertanyaan AI ${rentang.hari} hari`} nilai={formatAngka(ai.pertanyaan)} ikon="forum" />
      <StatCard
        label={`Estimasi biaya AI ${rentang.hari} hari`}
        nilai={formatRupiah(ai.biayaTotalRp)}
        ikon="payments"
        nada="primary"
        keterangan={
          rata !== null ? `${formatRupiah(rata)} per pertanyaan · Perkiraan dari catatan pemakaian AI.` : "Perkiraan dari catatan pemakaian AI."
        }
      />
    </div>
  );
}

import Link from "next/link";
import { StatCard, cn, type NadaStat } from "@/components/ui";
import { formatAngka } from "@/lib/format";
import { STATUS_QC, type RingkasanStatusQc as DataRingkasan, type StatusQc } from "@/lib/qc/tipe";
import { GAYA_STATUS_QC } from "./badge-qc";
import { RUTE_QC_ADMIN, hrefQc, type FilterUrlQc } from "./url";

// StatCard tidak punya nada "neutral" → Ditolak memakai error (container lembut, tetap bertuliskan "Ditolak").
const NADA: Record<StatusQc, NadaStat> = { baru: "primary", dikerjakan: "tertiary", selesai: "success", ditolak: "error" };

/** 4 kartu ringkasan admin yang sekaligus filter status; klik kartu aktif → hapus filter. */
export function RingkasanStatusQc({ ringkasan, filter }: { ringkasan: DataRingkasan; filter: FilterUrlQc }) {
  return (
    <div className="grid grid-cols-2 gap-2 medium:grid-cols-4 medium:gap-3">
      {(Object.keys(STATUS_QC) as StatusQc[]).map((s) => {
        const aktif = filter.status === s;
        return (
          <Link
            key={s}
            href={hrefQc(RUTE_QC_ADMIN, { kategori: filter.kategori, status: aktif ? undefined : s })}
            aria-current={aktif ? "true" : undefined}
            aria-label={`${STATUS_QC[s]}: ${formatAngka(ringkasan[s])}. ${aktif ? "Hapus filter status" : `Tampilkan laporan ${STATUS_QC[s].toLowerCase()}`}`}
            className={cn(
              "state-layer relative rounded-lg outline-none focus-visible:outline-3 focus-visible:outline-secondary",
              aktif && "ring-2 ring-primary",
            )}
          >
            <StatCard label={STATUS_QC[s]} nilai={formatAngka(ringkasan[s])} ikon={GAYA_STATUS_QC[s].ikon} nada={NADA[s]} className="h-full" />
          </Link>
        );
      })}
    </div>
  );
}

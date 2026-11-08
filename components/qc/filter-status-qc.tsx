import { Chip } from "@/components/ui";
import { formatAngka } from "@/lib/format";
import { STATUS_QC, type RingkasanStatusQc, type StatusQc } from "@/lib/qc/tipe";
import { TEKS_QC } from "./teks";
import { hrefQc, type FilterUrlQc } from "./url";

/** Chip filter status + jumlahnya (ringkasan) — navigasi lewat URL, tanpa JS. */
export function FilterStatusQc({ rute, filter, ringkasan }: { rute: string; filter: FilterUrlQc; ringkasan: RingkasanStatusQc }) {
  const total = Object.values(ringkasan).reduce((a, b) => a + b, 0);
  const opsi: { status?: StatusQc; label: string; jumlah: number }[] = [
    { label: TEKS_QC.semua, jumlah: total },
    ...(Object.keys(STATUS_QC) as StatusQc[]).map((s) => ({ status: s, label: STATUS_QC[s], jumlah: ringkasan[s] })),
  ];
  return (
    <nav aria-label={TEKS_QC.filterStatus} className="scrollbar-tipis -mx-4 overflow-x-auto px-4 medium:mx-0 medium:px-0">
      <ul role="list" className="flex gap-2 py-1">
        {opsi.map((o) => (
          <li key={o.status ?? "semua"} className="shrink-0">
            <Chip
              varian="filter"
              terpilih={filter.status === o.status}
              href={hrefQc(rute, { kategori: filter.kategori, status: o.status })}
              label={`${o.label} · ${formatAngka(o.jumlah)}`}
              className="whitespace-nowrap"
            />
          </li>
        ))}
      </ul>
    </nav>
  );
}

import { Chip } from "@/components/ui";
import type { RingkasanPengguna } from "@/lib/data/admin";
import { formatAngka } from "@/lib/format";
import { STATUS_AKUN } from "@/lib/pesan";
import { FILTER_STATUS_PENGGUNA } from "@/lib/validasi/admin";
import { hrefPengguna, type FilterPengguna } from "./url";

const LABEL = { semua: "Semua", ...STATUS_AKUN } as const;

/**
 * Filter chip status (FT-09 K-04) berupa tautan — bekerja tanpa JS & URL bisa dibagikan.
 * Angka chip = total keseluruhan (dari fn_ringkasan_pengguna), bukan hasil pencarian.
 */
export function FilterStatusPengguna({ filter, ringkasan }: { filter: FilterPengguna; ringkasan: RingkasanPengguna }) {
  const jumlah = { semua: ringkasan.total, aktif: ringkasan.aktif, nonaktif: ringkasan.nonaktif };
  return (
    <nav aria-label="Filter status akun" className="scrollbar-tipis -mx-1 flex gap-2 overflow-x-auto px-1 py-1">
      {FILTER_STATUS_PENGGUNA.map((s) => (
        <Chip
          key={s}
          varian="filter"
          href={hrefPengguna({ q: filter.q, status: s })}
          terpilih={filter.status === s}
          label={`${LABEL[s]} (${formatAngka(jumlah[s])})`}
        />
      ))}
    </nav>
  );
}

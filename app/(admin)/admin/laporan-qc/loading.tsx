import { Skeleton } from "@/components/ui";
import { TEKS } from "@/lib/pesan";

/** Kerangka memuat Laporan QC admin: header, 4 kartu status, filter, baris tabel. */
export default function MemuatLaporanQcAdmin() {
  return (
    <div aria-busy="true" className="flex flex-col gap-4">
      <span role="status" className="sr-only">
        {TEKS.memuat}
      </span>
      <Skeleton className="h-9 w-48" />
      <div className="grid grid-cols-2 gap-2 medium:grid-cols-4 medium:gap-3">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-28 rounded-lg" />
        ))}
      </div>
      <Skeleton className="h-14 w-full medium:max-w-[280px]" />
      {Array.from({ length: 8 }, (_, i) => (
        <Skeleton key={i} className="h-13 w-full" />
      ))}
    </div>
  );
}

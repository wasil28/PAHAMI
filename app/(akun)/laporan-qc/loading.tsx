import { Skeleton } from "@/components/ui";
import { TEKS } from "@/lib/pesan";

/** Kerangka memuat "Laporan saya": header, chip status, kartu laporan. */
export default function MemuatLaporanSaya() {
  return (
    <div aria-busy="true" className="flex flex-col gap-4">
      <span role="status" className="sr-only">
        {TEKS.memuat}
      </span>
      <Skeleton className="h-9 w-48" />
      <Skeleton className="h-5 w-72 max-w-full" />
      <div className="flex gap-2">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-8 w-24 rounded-sm" />
        ))}
      </div>
      {Array.from({ length: 4 }, (_, i) => (
        <Skeleton key={i} className="h-36 rounded-md" />
      ))}
    </div>
  );
}

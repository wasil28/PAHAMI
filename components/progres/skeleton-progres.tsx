import { Skeleton, SkeletonKartu } from "@/components/ui";
import { TEKS_PROGRES as T } from "./teks";

/** Kerangka memuat S-12 (FT-07 K-20): 4 kartu statistik, 2 kartu dokumen, 6 baris grafik, 5 baris riwayat. */
export function SkeletonProgres() {
  return (
    <div aria-busy="true" className="flex flex-col gap-6">
      <span role="status" className="sr-only">
        {T.memuat}
      </span>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-72 max-w-full" />
      </div>
      <div className="grid grid-cols-2 gap-3 expanded:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-32 rounded-lg" />
        ))}
      </div>
      <div className="grid gap-6 expanded:grid-cols-12">
        <div className="flex flex-col gap-3 rounded-lg bg-surface-container-low p-4 expanded:col-span-7">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-6 w-full" />
          ))}
        </div>
        <div className="flex flex-col gap-3 expanded:col-span-5">
          <SkeletonKartu jumlah={2} />
        </div>
      </div>
      <div className="flex flex-col gap-2">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    </div>
  );
}

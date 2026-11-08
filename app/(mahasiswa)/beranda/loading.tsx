import { Skeleton, SkeletonKartu } from "@/components/ui";

/** Kerangka S-06 (FT-03 K-10): sapaan, lanjutkan belajar, 4 statistik, 3 kartu dokumen. */
export default function MemuatBeranda() {
  return (
    <div aria-busy="true" className="flex flex-col gap-6">
      <div>
        <Skeleton className="mb-2 h-9 w-56" />
        <Skeleton className="h-5 w-72 max-w-full" />
      </div>
      <Skeleton className="h-32" />
      <div className="grid grid-cols-2 gap-3 expanded:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      <Skeleton className="h-7 w-48" />
      <div className="grid gap-3 medium:grid-cols-2 large:grid-cols-3">
        <SkeletonKartu jumlah={3} />
      </div>
    </div>
  );
}

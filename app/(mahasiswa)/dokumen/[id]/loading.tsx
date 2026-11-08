import { Skeleton, SkeletonKartu } from "@/components/ui";

/** Kerangka S-07 (FT-03 K-11): header, kartu progres, 4 topik. */
export default function MemuatDetailDokumen() {
  return (
    <div aria-busy="true">
      <Skeleton className="mb-3 h-6 w-24" />
      <Skeleton className="mb-2 h-9 w-2/3" />
      <Skeleton className="mb-6 h-5 w-1/2" />
      <div className="grid gap-6 expanded:grid-cols-12">
        <div className="flex flex-col gap-3 expanded:col-span-8">
          <SkeletonKartu jumlah={4} />
        </div>
        <Skeleton className="h-48 expanded:col-span-4" />
      </div>
    </div>
  );
}

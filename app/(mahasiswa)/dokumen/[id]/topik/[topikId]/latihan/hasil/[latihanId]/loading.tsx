import { Skeleton, SkeletonKartu } from "@/components/ui";

/** K-07: kerangka S-10 (cincin skor + 5 item tinjauan). */
export default function MemuatHasil() {
  return (
    <div className="grid gap-8 expanded:grid-cols-12" aria-busy>
      <div className="flex flex-col items-center gap-4 expanded:col-span-5">
        <Skeleton bulat className="size-[120px]" />
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-16 w-full rounded-md" />
      </div>
      <div className="flex flex-col gap-2 expanded:col-span-7">
        <SkeletonKartu jumlah={5} />
      </div>
    </div>
  );
}

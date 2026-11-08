import { Skeleton } from "@/components/ui";
import { TEKS } from "@/lib/pesan";

/** K-13: kerangka memuat S-09. */
export default function MemuatLatihan() {
  return (
    <div className="mx-auto w-full max-w-[720px]" aria-busy>
      <div className="mb-6 flex items-center gap-3">
        <Skeleton bulat className="size-10" />
        <Skeleton className="h-5 flex-1" />
      </div>
      <Skeleton className="mb-6 h-1 w-full rounded-full" />
      <Skeleton className="mb-2 h-6 w-full" />
      <Skeleton className="mb-6 h-6 w-2/3" />
      <div className="flex flex-col gap-2">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-14 w-full rounded-md" />
        ))}
      </div>
      <span className="sr-only" role="status">
        {TEKS.memuat}
      </span>
    </div>
  );
}

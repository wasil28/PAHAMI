import { Skeleton } from "@/components/ui";
import { TEKS } from "@/lib/pesan";

/** Kerangka memuat S-13 (FT-08 K-19): header, kartu kuota, dua formulir. */
export default function MemuatProfil() {
  return (
    <div aria-busy="true" className="flex flex-col gap-4">
      <span role="status" className="sr-only">
        {TEKS.memuat}
      </span>
      <Skeleton className="h-8 w-32" />
      <div className="flex items-center gap-4">
        <Skeleton bulat className="size-16" />
        <div className="flex flex-col gap-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-56" />
        </div>
      </div>
      <div className="grid gap-4 expanded:grid-cols-12 expanded:gap-6">
        <div className="flex flex-col gap-4 expanded:col-span-7">
          <Skeleton className="h-64 rounded-lg" />
          <Skeleton className="h-72 rounded-lg" />
        </div>
        <div className="flex flex-col gap-4 expanded:col-span-5">
          <Skeleton className="h-56 rounded-lg" />
          <Skeleton className="h-36 rounded-lg" />
        </div>
      </div>
    </div>
  );
}

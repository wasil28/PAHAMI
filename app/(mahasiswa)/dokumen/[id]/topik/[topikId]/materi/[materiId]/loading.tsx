import { Skeleton } from "@/components/ui";
import { TEKS } from "@/lib/pesan";

/** Kerangka memuat halaman materi (header + paragraf + diagram). */
export default function MemuatMateri() {
  return (
    <div className="max-w-[70ch]" aria-busy>
      <Skeleton className="mb-6 h-5 w-56" />
      <Skeleton className="mb-2 h-4 w-40" />
      <Skeleton className="mb-3 h-8 w-3/4" />
      <div className="mb-8 flex gap-2">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-6 w-32" />
      </div>
      {Array.from({ length: 3 }, (_, i) => (
        <div key={i} className="mb-6 flex flex-col gap-2">
          <Skeleton className="h-5 w-44" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-11/12" />
          <Skeleton className="h-4 w-4/5" />
        </div>
      ))}
      <Skeleton className="h-48 w-full rounded-lg" />
      <span className="sr-only" role="status">
        {TEKS.memuat}
      </span>
    </div>
  );
}

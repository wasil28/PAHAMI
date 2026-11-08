import { Skeleton } from "@/components/ui";
import { TEKS } from "@/lib/pesan";

/** K-15: kerangka memuat S-08 (header + blok paragraf). */
export default function MemuatTopik() {
  return (
    <div className="max-w-[70ch]" aria-busy>
      <Skeleton className="mb-6 h-5 w-48" />
      <Skeleton className="mb-2 h-4 w-28" />
      <Skeleton className="mb-3 h-8 w-3/4" />
      <div className="mb-8 flex gap-2">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-6 w-28" />
      </div>
      {Array.from({ length: 5 }, (_, i) => (
        <div key={i} className="mb-6 flex flex-col gap-2">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
        </div>
      ))}
      <span className="sr-only" role="status">
        {TEKS.memuat}
      </span>
    </div>
  );
}

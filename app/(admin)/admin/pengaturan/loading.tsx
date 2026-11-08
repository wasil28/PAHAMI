import { Skeleton } from "@/components/ui";

// Skeleton S-16 (FT-10 K-15): 4 kolom + 2 kartu info.
export default function MemuatPengaturan() {
  return (
    <div className="flex flex-col gap-6" aria-busy>
      <Skeleton className="h-9 w-64" />
      <div className="grid grid-cols-1 gap-6 expanded:grid-cols-12">
        <div className="flex flex-col gap-6 expanded:col-span-7">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-20 w-full max-w-[360px]" />
          ))}
        </div>
        <div className="flex flex-col gap-4 expanded:col-span-5">
          <Skeleton className="h-40 w-full rounded-lg" />
          <Skeleton className="h-16 w-full rounded-md" />
        </div>
      </div>
      <span className="sr-only" role="status">
        Memuat…
      </span>
    </div>
  );
}

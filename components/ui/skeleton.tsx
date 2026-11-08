import { cn } from "@/lib/tema/cn";

/** Kerangka memuat (Panduan: state "memuat"). Atur ukuran lewat className, mis. `h-5 w-40`. */
export function Skeleton({ className, bulat }: { className?: string; bulat?: boolean }) {
  return <div aria-hidden className={cn("animate-pulse bg-surface-container-highest", bulat ? "rounded-full" : "rounded-sm", className)} />;
}

/** Kerangka kartu siap pakai (judul + 2 baris + bar), untuk daftar dokumen/topik. */
export function SkeletonKartu({ jumlah = 1, className }: { jumlah?: number; className?: string }) {
  return (
    <>
      {Array.from({ length: jumlah }, (_, i) => (
        <div key={i} aria-hidden className={cn("flex flex-col gap-3 rounded-md bg-surface-container-low p-4", className)}>
          <div className="flex items-center gap-3">
            <Skeleton bulat className="size-10" />
            <Skeleton className="h-5 w-2/3" />
          </div>
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-1 w-full rounded-full" />
        </div>
      ))}
      <span className="sr-only" role="status">
        Memuat…
      </span>
    </>
  );
}

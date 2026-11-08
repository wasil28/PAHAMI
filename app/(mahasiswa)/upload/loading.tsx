import { Skeleton } from "@/components/ui";

/** Kerangka S-11 (FT-02 K-16): kuota, area unggah, aturan. */
export default function MemuatUpload() {
  return (
    <div aria-busy="true">
      <Skeleton className="mb-2 h-9 w-48" />
      <Skeleton className="mb-6 h-5 w-80 max-w-full" />
      <div className="grid gap-4 expanded:grid-cols-12 expanded:gap-6">
        <Skeleton className="h-20 expanded:col-span-4 expanded:col-start-9 expanded:row-start-1" />
        <Skeleton className="h-56 expanded:col-span-8 expanded:col-start-1 expanded:row-span-2 expanded:row-start-1" />
        <Skeleton className="h-44 expanded:col-span-4 expanded:col-start-9 expanded:row-start-2" />
      </div>
    </div>
  );
}

import { Skeleton, SkeletonKartu } from "@/components/ui";

// Skeleton S-14 (FT-11 K-14): kartu statistik + area grafik + daftar pengguna.
export default function MemuatDashboard() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-9 w-56" />
      <div className="grid grid-cols-2 gap-3 expanded:grid-cols-3">
        <SkeletonKartu jumlah={3} />
      </div>
      <Skeleton className="h-72 w-full rounded-lg" />
      <Skeleton className="h-64 w-full rounded-lg" />
    </div>
  );
}

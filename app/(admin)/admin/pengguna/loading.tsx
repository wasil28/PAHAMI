import { Skeleton } from "@/components/ui";

// Skeleton S-15 (FT-09 K-16): 3 kartu ringkasan + kolom cari + baris tabel.
export default function MemuatKelolaPengguna() {
  return (
    <div className="flex flex-col gap-4" aria-busy>
      <Skeleton className="h-9 w-56" />
      <div className="grid grid-cols-3 gap-2 medium:gap-3">
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className="h-28 rounded-lg" />
        ))}
      </div>
      <Skeleton className="h-14 w-full expanded:max-w-[400px]" />
      {Array.from({ length: 8 }, (_, i) => (
        <Skeleton key={i} className="h-13 w-full" />
      ))}
      <span className="sr-only" role="status">
        Memuat…
      </span>
    </div>
  );
}

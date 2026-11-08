import { cn } from "@/lib/tema/cn";

/** Ambil maksimal 2 inisial dari nama, mis. "Wasil Mawardi" → "WM". */
export function inisial(nama: string): string {
  const kata = nama.trim().split(/\s+/).filter(Boolean);
  if (kata.length === 0) return "?";
  return ((kata[0][0] ?? "") + (kata.length > 1 ? kata[kata.length - 1][0] : "")).toUpperCase();
}

const ukuranKelas = { sm: "size-8 text-label-medium", md: "size-10 text-title-medium", lg: "size-16 text-headline-small" } as const;

/** Avatar inisial (container primary). Nama lengkap dibacakan bila `dekoratif` tidak diset. */
export function Avatar({ nama, ukuran = "md", dekoratif, className }: { nama: string; ukuran?: keyof typeof ukuranKelas; dekoratif?: boolean; className?: string }) {
  return (
    <span
      {...(dekoratif ? { "aria-hidden": true } : { role: "img", "aria-label": nama })}
      className={cn("grid shrink-0 select-none place-items-center rounded-full bg-primary-container font-semibold text-on-primary-container", ukuranKelas[ukuran], className)}
    >
      {inisial(nama)}
    </span>
  );
}

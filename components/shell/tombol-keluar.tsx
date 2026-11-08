import { Ikon } from "@/components/ui/ikon";
import { cn } from "@/lib/tema/cn";

/**
 * Tombol Keluar (KEPUTUSAN C1: di bawah rail/drawer & di Profil). Memakai form POST
 * biasa ke /api/auth/keluar (diimplementasi area auth) agar bekerja tanpa JS
 * dan tidak bisa dipicu lewat tautan GET.
 */
export function TombolKeluar({ gaya, className }: { gaya: "rail" | "drawer" | "ikon"; className?: string }) {
  return (
    <form action="/api/auth/keluar" method="post" className={className}>
      {gaya === "drawer" ? (
        <button type="submit" className="state-layer relative flex h-14 w-full items-center gap-3 rounded-full px-4 text-label-large text-on-surface-variant">
          <Ikon nama="logout" />
          Keluar
        </button>
      ) : gaya === "rail" ? (
        <button type="submit" className="group flex w-full flex-col items-center gap-1 py-1 text-on-surface-variant outline-none">
          <span className="state-layer relative grid h-8 w-14 place-items-center rounded-full group-focus-visible:outline-3 group-focus-visible:outline-offset-2 group-focus-visible:outline-secondary">
            <Ikon nama="logout" />
          </span>
          <span className="text-label-medium">Keluar</span>
        </button>
      ) : (
        <button type="submit" aria-label="Keluar" title="Keluar" className={cn("state-layer relative grid size-10 place-items-center rounded-full text-on-surface-variant")}>
          <Ikon nama="logout" />
        </button>
      )}
    </form>
  );
}

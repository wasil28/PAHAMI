import { useId, type ReactNode } from "react";
import { cn } from "@/lib/tema/cn";

export type TooltipProps = {
  teks: string;
  children: ReactNode;
  posisi?: "atas" | "bawah";
  className?: string;
};

/**
 * Plain tooltip M3 (tanpa JS): muncul saat hover/fokus pada anak.
 * Tooltip hanya pelengkap — elemen ikon tetap wajib punya `aria-label` sendiri.
 */
export function Tooltip({ teks, children, posisi = "atas", className }: TooltipProps) {
  const id = useId();
  return (
    <span className={cn("group/tooltip relative inline-flex", className)} aria-describedby={id}>
      {children}
      <span
        id={id}
        role="tooltip"
        className={cn(
          "pointer-events-none absolute left-1/2 z-40 w-max max-w-[200px] -translate-x-1/2 rounded-xs bg-inverse-surface px-2 py-1 text-body-small text-inverse-on-surface",
          "opacity-0 transition-opacity delay-0 duration-150 group-focus-within/tooltip:opacity-100 group-hover/tooltip:opacity-100 group-hover/tooltip:delay-500",
          posisi === "atas" ? "bottom-full mb-1" : "top-full mt-1",
        )}
      >
        {teks}
      </span>
    </span>
  );
}

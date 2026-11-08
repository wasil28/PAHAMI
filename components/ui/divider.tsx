import { cn } from "@/lib/tema/cn";

/** Divider M3 (garis `outline-variant`). `inset` memberi jarak kiri 16dp. */
export function Divider({ vertikal, inset, className }: { vertikal?: boolean; inset?: boolean; className?: string }) {
  return (
    <hr
      aria-orientation={vertikal ? "vertical" : undefined}
      className={cn("shrink-0 border-0 bg-outline-variant", vertikal ? "h-auto w-px self-stretch" : "h-px w-full", inset && !vertikal && "ml-4 w-[calc(100%-16px)]", className)}
    />
  );
}

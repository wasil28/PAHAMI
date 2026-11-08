import Link from "next/link";
import { Ikon } from "@/components/ui/ikon";
import { NAMA_APLIKASI } from "@/lib/config";
import { cn } from "@/lib/tema/cn";

/** Logo Pahami: tanda (ikon buku dalam kotak primary) + wordmark. */
export function Logo({ href = "/", hanyaTanda, className }: { href?: string; hanyaTanda?: boolean; className?: string }) {
  return (
    <Link href={href} aria-label={`${NAMA_APLIKASI} — beranda`} className={cn("inline-flex items-center gap-2.5 rounded-md", className)}>
      <span className="grid size-10 shrink-0 place-items-center rounded-md bg-primary text-on-primary">
        <Ikon nama="auto_stories" isi ukuran={22} />
      </span>
      {!hanyaTanda && <span className="text-title-large font-bold tracking-tight text-primary">{NAMA_APLIKASI}</span>}
    </Link>
  );
}

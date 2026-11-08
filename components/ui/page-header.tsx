import type { ReactNode } from "react";
import { cn } from "@/lib/tema/cn";
import { Ikon } from "./ikon";
import Link from "next/link";

export type PageHeaderProps = {
  judul: ReactNode;
  deskripsi?: ReactNode;
  /** Teks kecil di atas judul (mis. "Topik 2 dari 8"). */
  overline?: ReactNode;
  /** Tautan kembali di atas judul. */
  kembali?: { href: string; label: string };
  /** Tombol aksi (di kanan pada medium+, di bawah pada compact). */
  aksi?: ReactNode;
  /** Elemen di samping judul (mis. BadgeStatus). */
  badge?: ReactNode;
  className?: string;
};

/** Header halaman: Headline Small (compact) → Headline Medium (expanded), satu <h1> per halaman. */
export function PageHeader({ judul, deskripsi, overline, kembali, aksi, badge, className }: PageHeaderProps) {
  return (
    <div className={cn("mb-6 flex flex-col gap-4 medium:flex-row medium:items-end medium:justify-between", className)}>
      <div className="min-w-0">
        {kembali && (
          <Link
            href={kembali.href}
            className="state-layer relative -ml-3 mb-2 inline-flex h-10 items-center gap-1 rounded-full pr-4 pl-2 text-label-large text-primary"
          >
            <Ikon nama="arrow_back" ukuran={20} />
            {kembali.label}
          </Link>
        )}
        {overline && <p className="mb-1 text-label-large text-on-surface-variant">{overline}</p>}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <h1 className="text-headline-small text-on-surface expanded:text-headline-medium">{judul}</h1>
          {badge}
        </div>
        {deskripsi && <p className="mt-1 max-w-[70ch] text-body-medium text-on-surface-variant">{deskripsi}</p>}
      </div>
      {aksi && <div className="flex shrink-0 flex-wrap gap-2">{aksi}</div>}
    </div>
  );
}

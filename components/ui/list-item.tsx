import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/tema/cn";
import { Ikon } from "./ikon";

export type ListItemProps = {
  judul: ReactNode;
  /** Teks pendukung (1–2 baris). */
  deskripsi?: ReactNode;
  /** Teks kecil di atas judul (overline). */
  overline?: ReactNode;
  /** Ikon di kiri, atau elemen kustom (Avatar, gambar). */
  depan?: string | ReactNode;
  /** Elemen di kanan (badge, teks meta, icon button, Switch). */
  belakang?: ReactNode;
  href?: string;
  onClick?: () => void;
  /** Garis pemisah di bawah. */
  pemisah?: boolean;
  className?: string;
};

/** List item M3 (satu–tiga baris). Bungkus dengan <ul role="list"> → <li>. */
export function ListItem({ judul, deskripsi, overline, depan, belakang, href, onClick, pemisah, className }: ListItemProps) {
  const interaktif = Boolean(href || onClick);
  const kelas = cn(
    "flex min-h-14 w-full items-center gap-4 px-4 py-2 text-left",
    interaktif && "state-layer relative",
    pemisah && "border-b border-outline-variant",
    className,
  );
  const isi = (
    <>
      {typeof depan === "string" ? <Ikon nama={depan} className="text-on-surface-variant" /> : depan}
      <span className="min-w-0 flex-1">
        {overline && <span className="block text-label-medium text-on-surface-variant">{overline}</span>}
        <span className="block text-body-large text-on-surface">{judul}</span>
        {deskripsi && <span className="line-clamp-2 block text-body-medium text-on-surface-variant">{deskripsi}</span>}
      </span>
      {belakang && <span className="flex shrink-0 items-center gap-2 text-label-small text-on-surface-variant">{belakang}</span>}
    </>
  );
  if (href) {
    return (
      <Link href={href} className={kelas}>
        {isi}
      </Link>
    );
  }
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={kelas}>
        {isi}
      </button>
    );
  }
  return <div className={kelas}>{isi}</div>;
}

import Link from "next/link";
import { cn } from "@/lib/tema/cn";
import { Ikon } from "./ikon";

export type PaginationProps = {
  /** Halaman aktif, mulai 1. */
  halaman: number;
  totalHalaman: number;
  /** Pembuat URL per halaman (navigasi server, mis. `?halaman=2`). */
  buatHref?: (halaman: number) => string;
  /** Alternatif untuk komponen client tanpa URL. */
  onUbah?: (halaman: number) => void;
  className?: string;
};

/** Nomor yang ditampilkan: 1 … (h-1) h (h+1) … total. */
function daftarNomor(h: number, total: number): (number | "…")[] {
  const set = new Set([1, total, h - 1, h, h + 1].filter((n) => n >= 1 && n <= total));
  const urut = [...set].sort((a, b) => a - b);
  const hasil: (number | "…")[] = [];
  urut.forEach((n, i) => {
    if (i > 0 && n - urut[i - 1] > 1) hasil.push("…");
    hasil.push(n);
  });
  return hasil;
}

type ItemProps = Pick<PaginationProps, "buatHref" | "onUbah"> & { ke: number; label: string; ikon?: string; aktif?: boolean; nonaktif?: boolean };

function Item({ ke, label, ikon, aktif, nonaktif, buatHref, onUbah }: ItemProps) {
  const kelas = cn(
    "state-layer relative grid size-10 shrink-0 place-items-center rounded-full text-label-large tabular-nums",
    aktif ? "bg-secondary-container text-on-secondary-container" : "text-on-surface-variant",
    nonaktif && "pointer-events-none opacity-38",
  );
  const isi = ikon ? <Ikon nama={ikon} /> : ke;
  const aria = { "aria-label": label, "aria-current": aktif ? ("page" as const) : undefined };
  if (buatHref && !nonaktif) {
    return (
      <Link href={buatHref(ke)} className={kelas} {...aria}>
        {isi}
      </Link>
    );
  }
  return (
    <button type="button" className={kelas} disabled={nonaktif} onClick={() => onUbah?.(ke)} {...aria}>
      {isi}
    </button>
  );
}

/** Paginasi: tombol sebelumnya/berikutnya + nomor (nomor disembunyikan di compact). */
export function Pagination({ halaman, totalHalaman, buatHref, onUbah, className }: PaginationProps) {
  if (totalHalaman <= 1) return null;

  return (
    <nav aria-label="Paginasi" className={cn("flex items-center justify-between gap-2 medium:justify-center", className)}>
      <Item buatHref={buatHref} onUbah={onUbah} ke={halaman - 1} label="Halaman sebelumnya" ikon="chevron_left" nonaktif={halaman <= 1} />
      <span className="text-body-medium text-on-surface-variant medium:hidden">
        Halaman {halaman} dari {totalHalaman}
      </span>
      <ul className="hidden items-center gap-1 medium:flex">
        {daftarNomor(halaman, totalHalaman).map((n, i) =>
          n === "…" ? (
            <li key={`e${i}`} aria-hidden className="w-6 text-center text-on-surface-variant">
              …
            </li>
          ) : (
            <li key={n}>
              <Item buatHref={buatHref} onUbah={onUbah} ke={n} label={`Halaman ${n}`} aktif={n === halaman} />
            </li>
          ),
        )}
      </ul>
      <Item buatHref={buatHref} onUbah={onUbah} ke={halaman + 1} label="Halaman berikutnya" ikon="chevron_right" nonaktif={halaman >= totalHalaman} />
    </nav>
  );
}

import Link from "next/link";
import { StatCard } from "@/components/ui";
import type { RingkasanPengguna as DataRingkasan } from "@/lib/data/admin";
import { formatAngka } from "@/lib/format";
import { hrefPengguna } from "./url";

/** Kartu ringkasan S-15 (FT-09 K-02). Kartu Aktif/Nonaktif = pintasan filter status. */
export function RingkasanPengguna({ ringkasan, q }: { ringkasan: DataRingkasan; q: string }) {
  const kartu = [
    { label: "Total pengguna", nilai: ringkasan.total, ikon: "group", nada: "primary", status: "semua" },
    { label: "Aktif", nilai: ringkasan.aktif, ikon: "check_circle", nada: "success", status: "aktif" },
    { label: "Nonaktif", nilai: ringkasan.nonaktif, ikon: "block", nada: "error", status: "nonaktif" },
  ] as const;
  return (
    <div className="grid grid-cols-3 gap-2 medium:gap-3">
      {kartu.map((k) => (
        <Link
          key={k.status}
          href={hrefPengguna({ q, status: k.status })}
          className="state-layer relative rounded-lg"
          aria-label={`${k.label}: ${formatAngka(k.nilai)}. Tampilkan ${k.status === "semua" ? "semua akun" : `akun ${k.label.toLowerCase()}`}`}
        >
          <StatCard label={k.label} nilai={formatAngka(k.nilai)} ikon={k.ikon} nada={k.nada} className="h-full" />
        </Link>
      ))}
    </div>
  );
}

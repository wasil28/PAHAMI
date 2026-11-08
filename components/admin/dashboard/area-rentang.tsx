"use client";

import { useTransition, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ProgressLinear, SegmentedButton } from "@/components/ui";
import { cn } from "@/lib/tema/cn";
import { RENTANG_STATISTIK, type RentangStatistik } from "@/lib/validasi/admin";

const OPSI = RENTANG_STATISTIK.map((n) => ({ nilai: String(n), label: `${n} hari` }));

/**
 * Pilihan rentang 7/30 hari (KEPUTUSAN B11: hanya memengaruhi kartu AI & grafik).
 * Rentang disimpan di URL (?rentang=) agar bisa dibagikan; selama data baru dimuat
 * isi lama tetap tampil 50% dengan progress linear (FT-11 K-15).
 */
export function AreaRentang({ rentang, aksi, children }: { rentang: RentangStatistik; aksi?: ReactNode; children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [memuat, startTransition] = useTransition();

  function ubah(nilai: string) {
    startTransition(() => {
      router.replace(`${pathname}?rentang=${nilai}`, { scroll: false });
    });
  }

  return (
    <section aria-labelledby="judul-pemakaian-ai" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="judul-pemakaian-ai" className="text-title-large text-on-surface">
          Pemakaian AI
        </h2>
        <div className="flex items-center gap-3">
          {aksi}
          <SegmentedButton label="Rentang waktu" opsi={OPSI} nilai={String(rentang)} onUbah={ubah} />
        </div>
      </div>
      <p className="sr-only" aria-live="polite">
        {memuat ? "Memuat…" : `Menampilkan data ${rentang} hari terakhir.`}
      </p>
      <div className="h-1">{memuat && <ProgressLinear label="Memuat data rentang baru" />}</div>
      <div className={cn("flex flex-col gap-4 transition-opacity", memuat && "opacity-50")}>{children}</div>
    </section>
  );
}

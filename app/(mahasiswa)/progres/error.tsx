"use client";

import { useEffect } from "react";
import { ErrorState } from "@/components/ui";
import { LABEL, PESAN } from "@/lib/pesan";

/** Gagal memuat S-12 → MSG-G02 + Coba lagi (FT-07 K-19, NF-04). Detail teknis hanya ke konsol. */
export default function ErrorProgres({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return <ErrorState judul={PESAN["MSG-G02"]} onCobaLagi={retry} labelCobaLagi={LABEL.cobaLagi} />;
}

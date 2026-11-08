"use client";

import { useEffect } from "react";
import { ErrorState } from "@/components/ui";
import { LABEL, PESAN } from "@/lib/pesan";

/** Isi error.tsx S-06/S-07/S-11 (K-12/K-17): MSG-G02 + Coba lagi. Detail teknis hanya ke konsol. */
export function GalatHalaman({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return <ErrorState judul={PESAN["MSG-G02"]} onCobaLagi={retry} labelCobaLagi={LABEL.cobaLagi} />;
}

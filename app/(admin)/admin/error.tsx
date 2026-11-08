"use client";

import { useEffect } from "react";
import { ErrorState } from "@/components/ui";
import { PESAN } from "@/lib/pesan";

// Batas error seluruh area admin (S-14/15/16): MSG-G02 + Coba lagi (K-16/K-17).
export default function ErrorAdmin({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return <ErrorState judul={PESAN["MSG-G02"]} teks={PESAN["MSG-G01"]} onCobaLagi={retry} />;
}

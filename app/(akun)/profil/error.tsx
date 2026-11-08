"use client";

import { useEffect } from "react";
import { ErrorState } from "@/components/ui";
import { LABEL, PESAN } from "@/lib/pesan";

/** Gagal memuat S-13 → MSG-G02 + Coba lagi (FT-08 K-20). */
export default function ErrorProfil({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return <ErrorState judul={PESAN["MSG-G02"]} onCobaLagi={retry} labelCobaLagi={LABEL.cobaLagi} />;
}

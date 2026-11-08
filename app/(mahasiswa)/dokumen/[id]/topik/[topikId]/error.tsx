"use client";

import { useEffect } from "react";
import { ErrorState } from "@/components/ui";
import { LABEL, PESAN } from "@/lib/pesan";

/** K-16 (S-08) / K-08 (S-10): gagal memuat data → MSG-G02 + Coba lagi. */
export default function GagalMuatTopik({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error("[topik]", error);
  }, [error]);
  return <ErrorState judul={PESAN["MSG-G02"]} teks={PESAN["MSG-G01"]} labelCobaLagi={LABEL.cobaLagi} onCobaLagi={retry} />;
}

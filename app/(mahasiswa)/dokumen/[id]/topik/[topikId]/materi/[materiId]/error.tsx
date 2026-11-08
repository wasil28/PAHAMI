"use client";

import { useEffect } from "react";
import { ErrorState } from "@/components/ui";
import { LABEL, PESAN } from "@/lib/pesan";

/** Gagal memuat data halaman materi → MSG-G02 + Coba lagi (pola K-16 S-08). */
export default function GagalMuatMateri({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error("[materi]", error);
  }, [error]);
  return <ErrorState judul={PESAN["MSG-G02"]} teks={PESAN["MSG-G01"]} labelCobaLagi={LABEL.cobaLagi} onCobaLagi={retry} />;
}

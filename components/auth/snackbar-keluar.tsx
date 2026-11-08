"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSnackbar } from "@/components/ui";
import { PESAN } from "@/lib/pesan";

/**
 * Snackbar MSG-G03 setelah logout (/masuk?keluar=1), lalu parameter dibuang dari URL agar tidak
 * muncul lagi saat halaman dimuat ulang.
 */
export function SnackbarKeluar() {
  const { tampilkan } = useSnackbar();
  const router = useRouter();
  const sudah = useRef(false);

  useEffect(() => {
    if (sudah.current) return; // StrictMode menjalankan efek dua kali saat dev
    sudah.current = true;
    tampilkan(PESAN["MSG-G03"]);
    router.replace("/masuk", { scroll: false });
  }, [tampilkan, router]);

  return null;
}

"use client";

import { useEffect, useState } from "react";
import { ambilStatusDokumen, picuProsesDokumen } from "@/lib/dokumen/klien";
import { INTERVAL_POLLING_MS, JEDA_PICU_ULANG_PROSES_MS, MAKS_PICU_ULANG_PROSES } from "@/lib/dokumen/tahap";
import type { StatusDokumenApi } from "@/lib/dokumen/tipe";

/**
 * Memantau satu dokumen `diproses` lewat polling GET /api/dokumen/[id] (KEPUTUSAN §3) sampai
 * `siap`/`gagal`. Galat jaringan sesaat diabaikan (dicoba lagi pada putaran berikut).
 * `hilang` = dokumen sudah dihapus (404).
 *
 * Bila pemicu POST /proses dari halaman unggah hilang di jaringan, dokumen tertahan di tahap
 * `membaca` tanpa pipeline. Setelah JEDA_PICU_ULANG_PROSES_MS di tahap itu, pemicu dikirim ulang
 * (idempoten di server; klaim kalah = pipeline memang sudah berjalan), maks. MAKS_PICU_ULANG_PROSES×.
 */
export function useStatusDokumen(awal: StatusDokumenApi): { dokumen: StatusDokumenApi; hilang: boolean } {
  const [dokumen, setDokumen] = useState(awal);
  const [hilang, setHilang] = useState(false);
  const selesai = dokumen.status !== "diproses" || hilang;

  useEffect(() => {
    if (selesai) return;
    let batal = false;
    let timer: ReturnType<typeof setTimeout>;
    let picuTerakhir = Date.now();
    let sisaPicu = MAKS_PICU_ULANG_PROSES;

    const picuUlang = async () => {
      sisaPicu -= 1;
      picuTerakhir = Date.now();
      const hasil = await picuProsesDokumen(awal.id);
      if (batal || hasil.ok || hasil.status === 0) return; // 0 = jaringan: coba lagi nanti
      if (hasil.status === 404) setHilang(true);
      // 409/413 dll.: server sudah memutuskan (file belum ada / terlalu besar → dihapus); jangan ulangi.
      else sisaPicu = 0;
    };

    const putar = async () => {
      const hasil = await ambilStatusDokumen(awal.id);
      if (batal) return;
      if (hasil.ok) {
        setDokumen(hasil.data);
        const tertahan = hasil.data.status === "diproses" && hasil.data.tahap === "membaca";
        if (tertahan && sisaPicu > 0 && Date.now() - picuTerakhir >= JEDA_PICU_ULANG_PROSES_MS) await picuUlang();
        if (batal) return;
      } else if (hasil.status === 404) setHilang(true);
      timer = setTimeout(putar, INTERVAL_POLLING_MS);
    };
    timer = setTimeout(putar, INTERVAL_POLLING_MS);
    return () => {
      batal = true;
      clearTimeout(timer);
    };
  }, [awal.id, selesai]);

  return { dokumen, hilang };
}

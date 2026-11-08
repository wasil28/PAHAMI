"use client";

import { useEffect, useState } from "react";
import type { EstimasiBiaya } from "@/lib/data/admin";
import { formatAngka, formatRupiah } from "@/lib/format";
import { skemaNilaiPengaturan } from "@/lib/validasi/admin";

const JEDA_ESTIMASI_MS = 400;
const HARI_PER_BULAN = 30;
const skemaMaks = skemaNilaiPengaturan("max_pertanyaan_harian");

/**
 * Perkiraan biaya AI (FT-10 K-09) = maks pertanyaan × mahasiswa aktif 7 hari (B12) × rata-rata
 * biaya per pertanyaan 30 hari. Dihitung ulang di server (fn_estimasi_biaya_kuota) dengan jeda.
 */
export function KartuEstimasiBiaya({ maxPertanyaan, tersimpan, awal }: { maxPertanyaan: string; tersimpan: number; awal: EstimasiBiaya | null }) {
  const [hasil, setHasil] = useState<{ maks: number; data: EstimasiBiaya } | null>(awal ? { maks: tersimpan, data: awal } : null);
  const valid = skemaMaks.safeParse(maxPertanyaan);
  const maks = valid.success ? valid.data : null;

  useEffect(() => {
    if (maks === null || hasil?.maks === maks) return;
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/admin/pengaturan/estimasi-biaya?maxPertanyaan=${maks}`, { signal: ctrl.signal });
        if (!res.ok) return;
        const json = (await res.json()) as { data: EstimasiBiaya };
        setHasil({ maks, data: json.data });
      } catch {
        // Diabaikan: kartu tetap menampilkan perkiraan terakhir (informasi pendukung saja).
      }
    }, JEDA_ESTIMASI_MS);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [maks, hasil?.maks]);

  const d = hasil?.data;
  const harian = d?.estimasiHarianMaksRp ?? null;
  const sebelumnya = awal?.estimasiHarianMaksRp ?? null;
  const berubah = maks !== null && maks !== tersimpan;

  return (
    <section aria-labelledby="judul-estimasi" aria-live="polite" className="flex flex-col gap-2 rounded-lg bg-primary-container p-4 text-on-primary-container">
      <h2 id="judul-estimasi" className="text-title-medium">
        Perkiraan biaya AI harian
      </h2>
      {harian === null || !d || d.rataBiayaPerPertanyaan === null ? (
        <p className="text-body-medium">Belum ada data biaya untuk diperkirakan.</p>
      ) : (
        <>
          <p className="text-headline-small font-semibold tabular-nums">≈ {formatRupiah(harian)} / hari (maksimum)</p>
          <p className="text-body-medium">≈ {formatRupiah(harian * HARI_PER_BULAN)} / bulan ({HARI_PER_BULAN} hari)</p>
          <p className="text-body-small">
            {formatAngka(hasil?.maks ?? tersimpan)} pertanyaan × {formatAngka(d.mahasiswaAktif)} mahasiswa aktif × {formatRupiah(d.rataBiayaPerPertanyaan)} rata-rata per pertanyaan
          </p>
          {berubah && sebelumnya !== null && <p className="text-body-small">Sebelumnya: {formatRupiah(sebelumnya)} / hari</p>}
        </>
      )}
      <p className="text-body-small opacity-80">Perkiraan terburuk bila semua mahasiswa aktif memakai seluruh kuota.</p>
    </section>
  );
}

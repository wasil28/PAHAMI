"use client";

import { useRouter } from "next/navigation";
import { Select } from "@/components/ui";
import { KATEGORI_QC, type KategoriQc } from "@/lib/qc/tipe";
import { TEKS_QC } from "./teks";
import { hrefQc, type FilterUrlQc } from "./url";

const OPSI = [{ nilai: "", label: TEKS_QC.semuaKategori }, ...Object.entries(KATEGORI_QC).map(([nilai, label]) => ({ nilai, label }))];

/** Filter kategori: ganti pilihan → URL baru (status tetap, halaman kembali ke 1). */
export function FilterKategoriQc({ rute, filter }: { rute: string; filter: FilterUrlQc }) {
  const router = useRouter();
  return (
    <Select
      label={TEKS_QC.filterKategori}
      opsi={OPSI}
      ikonDepan="filter_list"
      value={filter.kategori ?? ""}
      onChange={(e) => router.push(hrefQc(rute, { status: filter.status, kategori: (e.target.value || undefined) as KategoriQc | undefined }))}
      className="medium:max-w-[280px]"
    />
  );
}

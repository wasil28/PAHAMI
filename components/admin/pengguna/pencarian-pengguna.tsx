"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { IconButton, ProgressLinear, TextField } from "@/components/ui";
import { CARI_PENGGUNA_MAX } from "@/lib/validasi/admin";
import { hrefPengguna, RUTE_PENGGUNA, type FilterPengguna } from "./url";

const JEDA_CARI_MS = 300; // FT-09 K-03

/**
 * Kolom cari nama/email (FT-09 K-03). Berupa <form method="get"> sehingga tetap jalan tanpa JS;
 * dengan JS, URL diperbarui otomatis setelah jeda 300 ms dan kembali ke halaman 1.
 */
export function PencarianPengguna({ filter }: { filter: FilterPengguna }) {
  const router = useRouter();
  const [nilai, setNilai] = useState(filter.q);
  const [memuat, startTransition] = useTransition();
  const [qUrl, setQUrl] = useState(filter.q);
  const [dikirim, setDikirim] = useState(filter.q);

  // URL berubah dari luar (mis. "Hapus pencarian", tombol Kembali) → samakan isian.
  // Hasil ketikan sendiri tidak ditimpa agar huruf yang diketik selama memuat tidak hilang.
  if (filter.q !== qUrl) {
    setQUrl(filter.q);
    if (filter.q !== dikirim) {
      setNilai(filter.q);
      setDikirim(filter.q);
    }
  }

  useEffect(() => {
    const q = nilai.trim();
    if (q === filter.q) return;
    const t = setTimeout(() => {
      setDikirim(q);
      startTransition(() => router.replace(hrefPengguna({ q, status: filter.status }), { scroll: false }));
    }, JEDA_CARI_MS);
    return () => clearTimeout(t);
  }, [nilai, filter.q, filter.status, router]);

  return (
    <form action={RUTE_PENGGUNA} method="get" role="search" className="relative w-full expanded:max-w-[400px]">
      {filter.status !== "semua" && <input type="hidden" name="status" value={filter.status} />}
      <TextField
        label={<span className="sr-only">Cari nama atau email</span>}
        type="text"
        inputMode="search"
        name="q"
        placeholder="Cari nama atau email"
        ikonDepan="search"
        maxLength={CARI_PENGGUNA_MAX}
        value={nilai}
        onChange={(e) => setNilai(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") setNilai("");
        }}
        ikonBelakang={nilai ? <IconButton ikon="close" label="Hapus pencarian" onClick={() => setNilai("")} /> : undefined}
      />
      {memuat && <ProgressLinear label="Menyaring daftar pengguna" className="absolute inset-x-0 -bottom-2" />}
    </form>
  );
}

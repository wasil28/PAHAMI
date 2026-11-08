"use client";

import { useRef, useState } from "react";
import type { z } from "zod";
import { errorPerKolom } from "@/lib/validasi";

type ErrorKolom<K extends string> = Partial<Record<K, string>>;
export type HasilValidasi<T> = { data: T; jumlah: 0 } | { data: null; jumlah: number };

/**
 * State form auth + validasi Zod per kolom (skema yang sama dengan API, Panduan §3.1):
 * - blur → cek kolom itu (S-03: "validasi per kolom saat keluar kolom")
 * - mengetik → cek ulang hanya bila kolom itu (atau kolom terkait) sedang error
 * - submit → cek semua + fokus ke kolom error pertama
 */
export function useFormKolom<K extends string, S extends z.ZodType>(
  skema: S,
  awal: Record<K, string>,
  urutan: readonly K[],
  opsi: { wajibSaatBlur?: boolean } = {},
) {
  const [nilai, setNilai] = useState(awal);
  const [error, setError] = useState<ErrorKolom<K>>({});
  const refs = useRef<Partial<Record<K, HTMLInputElement | null>>>({});

  const errorUntuk = (data: Record<K, string>): ErrorKolom<K> => {
    const hasil = skema.safeParse(data);
    return hasil.success ? {} : (errorPerKolom(hasil.error) as ErrorKolom<K>);
  };

  /** `terkait`: kolom lain yang ikut dicek ulang, mis. konfirmasi saat sandi berubah. */
  function ubah(nama: K, isi: string, terkait: readonly K[] = []) {
    const baru = { ...nilai, [nama]: isi };
    setNilai(baru);
    // Kolom terkait dicek ulang bila sudah terisi (S-03 K-06: konfirmasi ikut divalidasi).
    const cek = [...(error[nama] ? [nama] : []), ...terkait.filter((k) => error[k] || baru[k] !== "")];
    if (cek.length === 0) return;
    const e = errorUntuk(baru);
    setError((lama) => {
      const n = { ...lama };
      cek.forEach((k) => {
        n[k] = e[k];
      });
      return n;
    });
  }

  function blur(nama: K) {
    if (!opsi.wajibSaatBlur && nilai[nama] === "") return;
    const e = errorUntuk(nilai);
    setError((lama) => ({ ...lama, [nama]: e[nama] }));
  }

  function validasiSemua(): HasilValidasi<z.output<S>> {
    const hasil = skema.safeParse(nilai);
    if (hasil.success) {
      setError({});
      return { data: hasil.data, jumlah: 0 };
    }
    const e = errorPerKolom(hasil.error) as ErrorKolom<K>;
    setError(e);
    const pertama = urutan.find((k) => e[k]);
    if (pertama) refs.current[pertama]?.focus();
    return { data: null, jumlah: urutan.filter((k) => e[k]).length };
  }

  /** Error dari server untuk satu kolom (mis. MSG-A05 di Email) + fokus ke kolom itu. */
  function aturError(nama: K, pesan: string) {
    setError((lama) => ({ ...lama, [nama]: pesan }));
    refs.current[nama]?.focus();
  }

  const daftarRef = (nama: K) => (el: HTMLInputElement | null) => {
    refs.current[nama] = el;
  };

  const fokus = (nama: K) => refs.current[nama]?.focus();

  return { nilai, setNilai, error, ubah, blur, validasiSemua, aturError, daftarRef, fokus };
}

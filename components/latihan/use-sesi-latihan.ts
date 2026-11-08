"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { HasilPeriksa, HasilSimpanLatihan, SoalLatihan } from "@/lib/data/latihan";
import { PESAN } from "@/lib/pesan";
import type { StatusTopik } from "@/types/database";
import { ambilApi } from "@/components/belajar/ambil-api";

type Opsi = { topikId: number; soal: SoalLatihan[]; hrefHasil: (latihanId: number) => string; statusAwal: StatusTopik };

/**
 * Status sesi latihan di memori (tidak disimpan sampai semua terjawab, BR-33).
 * Pemeriksaan per soal lewat fn_periksa_jawaban; skor akhir dihitung ulang server (B8).
 */
export function useSesiLatihan({ topikId, soal, hrefHasil, statusAwal }: Opsi) {
  const router = useRouter();
  const [indeks, setIndeks] = useState(0);
  const [pilihan, setPilihan] = useState<Record<number, number>>({});
  const [hasil, setHasil] = useState<Record<number, HasilPeriksa>>({});
  const [memeriksa, setMemeriksa] = useState(false);
  const [galatPeriksa, setGalatPeriksa] = useState<string | null>(null);
  const [menyimpan, setMenyimpan] = useState(false);
  const [galatSimpan, setGalatSimpan] = useState<string | null>(null);
  const [selesai, setSelesai] = useState(false);

  const sekarang = soal[indeks];
  const dipilih = sekarang ? pilihan[sekarang.id] : undefined;
  const hasilSekarang = sekarang ? hasil[sekarang.id] : undefined;
  const jumlahDiperiksa = Object.keys(hasil).length;
  const terakhir = indeks === soal.length - 1;
  const adaInteraksi = Object.keys(pilihan).length > 0 && !selesai;

  const pilih = (indeksAsli: number) => {
    if (!sekarang || hasilSekarang || memeriksa) return; // terkunci setelah diperiksa
    setPilihan((p) => ({ ...p, [sekarang.id]: indeksAsli }));
  };

  const periksa = async () => {
    if (!sekarang || dipilih === undefined || hasilSekarang || memeriksa) return;
    setMemeriksa(true);
    setGalatPeriksa(null);
    const r = await ambilApi<HasilPeriksa>("/api/latihan/periksa", {
      method: "POST",
      body: JSON.stringify({ soalId: sekarang.id, pilihan: dipilih }),
    });
    setMemeriksa(false);
    if (r.ok) setHasil((h) => ({ ...h, [sekarang.id]: r.data }));
    else setGalatPeriksa(r.pesan ?? PESAN["MSG-G01"]);
  };

  const simpan = async () => {
    setMenyimpan(true);
    setGalatSimpan(null);
    const r = await ambilApi<HasilSimpanLatihan>("/api/latihan", {
      method: "POST",
      body: JSON.stringify({ topikId, jawaban: soal.map((s) => ({ soalId: s.id, pilihan: pilihan[s.id] })) }),
    });
    if (r.ok) {
      setSelesai(true);
      // replace: tombol kembali dari S-10 tidak membuka lagi latihan yang sudah selesai.
      router.replace(`${hrefHasil(r.data.latihanId)}?sebelum=${statusAwal}`);
      return;
    }
    setMenyimpan(false);
    // Jawaban tetap di memori → cukup "Coba lagi" (MSG-L08). 400 belum lengkap → MSG-L07.
    setGalatSimpan(r.kode === "JAWABAN_BELUM_LENGKAP" ? PESAN["MSG-L07"] : PESAN["MSG-L08"]);
  };

  const lanjut = () => {
    if (!hasilSekarang || menyimpan) return;
    if (terakhir) void simpan();
    else setIndeks((i) => i + 1);
  };

  return {
    indeks,
    sekarang,
    dipilih,
    hasilSekarang,
    jumlahDiperiksa,
    terakhir,
    adaInteraksi,
    memeriksa,
    galatPeriksa,
    menyimpan,
    galatSimpan,
    pilih,
    periksa,
    lanjut,
    simpan,
  };
}

export type SesiLatihanState = ReturnType<typeof useSesiLatihan>;

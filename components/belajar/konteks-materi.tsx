"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { MateriRingkas, ResponsDaftarMateri } from "@/lib/materi/tipe";
import { ambilApi, tungguSampaiSiap } from "./ambil-api";

export type StatusDaftarMateri = "siap" | "menyiapkan" | "gagal";

type NilaiKonteks = {
  topikId: number;
  dokumenId: number;
  status: StatusDaftarMateri;
  materi: MateriRingkas[];
  /** Materi yang sedang dibuka (halaman materi) — disorot di "Isi topik". */
  aktifId: number | null;
  cobaLagi: () => void;
  /** Tandai dibaca di sisi klien setelah isi materi tampil, tanpa memuat ulang data server. */
  tandaiDibaca: (materiId: number) => void;
};

const Konteks = createContext<NilaiKonteks | null>(null);

function adalahDaftar(d: unknown): d is ResponsDaftarMateri {
  return typeof d === "object" && d !== null && "materi" in d && Array.isArray((d as ResponsDaftarMateri).materi);
}

type Props = {
  topikId: number;
  dokumenId: number;
  /** Dari server; [] = kerangka materi belum dibuat → dibuat sekali lewat POST /api/topik/[id]/materi. */
  daftarAwal: MateriRingkas[];
  aktifId?: number | null;
  children: ReactNode;
};

/**
 * Satu sumber daftar materi untuk kolom utama (tombol "Mulai belajar") dan kolom kanan / tab
 * ("Isi topik"), sehingga pembuatan kerangka (202 → polling, KEPUTUSAN A7) hanya dipicu sekali.
 */
export function PenyediaMateri({ topikId, dokumenId, daftarAwal, aktifId = null, children }: Props) {
  const [hasil, setHasil] = useState<{ status: StatusDaftarMateri; materi: MateriRingkas[] }>(() => ({
    status: daftarAwal.length > 0 ? "siap" : "menyiapkan",
    materi: [],
  }));
  const [dibacaLokal, setDibacaLokal] = useState<ReadonlySet<number>>(() => new Set());
  const terpasang = useRef(true);
  const perluAmbil = daftarAwal.length === 0;

  const muat = useCallback(
    (masihAktif: () => boolean) =>
      tungguSampaiSiap(
        () => ambilApi<unknown>(`/api/topik/${topikId}/materi`, { method: "POST" }),
        adalahDaftar,
        masihAktif,
      ).then((h) => {
        if (h.jenis === "siap") setHasil({ status: h.data.materi.length > 0 ? "siap" : "gagal", materi: h.data.materi });
        else if (h.jenis === "gagal") setHasil({ status: "gagal", materi: [] });
      }),
    [topikId],
  );

  useEffect(() => {
    let hidup = true;
    terpasang.current = true;
    if (perluAmbil) void muat(() => hidup);
    return () => {
      hidup = false;
      terpasang.current = false;
    };
  }, [perluAmbil, muat]);

  const cobaLagi = useCallback(() => {
    setHasil({ status: "menyiapkan", materi: [] });
    void muat(() => terpasang.current);
  }, [muat]);

  const tandaiDibaca = useCallback((materiId: number) => {
    setDibacaLokal((lama) => (lama.has(materiId) ? lama : new Set(lama).add(materiId)));
  }, []);

  const nilai = useMemo<NilaiKonteks>(() => {
    // Data server menang bila ada (navigasi antarmateri membawa status dibaca terbaru).
    const dasar = perluAmbil ? hasil.materi : daftarAwal;
    const materi = dasar.map((m) => (dibacaLokal.has(m.id) && !m.sudahDibaca ? { ...m, sudahDibaca: true } : m));
    return { topikId, dokumenId, status: perluAmbil ? hasil.status : "siap", materi, aktifId, cobaLagi, tandaiDibaca };
  }, [perluAmbil, hasil, daftarAwal, dibacaLokal, topikId, dokumenId, aktifId, cobaLagi, tandaiDibaca]);

  return <Konteks.Provider value={nilai}>{children}</Konteks.Provider>;
}

export function useDaftarMateri(): NilaiKonteks {
  const nilai = useContext(Konteks);
  if (!nilai) throw new Error("useDaftarMateri harus dipakai di dalam <PenyediaMateri>");
  return nilai;
}

"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import type { RingkasanTopik } from "@/lib/data/topik";
import { ambilApi, tungguSampaiSiap } from "./ambil-api";
import { IsiRingkasan } from "./isi-ringkasan";
import { StateGagalMateri, StateMenyiapkanMateri } from "./state-materi";
import { TEKS_BELAJAR } from "./teks";

type StateMateri = { jenis: "siap"; data: RingkasanTopik } | { jenis: "menyiapkan" } | { jenis: "gagal" };

type Props = {
  topikId: number;
  dokumenId: number;
  judulDokumen: string;
  ringkasanAwal: RingkasanTopik | null;
  hrefLatihan: string;
  /** K-10 (server). Disembunyikan saat gagal karena tombol latihan pindah ke K-13. */
  ajakan: ReactNode;
};

function adalahRingkasan(d: unknown): d is RingkasanTopik {
  return typeof d === "object" && d !== null && "konsepInti" in d;
}

/**
 * Kolom Materi S-08. Ringkasan yang sudah ada tampil instan; bila belum, dibuat sekali lewat
 * POST /api/topik/[id]/ringkasan (BR-10). 202 = permintaan lain sedang membuat (A7) → polling.
 */
export function MateriTopik({ topikId, dokumenId, judulDokumen, ringkasanAwal, hrefLatihan, ajakan }: Props) {
  const router = useRouter();
  const [state, setState] = useState<StateMateri>(ringkasanAwal ? { jenis: "siap", data: ringkasanAwal } : { jenis: "menyiapkan" });
  const [pengumuman, setPengumuman] = useState("");
  const terpasang = useRef(true);

  // masihAktif per pemanggilan: efek yang dilepas (StrictMode/ganti topik) menghentikan loop-nya sendiri.
  const muat = useCallback(
    (masihAktif: () => boolean) =>
      tungguSampaiSiap(
        () => ambilApi<unknown>(`/api/topik/${topikId}/ringkasan`, { method: "POST" }),
        adalahRingkasan,
        masihAktif,
      ).then((h) => {
        if (h.jenis === "siap") {
          setState({ jenis: "siap", data: h.data });
          setPengumuman(TEKS_BELAJAR.materiSiap);
        } else if (h.jenis === "gagal" && h.kode === "DOKUMEN_BELUM_SIAP") {
          router.replace(`/dokumen/${dokumenId}`); // BR-07 → S-07
        } else if (h.jenis === "gagal") {
          setState({ jenis: "gagal" });
        }
      }),
    [topikId, dokumenId, router],
  );

  useEffect(() => {
    let hidup = true;
    terpasang.current = true;
    if (!ringkasanAwal) void muat(() => hidup);
    return () => {
      hidup = false;
      terpasang.current = false;
    };
  }, [ringkasanAwal, muat]);

  const cobaLagi = () => {
    setState({ jenis: "menyiapkan" });
    void muat(() => terpasang.current);
  };

  return (
    <div>
      <div aria-live="polite" aria-busy={state.jenis === "menyiapkan"} className="min-h-0">
        {state.jenis === "siap" && <IsiRingkasan ringkasan={state.data} judulDokumen={judulDokumen} />}
        {state.jenis === "menyiapkan" && <StateMenyiapkanMateri />}
        <p className="sr-only">{pengumuman}</p>
      </div>
      {state.jenis === "gagal" ? <StateGagalMateri onCobaLagi={cobaLagi} hrefLatihan={hrefLatihan} /> : ajakan}
    </div>
  );
}

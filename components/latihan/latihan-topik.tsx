"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { SoalLatihan } from "@/lib/data/latihan";
import type { StatusTopik } from "@/types/database";
import { ambilApi, tungguSampaiSiap } from "@/components/belajar/ambil-api";
import { acakPilihan } from "./acak";
import { HeaderLatihan } from "./header-latihan";
import { SesiLatihan } from "./sesi-latihan";
import { StateGagalSoal, StateMenyiapkanSoal } from "./state-soal";

type Bank = { soal: SoalLatihan[]; urutan: number[][] };
type State = { jenis: "siap"; bank: Bank } | { jenis: "menyiapkan" } | { jenis: "gagal" };

type Props = {
  dokumenId: number;
  topik: { id: number; judul: string };
  /** Soal yang sudah ada (dibaca server) + urutan pilihan acak dari server; null = belum dibuat. */
  bankAwal: Bank | null;
  statusAwal: StatusTopik;
  hrefMateri: string;
};

function adalahDaftarSoal(d: unknown): d is { soal: SoalLatihan[] } {
  return typeof d === "object" && d !== null && "soal" in d;
}

/**
 * S-09: memastikan bank soal ada (BR-11 — dibuat sekali lewat GET /api/topik/[id]/soal,
 * 202 = sedang dibuat permintaan lain → polling, A7), lalu menjalankan sesi latihan.
 */
export function LatihanTopik({ dokumenId, topik, bankAwal, statusAwal, hrefMateri }: Props) {
  const router = useRouter();
  const [state, setState] = useState<State>(bankAwal ? { jenis: "siap", bank: bankAwal } : { jenis: "menyiapkan" });
  const terpasang = useRef(true);

  // masihAktif per pemanggilan: efek yang dilepas (StrictMode/ganti topik) menghentikan loop-nya sendiri.
  const muat = useCallback(
    (masihAktif: () => boolean) =>
      tungguSampaiSiap(() => ambilApi<unknown>(`/api/topik/${topik.id}/soal`), adalahDaftarSoal, masihAktif).then((h) => {
        if (h.jenis === "siap") {
          // Diacak di sini (bukan saat render) agar tidak ada ketidakcocokan hidrasi.
          setState({ jenis: "siap", bank: { soal: h.data.soal, urutan: acakPilihan(h.data.soal.length) } });
        } else if (h.jenis === "gagal" && h.kode === "DOKUMEN_BELUM_SIAP") {
          router.replace(`/dokumen/${dokumenId}`); // BR-07
        } else if (h.jenis === "gagal") {
          setState({ jenis: "gagal" });
        }
      }),
    [topik.id, dokumenId, router],
  );

  useEffect(() => {
    let hidup = true;
    terpasang.current = true;
    if (!bankAwal) void muat(() => hidup);
    return () => {
      hidup = false;
      terpasang.current = false;
    };
  }, [bankAwal, muat]);

  const keluar = () => router.push(hrefMateri);

  if (state.jenis !== "siap") {
    // Belum ada jawaban → ✕ langsung keluar tanpa dialog.
    return (
      <>
        <HeaderLatihan judulTopik={topik.judul} nomor={0} total={0} jumlahDiperiksa={0} onKeluar={keluar} />
        {state.jenis === "menyiapkan" ? (
          <StateMenyiapkanSoal />
        ) : (
          <StateGagalSoal
            hrefMateri={hrefMateri}
            onCobaLagi={() => {
              setState({ jenis: "menyiapkan" });
              void muat(() => terpasang.current);
            }}
          />
        )}
      </>
    );
  }

  return (
    <SesiLatihan
      dokumenId={dokumenId}
      topik={topik}
      soal={state.bank.soal}
      urutanPilihan={state.bank.urutan}
      statusAwal={statusAwal}
      hrefMateri={hrefMateri}
    />
  );
}

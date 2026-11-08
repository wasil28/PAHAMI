"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Ikon, ProgressLinear, Skeleton, Tombol } from "@/components/ui";
import type { IsiMateri } from "@/lib/materi/tipe";
import { LABEL } from "@/lib/pesan";
import { ambilApi, tungguSampaiSiap } from "./ambil-api";
import { TampilanIsiMateri } from "./isi-materi";
import { useDaftarMateri } from "./konteks-materi";
import { TEKS_BELAJAR } from "./teks";

type State = { jenis: "siap"; data: IsiMateri } | { jenis: "menyiapkan" } | { jenis: "gagal" };

function adalahIsi(d: unknown): d is IsiMateri {
  return typeof d === "object" && d !== null && "penjelasan" in d;
}

/** Kerangka saat isi materi dibuat pertama kali (pola K-12). */
function MenyiapkanIsi() {
  return (
    <div className="max-w-[70ch]">
      <div className="rounded-lg bg-surface-container p-4">
        <ProgressLinear label={TEKS_BELAJAR.menyiapkanIsiMateri} />
        <p className="mt-3 text-title-small text-on-surface">{TEKS_BELAJAR.menyiapkanIsiMateri}</p>
        <p className="mt-1 text-body-medium text-on-surface-variant">{TEKS_BELAJAR.teksMenyiapkanIsiMateri}</p>
      </div>
      <div aria-hidden className="mt-6 flex flex-col gap-3">
        {[1, 2].map((k) => (
          <div key={k} className="flex flex-col gap-3">
            <Skeleton className="mt-3 h-6 w-48" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-11/12" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/5" />
          </div>
        ))}
        <Skeleton className="mt-6 h-48 w-full rounded-lg" />
      </div>
    </div>
  );
}

/** Pola K-13: gagal → satu tombol Filled "Coba lagi". */
function GagalIsi({ onCobaLagi }: { onCobaLagi: () => void }) {
  return (
    <div role="alert" className="flex max-w-[70ch] flex-col items-center gap-3 rounded-lg bg-error-container p-6 text-center text-on-error-container">
      <Ikon nama="error" ukuran={48} />
      <p className="text-body-large">{TEKS_BELAJAR.gagalIsiMateri}</p>
      <Tombol ikon="refresh" onClick={onCobaLagi}>
        {LABEL.cobaLagi}
      </Tombol>
    </div>
  );
}

type Props = { materiId: number; dokumenId: number; judulDokumen: string; isiAwal: IsiMateri | null };

/**
 * Isi halaman materi. Isi yang sudah dibuat tampil instan; bila belum, dibuat sekali lewat
 * POST /api/materi/[id] (202 → polling, KEPUTUSAN A7). 409 DOKUMEN_BELUM_SIAP → S-07 (BR-07).
 */
export function KontenMateri({ materiId, dokumenId, judulDokumen, isiAwal }: Props) {
  const router = useRouter();
  const { tandaiDibaca } = useDaftarMateri();
  const [state, setState] = useState<State>(isiAwal ? { jenis: "siap", data: isiAwal } : { jenis: "menyiapkan" });
  const [pengumuman, setPengumuman] = useState("");
  const terpasang = useRef(true);

  const muat = useCallback(
    (masihAktif: () => boolean) =>
      tungguSampaiSiap(
        () => ambilApi<unknown>(`/api/materi/${materiId}`, { method: "POST" }),
        adalahIsi,
        masihAktif,
      ).then((h) => {
        if (h.jenis === "siap") {
          setState({ jenis: "siap", data: h.data });
          setPengumuman(TEKS_BELAJAR.materiSiap);
        } else if (h.jenis === "gagal" && h.kode === "DOKUMEN_BELUM_SIAP") {
          router.replace(`/dokumen/${dokumenId}`);
        } else if (h.jenis === "gagal") {
          setState({ jenis: "gagal" });
        }
      }),
    [materiId, dokumenId, router],
  );

  useEffect(() => {
    let hidup = true;
    terpasang.current = true;
    if (!isiAwal) void muat(() => hidup);
    return () => {
      hidup = false;
      terpasang.current = false;
    };
  }, [isiAwal, muat]);

  // Centang "sudah dibaca" di Isi topik begitu isinya tampil (server ikut mencatat).
  const siap = state.jenis === "siap";
  useEffect(() => {
    if (siap) tandaiDibaca(materiId);
  }, [siap, materiId, tandaiDibaca]);

  const cobaLagi = () => {
    setState({ jenis: "menyiapkan" });
    void muat(() => terpasang.current);
  };

  return (
    <div aria-busy={state.jenis === "menyiapkan"}>
      {state.jenis === "siap" && <TampilanIsiMateri isi={state.data} judulDokumen={judulDokumen} />}
      {state.jenis === "menyiapkan" && <MenyiapkanIsi />}
      {state.jenis === "gagal" && <GagalIsi onCobaLagi={cobaLagi} />}
      {/* Hanya pengumuman singkat yang live — isi materi panjang tidak dibacakan otomatis. */}
      <p className="sr-only" aria-live="polite">
        {pengumuman}
      </p>
    </div>
  );
}

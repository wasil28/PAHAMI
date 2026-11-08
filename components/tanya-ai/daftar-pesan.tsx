"use client";

import { Fragment, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { Tombol } from "@/components/ui";
import type { RujukanChat } from "@/lib/chat/tipe";
import { awalHariWIB, formatTanggal } from "@/lib/format";
import { LABEL, PESAN } from "@/lib/pesan";
import { GelembungJawaban, GelembungPertanyaan, IndikatorMengetik } from "./gelembung-pesan";
import { BarisGalat } from "./baris-galat";
import { JARAK_NEMPEL_BAWAH, TEKS_TANYA } from "./teks";
import type { PesanTampil } from "./use-riwayat-chat";
import type { GalatKirim, JawabanAktif } from "./use-tanya-ai";

const MS_HARI = 86_400_000;

/** Pemisah tanggal K-04: "Hari ini" · "Kemarin" · "8 Okt 2026" (hari kalender WIB). */
function labelHari(iso: string): string {
  const selisih = Math.round((awalHariWIB().getTime() - awalHariWIB(iso).getTime()) / MS_HARI);
  if (selisih <= 0) return TEKS_TANYA.hariIni;
  if (selisih === 1) return TEKS_TANYA.kemarin;
  return formatTanggal(iso);
}

function Pemisah({ label }: { label: string }) {
  return (
    <div role="separator" className="flex items-center gap-3 py-1 text-label-small text-on-surface-variant">
      <span className="h-px flex-1 bg-outline-variant" />
      {label}
      <span className="h-px flex-1 bg-outline-variant" />
    </div>
  );
}

export interface DaftarPesanProps {
  pesan: readonly PesanTampil[];
  aktif: JawabanAktif | null;
  galat: GalatKirim | null;
  adaSebelumnya: boolean;
  memuatLama: boolean;
  galatLama: boolean;
  onMuatSebelumnya: () => void;
  onBukaRujukan: (r: RujukanChat) => void;
  onCobaLagi: () => void;
  /** Konten state kosong (K-07) bila belum ada pesan. */
  kosong?: ReactNode;
}

/** K-04: riwayat bergulir (role="log"); gulir otomatis kecuali pengguna sedang membaca ke atas (K-13). */
export function DaftarPesan(p: DaftarPesanProps) {
  const ref = useRef<HTMLDivElement>(null);
  const nempel = useRef(true);
  const tinggiSebelumMuat = useRef<number | null>(null);
  const [tampilTerbaru, setTampilTerbaru] = useState(false);
  const idPertama = p.pesan[0]?.id;

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (tinggiSebelumMuat.current !== null) {
      // Pesan lama ditambahkan di atas: pertahankan posisi baca (tanpa lompat).
      el.scrollTop += el.scrollHeight - tinggiSebelumMuat.current;
      tinggiSebelumMuat.current = null;
      return;
    }
    if (nempel.current) el.scrollTop = el.scrollHeight;
    else setTampilTerbaru(true);
  }, [idPertama, p.pesan.length, p.aktif?.teks, p.aktif, p.galat]);

  // Panel di tab tersembunyi / Dialog (B6) baru punya ukuran saat tampil → tempel ulang ke bawah.
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => {
      if (nempel.current) el.scrollTop = el.scrollHeight;
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const onScroll = () => {
    const el = ref.current;
    if (!el) return;
    nempel.current = el.scrollHeight - el.scrollTop - el.clientHeight < JARAK_NEMPEL_BAWAH;
    if (nempel.current) setTampilTerbaru(false);
  };

  const keBawah = () => {
    const halus = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    ref.current?.scrollTo({ top: ref.current.scrollHeight, behavior: halus ? "smooth" : "auto" });
    nempel.current = true;
    setTampilTerbaru(false);
  };

  const muatLama = () => {
    tinggiSebelumMuat.current = ref.current?.scrollHeight ?? null;
    p.onMuatSebelumnya();
  };

  const kosong = p.pesan.length === 0 && !p.aktif && !p.galat;
  const labelPerPesan = p.pesan.map((m) => labelHari(m.createdAt));

  return (
    <div className="relative min-h-0 flex-1">
      <div ref={ref} onScroll={onScroll} className="scrollbar-tipis h-full overflow-y-auto px-4 py-3">
        {p.adaSebelumnya && (
          <div className="mb-3 flex flex-col items-center gap-1">
            <Tombol varian="text" ukuran="sm" ikon="history" memuat={p.memuatLama} onClick={muatLama}>
              {TEKS_TANYA.muatSebelumnya}
            </Tombol>
            {p.galatLama && <p className="text-body-small text-error">{PESAN["MSG-G02"]}</p>}
          </div>
        )}
        {kosong && p.kosong}
        <div role="log" aria-live="polite" aria-relevant="additions" className="flex flex-col gap-3">
          {p.pesan.map((m, i) => {
            const hari = labelPerPesan[i];
            const pemisah = i === 0 || hari !== labelPerPesan[i - 1] ? <Pemisah label={hari} /> : null;
            return (
              <Fragment key={m.id}>
                {pemisah}
                {m.peran === "user" ? (
                  <GelembungPertanyaan isi={m.isi} waktu={m.createdAt} />
                ) : (
                  <GelembungJawaban
                    isi={m.isi}
                    waktu={m.createdAt}
                    rujukan={m.rujukan}
                    isTidakDitemukan={m.isTidakDitemukan}
                    isTerputus={m.isTerputus}
                    isBelumTersimpan={m.isBelumTersimpan}
                    onBukaRujukan={p.onBukaRujukan}
                  />
                )}
              </Fragment>
            );
          })}
          {p.aktif && (
            <>
              <GelembungPertanyaan isi={p.aktif.pertanyaan} waktu={p.aktif.createdAt} />
              {p.aktif.teks ? <GelembungJawaban isi={p.aktif.teks} isStreaming /> : <IndikatorMengetik />}
            </>
          )}
          {p.galat && (
            <>
              <GelembungPertanyaan isi={p.galat.pertanyaan} waktu="" isGagal />
              <BarisGalat pesan={p.galat.pesan} onCobaLagi={p.onCobaLagi} labelCobaLagi={LABEL.cobaLagi} />
            </>
          )}
        </div>
      </div>
      {tampilTerbaru && (
        <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center">
          <Tombol varian="tonal" ukuran="sm" ikon="arrow_downward" onClick={keBawah} className="pointer-events-auto shadow-2">
            {TEKS_TANYA.terbaru}
          </Tombol>
        </div>
      )}
    </div>
  );
}

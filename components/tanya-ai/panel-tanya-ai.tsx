"use client";

import { useMemo, useState } from "react";
import { Banner, ErrorState, Ikon, Skeleton } from "@/components/ui";
import type { RujukanChat } from "@/lib/chat/tipe";
import { pesan as isiPesan, LABEL, PESAN, TEKS } from "@/lib/pesan";
import { cn } from "@/lib/tema/cn";
import { DaftarPesan } from "./daftar-pesan";
import { DialogKutipan } from "./dialog-kutipan";
import { HeaderTanyaAI } from "./header-tanya-ai";
import { KotakPertanyaan } from "./kotak-pertanyaan";
import { daftarSaran, SaranPertanyaan } from "./saran-pertanyaan";
import { TEKS_TANYA } from "./teks";
import { useTanyaAI } from "./use-tanya-ai";

export interface PanelTanyaAIProps {
  dokumenId: number;
  /** Topik yang sedang dibuka → t_chat.topik_id & saran; riwayat tetap per dokumen (BR-19). */
  topikId: number;
  judulTopik: string;
  saranPertanyaan?: string[];
  className?: string;
}

/** K-17: kerangka riwayat (gelembung bergantian kiri/kanan). */
function KerangkaRiwayat() {
  return (
    <div className="flex flex-1 flex-col gap-4 px-4 py-4" role="status" aria-label={TEKS.memuat}>
      <Skeleton className="h-10 w-2/3 self-end rounded-lg" />
      <Skeleton className="h-20 w-4/5 rounded-lg" />
      <Skeleton className="h-10 w-1/2 self-end rounded-lg" />
    </div>
  );
}

/**
 * Panel Tanya AI (FT-06, S-08). Mengisi tinggi wadahnya (h-full, flex kolom): bisa dipakai di
 * kolom kanan, di dalam tab, atau di dalam Dialog/sheet (B6). Header tetap · riwayat bergulir ·
 * area input tetap.
 */
export function PanelTanyaAI({ dokumenId, topikId, judulTopik, saranPertanyaan, className }: PanelTanyaAIProps) {
  const t = useTanyaAI(dokumenId, topikId);
  const [rujukanTerbuka, setRujukanTerbuka] = useState<RujukanChat | null>(null);
  const saran = useMemo(() => daftarSaran(judulTopik, saranPertanyaan), [judulTopik, saranPertanyaan]);

  const isKuotaHabis = t.kuota !== null && t.kuota.sisa <= 0;
  const isMenjawab = t.aktif !== null;
  const siap = t.status === "siap";
  const kosong = siap && t.pesan.length === 0 && !t.aktif && !t.galat;
  // K-10: saran disembunyikan saat menunggu, kuota habis, atau input berisi teks.
  const tampilSaranBaris = siap && !kosong && !isMenjawab && !isKuotaHabis && !t.input.trim();
  const kirimSaran = (s: string) => void t.kirim(s);

  return (
    <section
      aria-label={LABEL.tanyaAi}
      className={cn("flex h-full min-h-0 flex-col bg-surface-container-low text-on-surface", className)}
    >
      <HeaderTanyaAI kuota={t.kuota} />

      {t.status === "memuat" && <KerangkaRiwayat />}
      {t.status === "gagal" && (
        <div className="flex flex-1 items-center justify-center p-4">
          <ErrorState judul={PESAN["MSG-G02"]} ringkas onCobaLagi={t.muatUlang} />
        </div>
      )}
      {siap && (
        <DaftarPesan
          pesan={t.pesan}
          aktif={t.aktif}
          galat={t.galat}
          adaSebelumnya={t.adaSebelumnya}
          memuatLama={t.memuatLama}
          galatLama={t.galatLama}
          onMuatSebelumnya={() => void t.muatSebelumnya()}
          onBukaRujukan={setRujukanTerbuka}
          onCobaLagi={t.cobaLagi}
          kosong={
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <Ikon nama="auto_awesome" ukuran={40} className="text-primary" />
              <p className="max-w-sm text-body-medium text-on-surface-variant">{TEKS_TANYA.sapaan}</p>
              {!isKuotaHabis && (
                <div className="w-full max-w-sm text-left">
                  <p className="mb-2 text-label-large text-on-surface-variant">{TEKS_TANYA.cobaTanyakan}</p>
                  <SaranPertanyaan saran={saran} tata="vertikal" onPilih={kirimSaran} />
                </div>
              )}
            </div>
          }
        />
      )}

      <div className="border-t border-outline-variant px-4 pb-3 pt-2">
        {tampilSaranBaris && <SaranPertanyaan saran={saran} tata="horizontal" onPilih={kirimSaran} />}
        {isKuotaHabis && t.kuota && (
          <Banner nada="warning" ikon="hourglass_disabled" className="mb-2">
            {isiPesan("MSG-C02", { maks: t.kuota.maks })} {TEKS_TANYA.sambilMenunggu}
          </Banner>
        )}
        <KotakPertanyaan
          nilai={t.input}
          onUbah={t.ubahInput}
          onKirim={() => void t.kirim(t.input)}
          onHentikan={t.hentikan}
          isMenjawab={isMenjawab}
          isKuotaHabis={isKuotaHabis}
          isNonaktif={!siap}
          error={t.galatInput}
          onError={t.setGalatInput}
        />
      </div>

      {/* Pengumuman terpisah untuk pembaca layar: tidak membacakan tiap token streaming. */}
      <p className="sr-only" aria-live="polite">
        {t.pengumuman}
      </p>
      <DialogKutipan rujukan={rujukanTerbuka} onTutup={() => setRujukanTerbuka(null)} />
    </section>
  );
}

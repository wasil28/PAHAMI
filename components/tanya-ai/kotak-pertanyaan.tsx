"use client";

import type { KeyboardEvent } from "react";
import { IconButton, Textarea } from "@/components/ui";
import { PERTANYAAN_MAX } from "@/lib/config";
import { PESAN } from "@/lib/pesan";
import { pertanyaanValid } from "@/lib/validasi";
import { AMBANG_PENGHITUNG, TEKS_TANYA } from "./teks";

export interface KotakPertanyaanProps {
  nilai: string;
  onUbah: (nilai: string) => void;
  onKirim: () => void;
  onHentikan: () => void;
  /** Sedang menunggu/streaming: input read-only, tombol berganti Hentikan. */
  isMenjawab: boolean;
  isKuotaHabis: boolean;
  /** Input nonaktif selain kuota (mis. riwayat belum termuat, K-18). */
  isNonaktif?: boolean;
  error: string | null;
  onError: (pesan: string | null) => void;
}

/** K-11: kotak pertanyaan multibaris + kirim/hentikan. Enter kirim, Shift+Enter baris baru (S-08). */
export function KotakPertanyaan(p: KotakPertanyaanProps) {
  const valid = pertanyaanValid(p.nilai);
  const nonaktif = p.isKuotaHabis || p.isNonaktif;

  const kirim = () => {
    if (p.isMenjawab || nonaktif) return;
    if (!valid) {
      // BR-18: hanya spasi → tanpa pesan; 1–2 karakter → MSG-C01 (K-19).
      if (p.nilai.trim()) p.onError(PESAN["MSG-C01"]);
      return;
    }
    p.onKirim();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key !== "Enter" || e.shiftKey || e.nativeEvent.isComposing) return;
    e.preventDefault();
    kirim();
  };

  const panjang = p.nilai.length;
  const pesanError = p.error ?? (panjang >= PERTANYAAN_MAX ? PESAN["MSG-C01"] : null);

  return (
    <div className="flex items-start gap-2">
      <Textarea
        label={TEKS_TANYA.labelInput}
        labelTersembunyi
        rows={1}
        otomatis
        value={p.nilai}
        maxLength={PERTANYAAN_MAX}
        placeholder={p.isKuotaHabis ? TEKS_TANYA.placeholderKuotaHabis : TEKS_TANYA.placeholder}
        readOnly={p.isMenjawab}
        disabled={nonaktif}
        aria-disabled={nonaktif || undefined}
        teksPendukung={TEKS_TANYA.petunjukEnter}
        penghitung={panjang >= AMBANG_PENGHITUNG}
        error={pesanError ?? undefined}
        onChange={(e) => p.onUbah(e.target.value)}
        onKeyDown={onKeyDown}
        className="min-w-0 flex-1"
      />
      <div className="pt-1">
        {p.isMenjawab ? (
          <IconButton ikon="stop" label={TEKS_TANYA.hentikan} varian="tonal" onClick={p.onHentikan} />
        ) : (
          <IconButton ikon="send" label={TEKS_TANYA.kirim} varian="filled" disabled={!valid || nonaktif} onClick={kirim} />
        )}
      </div>
    </div>
  );
}

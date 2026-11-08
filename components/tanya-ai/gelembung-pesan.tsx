"use client";

import { Chip, Ikon } from "@/components/ui";
import { rujukanUnik } from "@/lib/chat/protokol";
import type { RujukanChat } from "@/lib/chat/tipe";
import { formatTanggalWaktu } from "@/lib/format";
import { isiPlaceholder, TEKS } from "@/lib/pesan";
import { cn } from "@/lib/tema/cn";
import { TeksJawaban } from "./teks-jawaban";
import { TEKS_TANYA } from "./teks";

const fmtJam = (iso: string) => formatTanggalWaktu(iso).split(", ").pop() ?? "";

function Waktu({ iso }: { iso: string }) {
  return (
    <time dateTime={iso} className="mt-1 block text-label-small text-on-surface-variant">
      {fmtJam(iso)}
    </time>
  );
}

/** K-05: gelembung pertanyaan pengguna (kanan). `isGagal` → "Belum terkirim" (K-15). */
export function GelembungPertanyaan({ isi, waktu, isGagal }: { isi: string; waktu: string; isGagal?: boolean }) {
  return (
    <article className="flex animate-masuk flex-col items-end">
      <span className="sr-only">{TEKS_TANYA.kamuBertanya}</span>
      <div className="max-w-[85%] whitespace-pre-wrap break-words rounded-lg rounded-br-xs bg-primary-container px-4 py-2.5 text-body-large text-on-primary-container">
        {isi}
      </div>
      {isGagal ? (
        <span className="mt-1 text-label-small text-error">{TEKS_TANYA.belumTerkirim}</span>
      ) : (
        <Waktu iso={waktu} />
      )}
    </article>
  );
}

function AvatarAi() {
  return (
    <span aria-hidden className="grid size-8 shrink-0 place-items-center rounded-full bg-secondary-container text-on-secondary-container">
      <Ikon nama="auto_awesome" ukuran={18} />
    </span>
  );
}

export interface GelembungJawabanProps {
  isi: string;
  waktu?: string;
  rujukan?: readonly RujukanChat[];
  isTidakDitemukan?: boolean;
  isTerputus?: boolean;
  isBelumTersimpan?: boolean;
  /** K-09: sedang streaming → kursor + aria-busy; chip & waktu menyusul setelah selesai. */
  isStreaming?: boolean;
  onBukaRujukan?: (r: RujukanChat) => void;
}

/** K-06 (bersitasi) · K-08 (tidak ditemukan, kuning) · K-09 (streaming). */
export function GelembungJawaban(p: GelembungJawabanProps) {
  const chips = p.isStreaming || p.isTidakDitemukan ? [] : rujukanUnik(p.rujukan ?? []);
  return (
    <article className="flex animate-masuk items-start gap-2" aria-busy={p.isStreaming || undefined}>
      <AvatarAi />
      <div className="flex min-w-0 max-w-[92%] flex-col items-start">
        <span className="sr-only">{p.isTidakDitemukan ? TEKS_TANYA.aiTidakDitemukan : TEKS_TANYA.aiMenjawab}</span>
        <div
          className={cn(
            "min-w-0 max-w-full rounded-lg rounded-tl-xs px-4 py-2.5",
            p.isTidakDitemukan ? "bg-warning-container text-on-warning-container" : "bg-surface-container-high text-on-surface",
          )}
        >
          {p.isTidakDitemukan && (
            <p className="mb-1 flex items-center gap-1.5 text-label-large">
              <Ikon nama="search_off" ukuran={18} />
              {TEKS_TANYA.tidakAdaDiDokumen}
            </p>
          )}
          {p.isTidakDitemukan ? <p className="text-body-large">{p.isi}</p> : <TeksJawaban teks={p.isi} />}
          {p.isStreaming && <span aria-hidden className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-on-surface align-middle" />}
          {chips.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {chips.map((r) => (
                <Chip
                  key={r.halaman}
                  varian="assist"
                  ikon="bookmark"
                  label={isiPlaceholder(TEKS_TANYA.hal, { halaman: r.halaman })}
                  aria-label={isiPlaceholder(TEKS_TANYA.lihatKutipan, { halaman: r.halaman })}
                  aria-haspopup="dialog"
                  onClick={() => p.onBukaRujukan?.(r)}
                />
              ))}
            </div>
          )}
        </div>
        {(p.isTerputus || p.isBelumTersimpan) && !p.isStreaming && (
          <p className="mt-1 flex items-center gap-1 text-label-small text-on-surface-variant">
            <Ikon nama="link_off" ukuran={14} />
            {[p.isTerputus && TEKS_TANYA.terputus, p.isBelumTersimpan && TEKS_TANYA.belumTersimpan].filter(Boolean).join(" · ")}
          </p>
        )}
        {p.waktu && !p.isStreaming && <Waktu iso={p.waktu} />}
      </div>
    </article>
  );
}

/** K-14: indikator menunggu token pertama — teks, bukan hanya titik animasi (aksesibilitas). */
export function IndikatorMengetik() {
  return (
    <div className="flex items-start gap-2" role="status">
      <AvatarAi />
      <div className="flex items-center gap-2 rounded-lg rounded-tl-xs bg-surface-container-high px-4 py-3 text-body-medium text-on-surface-variant">
        <span aria-hidden className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <span key={i} className="size-1.5 animate-pulse rounded-full bg-on-surface-variant" style={{ animationDelay: `${i * 200}ms` }} />
          ))}
        </span>
        {TEKS.aiMengetik}
      </div>
    </div>
  );
}

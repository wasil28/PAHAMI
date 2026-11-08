"use client";

import { useEffect, useState } from "react";
import { Ikon } from "@/components/ui";
import type { ResponsSampul } from "@/lib/materi/tipe";
import { cn } from "@/lib/tema/cn";
import { ambilApi, tungguSampaiSiap } from "./ambil-api";

function adalahSampul(d: unknown): d is ResponsSampul {
  return typeof d === "object" && d !== null && "url" in d;
}

/**
 * Sampul topik (gambar AI, dekoratif → alt=""). URL tersimpan tampil langsung; bila belum ada,
 * dibuat sekali lewat POST /api/topik/[id]/sampul (202 → polling). Gagal / url null / signed URL
 * kedaluwarsa → placeholder gradasi tetap tampil, tanpa pesan galat (bukan bagian inti belajar).
 * <img> biasa karena signed URL Supabase Storage tidak didaftarkan di images.remotePatterns.
 */
export function SampulTopik({ topikId, urlAwal }: { topikId: number; urlAwal: string | null }) {
  const [url, setUrl] = useState<string | null>(urlAwal);
  const [menunggu, setMenunggu] = useState(urlAwal === null);
  // URL dari server langsung tampil (onLoad bisa terjadi sebelum hidrasi); fade hanya untuk gambar baru.
  const [termuat, setTermuat] = useState(urlAwal !== null);
  const [rusak, setRusak] = useState(false);

  useEffect(() => {
    if (urlAwal !== null) return;
    let hidup = true;
    void tungguSampaiSiap(
      () => ambilApi<unknown>(`/api/topik/${topikId}/sampul`, { method: "POST" }),
      adalahSampul,
      () => hidup,
    ).then((h) => {
      if (!hidup) return;
      if (h.jenis === "siap" && h.data.url) setUrl(h.data.url);
      setMenunggu(false);
    });
    return () => {
      hidup = false;
    };
  }, [topikId, urlAwal]);

  const tampilGambar = url !== null && !rusak;

  return (
    <div
      aria-hidden
      className="relative mb-6 aspect-video overflow-hidden rounded-lg bg-linear-to-br from-primary-container via-secondary-container to-tertiary-container expanded:aspect-[21/9]"
    >
      {/* Placeholder: motif lingkaran lembut + ikon buku, berdenyut selama gambar dibuat. */}
      <div className={cn("absolute inset-0", menunggu && !termuat && "animate-pulse")}>
        <div className="absolute -top-1/4 -left-[10%] size-3/5 rounded-full bg-primary opacity-10" />
        <div className="absolute -right-[8%] -bottom-1/3 size-1/2 rounded-full bg-tertiary opacity-15" />
        <div className="absolute inset-0 grid place-items-center text-on-primary-container opacity-60">
          <Ikon nama="auto_stories" ukuran={56} />
        </div>
      </div>
      {tampilGambar && (
        // eslint-disable-next-line @next/next/no-img-element -- signed URL dinamis, lihat komentar di atas
        <img
          src={url}
          alt=""
          decoding="async"
          onLoad={() => setTermuat(true)}
          onError={() => setRusak(true)}
          className={cn(
            "absolute inset-0 size-full object-cover transition-opacity duration-500",
            termuat ? "opacity-100" : "opacity-0",
          )}
        />
      )}
    </div>
  );
}

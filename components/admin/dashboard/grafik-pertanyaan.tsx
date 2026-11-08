"use client";

import { useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { DataTable, EmptyState, Kartu, Tombol } from "@/components/ui";
import type { TitikSeriHarian } from "@/lib/data/admin";
import { formatAngka, formatTanggal, formatTanggalPendek } from "@/lib/format";
import { pesan } from "@/lib/pesan";

// Warna lewat variabel CSS token M3 (tanpa hex) agar ikut tema terang/gelap.
const WARNA = {
  batang: "var(--md-primary)",
  hariIni: "var(--md-tertiary)",
  grid: "var(--md-outline-variant)",
  label: "var(--md-on-surface-variant)",
};

/** Grafik batang pertanyaan AI per hari (FT-11 K-07..K-09, K-17) + alternatif tabel. */
export function GrafikPertanyaan({ seri, hari }: { seri: TitikSeriHarian[]; hari: number }) {
  const [modeTabel, setModeTabel] = useState(false);
  const total = seri.reduce((s, t) => s + t.jumlah, 0);
  const puncak = seri.reduce<TitikSeriHarian | null>((m, t) => (!m || t.jumlah > m.jumlah ? t : m), null);
  const terakhir = seri.at(-1)?.tanggal;

  return (
    <Kartu as="section" padding="md" radius="lg" aria-labelledby="judul-grafik" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 id="judul-grafik" className="text-title-medium">
          Pertanyaan AI per hari
        </h3>
        {total > 0 && (
          <Tombol varian="text" ukuran="sm" onClick={() => setModeTabel((v) => !v)}>
            {modeTabel ? "Lihat sebagai grafik" : "Lihat sebagai tabel"}
          </Tombol>
        )}
      </div>

      {total === 0 ? (
        <EmptyState ringkas ikon="bar_chart" judul={pesan("MSG-E05", { n: hari })} />
      ) : modeTabel ? (
        <DataTable
          keterangan="Jumlah pertanyaan AI per hari, terbaru di atas"
          data={[...seri].reverse()}
          kunciBaris={(t) => t.tanggal}
          kolom={[
            { kunci: "tanggal", judul: "Tanggal", render: (t) => formatTanggal(t.tanggal) },
            { kunci: "jumlah", judul: "Pertanyaan", rata: "kanan", render: (t) => formatAngka(t.jumlah) },
          ]}
        />
      ) : (
        <div className="h-64" role="img" aria-label={`Grafik batang pertanyaan AI ${hari} hari terakhir, total ${formatAngka(total)}`}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={seri} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
              <CartesianGrid vertical={false} stroke={WARNA.grid} />
              <XAxis
                dataKey="tanggal"
                tickFormatter={(v: string) => formatTanggalPendek(v)}
                interval={hari > 7 ? 6 : 0}
                tick={{ fill: WARNA.label, fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis allowDecimals={false} tick={{ fill: WARNA.label, fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip
                cursor={{ fill: WARNA.grid, fillOpacity: 0.3 }}
                content={({ active, payload }) => {
                  const t = payload?.[0]?.payload as TitikSeriHarian | undefined;
                  if (!active || !t) return null;
                  return (
                    <div className="rounded-xs bg-inverse-surface px-2 py-1 text-body-small text-inverse-on-surface">
                      {formatTanggal(t.tanggal)}
                      {t.tanggal === terakhir ? " (hari ini)" : ""}: {formatAngka(t.jumlah)} pertanyaan
                    </div>
                  );
                }}
              />
              <Bar dataKey="jumlah" radius={[4, 4, 0, 0]} maxBarSize={32}>
                {seri.map((t) => (
                  <Cell key={t.tanggal} fill={t.tanggal === terakhir ? WARNA.hariIni : WARNA.batang} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {total > 0 && puncak && (
        <p className="text-body-small text-on-surface-variant">
          Rata-rata {formatAngka(Math.round(total / Math.max(1, seri.length)))}/hari · Puncak {formatAngka(puncak.jumlah)} (
          {formatTanggalPendek(puncak.tanggal)}) · Batang warna lain = hari ini (masih berjalan)
        </p>
      )}
    </Kartu>
  );
}

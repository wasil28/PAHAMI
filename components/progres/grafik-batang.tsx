"use client";

import { useRouter } from "next/navigation";
import { useSyncExternalStore } from "react";
import { Bar, BarChart, CartesianGrid, Cell, LabelList, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { SKOR_SELESAI } from "@/lib/config";
import { isiPlaceholder, STATUS_TOPIK, type StatusTopik } from "@/lib/pesan";
import type { SkorTopik } from "@/lib/data/progres";
import { hrefTopik } from "./rute";
import { TEKS_PROGRES as T } from "./teks";

// KEPUTUSAN C3: warna batang mengikuti STATUS topik (BR-13), bukan angka skor — skor 65 bisa
// "Selesai" (pernah ≥ 70) atau "Perlu diulang". Warna dari token CSS, tanpa hex.
export const WARNA_STATUS: Record<StatusTopik, string> = {
  selesai: "var(--md-success)",
  lemah: "var(--md-warning)",
  belum: "var(--md-outline-variant)",
};

const TINGGI_BARIS = 40;
const TINGGI_SUMBU = 32;
const MAKS_KARAKTER_LABEL = 22;

type Baris = { kunci: string; label: string; skor: number; teks: string; status: StatusTopik; topik: SkorTopik };

function potong(teks: string): string {
  return teks.length > MAKS_KARAKTER_LABEL ? `${teks.slice(0, MAKS_KARAKTER_LABEL - 1)}…` : teks;
}

/** Animasi dimatikan bila pengguna memilih prefers-reduced-motion (FT-07 §5). */
function useKurangiGerak(): boolean {
  return useSyncExternalStore(
    (ubah) => {
      const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
      mq.addEventListener("change", ubah);
      return () => mq.removeEventListener("change", ubah);
    },
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => true,
  );
}

/** Grafik batang horizontal skor terakhir per topik (FT-07 K-08) dengan garis batas selesai 70. */
export function GrafikBatang({ topik, dokumenId }: { topik: SkorTopik[]; dokumenId: number }) {
  const router = useRouter();
  const kurangiGerak = useKurangiGerak();
  const baris: Baris[] = topik.map((t) => ({
    kunci: String(t.topikId),
    label: `${t.urutan} ${t.judul}`,
    skor: t.skorTerakhir ?? 0,
    teks: t.skorTerakhir === null ? T.belumLatihan : String(t.skorTerakhir),
    status: t.status,
    topik: t,
  }));

  return (
    <ResponsiveContainer width="100%" height={baris.length * TINGGI_BARIS + TINGGI_SUMBU}>
      <BarChart data={baris} layout="vertical" margin={{ top: 16, right: 72, bottom: 0, left: 0 }} barCategoryGap={8}>
        <CartesianGrid horizontal={false} stroke="var(--md-outline-variant)" strokeDasharray="2 4" />
        <XAxis
          type="number"
          domain={[0, 100]}
          ticks={[0, 20, 40, 60, 80, 100]}
          tick={{ fill: "var(--md-on-surface-variant)", fontSize: 12 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          type="category"
          dataKey="label"
          width={150}
          tickFormatter={(v: string) => potong(v)}
          tick={{ fill: "var(--md-on-surface-variant)", fontSize: 13 }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          cursor={{ fill: "var(--md-surface-container-highest)", opacity: 0.6 }}
          content={({ active, activeIndex }) => {
            const b = active && activeIndex !== undefined && activeIndex !== null ? baris[Number(activeIndex)] : undefined;
            if (!b) return null;
            return (
              <div className="max-w-64 rounded-xs bg-inverse-surface px-2 py-1 text-body-small text-inverse-on-surface shadow-2">
                Topik {b.topik.urutan} · {b.topik.judul} · {b.topik.skorTerakhir === null ? T.belumLatihan : `${T.kolomSkor} ${b.topik.skorTerakhir}`} ·{" "}
                {STATUS_TOPIK[b.status]}
              </div>
            );
          }}
        />
        <ReferenceLine
          x={SKOR_SELESAI}
          stroke="var(--md-outline)"
          strokeDasharray="4 4"
          label={{ value: isiPlaceholder(T.batasSelesai, { n: SKOR_SELESAI }), position: "top", fill: "var(--md-on-surface-variant)", fontSize: 11 }}
        />
        <Bar
          dataKey="skor"
          radius={[0, 4, 4, 0]}
          isAnimationActive={!kurangiGerak}
          animationDuration={300}
          className="cursor-pointer"
          onClick={(_, i) => {
            const b = baris[i];
            if (b) router.push(hrefTopik(dokumenId, b.topik.topikId));
          }}
        >
          {baris.map((b) => (
            <Cell key={b.kunci} fill={WARNA_STATUS[b.status]} />
          ))}
          <LabelList dataKey="teks" position="right" fill="var(--md-on-surface)" fontSize={13} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

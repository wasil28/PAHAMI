"use client";

import { useState, type ReactNode } from "react";
import { Tabs } from "@/components/ui";
import { LABEL } from "@/lib/pesan";
import { TEKS_BELAJAR } from "./teks";
import { useExpanded } from "./use-expanded";

export type TabTopik = "materi" | "tanya";

type Props = {
  /** Bagian atas kolom utama (sampul, header, ajakan) — di Compact/Medium tampil sebelum `isiTopik`. */
  kepala?: ReactNode;
  materi: ReactNode;
  panelTanya: ReactNode;
  /** Kartu "Isi topik": Expanded → atas kolom kanan (maks ±34%, bisa dilipat, gulir sendiri); lainnya → tab Materi. */
  isiTopik?: ReactNode;
  tabAwal: TabTopik;
};

/**
 * Tata letak S-08 & halaman materi. Lebar ≥ 1200 px: dua kolom; kolom kanan menempel berisi
 * "Isi topik" (opsional) di atas panel Tanya AI yang mengisi sisa tinggi.
 * Compact & Medium: Tabs "Materi / Tanya AI" (KEPUTUSAN C4). Tab aktif disimpan di ?tab=tanya
 * lewat history.replaceState — tanpa memuat ulang data server.
 */
export function LayoutHalamanTopik({ kepala, materi, panelTanya, isiTopik, tabAwal }: Props) {
  const expanded = useExpanded();
  const [tab, setTab] = useState<TabTopik>(tabAwal);

  const ubahTab = (id: string) => {
    const baru: TabTopik = id === "tanya" ? "tanya" : "materi";
    setTab(baru);
    const url = new URL(window.location.href);
    if (baru === "tanya") url.searchParams.set("tab", "tanya");
    else url.searchParams.delete("tab");
    window.history.replaceState(window.history.state, "", url);
  };

  if (expanded) {
    return (
      <div className="grid grid-cols-[minmax(0,1fr)_minmax(320px,380px)] items-start gap-6">
        <div className="min-w-0">
          {kepala}
          {materi}
        </div>
        <aside
          aria-label={isiTopik ? TEKS_BELAJAR.kolomSamping : LABEL.tanyaAi}
          className="sticky top-6 flex h-[calc(100dvh-48px)] min-h-0 flex-col gap-4"
        >
          {isiTopik && <div className="flex max-h-[34%] min-h-0 shrink-0 flex-col">{isiTopik}</div>}
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg">{panelTanya}</div>
        </aside>
      </div>
    );
  }

  return (
    <Tabs
      label={TEKS_BELAJAR.tabTopik}
      aktif={tab}
      onUbah={ubahTab}
      kelasPanel="pt-4"
      tab={[
        {
          id: "materi",
          label: TEKS_BELAJAR.materi,
          ikon: "menu_book",
          konten: (
            <>
              {kepala}
              {isiTopik && <div className="mb-8 max-w-[70ch]">{isiTopik}</div>}
              {materi}
            </>
          ),
        },
        {
          id: "tanya",
          label: LABEL.tanyaAi,
          ikon: "forum",
          // Tinggi tetap agar riwayat chat menggulir di dalam panel, bukan seluruh halaman.
          konten: <div className="flex h-[calc(100dvh-14rem)] min-h-[420px] flex-col">{panelTanya}</div>,
        },
      ]}
    />
  );
}

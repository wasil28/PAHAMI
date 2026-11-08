"use client";

import { useSyncExternalStore } from "react";

// Batas tata letak dua kolom halaman topik/materi (materi + kolom kanan Isi topik & Tanya AI).
// Sengaja ≥ 1200 px (Large), bukan Expanded 840: di 840–1199 px sidebar navigasi + kolom kanan
// 380 px menyisakan < 300 px untuk materi sehingga judul & diagram rusak. Di bawahnya → Tabs.
const KUERI_EXPANDED = "(min-width: 1200px)";

function langganan(onUbah: () => void): () => void {
  const mql = window.matchMedia(KUERI_EXPANDED);
  mql.addEventListener("change", onUbah);
  return () => mql.removeEventListener("change", onUbah);
}

/**
 * true bila layar cukup lebar untuk dua kolom (≥ 1200 px). Dipakai agar PanelTanyaAI dirender SATU kali (kolom kanan atau tab),
 * bukan dua salinan yang sama-sama memuat riwayat. Server/hidrasi awal menganggap compact.
 */
export function useExpanded(): boolean {
  return useSyncExternalStore(
    langganan,
    () => window.matchMedia(KUERI_EXPANDED).matches,
    () => false,
  );
}

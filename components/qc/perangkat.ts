// Penangkap konteks laporan di sisi klien (hanya dipanggil di event handler, bukan saat render server).
import { LAMPIRAN_QC_MAKS_BYTE, LAMPIRAN_QC_TIPE, type InfoPerangkat } from "@/lib/qc/tipe";
import { TEKS_QC } from "./teks";

/** Tema efektif: class manual `.dark`/`.light` di <html> menang atas preferensi sistem (lihat globals.css). */
function temaAktif(): InfoPerangkat["tema"] {
  const html = document.documentElement;
  if (html.classList.contains("dark") || html.dataset.theme === "dark") return "gelap";
  if (html.classList.contains("light") || html.dataset.theme === "light") return "terang";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "gelap" : "terang";
}

export function ambilInfoPerangkat(): InfoPerangkat {
  return {
    userAgent: navigator.userAgent,
    lebarLayar: window.innerWidth,
    tinggiLayar: window.innerHeight,
    tema: temaAktif(),
  };
}

/** Path + query halaman saat dialog dibuka (tanpa origin, agar ringkas & sama antar-lingkungan). */
export function ambilUrlHalaman(): string {
  return window.location.pathname + window.location.search;
}

/** null bila valid, selain itu pesan galat (cek awal di klien; server tetap memvalidasi ulang). */
export function cekLampiran(file: File): string | null {
  if (!(LAMPIRAN_QC_TIPE as readonly string[]).includes(file.type)) return TEKS_QC.tipeTidakDidukung;
  if (file.size > LAMPIRAN_QC_MAKS_BYTE) return TEKS_QC.terlaluBesar;
  return null;
}

import { JUMLAH_PILIHAN } from "@/lib/config";

/**
 * Urutan tampil pilihan diacak per sesi (BR-11). Hasil = indeks asli (0..3) per posisi tampil;
 * jawaban yang dikirim ke server tetap indeks asli. Dipanggil di server (prop awal, agar hidrasi
 * konsisten) atau di event handler klien — tidak pernah saat render klien.
 */
export function acakPilihan(jumlahSoal: number): number[][] {
  return Array.from({ length: jumlahSoal }, () => {
    const urutan = Array.from({ length: JUMLAH_PILIHAN }, (_, i) => i);
    for (let i = urutan.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [urutan[i], urutan[j]] = [urutan[j], urutan[i]];
    }
    return urutan;
  });
}

export const HURUF_TAMPIL = ["A", "B", "C", "D"] as const;

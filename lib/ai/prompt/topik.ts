import "server-only";
import { z } from "zod";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { JUDUL_TOPIK_MAX, MAX_TOPIK, MIN_TOPIK } from "@/lib/config";
import { adalahJudul } from "@/lib/ai/chunk";
import {
  ANGGARAN_KARAKTER_KERANGKA,
  KARAKTER_KERANGKA_PER_HALAMAN_MAKS,
  KARAKTER_KERANGKA_PER_HALAMAN_MIN,
} from "@/lib/ai/konfigurasi";
import { ATURAN_JSON } from "@/lib/ai/prompt/umum";
import type { HalamanTeks } from "@/lib/ai/tipe";

// Prompt penyusunan topik (BP-04 langkah 5, BR-09). Model hanya melihat KERANGKA dokumen
// (judul bab + awal teks tiap halaman) agar 300 halaman tetap muat dalam anggaran token.
// Keluaran lalu dinormalkan di kode (topik-normalisasi.ts) — prompt bukan satu-satunya penjaga.

/** Skema longgar: angka boleh string, field opsional — normalisasi yang memperbaiki. */
export const skemaTopikAI = z.object({
  topik: z
    .array(
      z.object({
        judul: z.string().optional(),
        halaman_awal: z.union([z.number(), z.string()]).optional(),
        halaman_akhir: z.union([z.number(), z.string()]).optional(),
        deskripsi: z.string().optional(),
      }),
    )
    .min(1),
});
export type TopikAI = z.infer<typeof skemaTopikAI>;

const JUDUL_PER_HALAMAN_MAKS = 3;

/**
 * Kerangka per halaman: "[Hal. n] ## Judul | awal teks…". Anggaran karakter per halaman
 * dibagi rata dari ANGGARAN_KARAKTER_KERANGKA (min 200, maks 1.500 karakter).
 */
export function buatKerangkaDokumen(halaman: readonly HalamanTeks[]): string {
  const perHalaman = Math.max(
    KARAKTER_KERANGKA_PER_HALAMAN_MIN,
    Math.min(KARAKTER_KERANGKA_PER_HALAMAN_MAKS, Math.floor(ANGGARAN_KARAKTER_KERANGKA / Math.max(1, halaman.length))),
  );
  return halaman
    .map((h) => {
      const baris = h.teks.split("\n").map((b) => b.trim()).filter(Boolean);
      const judul = baris.filter(adalahJudul).slice(0, JUDUL_PER_HALAMAN_MAKS);
      const isi = baris.filter((b) => !judul.includes(b)).join(" ").replace(/\s+/g, " ");
      const kepala = judul.map((j) => `## ${j}`).join(" ");
      const sisa = Math.max(0, perHalaman - kepala.length);
      const ringkas = isi.length > sisa ? `${isi.slice(0, sisa)}…` : isi;
      return `[Hal. ${h.nomor}] ${kepala}${kepala && ringkas ? " | " : ""}${ringkas || (kepala ? "" : "(kosong)")}`;
    })
    .join("\n");
}

export function promptTopik(kerangka: string, jumlahHalaman: number): ChatCompletionMessageParam[] {
  const sistem = `Kamu perancang jalur belajar untuk mahasiswa Universitas Terbuka. Tugasmu membagi sebuah dokumen PDF (modul/buku ajar) menjadi topik belajar berurutan berdasarkan KERANGKA dokumen yang diberikan.

ATURAN TOPIK:
- Buat ${MIN_TOPIK}–${MAX_TOPIK} topik (dokumen sangat pendek boleh kurang dari ${MIN_TOPIK}). Ikuti struktur asli dokumen (bab, kegiatan belajar, subbab) bila ada.
- Topik berurutan sesuai isi dokumen. Rentang halaman TIDAK boleh tumpang tindih, harus bersambung, dan mencakup halaman 1 sampai ${jumlahHalaman}.
- Halaman pembuka (sampul, daftar isi, kata pengantar) gabungkan ke topik pertama; daftar pustaka/glosarium/kunci jawaban gabungkan ke topik terakhir. Jangan jadikan topik tersendiri.
- Judul topik dalam bahasa Indonesia, deskriptif, maksimal ${JUDUL_TOPIK_MAX} karakter, berdasarkan judul bab/isi dokumen (bukan karangan). Jangan awali dengan "Topik 1:" atau nomor.
- Deskripsi: 1 kalimat singkat tentang isi topik.
- Gunakan hanya nomor halaman dari label [Hal. n].

${ATURAN_JSON}
Bentuk:
{"topik":[{"judul":"…","halaman_awal":1,"halaman_akhir":12,"deskripsi":"…"}]}`;

  const pengguna = `Jumlah halaman dokumen: ${jumlahHalaman}.
Kerangka dokumen (tiap baris = satu halaman; "##" = judul bagian yang terdeteksi; teks setelah "|" = awal isi halaman):

${kerangka}`;

  return [
    { role: "system", content: sistem },
    { role: "user", content: pengguna },
  ];
}

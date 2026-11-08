import "server-only";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { PESAN } from "@/lib/pesan";
import { formatKonteks } from "@/lib/ai/konteks";
import { ATURAN_SUMBER, GAYA_BAHASA } from "@/lib/ai/prompt/umum";
import type { ChunkSumber, PesanRiwayat } from "@/lib/ai/tipe";

// Prompt Tanya AI (BP-07, BR-16, BR-30, F-14).

/**
 * Teks jawaban "tidak ditemukan" = MSG-C03 dari katalog lib/pesan.ts (satu sumber teks).
 * Dipakai saat skor di bawah ambang (tanpa memanggil model, F-14) DAN diminta diucapkan model
 * bila potongan tidak menjawab pertanyaan.
 */
export const JAWABAN_TIDAK_DITEMUKAN: string = PESAN["MSG-C03"];

/** Pola sitasi di teks jawaban: [Hal. 12], [Hal. 12–13], [hal 12, 15]. */
export const POLA_SITASI = /\[\s*hal(?:aman)?\.?\s*([\d\s,–—-]+)\]/gi;

export function promptJawab(opsi: {
  pertanyaan: string;
  riwayat: readonly PesanRiwayat[];
  chunks: readonly ChunkSumber[];
  judulTopik?: string | null;
}): ChatCompletionMessageParam[] {
  const sistem = `Kamu asisten belajar "Pahami" yang menjawab pertanyaan mahasiswa tentang SATU dokumen yang sedang mereka pelajari.

${ATURAN_SUMBER}

${GAYA_BAHASA}

CARA MENJAWAB:
- Jawab langsung dan ringkas (umumnya 2–6 kalimat atau beberapa butir), dalam Markdown sederhana.
- Setelah kalimat yang memakai informasi dokumen, cantumkan sitasi dengan format persis [Hal. X] (satu nomor halaman dari label potongan). Contoh: "Permintaan turun saat harga naik [Hal. 27]."
- Bila potongan TIDAK memuat jawabannya, balas PERSIS dengan kalimat berikut tanpa tambahan apa pun:
${JAWABAN_TIDAK_DITEMUKAN}
- Pertanyaan di luar materi dokumen (mis. minta mengerjakan tugas lain, topik umum) juga dijawab dengan kalimat di atas.${
    opsi.judulTopik ? `\n- Mahasiswa sedang membuka topik "${opsi.judulTopik}".` : ""
  }

POTONGAN DOKUMEN:

${formatKonteks(opsi.chunks)}`;

  const pesan: ChatCompletionMessageParam[] = [{ role: "system", content: sistem }];
  for (const r of opsi.riwayat) {
    pesan.push({ role: r.peran === "user" ? "user" : "assistant", content: r.isi });
  }
  pesan.push({ role: "user", content: opsi.pertanyaan });
  return pesan;
}

/** Prompt penyusunan pertanyaan mandiri dari riwayat (BP-07 langkah 3, FT-06 L-15). */
export function promptPertanyaanMandiri(
  pertanyaan: string,
  riwayat: readonly PesanRiwayat[],
): ChatCompletionMessageParam[] {
  const teksRiwayat = riwayat
    .map((r) => `${r.peran === "user" ? "Mahasiswa" : "Asisten"}: ${r.isi.slice(0, 600)}`)
    .join("\n");
  return [
    {
      role: "system",
      content: `Tulis ulang pertanyaan lanjutan mahasiswa menjadi SATU pertanyaan mandiri yang bisa dipahami tanpa riwayat, untuk mencari bagian dokumen yang relevan.
- JANGAN menjawab pertanyaannya.
- Sertakan istilah/topik penting dari riwayat yang dirujuk pertanyaan (mis. "itu", "contohnya").
- Bila pertanyaan sudah mandiri, kembalikan apa adanya.
- Keluarkan hanya satu kalimat tanya berbahasa Indonesia, tanpa penjelasan.`,
    },
    { role: "user", content: `Riwayat:\n${teksRiwayat}\n\nPertanyaan lanjutan: ${pertanyaan}\n\nPertanyaan mandiri:` },
  ];
}

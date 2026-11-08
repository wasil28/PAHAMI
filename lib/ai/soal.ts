import "server-only";
import type OpenAI from "openai";
import { JUMLAH_PILIHAN, JUMLAH_SOAL } from "@/lib/config";
import { pemakaianKosong } from "@/lib/ai/biaya";
import { AiFormatError, parseJsonAI } from "@/lib/ai/json";
import { ANGGARAN_KARAKTER_KONTEKS_TOPIK, SUHU_SOAL, TOKEN_MAKS_SOAL } from "@/lib/ai/konfigurasi";
import { batasiKonteks, chunkDalamRentang, formatKonteks } from "@/lib/ai/konteks";
import { AiGagalError, panggilDanOlah } from "@/lib/ai/panggil";
import { promptSoal, skemaSoalAI, type SoalAI } from "@/lib/ai/prompt/soal";
import type { ChunkSumber, Pemakaian, TopikRentang } from "@/lib/ai/tipe";

export type KunciSoal = "A" | "B" | "C" | "D";
const HURUF: readonly KunciSoal[] = ["A", "B", "C", "D"];

/** Baris siap simpan ke t_soal (tanpa topik_id). */
export interface SoalBaru {
  urutan: number;
  pertanyaan: string;
  pilihan_a: string;
  pilihan_b: string;
  pilihan_c: string;
  pilihan_d: string;
  kunci: KunciSoal;
  pembahasan: string;
  halaman_rujukan: number;
}

/**
 * Membuat tepat 5 soal PG (BP-06, BR-11, BR-30). Soal yang melanggar aturan dibuang; bila
 * tersisa < 5, keluaran dianggap tidak valid → dicoba ulang dengan pesan koreksi.
 * Pemakaian → log fitur 'soal'.
 * @throws AiGagalError
 */
export async function buatSoal(
  topik: TopikRentang,
  chunks: readonly ChunkSumber[],
  klien?: OpenAI,
): Promise<{ soal: SoalBaru[]; pemakaian: Pemakaian }> {
  const dalam = chunkDalamRentang(chunks, topik.halaman_awal, topik.halaman_akhir);
  if (dalam.length === 0) {
    throw new AiGagalError("Tidak ada teks dokumen pada rentang halaman topik.", pemakaianKosong());
  }
  const konteks = batasiKonteks(dalam, ANGGARAN_KARAKTER_KONTEKS_TOPIK);
  const { hasil, pemakaian } = await panggilDanOlah(
    {
      pesan: promptSoal(topik, formatKonteks(konteks)),
      suhu: SUHU_SOAL,
      maksToken: TOKEN_MAKS_SOAL,
      json: true,
    },
    (teks) => validasiSoal(parseJsonAI(teks, "object", skemaSoalAI).soal, topik),
    klien,
  );
  return { soal: hasil, pemakaian };
}

/**
 * Validasi BR-11 / FT-05 L-07: 4 pilihan tidak kosong & tidak kembar, kunci ∈ A–D, pembahasan
 * ada, halaman_rujukan ∈ rentang topik, pertanyaan tidak kembar. Mengambil 5 soal valid pertama.
 * @throws AiFormatError bila soal valid < 5
 */
export function validasiSoal(daftar: SoalAI["soal"], topik: TopikRentang): SoalBaru[] {
  const valid: SoalBaru[] = [];
  const masalah: string[] = [];
  const pertanyaanSudah = new Set<string>();

  daftar.forEach((s, i) => {
    const no = i + 1;
    const pertanyaan = s.pertanyaan.trim();
    const pilihan = s.pilihan.map(bersihkanPilihan);
    const kunci = keKunci(s.kunci);
    const halaman = Math.round(s.halaman_rujukan);
    const kecil = pilihan.map((p) => p.toLowerCase());

    if (!pertanyaan) masalah.push(`Soal ${no}: pertanyaan kosong.`);
    else if (pilihan.length !== JUMLAH_PILIHAN) masalah.push(`Soal ${no}: pilihan harus tepat ${JUMLAH_PILIHAN}.`);
    else if (pilihan.some((p) => !p)) masalah.push(`Soal ${no}: ada pilihan kosong.`);
    else if (new Set(kecil).size !== kecil.length) masalah.push(`Soal ${no}: ada pilihan kembar.`);
    else if (!kunci) masalah.push(`Soal ${no}: kunci harus A, B, C, atau D.`);
    else if (!s.pembahasan.trim()) masalah.push(`Soal ${no}: pembahasan kosong.`);
    else if (!(halaman >= topik.halaman_awal && halaman <= topik.halaman_akhir)) {
      masalah.push(`Soal ${no}: halaman_rujukan ${halaman} di luar rentang ${topik.halaman_awal}–${topik.halaman_akhir}.`);
    } else if (pertanyaanSudah.has(pertanyaan.toLowerCase())) masalah.push(`Soal ${no}: pertanyaan kembar.`);
    else {
      pertanyaanSudah.add(pertanyaan.toLowerCase());
      valid.push({
        urutan: valid.length + 1,
        pertanyaan,
        pilihan_a: pilihan[0],
        pilihan_b: pilihan[1],
        pilihan_c: pilihan[2],
        pilihan_d: pilihan[3],
        kunci,
        pembahasan: s.pembahasan.trim(),
        halaman_rujukan: halaman,
      });
    }
  });

  if (valid.length < JUMLAH_SOAL) {
    throw new AiFormatError(
      `Dibutuhkan tepat ${JUMLAH_SOAL} soal valid, baru ${valid.length}.`,
      masalah.join(" "),
    );
  }
  return valid.slice(0, JUMLAH_SOAL);
}

/** Buang awalan "A." / "b)" / "(C)" yang kadang tetap ditulis model. */
function bersihkanPilihan(p: string): string {
  return p.trim().replace(/^\(?[A-Da-d][.)]\s+/, "").trim();
}

/** "B" | "b" | "B." | "(B)" | indeks 0–3 → "B". */
export function keKunci(k: string | number): KunciSoal | null {
  if (typeof k === "number") return Number.isInteger(k) && k >= 0 && k < HURUF.length ? HURUF[k] : null;
  const m = k.trim().match(/^\(?([A-Da-d])[.)]?$/);
  return m ? (m[1].toUpperCase() as KunciSoal) : null;
}

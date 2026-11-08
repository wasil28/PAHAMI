import "server-only";
import type OpenAI from "openai";
import { AiFormatError, parseJsonAI } from "@/lib/ai/json";
import {
  ANGGARAN_KARAKTER_KERANGKA_MATERI,
  ANGGARAN_KARAKTER_KONTEKS_MATERI,
  HALAMAN_PER_MATERI,
  HALAMAN_TANPA_PECAH,
  KARAKTER_KERANGKA_MATERI_PER_CHUNK,
  MATERI_MAKS,
  MATERI_MIN,
  POIN_MATERI_MAKS,
  SUHU_FAKTUAL,
  SUHU_STRUKTUR,
  TOKEN_MAKS_ISI_MATERI,
  TOKEN_MAKS_KERANGKA_MATERI,
} from "@/lib/ai/konfigurasi";
import { batasiKonteks, chunkDalamRentang, formatKonteks, labelHalaman, validasiRujukan } from "@/lib/ai/konteks";
import { AiGagalError, panggilDanOlah } from "@/lib/ai/panggil";
import { promptIsiMateri, promptKerangkaMateri, skemaKerangkaMateriAI, skemaIsiMateriAI } from "@/lib/ai/prompt/materi";
import { pemakaianKosong } from "@/lib/ai/biaya";
import { potongDiKata, rapikanJudul } from "@/lib/ai/topik-normalisasi";
import type { ChunkSumber, Pemakaian, Rujukan, TopikRentang } from "@/lib/ai/tipe";
import { skemaDiagram, type Diagram } from "@/lib/materi/tipe";

// Fitur Materi (KEPUTUSAN §4): kerangka sub-bab per topik + isi detail per sub-bab.

export interface MateriBaru {
  judul: string;
  halaman_awal: number;
  halaman_akhir: number;
}

export interface HasilKerangkaMateri {
  materi: MateriBaru[];
  /** null = tidak memanggil AI (topik pendek). */
  pemakaian: Pemakaian | null;
}

export interface HasilIsiMateri {
  penjelasan: string;
  poin_penting: string[];
  contoh: string;
  diagram: Diagram | null;
  rujukan: Rujukan[];
  pemakaian: Pemakaian;
}

/** Jumlah materi yang dituju untuk topik sepanjang `jumlahHalaman`. */
export function targetJumlahMateri(jumlahHalaman: number): number {
  return Math.min(MATERI_MAKS, Math.max(MATERI_MIN, Math.round(jumlahHalaman / HALAMAN_PER_MATERI)));
}

/**
 * Menormalkan kerangka dari AI (fungsi murni). Hanya halaman AWAL yang dipercaya; akhir = awal
 * materi berikutnya − 1, materi pertama mulai di `awal`, terakhir berakhir di `akhir`. Lebih
 * dari `maks` → pasangan bertetangga dengan rentang gabungan tersempit digabung.
 */
export function normalisasiMateri(
  mentah: readonly { judul?: unknown; halaman_awal?: unknown }[],
  awal: number,
  akhir: number,
  maks: number = MATERI_MAKS,
): MateriBaru[] {
  const kandidat = mentah
    .map((m, i) => {
      const h = typeof m.halaman_awal === "number" ? m.halaman_awal : Number(m.halaman_awal);
      if (!Number.isFinite(h)) return null;
      return {
        judul: rapikanJudul(typeof m.judul === "string" ? m.judul.replace(/^\s*\d+[.)]\s*/, "") : "", i + 1),
        awal: Math.min(akhir, Math.max(awal, Math.round(h))),
        asal: i,
      };
    })
    .filter((m): m is NonNullable<typeof m> => m !== null)
    .sort((x, y) => x.awal - y.awal || x.asal - y.asal);

  const unik: typeof kandidat = [];
  for (const m of kandidat) if (unik.length === 0 || unik[unik.length - 1].awal !== m.awal) unik.push(m);
  if (unik.length === 0) return [];
  unik[0].awal = awal;

  const hasil: MateriBaru[] = unik.map((m, i) => ({
    judul: m.judul,
    halaman_awal: m.awal,
    halaman_akhir: i + 1 < unik.length ? unik[i + 1].awal - 1 : akhir,
  }));
  while (hasil.length > Math.max(1, maks)) {
    let terbaik = 0;
    for (let i = 1; i < hasil.length - 1; i++) {
      const lebar = hasil[i + 1].halaman_akhir - hasil[i].halaman_awal;
      if (lebar < hasil[terbaik + 1].halaman_akhir - hasil[terbaik].halaman_awal) terbaik = i;
    }
    hasil.splice(terbaik, 2, { ...hasil[terbaik], halaman_akhir: hasil[terbaik + 1].halaman_akhir });
  }
  return hasil;
}

/** Cuplikan awal tiap chunk + label halaman, dipangkas merata bila melebihi anggaran. */
function susunCuplikan(chunks: readonly ChunkSumber[]): string {
  const perChunk = Math.max(
    120,
    Math.min(KARAKTER_KERANGKA_MATERI_PER_CHUNK, Math.floor(ANGGARAN_KARAKTER_KERANGKA_MATERI / Math.max(1, chunks.length))),
  );
  return chunks
    .map((c) => `[${labelHalaman(c.halaman_awal, c.halaman_akhir)}] ${potongDiKata(c.isi.replace(/\s+/g, " ").trim(), perChunk)}`)
    .join("\n");
}

/**
 * Kerangka materi satu topik. Topik ≤ HALAMAN_TANPA_PECAH halaman (atau hanya 1 chunk) tidak
 * dipecah dan tidak memanggil AI. Pemakaian → log fitur 'materi'.
 * @throws AiGagalError
 */
export async function buatKerangkaMateri(
  topik: TopikRentang,
  chunks: readonly ChunkSumber[],
  klien?: OpenAI,
): Promise<HasilKerangkaMateri> {
  const { halaman_awal: awal, halaman_akhir: akhir } = topik;
  const dalam = chunkDalamRentang(chunks, awal, akhir);
  const jumlahHalaman = akhir - awal + 1;
  const utuh: MateriBaru[] = [{ judul: rapikanJudul(topik.judul, 1), halaman_awal: awal, halaman_akhir: akhir }];
  if (jumlahHalaman <= HALAMAN_TANPA_PECAH || dalam.length <= 1) return { materi: utuh, pemakaian: null };

  const target = targetJumlahMateri(jumlahHalaman);
  const { hasil, pemakaian } = await panggilDanOlah(
    {
      pesan: promptKerangkaMateri(topik, target, susunCuplikan(dalam)),
      suhu: SUHU_STRUKTUR,
      maksToken: TOKEN_MAKS_KERANGKA_MATERI,
      json: true,
    },
    (teks) => {
      const ai = parseJsonAI(teks, "object", skemaKerangkaMateriAI);
      const materi = normalisasiMateri(ai.materi, awal, akhir);
      if (materi.length === 0) throw new AiFormatError("Kerangka materi kosong.", `Buat ${target} materi.`);
      return materi;
    },
    klien,
  );
  return { materi: hasil, pemakaian };
}

/** Diagram AI → Diagram tervalidasi, atau null (bentuk salah tidak menggagalkan materi). */
export function bersihkanDiagram(mentah: unknown): Diagram | null {
  if (!mentah || typeof mentah !== "object") return null;
  const r = skemaDiagram.safeParse(potongTeksDalam(mentah));
  return r.success ? r.data : null;
}

/** Memangkas string terlalu panjang secara rekursif agar batas karakter skema tidak menolak diagram yang baik. */
function potongTeksDalam(nilai: unknown, kunci = ""): unknown {
  if (typeof nilai === "string") return potongDiKata(nilai.trim(), kunci === "keterangan" || kunci === "butir" ? 160 : 60);
  if (Array.isArray(nilai)) return nilai.map((v) => potongTeksDalam(v, kunci));
  if (nilai && typeof nilai === "object") {
    return Object.fromEntries(Object.entries(nilai).map(([k, v]) => [k, k === "jenis" ? v : potongTeksDalam(v, k)]));
  }
  return nilai;
}

/**
 * Isi detail satu materi dari chunk dalam rentangnya. Rujukan wajib ≥ 1 di dalam rentang.
 * Pemakaian → log fitur 'materi'.
 * @throws AiGagalError
 */
export async function buatIsiMateri(
  topik: { judul: string },
  materi: TopikRentang,
  chunks: readonly ChunkSumber[],
  klien?: OpenAI,
): Promise<HasilIsiMateri> {
  const dalam = chunkDalamRentang(chunks, materi.halaman_awal, materi.halaman_akhir);
  if (dalam.length === 0) {
    throw new AiGagalError("Tidak ada teks dokumen pada rentang halaman materi.", pemakaianKosong());
  }
  const konteks = batasiKonteks(dalam, ANGGARAN_KARAKTER_KONTEKS_MATERI);
  const rentang = { awal: materi.halaman_awal, akhir: materi.halaman_akhir };

  const { hasil, pemakaian } = await panggilDanOlah(
    {
      pesan: promptIsiMateri(topik, materi, formatKonteks(konteks)),
      suhu: SUHU_FAKTUAL,
      maksToken: TOKEN_MAKS_ISI_MATERI,
      json: true,
    },
    (teks) => {
      const ai = parseJsonAI(teks, "object", skemaIsiMateriAI);
      const rujukan = validasiRujukan(ai.rujukan, dalam, rentang).sort((a, b) => a.halaman - b.halaman);
      if (rujukan.length === 0) {
        throw new AiFormatError(
          "Rujukan halaman wajib berada di dalam rentang materi.",
          `Gunakan halaman di ${labelHalaman(materi.halaman_awal, materi.halaman_akhir)}.`,
        );
      }
      return {
        penjelasan: ai.penjelasan.replace(/^#{1,2}\s.*\n+/, "").trim(), // buang judul utama bila model menambahkannya
        poin_penting: ai.poin_penting.slice(0, POIN_MATERI_MAKS),
        contoh: ai.contoh,
        diagram: bersihkanDiagram(ai.diagram),
        rujukan,
      };
    },
    klien,
  );
  return { ...hasil, pemakaian };
}

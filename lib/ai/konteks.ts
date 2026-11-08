import "server-only";
import { pecahKalimat } from "@/lib/ai/chunk";
import { KUTIPAN_MAKS } from "@/lib/ai/konfigurasi";
import { potongDiKata } from "@/lib/ai/topik-normalisasi";
import type { ChunkSumber, Rujukan } from "@/lib/ai/tipe";

// Utilitas konteks RAG: memformat potongan dokumen untuk prompt, membatasi anggaran, dan
// memvalidasi/memperbaiki rujukan halaman (BR-10, BR-11, BR-30, FT-06 L-21).

export function labelHalaman(awal: number, akhir: number): string {
  return awal === akhir ? `Hal. ${awal}` : `Hal. ${awal}–${akhir}`;
}

/** "[Hal. 12–13]\n<isi>" per chunk, dipisah garis. Label inilah yang dirujuk model. */
export function formatKonteks(chunks: readonly ChunkSumber[]): string {
  return chunks
    .map((c) => `[${labelHalaman(c.halaman_awal, c.halaman_akhir)}]\n${c.isi.trim()}`)
    .join("\n\n---\n\n");
}

/** Chunk yang beririsan dengan rentang halaman topik, terurut. */
export function chunkDalamRentang(
  chunks: readonly ChunkSumber[],
  awal: number,
  akhir: number,
): ChunkSumber[] {
  return chunks
    .filter((c) => c.halaman_akhir >= awal && c.halaman_awal <= akhir)
    .sort((a, b) => (a.urutan ?? a.halaman_awal) - (b.urutan ?? b.halaman_awal) || a.halaman_awal - b.halaman_awal);
}

/**
 * Bila total karakter melebihi anggaran, ambil sampel merata (urutan tetap) agar seluruh
 * rentang topik tetap terwakili — lebih baik daripada hanya awal topik.
 */
export function batasiKonteks<T extends ChunkSumber>(chunks: readonly T[], anggaranKarakter: number): T[] {
  const total = chunks.reduce((s, c) => s + c.isi.length, 0);
  if (total <= anggaranKarakter) return [...chunks];
  const rata = total / chunks.length;
  const jumlah = Math.max(1, Math.floor(anggaranKarakter / rata));
  const langkah = chunks.length / jumlah;
  const hasil: T[] = [];
  for (let i = 0; i < jumlah; i++) hasil.push(chunks[Math.floor(i * langkah)]);
  return hasil;
}

function tokenKata(teks: string): Set<string> {
  return new Set(
    teks
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^\p{L}\p{N}\s]/gu, " ")
      .split(/\s+/)
      .filter((k) => k.length > 2),
  );
}

/**
 * Memilih kalimat di `isi` yang paling mirip `acuan` (irisan kata) sebagai kutipan ≤ 500
 * karakter. Menjamin kutipan benar-benar berasal dari dokumen (BR-30), bukan parafrase model.
 */
export function pilihKutipan(isi: string, acuan: string): string {
  const kalimat = pecahKalimat(isi);
  if (kalimat.length === 0) return potongDiKata(isi.trim(), KUTIPAN_MAKS);
  const kataAcuan = tokenKata(acuan);
  let terbaik = 0;
  let skorTerbaik = -1;
  kalimat.forEach((k, i) => {
    const kata = tokenKata(k);
    let irisan = 0;
    for (const w of kata) if (kataAcuan.has(w)) irisan++;
    const skor = kata.size ? irisan / Math.sqrt(kata.size) : 0;
    if (skor > skorTerbaik) {
      skorTerbaik = skor;
      terbaik = i;
    }
  });
  // Tambah kalimat berikutnya bila masih muat, agar kutipan tidak terlalu pendek.
  let kutipan = kalimat[terbaik];
  const lanjut = kalimat[terbaik + 1];
  if (lanjut && kutipan.length + lanjut.length + 1 <= KUTIPAN_MAKS && kutipan.length < KUTIPAN_MAKS / 3) {
    kutipan = `${kutipan} ${lanjut}`;
  }
  return potongDiKata(kutipan, KUTIPAN_MAKS);
}

function normalSpasi(s: string): string {
  return s.toLowerCase().replace(/\s+/g, " ").trim();
}

/** Chunk pertama yang memuat halaman tsb. */
export function chunkUntukHalaman(chunks: readonly ChunkSumber[], halaman: number): ChunkSumber | null {
  return chunks.find((c) => halaman >= c.halaman_awal && halaman <= c.halaman_akhir) ?? null;
}

/**
 * Memvalidasi rujukan usulan model: halaman harus di [awal, akhir] DAN di dalam chunk yang
 * diberikan; kutipan harus ada di teks chunk — bila tidak (parafrase), diganti kalimat chunk
 * yang paling mirip. Rujukan di luar rentang dibuang (FT-04 L-10). Duplikat halaman digabung.
 */
export function validasiRujukan(
  usulan: readonly { halaman: number; kutipan?: string }[],
  chunks: readonly ChunkSumber[],
  rentang: { awal: number; akhir: number },
): Rujukan[] {
  const hasil: Rujukan[] = [];
  const sudah = new Set<number>();
  for (const u of usulan) {
    const h = Math.round(u.halaman);
    if (!Number.isFinite(h) || h < rentang.awal || h > rentang.akhir || sudah.has(h)) continue;
    const c = chunkUntukHalaman(chunks, h);
    if (!c) continue;
    const kutipanModel = (u.kutipan ?? "").trim();
    const asli = kutipanModel.length >= 10 && normalSpasi(c.isi).includes(normalSpasi(kutipanModel));
    hasil.push({
      halaman: h,
      kutipan: asli ? potongDiKata(kutipanModel, KUTIPAN_MAKS) : pilihKutipan(c.isi, kutipanModel),
      chunk_id: c.id,
    });
    sudah.add(h);
  }
  return hasil;
}

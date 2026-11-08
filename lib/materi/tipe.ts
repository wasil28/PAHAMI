import { z } from "zod";

// Kontrak bersama (server + klien) fitur "Materi": satu topik dipecah menjadi beberapa halaman
// materi (sub-bab) yang masing-masing punya penjelasan detail, poin penting, contoh, diagram,
// dan rujukan halaman. Lihat docs/KEPUTUSAN-IMPLEMENTASI.md §4 "Materi per topik".

// ── Diagram (digambar aplikasi dari data, bukan gambar AI) ─────────────────

const label = z.string().trim().min(1).max(60);
const keterangan = z.string().trim().max(160);

const simpul = z.object({ label, keterangan: keterangan.optional() });

export const skemaDiagram = z.discriminatedUnion("jenis", [
  /** Langkah berurutan (proses, prosedur, tahapan). */
  z.object({ jenis: z.literal("alur"), judul: label, langkah: z.array(simpul).min(2).max(7) }),
  /** Langkah yang berulang kembali ke awal (siklus). */
  z.object({ jenis: z.literal("siklus"), judul: label, langkah: z.array(simpul).min(3).max(6) }),
  /** Klasifikasi/pembagian: akar → cabang → (opsional) anak. */
  z.object({
    jenis: z.literal("hierarki"),
    judul: label,
    akar: label,
    cabang: z.array(z.object({ label, anak: z.array(label).max(4).optional() })).min(2).max(6),
  }),
  /** Perbandingan beberapa hal berdampingan. */
  z.object({
    jenis: z.literal("perbandingan"),
    judul: label,
    kolom: z.array(z.object({ label, butir: z.array(keterangan.min(1)).min(1).max(5) })).min(2).max(4),
  }),
  /** Satu konsep pusat dengan bagian-bagian penyusunnya. */
  z.object({ jenis: z.literal("komponen"), judul: label, pusat: label, bagian: z.array(simpul).min(3).max(8) }),
]);
export type Diagram = z.infer<typeof skemaDiagram>;
export type JenisDiagram = Diagram["jenis"];

// ── Data materi untuk UI ───────────────────────────────────────────────────

export interface RujukanMateri {
  halaman: number;
  kutipan: string;
}

/** Satu baris daftar "Isi topik". */
export interface MateriRingkas {
  id: number;
  urutan: number;
  judul: string;
  halamanAwal: number;
  halamanAkhir: number;
  /** Isi detail sudah pernah dibuat (membuka berikutnya instan). */
  isiSiap: boolean;
  /** Pernah dibuka mahasiswa. */
  sudahDibaca: boolean;
}

/** Isi lengkap satu halaman materi. */
export interface IsiMateri {
  /** Markdown: paragraf, sub-judul ###, daftar, **tebal**. Tanpa gambar/tautan. */
  penjelasan: string;
  poinPenting: string[];
  contoh: string;
  diagram: Diagram | null;
  rujukan: RujukanMateri[];
}

/** Respons POST /api/topik/[id]/materi (200). 202 → { status: "diproses" }. */
export interface ResponsDaftarMateri {
  materi: MateriRingkas[];
}

/** Respons POST /api/materi/[id] (200). 202 → { status: "diproses" }. */
export type ResponsIsiMateri = IsiMateri;

/** Respons POST /api/topik/[id]/sampul (200). url null = gagal/tidak tersedia (dekoratif, abaikan). 202 → { status: "diproses" }. */
export interface ResponsSampul {
  url: string | null;
}

// Uji alur BP-04 (lib/dokumen/proses.ts) dengan Storage/DB/AI palsu. Jalankan:
//   npx tsx --conditions=react-server --test lib/dokumen/__tests__/*.test.ts
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { prosesDokumen, type BarisChunk, type DepsProses, type TopikSimpan } from "@/lib/dokumen/proses";
import { PdfError } from "@/lib/pdf/ekstrak";
import { AiGagalError } from "@/lib/ai/panggil";
import type { CatatPemakaianInput } from "@/lib/ai/pemakaian";
import type { Pemakaian } from "@/lib/ai/tipe";
import { PESAN, pesan, type TahapDokumen } from "@/lib/pesan";

const pakai: Pemakaian = { model: "uji", tokenMasuk: 10, tokenKeluar: 5, biayaRp: 1, durasiMs: 3 };
const DOK = { id: 7, userId: 3, pathFile: "uid/DOK-2026-000007.pdf" };

interface Jejak {
  tahap: TahapDokumen[];
  chunk: BarisChunk[];
  topik: TopikSimpan[] | null;
  gagal: string | null;
  log: CatatPemakaianInput[];
}

function buatDeps(ubah: Partial<DepsProses> = {}): { deps: DepsProses; jejak: Jejak } {
  const jejak: Jejak = { tahap: [], chunk: [], topik: null, gagal: null, log: [] };
  const deps: DepsProses = {
    maxHalaman: 300,
    unduhPdf: async () => new Uint8Array([1, 2, 3]),
    ekstrakTeks: async () => ({
      jumlahHalaman: 2,
      halaman: [
        { nomor: 1, teks: "Bab 1 Pengantar manajemen." },
        { nomor: 2, teks: "Bab 2 Fungsi manajemen." },
      ],
    }),
    isPdfScan: () => false,
    buatChunk: (h) =>
      h.map((x, i) => ({
        urutan: i + 1,
        halaman_awal: x.nomor,
        halaman_akhir: x.nomor,
        judul_bagian: null,
        isi: x.teks,
        jumlah_token: 5,
        jumlah_kata: 4,
      })),
    embedTeks: async (teks) => ({ vektor: teks.map(() => [0.1, 0.2]), pemakaian: pakai }),
    keVektorPg: (v) => `[${v.join(",")}]`,
    susunTopik: async () => ({
      topik: [
        { urutan: 1, judul: "Pengantar", halaman_awal: 1, halaman_akhir: 1, deskripsi: "x" },
        { urutan: 2, judul: "Fungsi", halaman_awal: 2, halaman_akhir: 2, deskripsi: "y" },
      ],
      pemakaian: pakai,
    }),
    majukanTahap: async (_id, tahap) => {
      jejak.tahap.push(tahap);
      return true;
    },
    simpanChunk: async (baris) => {
      jejak.chunk.push(...baris);
      return true;
    },
    selesaikan: async (_id, topik) => {
      jejak.topik = topik;
      return { jumlahTopik: topik.length, judul: "Modul" };
    },
    gagalkan: async (_id, p) => {
      jejak.gagal = p;
      return true;
    },
    catatPemakaian: async (input) => {
      jejak.log.push(input);
    },
    ...ubah,
  };
  return { deps, jejak };
}

describe("prosesDokumen", () => {
  test("alur sukses: tahap berurutan, chunk & topik tersimpan, 2 log sukses", async () => {
    const { deps, jejak } = buatDeps();
    const hasil = await prosesDokumen(DOK, deps);
    assert.deepEqual(hasil, { status: "siap", jumlahTopik: 2, judul: "Modul" });
    assert.deepEqual(jejak.tahap, ["mengekstrak", "memotong", "mengindeks", "menyusun_topik"]);
    assert.equal(jejak.chunk.length, 2);
    assert.equal(jejak.chunk[0].embedding, "[0.1,0.2]");
    assert.equal(jejak.chunk[0].dokumen_id, DOK.id);
    assert.deepEqual(jejak.topik?.[1], { urutan: 2, judul: "Fungsi", halaman_awal: 2, halaman_akhir: 2 });
    assert.deepEqual(
      jejak.log.map((l) => [l.fitur, l.isSukses]),
      [
        ["indeks", true],
        ["topik", true],
      ],
    );
    assert.equal(jejak.gagal, null);
  });

  test("halaman melebihi batas → MSG-U06 dengan angka, gagal di tahap membaca", async () => {
    const { deps, jejak } = buatDeps({
      ekstrakTeks: async () => {
        throw new PdfError("HALAMAN_MELEBIHI", "x", { jumlahHalaman: 412 });
      },
    });
    const hasil = await prosesDokumen(DOK, deps);
    const harap = pesan("MSG-U06", { n: 412, max_halaman: 300 });
    assert.equal(hasil.status, "gagal");
    assert.equal(jejak.gagal, harap);
    assert.equal(hasil.status === "gagal" && hasil.tahap, "membaca");
    assert.equal(jejak.log.length, 0);
  });

  test("PDF scan → MSG-U07 di tahap mengekstrak", async () => {
    const { deps, jejak } = buatDeps({ isPdfScan: () => true });
    const hasil = await prosesDokumen(DOK, deps);
    assert.equal(jejak.gagal, PESAN["MSG-U07"]);
    assert.equal(hasil.status === "gagal" && hasil.tahap, "mengekstrak");
  });

  test("PDF terkunci sandi → MSG-U09", async () => {
    const { deps, jejak } = buatDeps({
      ekstrakTeks: async () => {
        throw new PdfError("PDF_TERKUNCI", "x");
      },
    });
    await prosesDokumen(DOK, deps);
    assert.equal(jejak.gagal, PESAN["MSG-U09"]);
  });

  test("embedding gagal → log indeks is_sukses=false + MSG-U09, chunk tidak disimpan", async () => {
    const { deps, jejak } = buatDeps({
      embedTeks: async () => {
        throw new AiGagalError("embedding gagal", pakai);
      },
    });
    const hasil = await prosesDokumen(DOK, deps);
    assert.equal(hasil.status, "gagal");
    assert.equal(jejak.gagal, PESAN["MSG-U09"]);
    assert.equal(jejak.chunk.length, 0);
    assert.deepEqual(
      jejak.log.map((l) => [l.fitur, l.isSukses]),
      [["indeks", false]],
    );
  });

  test("susun topik gagal → log indeks sukses + topik gagal", async () => {
    const { deps, jejak } = buatDeps({
      susunTopik: async () => {
        throw new AiGagalError("topik gagal", pakai);
      },
    });
    await prosesDokumen(DOK, deps);
    assert.deepEqual(
      jejak.log.map((l) => [l.fitur, l.isSukses]),
      [
        ["indeks", true],
        ["topik", false],
      ],
    );
    assert.equal(jejak.gagal, PESAN["MSG-U09"]);
  });

  test("dokumen dihapus di tengah jalan → berhenti tanpa fn_gagalkan_dokumen", async () => {
    const { deps, jejak } = buatDeps({ majukanTahap: async (_id, t) => t !== "mengindeks" });
    const hasil = await prosesDokumen(DOK, deps);
    assert.deepEqual(hasil, { status: "dihentikan", tahap: "memotong" });
    assert.equal(jejak.gagal, null);
  });

  test("fn_selesaikan_dokumen: dokumen tidak lagi diproses → dihentikan", async () => {
    const { deps, jejak } = buatDeps({ selesaikan: async () => null });
    const hasil = await prosesDokumen(DOK, deps);
    assert.equal(hasil.status, "dihentikan");
    assert.equal(jejak.gagal, null);
  });

  test("fn_simpan_chunk menolak (dokumen ditandai macet A8) → dihentikan tanpa fn_gagalkan", async () => {
    const { deps, jejak } = buatDeps({ simpanChunk: async () => false });
    const hasil = await prosesDokumen(DOK, deps);
    assert.deepEqual(hasil, { status: "dihentikan", tahap: "mengindeks" });
    assert.equal(jejak.gagal, null);
    assert.equal(jejak.topik, null);
  });

  test("tenggat habis saat embedding → MSG-U09, sebab BATAS_WAKTU, log indeks gagal", async () => {
    const tenggat = new AbortController();
    const { deps, jejak } = buatDeps({
      signal: tenggat.signal,
      embedTeks: async () => {
        tenggat.abort(); // panggilan AI dibatalkan sinyal tenggat
        throw new AiGagalError("dibatalkan", pakai);
      },
    });
    const hasil = await prosesDokumen(DOK, deps);
    assert.equal(hasil.status, "gagal");
    assert.equal(hasil.status === "gagal" && hasil.sebab, "BATAS_WAKTU");
    assert.equal(jejak.gagal, PESAN["MSG-U09"]);
    assert.deepEqual(
      jejak.log.map((l) => [l.fitur, l.isSukses]),
      [["indeks", false]],
    );
  });

  test("tenggat habis di antara tahap → berhenti di titik periksa, dokumen digagalkan", async () => {
    const tenggat = new AbortController();
    const { deps, jejak } = buatDeps({
      signal: tenggat.signal,
      buatChunk: () => {
        tenggat.abort();
        return [{ urutan: 1, halaman_awal: 1, halaman_akhir: 1, judul_bagian: null, isi: "x", jumlah_token: 1, jumlah_kata: 1 }];
      },
    });
    const hasil = await prosesDokumen(DOK, deps);
    assert.equal(hasil.status === "gagal" && `${hasil.sebab}@${hasil.tahap}`, "BATAS_WAKTU@memotong");
    assert.equal(jejak.gagal, PESAN["MSG-U09"]);
    assert.deepEqual(jejak.tahap, ["mengekstrak", "memotong"]);
    assert.equal(jejak.log.length, 0);
  });

  test("galat DB tak terduga → MSG-U09; fn_gagalkan yang ikut gagal tidak membuat proses melempar", async () => {
    const { deps } = buatDeps({
      simpanChunk: async () => {
        throw new Error("koneksi putus");
      },
      gagalkan: async () => {
        throw new Error("juga putus");
      },
    });
    const hasil = await prosesDokumen(DOK, deps);
    assert.equal(hasil.status === "gagal" && hasil.pesan, PESAN["MSG-U09"]);
  });
});

// Uji protokol aliran Tanya AI (tanpa jaringan). Jalankan:
//   npx tsx --test lib/chat/__tests__/protokol.test.ts
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { bersihkanPotongan, kodekanMeta, PEMISAH_META, PenguraiAliran, rujukanUnik, uraiMeta } from "@/lib/chat/protokol";
import type { MetaJawaban } from "@/lib/chat/tipe";

const meta: MetaJawaban = {
  status: "selesai",
  chatUserId: 10,
  chatAiId: 11,
  isTidakDitemukan: false,
  isTerputus: false,
  rujukan: [
    { halaman: 15, kutipan: "Neraca adalah laporan posisi keuangan." },
    { halaman: 12, kutipan: "Aset = liabilitas + ekuitas." },
  ],
  kuota: { terpakai: 4, maks: 30, sisa: 26, resetAt: "2026-10-28T17:00:00.000Z" },
  createdAt: "2026-10-28T07:00:00.000Z",
};

/** Simulasikan server (teks + meta → byte) lalu klien (byte dipecah sembarang → TextDecoder). */
function lewatkanKabel(potongan: string[], ukuranPecahan: number): { teksBertahap: string[]; akhir: ReturnType<PenguraiAliran["akhiri"]> } {
  const byte = new TextEncoder().encode(potongan.join(""));
  const dekoder = new TextDecoder();
  const p = new PenguraiAliran();
  const teksBertahap: string[] = [];
  for (let i = 0; i < byte.length; i += ukuranPecahan) {
    teksBertahap.push(p.tambah(dekoder.decode(byte.subarray(i, i + ukuranPecahan), { stream: true })));
  }
  p.tambah(dekoder.decode());
  return { teksBertahap, akhir: p.akhiri() };
}

describe("protokol aliran chat", () => {
  test("teks + meta terurai utuh walau byte terpecah di tengah karakter multibyte", () => {
    const jawaban = ["Neraca **adalah** ", "laporan — “posisi” keuangan ", "[Hal. 15] 😊"];
    for (const ukuran of [1, 2, 3, 7, 64]) {
      const { teksBertahap, akhir } = lewatkanKabel([...jawaban, kodekanMeta(meta)], ukuran);
      assert.equal(akhir.teks, jawaban.join(""));
      assert.deepEqual(akhir.meta, meta);
      // Teks bertahap tidak pernah memuat pemisah/JSON metadata.
      for (const t of teksBertahap) assert.ok(!t.includes(PEMISAH_META) && !t.includes('"chatAiId"'));
    }
  });

  test("aliran tanpa metadata (koneksi putus) → meta null, teks parsial tetap", () => {
    const { akhir } = lewatkanKabel(["Jawaban seten", "gah"], 4);
    assert.equal(akhir.teks, "Jawaban setengah");
    assert.equal(akhir.meta, null);
  });

  test("pemisah dari model dibuang sebelum dikirim", () => {
    assert.equal(bersihkanPotongan(`a${PEMISAH_META}b`), "ab");
    const { akhir } = lewatkanKabel([bersihkanPotongan(`x${PEMISAH_META}y`), kodekanMeta(meta)], 5);
    assert.equal(akhir.teks, "xy");
    assert.equal(akhir.meta?.chatAiId, 11);
  });

  test("uraiMeta toleran & menolak status asing", () => {
    assert.equal(uraiMeta("{rusak"), null);
    assert.equal(uraiMeta(JSON.stringify({ status: "aneh" })), null);
    const m = uraiMeta(JSON.stringify({ status: "gagal_simpan", rujukan: [{ halaman: "3" }, { halaman: 4, kutipan: "k" }], kuota: { sisa: 1 } }));
    assert.equal(m?.status, "gagal_simpan");
    assert.equal(m?.chatAiId, null);
    assert.deepEqual(m?.rujukan, [{ halaman: 4, kutipan: "k" }]);
    assert.equal(m?.kuota, null);
  });

  test("rujukanUnik: satu chip per halaman, urut halaman", () => {
    const hasil = rujukanUnik([...meta.rujukan, { halaman: 15, kutipan: "duplikat" }]);
    assert.deepEqual(hasil.map((r) => r.halaman), [12, 15]);
    assert.equal(hasil[1].kutipan, meta.rujukan[0].kutipan);
  });
});

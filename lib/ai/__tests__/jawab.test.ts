// Uji jawaban streaming dengan klien AI palsu (tanpa jaringan). Jalankan:
//   npx tsx --conditions=react-server --test lib/ai/__tests__/*.test.ts
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import type OpenAI from "openai";
import { jawabPertanyaanStream } from "@/lib/ai/jawab";
import { AiGagalError } from "@/lib/ai/panggil";

const chunks = [
  { id: 7, isi: "Hukum permintaan menyatakan bahwa harga naik membuat permintaan turun.", halaman_awal: 27, halaman_akhir: 27 },
];

interface BagianPalsu {
  model?: string;
  choices: { delta: { content?: string } }[];
  usage?: { prompt_tokens: number; completion_tokens: number; cost?: number };
}

function klienPalsu(bagian: BagianPalsu[], galatSetelah?: number): OpenAI {
  const palsu = {
    chat: {
      completions: {
        create: async () => ({
          async *[Symbol.asyncIterator]() {
            for (let i = 0; i < bagian.length; i++) {
              if (galatSetelah !== undefined && i === galatSetelah) throw new Error("koneksi putus");
              yield bagian[i];
            }
          },
        }),
      },
    },
  };
  return palsu as unknown as OpenAI;
}

async function bacaSemua(aliran: ReadableStream<string>): Promise<string> {
  const reader = aliran.getReader();
  let hasil = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) return hasil;
    hasil += value;
  }
}

describe("jawabPertanyaanStream", () => {
  test("aliran normal: teks, rujukan, pemakaian dari usage.cost", async () => {
    process.env.KURS_USD_IDR = "16000";
    const r = jawabPertanyaanStream(
      { pertanyaan: "Apa hukum permintaan?", riwayat: [], chunks },
      klienPalsu([
        { model: "google/gemini-2.5-flash", choices: [{ delta: { content: "Saat harga naik, " } }] },
        { choices: [{ delta: { content: "permintaan turun [Hal. 27]." } }] },
        { choices: [], usage: { prompt_tokens: 900, completion_tokens: 20, cost: 0.001 } },
      ]),
    );
    const teks = await bacaSemua(r.aliran);
    const h = await r.selesai;
    assert.equal(teks, "Saat harga naik, permintaan turun [Hal. 27].");
    assert.equal(h.teks, teks);
    assert.equal(h.isTerputus, false);
    assert.equal(h.isTidakDitemukan, false);
    assert.deepEqual(h.rujukan.map((x) => [x.halaman, x.chunk_id]), [[27, 7]]);
    assert.equal(h.pemakaian.tokenMasuk, 900);
    assert.equal(h.pemakaian.biayaRp, 16); // $0,001 × 16.000
    delete process.env.KURS_USD_IDR;
  });

  test("terputus di tengah → simpan parsial, isTerputus (B9)", async () => {
    const r = jawabPertanyaanStream(
      { pertanyaan: "Apa hukum permintaan?", riwayat: [], chunks },
      klienPalsu([{ choices: [{ delta: { content: "Saat harga naik" } }] }, { choices: [{ delta: { content: "x" } }] }], 1),
    );
    await bacaSemua(r.aliran);
    const h = await r.selesai;
    assert.equal(h.teks, "Saat harga naik");
    assert.equal(h.isTerputus, true);
    assert.ok(h.pemakaian.tokenKeluar > 0); // estimasi saat usage tidak sempat diterima
  });

  test("gagal sebelum ada teks → AiGagalError (MSG-C04, kuota tidak berkurang)", async () => {
    const r = jawabPertanyaanStream(
      { pertanyaan: "Apa hukum permintaan?", riwayat: [], chunks },
      klienPalsu([{ choices: [] }], 0),
    );
    await assert.rejects(bacaSemua(r.aliran));
    await assert.rejects(r.selesai, AiGagalError);
  });
});

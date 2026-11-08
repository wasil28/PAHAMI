// Uji unit pipeline AI tanpa jaringan. Jalankan:
//   npx tsx --conditions=react-server --test lib/ai/__tests__/*.test.ts
// (--conditions=react-server agar paket "server-only" memuat versi kosong di luar Next.js.)
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { z } from "zod";
import { buatChunk, pecahKalimat, adalahJudul } from "@/lib/ai/chunk";
import { cekAturanTopik, normalisasiTopik } from "@/lib/ai/topik-normalisasi";
import { AiFormatError, parseJsonAI, uraiJsonToleran } from "@/lib/ai/json";
import { validasiSoal, keKunci } from "@/lib/ai/soal";
import { validasiRujukan } from "@/lib/ai/konteks";
import { adalahTidakDitemukan, ekstrakRujukanJawaban, JAWABAN_TIDAK_DITEMUKAN } from "@/lib/ai/jawab";
import { gabungPemakaian, hitungBiayaRp } from "@/lib/ai/biaya";
import { bersihkanHalaman, cekPdfScan, sambungPemenggalan } from "@/lib/pdf/ekstrak";
import type { HalamanTeks } from "@/lib/ai/tipe";

/** Kalimat unik bernomor ±12 kata agar mudah dilacak. */
function kalimat(n: number): string {
  return `Kalimat nomor ${n} menjelaskan konsep ekonomi dasar bagi mahasiswa dengan contoh sederhana.`;
}

function halamanDummy(jumlahHalaman: number, kalimatPerHalaman: number): HalamanTeks[] {
  let n = 0;
  return Array.from({ length: jumlahHalaman }, (_, i) => ({
    nomor: i + 1,
    teks: Array.from({ length: kalimatPerHalaman }, () => kalimat(++n)).join(" "),
  }));
}

describe("pecahKalimat (bahasa Indonesia)", () => {
  test("tidak memotong di singkatan, inisial, angka, dan nomor butir", () => {
    const teks =
      "Bahan pokok meliputi beras, gula, dll. yang dijual di pasar. Menurut Prof. Budi dan A. Rahman, harga naik 2,5 persen. " +
      "Lihat No. 3 pada tabel. Langkahnya: 1. Ambil data. Harga Rp. 5.000 per kg. Apakah itu benar? Ya!";
    const k = pecahKalimat(teks);
    assert.deepEqual(k, [
      "Bahan pokok meliputi beras, gula, dll. yang dijual di pasar.",
      "Menurut Prof. Budi dan A. Rahman, harga naik 2,5 persen.",
      "Lihat No. 3 pada tabel.",
      "Langkahnya: 1. Ambil data.",
      "Harga Rp. 5.000 per kg.",
      "Apakah itu benar?",
      "Ya!",
    ]);
  });

  test("mengenali judul bab", () => {
    assert.ok(adalahJudul("BAB 2 Permintaan dan Penawaran"));
    assert.ok(adalahJudul("Kegiatan Belajar 1"));
    assert.ok(adalahJudul("2.1 Hukum Permintaan"));
    assert.ok(!adalahJudul("Harga naik ketika permintaan bertambah."));
  });
});

describe("buatChunk (BR-08)", () => {
  const halaman = halamanDummy(30, 10); // 300 kalimat × 13 kata ≈ 3.900 kata
  const chunks = buatChunk(halaman, { kataPerChunk: 500 });
  const semuaKalimat = new Set(halaman.flatMap((h) => pecahKalimat(h.teks)));

  test("± 500 kata dan tidak melebihi 1,2× target", () => {
    assert.ok(chunks.length >= 7 && chunks.length <= 9, `jumlah chunk ${chunks.length}`);
    for (const c of chunks) assert.ok(c.jumlah_kata <= 600, `chunk ${c.urutan} ${c.jumlah_kata} kata`);
    for (const c of chunks.slice(0, -1)) assert.ok(c.jumlah_kata >= 400, `chunk ${c.urutan} terlalu kecil`);
  });

  test("tidak memotong kalimat", () => {
    for (const c of chunks) {
      for (const k of pecahKalimat(c.isi)) assert.ok(semuaKalimat.has(k), `kalimat terpotong: ${k}`);
    }
  });

  test("tumpang tindih tepat 1 kalimat", () => {
    for (let i = 1; i < chunks.length; i++) {
      const prev = pecahKalimat(chunks[i - 1].isi);
      const kini = pecahKalimat(chunks[i].isi);
      assert.equal(kini[0], prev[prev.length - 1]);
      assert.notEqual(kini[1], prev[prev.length - 1]);
    }
  });

  test("urutan, halaman awal/akhir, dan cakupan semua kalimat", () => {
    chunks.forEach((c, i) => assert.equal(c.urutan, i + 1));
    assert.equal(chunks[0].halaman_awal, 1);
    assert.equal(chunks[chunks.length - 1].halaman_akhir, 30);
    for (const c of chunks) {
      const nomor = [...c.isi.matchAll(/Kalimat nomor (\d+)/g)].map((m) => Number(m[1]));
      // Kalimat n berada di halaman ceil(n/10).
      assert.equal(c.halaman_awal, Math.ceil(Math.min(...nomor) / 10));
      assert.equal(c.halaman_akhir, Math.ceil(Math.max(...nomor) / 10));
      assert.ok(c.jumlah_token > 0);
    }
    const tercakup = new Set(chunks.flatMap((c) => pecahKalimat(c.isi)));
    assert.equal(tercakup.size, semuaKalimat.size);
  });

  test("kalimat yang melintasi pergantian halaman mencatat dua halaman", () => {
    const c = buatChunk([
      { nomor: 4, teks: "Ini kalimat pertama. Kalimat kedua dimulai di halaman empat" },
      { nomor: 5, teks: "dan berakhir di halaman lima. Penutup." },
    ]);
    assert.equal(c.length, 1);
    assert.equal(c[0].halaman_awal, 4);
    assert.equal(c[0].halaman_akhir, 5);
    assert.ok(c[0].isi.includes("halaman empat dan berakhir"));
  });

  test("bab pendek tidak digabung dengan bab berikutnya", () => {
    const c = buatChunk([
      { nomor: 1, teks: `Modul 1: Konsep Dasar\n${Array.from({ length: 4 }, (_, i) => kalimat(i)).join(" ")}` },
      { nomor: 2, teks: `Modul 2: Jenis Sistem\n${Array.from({ length: 4 }, (_, i) => kalimat(50 + i)).join(" ")}` },
      { nomor: 2, teks: `2.1 Sub Bagian\n${Array.from({ length: 2 }, (_, i) => kalimat(80 + i)).join(" ")}` },
    ]);
    assert.equal(c.length, 2);
    assert.deepEqual(c.map((x) => [x.halaman_awal, x.halaman_akhir]), [[1, 1], [2, 2]]);
    assert.ok(c[1].isi.startsWith("Modul 2"));
    assert.ok(c[1].isi.includes("2.1 Sub Bagian")); // sub-judul kecil tetap menyatu
  });

  test("judul bab memulai chunk baru dan tercatat di judul_bagian", () => {
    const h: HalamanTeks[] = [
      { nomor: 1, teks: `BAB 1 Pendahuluan Ekonomi\n${Array.from({ length: 30 }, (_, i) => kalimat(i)).join(" ")}` },
      { nomor: 2, teks: `BAB 2 Permintaan\n${Array.from({ length: 5 }, (_, i) => kalimat(100 + i)).join(" ")}` },
    ];
    const c = buatChunk(h);
    assert.equal(c.length, 2);
    assert.equal(c[0].judul_bagian, "BAB 1 Pendahuluan Ekonomi");
    assert.equal(c[1].judul_bagian, "BAB 2 Permintaan");
    assert.ok(c[1].isi.startsWith("BAB 2 Permintaan"));
    assert.equal(c[1].halaman_awal, 2);
  });

  test("dokumen kosong → tanpa chunk", () => {
    assert.deepEqual(buatChunk([{ nomor: 1, teks: "" }]), []);
  });
});

describe("normalisasiTopik (BR-09, B4)", () => {
  test("mengurutkan, menutup celah & tumpang tindih, mencakup 1..N", () => {
    const t = normalisasiTopik(
      [
        { judul: "Penawaran", halaman_awal: 20, halaman_akhir: 35 },
        { judul: "Pendahuluan", halaman_awal: 3, halaman_akhir: 12 },
        { judul: "Permintaan", halaman_awal: 10, halaman_akhir: 18 }, // tumpang tindih
        { judul: "Elastisitas", halaman_awal: "40", halaman_akhir: 44 }, // celah 36–39, string
      ],
      50,
    );
    assert.deepEqual(
      t.map((x) => [x.urutan, x.judul, x.halaman_awal, x.halaman_akhir]),
      [
        [1, "Pendahuluan", 1, 9],
        [2, "Permintaan", 10, 19],
        [3, "Penawaran", 20, 39],
        [4, "Elastisitas", 40, 50],
      ],
    );
    assert.deepEqual(cekAturanTopik(t, 50), []);
  });

  test("> 15 topik digabung menjadi 15, tetap bersambung", () => {
    const mentah = Array.from({ length: 22 }, (_, i) => ({ judul: `Bagian ${i + 1}`, halaman_awal: i * 10 + 1, halaman_akhir: i * 10 + 10 }));
    const t = normalisasiTopik(mentah, 220);
    assert.equal(t.length, 15);
    assert.deepEqual(cekAturanTopik(t, 220), []);
  });

  test("< 4 topik diterima selama ≥ 1; halaman di luar batas dijepit; judul dipotong ≤ 120", () => {
    const judulPanjang = "Sangat ".repeat(40) + "Panjang";
    const t = normalisasiTopik([{ judul: judulPanjang, halaman_awal: 0, halaman_akhir: 999 }], 7);
    assert.equal(t.length, 1);
    assert.equal(t[0].halaman_awal, 1);
    assert.equal(t[0].halaman_akhir, 7);
    assert.ok(t[0].judul.length <= 120 && t[0].judul.endsWith("…"));
  });

  test("halaman awal kembar & judul kosong", () => {
    const t = normalisasiTopik(
      [
        { judul: "A", halaman_awal: 1, halaman_akhir: 5 },
        { judul: "A lagi", halaman_awal: 1, halaman_akhir: 3 },
        { judul: "  ", halaman_awal: 6, halaman_akhir: 10 },
      ],
      10,
    );
    assert.deepEqual(t.map((x) => x.judul), ["A", "Bagian 3"]);
  });

  test("tidak ada topik layak → []", () => {
    assert.deepEqual(normalisasiTopik([{ judul: "x" }], 10), []);
  });
});

describe("parseJsonAI", () => {
  const skema = z.object({ topik: z.array(z.object({ judul: z.string() })) });

  test("membuang pagar kode & teks pembuka", () => {
    const raw = 'Berikut hasilnya:\n```json\n{"topik":[{"judul":"A"}]}\n```\nSemoga membantu.';
    assert.deepEqual(parseJsonAI(raw, "object", skema), { topik: [{ judul: "A" }] });
  });

  test("koma berlebih", () => {
    assert.deepEqual(parseJsonAI('{"topik":[{"judul":"A"},],}', "object", skema), { topik: [{ judul: "A" }] });
  });

  test("keluaran terpotong ditutup", () => {
    assert.deepEqual(uraiJsonToleran('{"topik":[{"judul":"A"},{"judul":"B', "object"), {
      topik: [{ judul: "A" }, { judul: "B" }],
    });
    assert.deepEqual(uraiJsonToleran('{"topik":[{"judul":"A"},{"judul":', "object"), {
      topik: [{ judul: "A" }, { judul: null }],
    });
  });

  test("array & galat skema", () => {
    assert.deepEqual(uraiJsonToleran("hasil: [1,2,3]", "array"), [1, 2, 3]);
    assert.throws(() => parseJsonAI('{"topik":"bukan array"}', "object", skema), AiFormatError);
    assert.throws(() => parseJsonAI("tidak ada json", "object", skema), AiFormatError);
  });
});

describe("validasiSoal (BR-11)", () => {
  const topik = { judul: "Permintaan", halaman_awal: 10, halaman_akhir: 20 };
  const soal = (i: number, ubah: Record<string, unknown> = {}) => ({
    pertanyaan: `Pertanyaan ${i}?`,
    pilihan: ["A. Satu", "Dua", "Tiga", "Empat"],
    kunci: "b",
    pembahasan: "Karena dokumen menyatakan demikian.",
    halaman_rujukan: 12,
    ...ubah,
  });

  test("5 soal valid → dipetakan ke kolom t_soal", () => {
    const hasil = validasiSoal([1, 2, 3, 4, 5].map((i) => soal(i)), topik);
    assert.equal(hasil.length, 5);
    assert.equal(hasil[0].pilihan_a, "Satu"); // awalan "A." dibuang
    assert.equal(hasil[0].kunci, "B");
    assert.deepEqual(hasil.map((s) => s.urutan), [1, 2, 3, 4, 5]);
  });

  test("soal tidak valid dibuang; < 5 → AiFormatError", () => {
    const daftar = [
      soal(1),
      soal(2, { halaman_rujukan: 30 }), // di luar rentang
      soal(3, { pilihan: ["x", "x", "y", "z"] }), // kembar
      soal(4, { kunci: "E" }),
      soal(5, { pilihan: ["a", "b", "c"] }),
      soal(6),
    ];
    assert.throws(() => validasiSoal(daftar, topik), (e: unknown) => e instanceof AiFormatError && /baru 2/.test(e.message));
  });

  test("keKunci", () => {
    assert.equal(keKunci("(C)"), "C");
    assert.equal(keKunci("d."), "D");
    assert.equal(keKunci(0), "A");
    assert.equal(keKunci(4), null);
    assert.equal(keKunci("Benar"), null);
  });
});

describe("rujukan (BR-10, BR-30)", () => {
  const chunks = [
    { id: 1, isi: "Hukum permintaan menyatakan bahwa harga naik membuat permintaan turun. Ini berlaku ceteris paribus.", halaman_awal: 10, halaman_akhir: 11 },
    { id: 2, isi: "Elastisitas mengukur kepekaan permintaan terhadap perubahan harga.", halaman_awal: 12, halaman_akhir: 12 },
  ];

  test("buang di luar rentang, ganti kutipan parafrase dengan kalimat asli", () => {
    const r = validasiRujukan(
      [
        { halaman: 10, kutipan: "harga naik membuat permintaan turun" },
        { halaman: 12, kutipan: "elastisitas itu kepekaan" },
        { halaman: 25, kutipan: "di luar" },
      ],
      chunks,
      { awal: 10, akhir: 12 },
    );
    assert.equal(r.length, 2);
    assert.deepEqual(r[0], { halaman: 10, kutipan: "harga naik membuat permintaan turun", chunk_id: 1 });
    assert.equal(r[1].kutipan, "Elastisitas mengukur kepekaan permintaan terhadap perubahan harga.");
    assert.equal(r[1].chunk_id, 2);
  });

  test("ekstrak sitasi [Hal. X] dari jawaban", () => {
    const r = ekstrakRujukanJawaban("Permintaan turun saat harga naik [Hal. 10]. Kepekaannya disebut elastisitas [Hal. 12, 40].", chunks);
    assert.deepEqual(r.map((x) => x.halaman), [10, 12]);
    const tanpa = ekstrakRujukanJawaban("Jawaban tanpa sitasi.", chunks);
    assert.deepEqual(tanpa.map((x) => x.halaman), [10]);
  });

  test("deteksi jawaban tidak ditemukan", () => {
    assert.ok(adalahTidakDitemukan(JAWABAN_TIDAK_DITEMUKAN));
    assert.ok(!adalahTidakDitemukan("Permintaan turun [Hal. 10]."));
  });
});

describe("biaya (BR-27, A1)", () => {
  test("rumus token × harga × kurs dan penjumlahan", () => {
    process.env.KURS_USD_IDR = "16000";
    // 1 juta token masuk gemini-2.5-flash = $0,30 → Rp 4.800
    assert.equal(hitungBiayaRp("google/gemini-2.5-flash", 1_000_000, 0), 4800);
    const g = gabungPemakaian(
      { model: "openai/text-embedding-3-small", tokenMasuk: 20, tokenKeluar: 0, biayaRp: 0.01, durasiMs: 100 },
      { model: "google/gemini-2.5-flash", tokenMasuk: 3000, tokenKeluar: 400, biayaRp: 30.4, durasiMs: 2000 },
    );
    assert.deepEqual(g, { model: "google/gemini-2.5-flash", tokenMasuk: 3020, tokenKeluar: 400, biayaRp: 30.41, durasiMs: 2100 });
    delete process.env.KURS_USD_IDR;
  });
});

describe("normalisasi teks PDF & cek scan (BR-05)", () => {
  test("pemenggalan & kata ulang", () => {
    assert.deepEqual(sambungPemenggalan(["Proses pemba-", "ngunan berjalan. Anak-", "anak bermain."]), [
      "Proses pembangunan berjalan. Anak-anak bermain.",
    ]);
  });

  test("buang nomor halaman & header berulang", () => {
    const isi = ["Pasar adalah tempat bertemunya penjual dan pembeli.", "Harga terbentuk dari tawar-menawar.", "Permintaan dipengaruhi pendapatan.", "Penawaran dipengaruhi biaya produksi.", "Keseimbangan terjadi saat keduanya sama.", "Pemerintah dapat menetapkan harga eceran tertinggi."];
    const mentah = isi.map((k, i) => `Pengantar Ekonomi Mikro\n${k}\nParagraf lanjutan ${"abcdef"[i]} berbeda.\n${i + 1}`);
    const bersih = bersihkanHalaman(mentah);
    assert.equal(bersih[0], "Pasar adalah tempat bertemunya penjual dan pembeli.\nParagraf lanjutan a berbeda.");
  });

  test("> 50% halaman < 50 karakter → scan", () => {
    const isi = "x".repeat(60);
    assert.equal(cekPdfScan([{ nomor: 1, teks: isi }, { nomor: 2, teks: "" }, { nomor: 3, teks: "12" }]).isScan, true);
    assert.equal(cekPdfScan([{ nomor: 1, teks: isi }, { nomor: 2, teks: isi }, { nomor: 3, teks: "" }]).isScan, false);
    assert.equal(cekPdfScan([{ nomor: 1, teks: isi }, { nomor: 2, teks: "" }]).isScan, false); // tepat 50% bukan scan
  });
});

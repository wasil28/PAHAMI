// Uji unit fitur Materi (KEPUTUSAN §4) tanpa jaringan.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { bersihkanDiagram, buatKerangkaMateri, normalisasiMateri, targetJumlahMateri } from "@/lib/ai/materi";

describe("kerangka materi", () => {
  test("target ± 1 materi per 5 halaman, dijepit 2–10", () => {
    assert.equal(targetJumlahMateri(4), 2);
    assert.equal(targetJumlahMateri(25), 5);
    assert.equal(targetJumlahMateri(200), 10);
  });

  test("normalisasi: urut, bersambung, mencakup rentang topik, nomor judul dibuang", () => {
    const m = normalisasiMateri(
      [
        { judul: "2. Jenis Audit", halaman_awal: 30 },
        { judul: "1. Pengertian Audit", halaman_awal: 12 }, // di bawah awal → dijepit ke 10
        { judul: "Kembar", halaman_awal: 30 },
        { judul: "Penutup", halaman_awal: "52" },
        { judul: "Luar", halaman_awal: 99 }, // di atas akhir → dijepit ke 55
      ],
      10,
      55,
    );
    assert.deepEqual(
      m.map((x) => [x.judul, x.halaman_awal, x.halaman_akhir]),
      [
        ["Pengertian Audit", 10, 29],
        ["Jenis Audit", 30, 51],
        ["Penutup", 52, 54],
        ["Luar", 55, 55],
      ],
    );
  });

  test("lebih dari batas → pasangan tersempit digabung", () => {
    const mentah = Array.from({ length: 6 }, (_, i) => ({ judul: `M${i + 1}`, halaman_awal: 1 + i * 2 }));
    const m = normalisasiMateri(mentah, 1, 12, 4);
    assert.equal(m.length, 4);
    assert.equal(m[0].halaman_awal, 1);
    assert.equal(m[m.length - 1].halaman_akhir, 12);
    for (let i = 1; i < m.length; i++) assert.equal(m[i].halaman_awal, m[i - 1].halaman_akhir + 1);
  });

  test("topik pendek tidak dipecah dan tidak memanggil AI", async () => {
    const hasil = await buatKerangkaMateri({ judul: "Topik Pendek", halaman_awal: 4, halaman_akhir: 6 }, [
      { id: 1, isi: "Teks.", halaman_awal: 4, halaman_akhir: 6 },
    ]);
    assert.equal(hasil.pemakaian, null);
    assert.deepEqual(hasil.materi, [{ judul: "Topik Pendek", halaman_awal: 4, halaman_akhir: 6 }]);
  });
});

describe("diagram", () => {
  test("bentuk valid diterima, label kepanjangan dipangkas", () => {
    const d = bersihkanDiagram({
      jenis: "alur",
      judul: "Tahap audit",
      langkah: [{ label: "Perencanaan ".repeat(10) }, { label: "Pelaksanaan", keterangan: "Mengumpulkan bukti." }],
    });
    assert.ok(d && d.jenis === "alur");
    assert.ok(d.langkah[0].label.length <= 60);
  });

  test("bentuk salah / jenis tak dikenal / null → tanpa diagram", () => {
    assert.equal(bersihkanDiagram(null), null);
    assert.equal(bersihkanDiagram({ jenis: "pie", judul: "x" }), null);
    assert.equal(bersihkanDiagram({ jenis: "siklus", judul: "x", langkah: [{ label: "a" }] }), null); // < 3 langkah
  });
});

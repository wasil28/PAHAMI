// Uji cepat skema validasi & format. Jalankan: npx tsx lib/validasi/__tests__/validasi.test.ts

import assert from "node:assert/strict";
import { test } from "node:test";
import { JUMLAH_SOAL, PERTANYAAN_MAX } from "@/lib/config";
import {
  awalHariBerikutWIB,
  awalHariWIB,
  formatRelatif,
  formatRupiah,
  formatTanggal,
  formatTanggalWaktu,
  formatUkuranFile,
} from "@/lib/format";
import { PESAN, pesan } from "@/lib/pesan";
import {
  errorPerKolom,
  parseIdParam,
  pesanErrorPertama,
  skemaBuatDokumen,
  skemaDaftar,
  skemaDaftarPenggunaQuery,
  skemaKirimPertanyaan,
  skemaMasuk,
  skemaSimpanLatihan,
  skemaStatistikQuery,
  skemaUbahJudul,
  skemaUbahPengaturan,
  skemaUbahSandi,
  validasiFilePdf,
} from "@/lib/validasi";
import type { z } from "zod";

function pesanGagal<S extends z.ZodType>(skema: S, input: unknown): string | null {
  const h = skema.safeParse(input);
  return h.success ? null : pesanErrorPertama(h.error);
}

test("pesan(): placeholder terisi", () => {
  assert.equal(pesan("MSG-M02", { nama: "Budi" }), "Akun Budi dinonaktifkan.");
  assert.equal(pesan("MSG-U03", { maks: 5 }).startsWith("Kuota dokumen kamu sudah penuh (5 dokumen)."), true);
  assert.equal(pesan("MSG-D01"), "Nama dokumen berhasil diubah.");
  assert.equal(PESAN["MSG-V03"], "Nama harus 3–60 karakter.");
});

test("daftar: aturan sandi huruf + angka (BR-22)", () => {
  const dasar = { nama: "  Rina   Saputri ", email: " Rina@ECampus.ut.ac.id ", konfirmasiSandi: "" };
  assert.equal(pesanGagal(skemaDaftar, { ...dasar, sandi: "abcdefgh", konfirmasiSandi: "abcdefgh" }), PESAN["MSG-V04"]);
  assert.equal(pesanGagal(skemaDaftar, { ...dasar, sandi: "12345678", konfirmasiSandi: "12345678" }), PESAN["MSG-V04"]);
  assert.equal(pesanGagal(skemaDaftar, { ...dasar, sandi: "abc123", konfirmasiSandi: "abc123" }), PESAN["MSG-V04"]);
  assert.equal(pesanGagal(skemaDaftar, { ...dasar, sandi: "belajar123", konfirmasiSandi: "belajar12" }), PESAN["MSG-V05"]);
  const ok = skemaDaftar.parse({ ...dasar, sandi: "belajar123", konfirmasiSandi: "belajar123" });
  assert.equal(ok.nama, "Rina Saputri");
  assert.equal(ok.email, "rina@ecampus.ut.ac.id");
});

test("daftar: kolom wajib, nama, email", () => {
  assert.equal(pesanGagal(skemaDaftar, {}), "Nama lengkap wajib diisi.");
  assert.equal(
    pesanGagal(skemaDaftar, { nama: "Al", email: "a@b.co", sandi: "belajar123", konfirmasiSandi: "belajar123" }),
    PESAN["MSG-V03"],
  );
  assert.equal(pesanGagal(skemaMasuk, { email: "bukan-email", sandi: "x" }), PESAN["MSG-V02"]);
  assert.equal(pesanGagal(skemaMasuk, { email: "", sandi: "" }), "Email wajib diisi.");
  const h = skemaUbahSandi.safeParse({ sandiLama: "", sandiBaru: "abc", konfirmasiSandi: "x" });
  assert.equal(h.success, false);
  if (!h.success) {
    const e = errorPerKolom(h.error);
    assert.equal(e.sandiLama, "Kata sandi lama wajib diisi.");
    assert.equal(e.sandiBaru, PESAN["MSG-V04"]);
    assert.equal(e.konfirmasiSandi, PESAN["MSG-V05"]);
  }
});

test("judul dokumen 3–100 (BR-21) & file PDF (BR-01/02)", () => {
  assert.equal(pesanGagal(skemaUbahJudul, { judul: "  ab  " }), PESAN["MSG-U04"]);
  assert.equal(pesanGagal(skemaUbahJudul, { judul: "a".repeat(101) }), PESAN["MSG-U04"]);
  assert.equal(skemaUbahJudul.parse({ judul: "  abc " }).judul, "abc");
  assert.equal(skemaUbahJudul.parse({ judul: "a".repeat(100) }).judul.length, 100);

  const skema = skemaBuatDokumen(20);
  const file = { namaFile: "Modul EKMA4116.PDF", tipe: "application/pdf", ukuranByte: 1000 };
  assert.equal(skema.parse(file).judul, "Modul EKMA4116");
  assert.equal(skema.parse({ ...file, judul: " Judul Saya " }).judul, "Judul Saya");
  assert.equal(pesanGagal(skema, { ...file, namaFile: "x.pdf" }), PESAN["MSG-U04"]);
  assert.equal(pesanGagal(skema, { ...file, tipe: "image/png" }), PESAN["MSG-U01"]);
  assert.equal(pesanGagal(skema, { ...file, namaFile: "a.docx" }), PESAN["MSG-U01"]);
  assert.equal(
    pesanGagal(skema, { ...file, ukuranByte: 20 * 1024 * 1024 + 1 }),
    "Ukuran file melebihi batas 20 MB.",
  );

  assert.equal(validasiFilePdf({ name: "a.pdf", type: "application/pdf", size: 10 }, 20), null);
  assert.equal(validasiFilePdf({ name: "a.pdf", type: "", size: 10 }, 20), "MSG-U01");
  assert.equal(validasiFilePdf({ name: "a.pdf", type: "application/pdf", size: 21 * 1024 * 1024 }, 20), "MSG-U02");
});

test("pengaturan kuota: rentang BR-29, bilangan bulat", () => {
  const cek = (nilai: Record<string, unknown>) => pesanGagal(skemaUbahPengaturan, { nilai });
  assert.equal(cek({ max_dokumen: 0 }), "Isi bilangan bulat antara 1 dan 50.");
  assert.equal(cek({ max_dokumen: 51 }), "Isi bilangan bulat antara 1 dan 50.");
  assert.equal(cek({ max_halaman: 9 }), "Isi bilangan bulat antara 10 dan 500.");
  assert.equal(cek({ max_halaman: 501 }), "Isi bilangan bulat antara 10 dan 500."); // BR-29: muat dalam batas waktu pipeline
  assert.equal(cek({ max_ukuran_mb: "2.5" }), "Isi bilangan bulat antara 1 dan 100.");
  assert.equal(cek({ max_pertanyaan_harian: 501 }), "Isi bilangan bulat antara 1 dan 500.");
  assert.equal(cek({ max_pertanyaan_harian: " " }), "Maks. pertanyaan AI per hari wajib diisi.");
  assert.equal(cek({ max_dokumen: -1 }), "Isi bilangan bulat antara 1 dan 50.");
  assert.equal(cek({}), PESAN["MSG-V06"]);
  assert.equal(cek({ ambang_relevansi: 0.8 }), PESAN["MSG-V06"]);
  const ok = skemaUbahPengaturan.parse({
    nilai: { max_dokumen: "8", max_halaman: 500, max_ukuran_mb: 1, max_pertanyaan_harian: 500 },
    versi: "2026-10-12T02:00:00.123456+00:00",
  });
  assert.deepEqual(ok.nilai, { max_dokumen: 8, max_halaman: 500, max_ukuran_mb: 1, max_pertanyaan_harian: 500 });
});

test("latihan: harus tepat 5 jawaban unik (BR-33 → MSG-L07)", () => {
  const jawaban = Array.from({ length: JUMLAH_SOAL }, (_, i) => ({ soalId: 100 + i, pilihan: i % 4 }));
  assert.equal(skemaSimpanLatihan.safeParse({ topikId: 3, jawaban }).success, true);
  assert.equal(pesanGagal(skemaSimpanLatihan, { topikId: 3, jawaban: jawaban.slice(0, 3) }), PESAN["MSG-L07"]);
  const ganda = [...jawaban.slice(0, 4), { soalId: 100, pilihan: 1 }];
  assert.equal(pesanGagal(skemaSimpanLatihan, { topikId: 3, jawaban: ganda }), PESAN["MSG-L07"]);
  const salahPilihan = [...jawaban.slice(0, 4), { soalId: 999, pilihan: 4 }];
  assert.equal(skemaSimpanLatihan.safeParse({ topikId: 3, jawaban: salahPilihan }).success, false);
});

test("pertanyaan: 3–500, tidak hanya spasi (BR-18 → MSG-C01)", () => {
  assert.equal(pesanGagal(skemaKirimPertanyaan, { pertanyaan: "      " }), PESAN["MSG-C01"]);
  assert.equal(pesanGagal(skemaKirimPertanyaan, { pertanyaan: " ab " }), PESAN["MSG-C01"]);
  assert.equal(pesanGagal(skemaKirimPertanyaan, { pertanyaan: "a".repeat(PERTANYAAN_MAX + 1) }), PESAN["MSG-C01"]);
  assert.equal(skemaKirimPertanyaan.parse({ pertanyaan: "  apa itu?  ", topikId: "302" }).pertanyaan, "apa itu?");
});

test("query admin & id rute", () => {
  assert.deepEqual(skemaDaftarPenggunaQuery.parse({}), { q: "", status: "semua", halaman: 1, urut: "terbaru" });
  const q = skemaDaftarPenggunaQuery.parse({ q: " budi ", status: "x", halaman: "-2", urut: "nama", peran: "admin" });
  assert.deepEqual(q, { q: "budi", status: "semua", halaman: 1, urut: "nama", peran: "admin" });
  assert.equal(skemaStatistikQuery.parse({ rentang: "7" }).rentang, 7);
  assert.equal(skemaStatistikQuery.parse({ rentang: "9" }).rentang, 30);
  assert.equal(skemaStatistikQuery.parse({}).rentang, 30); // default FT-11/BP-13
  assert.equal(parseIdParam("12"), 12);
  assert.equal(parseIdParam("0"), null);
  assert.equal(parseIdParam("1e3"), null);
  assert.equal(parseIdParam("abc"), null);
});

test("format: tanggal, relatif, awal hari WIB (BR-17)", () => {
  // 28 Okt 2026 23.30 WIB = 16.30 UTC
  const malam = new Date("2026-10-28T16:30:00Z");
  assert.equal(formatTanggal(malam), "28 Okt 2026");
  assert.equal(formatTanggalWaktu(malam), "28 Okt 2026, 23.30");
  // 17.30 UTC sudah 29 Okt 00.30 WIB
  assert.equal(formatTanggal(new Date("2026-10-28T17:30:00Z")), "29 Okt 2026");

  assert.equal(awalHariWIB(malam).toISOString(), "2026-10-27T17:00:00.000Z");
  assert.equal(awalHariWIB(new Date("2026-10-28T17:00:00Z")).toISOString(), "2026-10-28T17:00:00.000Z");
  assert.equal(awalHariBerikutWIB(malam).toISOString(), "2026-10-28T17:00:00.000Z");

  const kini = new Date("2026-10-28T05:00:00Z"); // 12.00 WIB
  assert.equal(formatRelatif(new Date("2026-10-28T04:59:30Z"), kini), "baru saja");
  assert.equal(formatRelatif(new Date("2026-10-28T04:55:00Z"), kini), "5 menit lalu");
  assert.equal(formatRelatif(new Date("2026-10-28T02:00:00Z"), kini), "3 jam lalu");
  assert.equal(formatRelatif(new Date("2026-10-27T10:00:00Z"), kini), "kemarin"); // 27 Okt 17.00 WIB
  assert.equal(formatRelatif(new Date("2026-10-25T05:00:00Z"), kini), "3 hari lalu");
  assert.equal(formatRelatif(new Date("2026-10-01T05:00:00Z"), kini), "1 Okt 2026");
  // 00.30 WIB hari ini dilihat 12.00 WIB → masih hari yang sama, jadi "jam lalu"
  assert.equal(formatRelatif(new Date("2026-10-27T17:30:00Z"), kini), "11 jam lalu");
});

test("format: angka & ukuran", () => {
  assert.equal(formatRupiah(1250), "Rp1.250");
  assert.equal(formatRupiah(0.4), "< Rp1");
  assert.equal(formatUkuranFile(2.4 * 1024 * 1024), "2,4 MB");
  assert.equal(formatUkuranFile(512), "512 B");
});

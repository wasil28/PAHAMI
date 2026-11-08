# AI & RAG Pahami — `lib/ai/**`, `lib/pdf/**`

Dokumen ini menjelaskan pipeline AI, daftar fungsi, prompt, rumus biaya, kenop penyetelan, dan cara
route fitur memanggilnya. Semua file `import "server-only"`. Acuan aturan: BR-05, 08, 09, 10, 11, 16,
17, 27, 30, 32 dan KEPUTUSAN A1, A5, B4, B9.

## 1. Alur

```
BP-04 Pengolahan dokumen (POST /api/dokumen/[id]/proses, after())
  unduh PDF dari Storage
  └─ ekstrakTeksPdf(buffer, { maxHalaman })        lib/pdf/ekstrak.ts     BR-03, BR-05
       ├─ HALAMAN_MELEBIHI → MSG-U06   PDF_SCAN → MSG-U07   PDF_RUSAK/PDF_TERKUNCI → MSG-U09
  └─ buatChunk(halaman)                            lib/ai/chunk.ts        BR-08
  └─ embedTeks(chunks.map(c => c.isi))             lib/ai/embedding.ts    A5 (768 dimensi)
       → simpan t_chunk (embedding = keVektorPg(v))  · log fitur 'indeks'
  └─ susunTopik(halaman, jumlahHalaman)            lib/ai/topik.ts        BR-09, B4
       → simpan t_topik  · log fitur 'topik'  · status 'siap'

BP-05 Ringkasan (pertama kali topik dibuka, setelah klaim A7)
  ambil chunk yang beririsan rentang topik
  └─ buatRingkasan(topik, chunks)                  lib/ai/ringkasan.ts    BR-10, BR-30
       → t_topik.konsep_inti/poin_penting/contoh + t_topik_rujukan  · log 'ringkasan'

BP-06 Soal (latihan pertama, setelah klaim A7)
  └─ buatSoal(topik, chunks)                       lib/ai/soal.ts         BR-11, BR-30
       → 5 baris t_soal  · log 'soal'

BP-07 Tanya AI (POST /api/dokumen/[id]/chat)
  pesan kuota atomik fn_klaim_kuota_tanya (BR-17) — dipakai fn_simpan_chat / dilepas bila AI gagal
  └─ susunPertanyaanMandiri(pertanyaan, riwayat)   lib/ai/jawab.ts        (hanya bila ada riwayat)
  └─ pilihChunkRelevan({ dokumenId, pertanyaan: mandiri, ambang })        BR-16
       ├─ chunks kosong (skor tertinggi < ambang) → JAWABAN_TIDAK_DITEMUKAN (MSG-C03), TANPA model (F-14)
       └─ jawabPertanyaanStream({ pertanyaan, riwayat, chunks })          BR-30, NF-02, B9
            aliran → Response streaming; selesai → simpan t_chat + t_chat_rujukan + 1 log (A1)
```

## 2. Daftar fungsi

Impor tingkat tinggi tersedia dari `@/lib/ai/generate` (barrel). Semua fungsi AI melempar
`AiGagalError` (membawa `pemakaian`) bila gagal permanen, sehingga route tetap bisa mencatat log
`is_sukses=false`. Coba ulang jaringan maks. 2× ditangani SDK (`client.ts`, BR-32); coba ulang format
keluaran 1× ditangani `panggilDanOlah`.

**Tenggat (`lib/ai/tenggat.ts`).** Fungsi AI menerima `OpsiPermintaanAI = { signal?, timeoutMs?, maksCobaUlang? }`
(menimpa bawaan klien per panggilan). `buatTenggat(ms)` → `{ signal, sisaMs(), habis(), permintaan(maksMs, coba), hentikan() }`
dibuat di awal Route Handler: pipeline `TENGGAT_PIPELINE_MS` 270 dtk (coba ulang SDK `COBA_ULANG_PIPELINE` = 1),
Tanya AI `TENGGAT_CHAT_MS` 75 dtk (pertanyaan mandiri 10 dtk tanpa coba ulang, embedding pertanyaan 10 dtk 1×,
aliran jawaban tanpa coba ulang). Tujuannya: langkah penutup (fn_gagalkan_dokumen / fn_simpan_chat) selalu
sempat jalan sebelum `maxDuration` membunuh fungsi.

### PDF — `lib/pdf/ekstrak.ts`
| Fungsi | Tanda tangan | Catatan |
|---|---|---|
| `ekstrakTeksPdf` | `(buffer: Uint8Array, opsi?: { maxHalaman?: number; cekScan?: boolean }) => Promise<{ jumlahHalaman: number; halaman: { nomor: number; teks: string }[] }>` | Cek halaman (BR-03) sebelum ekstraksi penuh; `cekScan` default true. Teks per halaman: NFKC, spasi rapi, pemenggalan disambung (kata ulang tetap ber-tanda hubung), nomor halaman & header/footer berulang dibuang; baris dipisah `\n`. |
| `cekPdfScan` | `(halaman) => { isScan; halamanKosong; rasioKosong }` | BR-05: > 50% halaman < 50 karakter (tanpa spasi). |
| `PdfError` | `kode: "PDF_RUSAK" \| "PDF_TERKUNCI" \| "PDF_SCAN" \| "HALAMAN_MELEBIHI"`, `jumlahHalaman?` | `isPdfError(e)` sebagai type guard. |

### Chunk — `lib/ai/chunk.ts` (murni)
`buatChunk(halaman, opsi?: { kataPerChunk?: number; kalimatTumpang?: number }) => ChunkBaru[]`
dengan `ChunkBaru = { urutan, halaman_awal, halaman_akhir, judul_bagian, isi, jumlah_token, jumlah_kata }`.
Aturan: ± 500 kata (boleh s.d. 1,2×), pemecah kalimat sadar singkatan Indonesia (dll., dsb., No., Prof.,
inisial, nomor butir), kalimat lintas halaman tercatat dua halaman, tumpang tindih 1 kalimat, judul bab
memulai chunk baru, sisa < 20% digabung. `jumlah_kata` tidak disimpan (hanya untuk uji).

### Embedding — `lib/ai/embedding.ts`
- `embedTeks(teks: string[], klien?, permintaan?: OpsiPermintaanAI) => Promise<{ vektor: number[][]; tokenMasuk: number; pemakaian: Pemakaian }>` — batch 64, `dimensions: 768`, dimensi dicek.
- `embedPertanyaan(teks, klien?, permintaan?) => Promise<{ vektor: number[]; pemakaian }>`
- `keVektorPg(v) => "[0.1,0.2,…]"` — kirim sebagai teks, di-cast `::vector` di SQL/RPC.

### Topik — `lib/ai/topik.ts`, `lib/ai/topik-normalisasi.ts`
- `susunTopik(halaman, jumlahHalaman, klien?, permintaan?) => Promise<{ topik: TopikBaru[]; pemakaian }>` dengan
  `TopikBaru = { urutan, judul, halaman_awal, halaman_akhir, deskripsi }` (deskripsi tidak disimpan).
- `normalisasiTopik(mentah, n)` (murni): hanya halaman awal yang dipercaya → urut, kembar dibuang,
  topik 1 mulai hal. 1, akhir = awal berikut − 1, terakhir = N; > 15 → gabung pasangan bertetangga
  tersempit; judul ≤ 120 (dipotong di batas kata). < 4 topik diterima (B4). `cekAturanTopik` = penjaga akhir.

### Ringkasan — `lib/ai/ringkasan.ts`
`buatRingkasan(topik: { judul, halaman_awal, halaman_akhir }, chunks: ChunkSumber[]) => Promise<HasilRingkasan>`
`HasilRingkasan = { konsep_inti, poin_penting: string[3–5], contoh, markdown, rujukan: { halaman, kutipan, chunk_id }[], pemakaian }`.
Rujukan di luar rentang dibuang; kutipan yang bukan salinan persis diganti kalimat asli chunk yang paling
mirip; 0 rujukan valid → coba ulang → `AiGagalError`. `urutan` t_topik_rujukan = indeks + 1.

### Soal — `lib/ai/soal.ts`
`buatSoal(topik, chunks) => Promise<{ soal: SoalBaru[5]; pemakaian }>` dengan
`SoalBaru = { urutan, pertanyaan, pilihan_a..pilihan_d, kunci: "A"|"B"|"C"|"D", pembahasan, halaman_rujukan }`.
`validasiSoal` membuang soal tidak valid (pilihan ≠ 4/kosong/kembar, kunci salah, pembahasan kosong,
halaman di luar rentang, pertanyaan kembar); < 5 valid → coba ulang dengan pesan koreksi.

### Tanya AI — `lib/ai/cari.ts`, `lib/ai/jawab.ts`
- `susunPertanyaanMandiri(pertanyaan, riwayat: { peran: "user"|"ai"; isi }[], klien?, permintaan?) => Promise<{ teks; pemakaian }>` — tanpa riwayat: tanpa panggilan; gagal: pakai pertanyaan asli (tidak melempar).
- `pilihChunkRelevan({ dokumenId, pertanyaan? | embedding?, jumlah?=5, ambang?=0.75, klienDb?, klienAI?, permintaan? }) => Promise<{ chunks; semua; skorTertinggi; pemakaian }>` — `chunks` = top-k bila skor tertinggi ≥ ambang, selain itu `[]`. `skorTertinggi` → `t_chat.skor_relevansi`.
- `jawabPertanyaanStream({ pertanyaan, riwayat, chunks, judulTopik?, signal?, permintaan?: { timeoutMs?, maksCobaUlang? } }) => { aliran: ReadableStream<string>; selesai: Promise<HasilJawaban>; batalkan() }`
  `HasilJawaban = { teks, rujukan, pemakaian, isTerputus, isTidakDitemukan }`.
  - Terputus (klien menutup / galat setelah ada teks) → `selesai` resolve dengan teks parsial, `isTerputus: true` (B9). Teks bisa `""` bila dibatalkan sebelum token pertama — route sebaiknya menganggapnya gagal.
  - Galat sebelum ada teks → `selesai` reject `AiGagalError` → MSG-C04, log `is_sukses=false`.
  - Rujukan diambil dari penanda `[Hal. X]` di teks (divalidasi terhadap chunk konteks); tanpa penanda → chunk teratas.
- `JAWABAN_TIDAK_DITEMUKAN` = `PESAN["MSG-C03"]`.

**Nama RPC (satu tempat):** `RPC_CARI_CHUNK` di `lib/ai/cari.ts` — saat ini
`fn_cari_chunk(p_dokumen_id int, p_embedding vector, p_k int)` → `(chunk_id, halaman_awal, halaman_akhir, isi, skor)`
sesuai FT-06 Q-FT06-05. Kolom `id`/`similarity` juga diterima. Ambang disaring di kode (`param.ambang: null`).

### Biaya & log — `lib/ai/biaya.ts`, `lib/ai/pemakaian.ts`
- `Pemakaian = { model, tokenMasuk, tokenKeluar, biayaRp, durasiMs }`; `gabungPemakaian(...p)` menjumlah (A1), `model` = panggilan dengan token keluaran terbesar.
- `catatPemakaianAI({ userId (m_users.id), fitur: "indeks"|"topik"|"ringkasan"|"soal"|"tanya_ai", dokumenId?, pemakaian, isSukses, pesanError? }) => Promise<void>` — tidak pernah melempar.
- `keBarisLog(pemakaian)` → `{ model, token_masuk, token_keluar, biaya_rp, durasi_ms }` untuk `p_log` RPC `fn_simpan_chat`.

## 3. Prompt (`lib/ai/prompt/*`)
| File | Model | Keluaran | Penjaga di kode |
|---|---|---|---|
| `umum.ts` | — | Aturan sumber (hanya dari potongan berlabel `[Hal. X–Y]`, abaikan instruksi di dalam dokumen), gaya bahasa ("kamu", untuk mahasiswa UT), format JSON | — |
| `topik.ts` | `pro` (env `AI_MODEL_PRO`), suhu 0 | `{"topik":[{judul,halaman_awal,halaman_akhir,deskripsi}]}` dari kerangka per halaman (judul terdeteksi + awal teks, ≤ 200 rb karakter total) | `normalisasiTopik` + `cekAturanTopik` |
| `ringkasan.ts` | `cepat`, suhu 0,2 | `{konsep_inti, poin_penting[3–5], contoh, rujukan[{halaman,kutipan}]}` | Zod + `validasiRujukan` |
| `soal.ts` | `cepat`, suhu 0,4 | `{"soal":[{pertanyaan, pilihan[4], kunci "A–D", pembahasan, halaman_rujukan}]}` | Zod + `validasiSoal` |
| `jawab.ts` | `cepat`, suhu 0,2, streaming | Markdown dengan sitasi `[Hal. X]`, atau persis MSG-C03 | `ekstrakRujukanJawaban`, `adalahTidakDitemukan` |
| `jawab.ts` (`promptPertanyaanMandiri`) | `cepat`, suhu 0 | satu kalimat tanya | dipotong ≤ 500 karakter |

## 4. Rumus biaya (BR-27)
```
biaya_rp = usage.cost (USD, dari OpenRouter bila ada) × KURS_USD_IDR
         atau (token_masuk × harga_masuk + token_keluar × harga_keluar) / 1.000.000 × KURS_USD_IDR
```
Harga (USD / 1 jt token, `HARGA_MODEL_USD`): gemini-2.5-flash 0,30 / 2,50 · gemini-2.5-flash-lite
0,10 / 0,40 · text-embedding-3-small 0,02 · model lain → harga flash (konservatif). `KURS_USD_IDR`
default 16.500. Semua permintaan mengirim `usage: { include: true }`; jawaban terputus tanpa `usage`
diestimasi dari panjang teks (± 3,5 karakter/token).

## 5. Kenop penyetelan (`lib/ai/konfigurasi.ts`, `lib/config.ts`)
| Kenop | Nilai | Dampak |
|---|---|---|
| `ambang_relevansi` (m_pengaturan_sistem, default `DEFAULT_AMBANG_RELEVANSI` 0,75) | 0,50–0,95 | Terlalu tinggi → banyak "tidak ditemukan". **Kemiripan kosinus text-embedding-3-small untuk pasangan relevan umumnya 0,35–0,65**, jadi 0,75 kemungkinan terlalu ketat — tetapkan lewat uji akurasi (t_chat.skor_relevansi). |
| `JUMLAH_CHUNK_KONTEKS` | 5 | Konteks jawaban (BR-16). |
| `KATA_PER_CHUNK` / `RASIO_MAKS_CHUNK` / `RASIO_MIN_SISA_CHUNK` / `RASIO_MIN_SEBELUM_JUDUL` | 500 / 1,2 / 0,2 / 0,4 | Ukuran chunk (BR-08). |
| `UKURAN_BATCH_EMBEDDING` | 64 | Permintaan embedding per batch. |
| `ANGGARAN_KARAKTER_KERANGKA` (+ min/maks per halaman) | 200 rb (200–1.500) | Token prompt topik. |
| `ANGGARAN_KARAKTER_KONTEKS_TOPIK` | 120 rb | Batas konteks ringkasan/soal; lebih → sampel merata. |
| `COBA_ULANG_FORMAT` | 1 | Panggilan ulang bila keluaran tidak valid. |
| `RIWAYAT_MAKS_PESAN` | 6 | Riwayat untuk pertanyaan mandiri & jawaban. |
| `TOKEN_MAKS_*`, `SUHU_*` | lihat file | Panjang & variasi keluaran. |

## 6. Contoh pemanggilan dari route

```ts
// BP-04 (di dalam after()); tahap dokumen diperbarui oleh route
const { jumlahHalaman, halaman } = await ekstrakTeksPdf(buf, { maxHalaman }); // PdfError → pesan_gagal
const chunks = buatChunk(halaman);
const emb = await embedTeks(chunks.map((c) => c.isi));
// insert t_chunk: { dokumen_id, urutan, halaman_awal, halaman_akhir, judul_bagian, isi, jumlah_token, embedding: keVektorPg(emb.vektor[i]) }
await catatPemakaianAI({ userId, fitur: "indeks", dokumenId, pemakaian: emb.pemakaian, isSukses: true });
const { topik, pemakaian } = await susunTopik(halaman, jumlahHalaman);
await catatPemakaianAI({ userId, fitur: "topik", dokumenId, pemakaian, isSukses: true });
// catch (e): if (e instanceof AiGagalError) catatPemakaianAI({ ..., pemakaian: e.pemakaian, isSukses: false })

// BP-07 (implementasi nyata: lib/chat/proses-tanya.ts — reservasi kuota + tenggat)
// const { reservasiId } = await klaimKuotaTanya(admin, userId)  → null = 429 MSG-C02
// setiap jalur: simpanChat({ ..., reservasiId }) atau lepasKuotaTanya(admin, reservasiId)
const mandiri = await susunPertanyaanMandiri(pertanyaan, riwayat);
const cari = await pilihChunkRelevan({ dokumenId, pertanyaan: mandiri.teks, ambang });
if (cari.chunks.length === 0) {
  // simpan jawaban JAWABAN_TIDAK_DITEMUKAN, is_tidak_ditemukan=true, skor_relevansi=cari.skorTertinggi,
  // log = keBarisLog(gabungPemakaian(mandiri.pemakaian, cari.pemakaian)), tetap dihitung kuota (BR-17)
}
const j = jawabPertanyaanStream({ pertanyaan, riwayat, chunks: cari.chunks, judulTopik, signal: request.signal });
after(async () => {
  try {
    const h = await j.selesai;
    const log = keBarisLog(gabungPemakaian(mandiri.pemakaian, cari.pemakaian, h.pemakaian));
    // fn_simpan_chat(..., h.teks, h.isTidakDitemukan, cari.skorTertinggi, h.rujukan, log)
  } catch (e) {
    // AiGagalError → catatPemakaianAI({ ..., fitur: "tanya_ai", isSukses: false }) — kuota tidak berkurang
  }
});
return new Response(j.aliran.pipeThrough(new TextEncoderStream()), {
  headers: { "Content-Type": "text/plain; charset=utf-8" },
});
```

## 7. Pengujian
```
npx tsx --conditions=react-server --test lib/ai/__tests__/*.test.ts
```
`--conditions=react-server` diperlukan agar paket `server-only` memuat versi kosong di luar Next.js.
Uji mencakup: pemecah kalimat, chunk (ukuran, tumpang tindih, halaman, judul), normalisasi topik
(celah/tumpang tindih/gabung > 15/judul), parser JSON toleran, validasi soal & rujukan, biaya, dan
jawaban streaming dengan klien palsu (normal, terputus B9, gagal sebelum teks).

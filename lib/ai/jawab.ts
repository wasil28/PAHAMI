import "server-only";
import type OpenAI from "openai";
import type { ChatCompletionCreateParamsStreaming } from "openai/resources/chat/completions";
import { PERTANYAAN_MAX } from "@/lib/config";
import { getKlienAI, getModel } from "@/lib/ai/client";
import { hitungBiayaRp, pemakaianKosong } from "@/lib/ai/biaya";
import { estimasiToken } from "@/lib/ai/chunk";
import {
  RIWAYAT_MAKS_PESAN,
  SUHU_FAKTUAL,
  SUHU_STRUKTUR,
  TOKEN_MAKS_JAWABAN,
  TOKEN_MAKS_PERTANYAAN_MANDIRI,
} from "@/lib/ai/konfigurasi";
import { validasiRujukan } from "@/lib/ai/konteks";
import {
  AiGagalError,
  panggilChat,
  pemakaianDariUsage,
  type OpsiPermintaanAI,
  type ParamOpenRouter,
  type UsageOpenRouter,
} from "@/lib/ai/panggil";
import { keOpsiSdk } from "@/lib/ai/tenggat";
import {
  JAWABAN_TIDAK_DITEMUKAN,
  POLA_SITASI,
  promptJawab,
  promptPertanyaanMandiri,
} from "@/lib/ai/prompt/jawab";
import type { ChunkSumber, Pemakaian, PesanRiwayat, Rujukan } from "@/lib/ai/tipe";

export { JAWABAN_TIDAK_DITEMUKAN } from "@/lib/ai/prompt/jawab";

// Tanya AI (BP-07): penyusunan pertanyaan mandiri, jawaban streaming, ekstraksi rujukan.

/**
 * BP-07 langkah 3: pertanyaan lanjutan ("contohnya?") ditulis ulang menjadi pertanyaan mandiri
 * agar pencarian vektor punya sinyal topik. Tanpa riwayat → dikembalikan apa adanya (tanpa
 * biaya). Bila AI gagal, JANGAN gagalkan pertanyaan: pakai pertanyaan asli (pemakaian tetap
 * dikembalikan untuk dijumlah ke log A1).
 */
export async function susunPertanyaanMandiri(
  pertanyaan: string,
  riwayat: readonly PesanRiwayat[],
  klien?: OpenAI,
  /** Tenggat chat: timeout pendek & tanpa coba ulang (langkah ini opsional — gagal = pakai pertanyaan asli). */
  permintaan?: OpsiPermintaanAI,
): Promise<{ teks: string; pemakaian: Pemakaian }> {
  const terakhir = riwayat.slice(-RIWAYAT_MAKS_PESAN);
  if (terakhir.length === 0) return { teks: pertanyaan, pemakaian: pemakaianKosong() };
  try {
    const r = await panggilChat(
      {
        pesan: promptPertanyaanMandiri(pertanyaan, terakhir),
        suhu: SUHU_STRUKTUR,
        maksToken: TOKEN_MAKS_PERTANYAAN_MANDIRI,
        ...permintaan,
      },
      klien,
    );
    const teks = r.teks.replace(/^["'“]|["'”]$/g, "").trim();
    return { teks: teks ? teks.slice(0, PERTANYAAN_MAX) : pertanyaan, pemakaian: r.pemakaian };
  } catch (e) {
    console.error("[ai] susunPertanyaanMandiri gagal, memakai pertanyaan asli:", e instanceof Error ? e.message : e);
    return { teks: pertanyaan, pemakaian: e instanceof AiGagalError ? e.pemakaian : pemakaianKosong() };
  }
}

export interface OpsiJawab {
  /** Pertanyaan ASLI mahasiswa (yang ditampilkan & disimpan). */
  pertanyaan: string;
  /** Riwayat terakhir dokumen ini (dipotong ke RIWAYAT_MAKS_PESAN). */
  riwayat: readonly PesanRiwayat[];
  /** Chunk hasil pilihChunkRelevan (sudah lolos ambang). Wajib ≥ 1. */
  chunks: readonly ChunkSumber[];
  judulTopik?: string | null;
  /** Sinyal batal dari request (mis. request.signal) → simpan jawaban parsial (B9). */
  signal?: AbortSignal;
  /** Timeout & coba ulang SDK untuk aliran jawaban (tenggat chat). `signal` di sini diabaikan — pakai `signal` di atas. */
  permintaan?: Omit<OpsiPermintaanAI, "signal">;
}

export interface HasilJawaban {
  /** Teks jawaban (memuat penanda [Hal. X] untuk dirender sebagai chip). */
  teks: string;
  /** Rujukan valid (halaman berada di chunk yang dipakai, BR-30) → t_chat_rujukan. */
  rujukan: Rujukan[];
  pemakaian: Pemakaian;
  /** true bila aliran terputus (klien menutup koneksi / galat di tengah) — B9. */
  isTerputus: boolean;
  /** Model menyatakan tidak ditemukan (MSG-C03) → t_chat.is_tidak_ditemukan. */
  isTidakDitemukan: boolean;
}

export interface AliranJawaban {
  /**
   * Potongan teks bertahap. Kirim ke browser dengan:
   *   new Response(aliran.pipeThrough(new TextEncoderStream()), { headers: { "Content-Type": "text/plain; charset=utf-8" } })
   */
  aliran: ReadableStream<string>;
  /**
   * Selesai setelah aliran berakhir (normal atau terputus). Reject (AiGagalError, membawa
   * pemakaian) HANYA bila gagal sebelum ada teks sama sekali → MSG-C04, log is_sukses=false.
   */
  selesai: Promise<HasilJawaban>;
  /** Hentikan pembuatan jawaban (hasil parsial tetap diselesaikan sebagai terputus). */
  batalkan: () => void;
}

/**
 * Jawaban streaming hanya dari chunk terpilih (BP-07 langkah 6, BR-30, NF-02). Panggilan
 * dimulai segera; aliran dapat dibaca kapan saja. Jawaban terputus disimpan parsial (B9).
 */
export function jawabPertanyaanStream(opsi: OpsiJawab, klien: OpenAI = getKlienAI()): AliranJawaban {
  const model = getModel("cepat");
  const pesan = promptJawab({
    pertanyaan: opsi.pertanyaan,
    riwayat: opsi.riwayat.slice(-RIWAYAT_MAKS_PESAN),
    chunks: opsi.chunks,
    judulTopik: opsi.judulTopik,
  });
  const abort = new AbortController();
  if (opsi.signal?.aborted) abort.abort();
  else opsi.signal?.addEventListener("abort", () => abort.abort(), { once: true });

  let teks = "";
  let usage: UsageOpenRouter | null = null;
  let modelRespons = model;
  let konsumenBatal = false;
  const mulai = Date.now();

  let selesaikan!: (h: HasilJawaban) => void;
  let tolak!: (e: unknown) => void;
  const selesai = new Promise<HasilJawaban>((res, rej) => {
    selesaikan = res;
    tolak = rej;
  });
  // Cegah "unhandled rejection" bila pemanggil baru menunggu setelah aliran habis.
  selesai.catch(() => undefined);

  const hitungPemakaian = (): Pemakaian => {
    if (usage) return pemakaianDariUsage(modelRespons, usage, Date.now() - mulai);
    // Terputus sebelum chunk usage terakhir → estimasi dari panjang teks (tetap dicatat, B9).
    const tokenMasuk = estimasiToken(pesan.map((p) => (typeof p.content === "string" ? p.content : "")).join("\n"));
    const tokenKeluar = estimasiToken(teks);
    return {
      model: modelRespons,
      tokenMasuk,
      tokenKeluar,
      biayaRp: hitungBiayaRp(modelRespons, tokenMasuk, tokenKeluar),
      durasiMs: Date.now() - mulai,
    };
  };

  const finalisasi = (isTerputus: boolean) => {
    const bersih = teks.trim();
    const isTidakDitemukan = adalahTidakDitemukan(bersih);
    selesaikan({
      teks: bersih,
      rujukan: isTidakDitemukan || !bersih ? [] : ekstrakRujukanJawaban(bersih, opsi.chunks),
      pemakaian: hitungPemakaian(),
      isTerputus,
      isTidakDitemukan,
    });
  };

  const aliran = new ReadableStream<string>({
    start(controller) {
      const kirim = (s: string) => {
        if (konsumenBatal) return;
        try {
          controller.enqueue(s);
        } catch {
          konsumenBatal = true;
        }
      };
      const tutup = () => {
        try {
          controller.close();
        } catch {
          // aliran sudah dibatalkan konsumen
        }
      };

      void (async () => {
        if (opsi.chunks.length === 0) {
          // Pemanggil seharusnya sudah menjawab MSG-C03 tanpa model (F-14); jaga-jaga.
          teks = JAWABAN_TIDAK_DITEMUKAN;
          kirim(teks);
          finalisasi(false);
          tutup();
          return;
        }
        try {
          const body: ChatCompletionCreateParamsStreaming & ParamOpenRouter = {
            model,
            messages: pesan,
            temperature: SUHU_FAKTUAL,
            max_tokens: TOKEN_MAKS_JAWABAN,
            stream: true,
            stream_options: { include_usage: true },
            usage: { include: true },
          };
          const stream = await klien.chat.completions.create(body, {
            ...keOpsiSdk(opsi.permintaan),
            signal: abort.signal,
          });
          for await (const bagian of stream) {
            if (bagian.model) modelRespons = bagian.model;
            const delta = bagian.choices[0]?.delta?.content;
            if (delta) {
              teks += delta;
              kirim(delta);
            }
            if (bagian.usage) usage = bagian.usage as UsageOpenRouter;
          }
          finalisasi(false);
          tutup();
        } catch (e) {
          if (teks.length > 0 || konsumenBatal || abort.signal.aborted) {
            // B9: simpan yang sudah tampil, tandai terputus, tetap dihitung 1 pertanyaan.
            finalisasi(true);
            tutup();
          } else {
            const p: Pemakaian = { ...pemakaianKosong(model), durasiMs: Date.now() - mulai };
            tolak(new AiGagalError("Layanan AI gagal menjawab.", p, e));
            try {
              controller.error(e);
            } catch {
              // sudah tertutup
            }
          }
        }
      })();
    },
    cancel() {
      konsumenBatal = true;
      abort.abort();
    },
  });

  return { aliran, selesai, batalkan: () => abort.abort() };
}

/** Jawaban model = MSG-C03 (persis atau diawali kalimat pertamanya). */
export function adalahTidakDitemukan(teks: string): boolean {
  const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();
  const kalimatPertama = norm(JAWABAN_TIDAK_DITEMUKAN.split(".")[0]);
  return norm(teks).startsWith(kalimatPertama);
}

/**
 * Mengambil sitasi [Hal. X] dari jawaban → rujukan tervalidasi (halaman harus di salah satu
 * chunk konteks; kutipan = kalimat chunk paling mirip dengan kalimat jawaban yang mengutipnya).
 * Tanpa sitasi valid → rujukan ke chunk paling relevan (chunks[0]) agar jawaban tetap bersumber.
 */
export function ekstrakRujukanJawaban(teks: string, chunks: readonly ChunkSumber[]): Rujukan[] {
  if (chunks.length === 0) return [];
  const usulan: { halaman: number; kutipan: string }[] = [];
  for (const m of teks.matchAll(POLA_SITASI)) {
    const acuan = teks.slice(Math.max(0, (m.index ?? 0) - 300), m.index ?? 0);
    for (const bagian of m[1].split(",")) {
      const angka = bagian.split(/[–—-]/).map((x) => Number.parseInt(x.trim(), 10)).filter(Number.isFinite);
      if (angka.length === 0) continue;
      const [awal, akhir = awal] = angka;
      for (let h = awal; h <= Math.min(akhir, awal + 2); h++) usulan.push({ halaman: h, kutipan: acuan });
    }
  }
  const rentang = {
    awal: Math.min(...chunks.map((c) => c.halaman_awal)),
    akhir: Math.max(...chunks.map((c) => c.halaman_akhir)),
  };
  const rujukan = validasiRujukan(usulan, chunks, rentang);
  if (rujukan.length > 0) return rujukan;
  const utama = chunks[0];
  return validasiRujukan([{ halaman: utama.halaman_awal, kutipan: teks }], [utama], {
    awal: utama.halaman_awal,
    akhir: utama.halaman_akhir,
  });
}

import "server-only";
import { after } from "next/server";
import {
  AiGagalError,
  catatPemakaianAI,
  gabungPemakaian,
  jawabPertanyaanStream,
  JAWABAN_TIDAK_DITEMUKAN,
  keBarisLog,
  pilihChunkRelevan,
  susunPertanyaanMandiri,
  type HasilJawaban,
  type Pemakaian,
  type PesanRiwayat,
} from "@/lib/ai/generate";
import { BATAS_WAKTU_LANGKAH_CHAT_MS, COBA_ULANG_LANGKAH_CHAT } from "@/lib/ai/konfigurasi";
import type { Tenggat } from "@/lib/ai/tenggat";
import { gagal, gagalServer } from "@/lib/api/respon";
import { ambilKuotaTanya, lepasKuotaTanya, simpanChat, type KlienDb } from "@/lib/data/chat";
import { PESAN } from "@/lib/pesan";
import { bersihkanPotongan, kodekanMeta } from "./protokol";
import type { KuotaTanyaAi, MetaJawaban } from "./tipe";

// Inti BP-07 setelah route memeriksa login, kepemilikan, validasi, dan MEMESAN kuota.
// Hasil: Response aliran (lib/chat/protokol.ts) atau JSON error sebelum ada teks.
//
// Dua jaminan di sini:
//  * Reservasi kuota (BR-17): setiap jalur keluar memakai reservasi (fn_simpan_chat sukses,
//    termasuk "tidak ditemukan") atau melepasnya (AI gagal / tidak tersimpan, A1).
//  * Tenggat (TENGGAT_CHAT_MS < maxDuration): langkah AI bertimeout pendek & aliran jawaban
//    dihentikan saat tenggat habis (disimpan sebagai terputus, B9), sehingga penyimpanan selalu
//    sempat berjalan sebelum fungsi dibunuh.

export interface KonteksTanya {
  userId: number;
  dokumenId: number;
  topik: { id: number; judul: string } | null;
  pertanyaan: string;
  riwayat: readonly PesanRiwayat[];
  ambang: number;
  /** Service role: fn_cari_chunk (t_chunk tanpa akses pengguna) & fn_simpan_chat. */
  admin: KlienDb;
  /** request.signal → jawaban parsial disimpan bila klien menutup koneksi (B9). */
  signal: AbortSignal;
  /** Dari fn_klaim_kuota_tanya; prosesTanya yang memakai/melepasnya. */
  reservasiId: number;
  /** Tenggat permintaan (dibuat di awal route); prosesTanya yang menghentikan timernya. */
  tenggat: Tenggat;
}

/** Status reservasi satu pertanyaan: `dipakai` setelah fn_simpan_chat sukses, selain itu `lepas`. */
interface PenjagaReservasi {
  dipakai(): void;
  /** Idempoten; no-op bila sudah dipakai. */
  lepas(): Promise<void>;
}

function buatPenjagaReservasi(k: KonteksTanya): PenjagaReservasi {
  let tuntas = false;
  return {
    dipakai: () => {
      tuntas = true;
    },
    lepas: async () => {
      if (tuntas) return;
      tuntas = true;
      await lepasKuotaTanya(k.admin, k.reservasiId);
    },
  };
}

const HEADER_ALIRAN = {
  "Content-Type": "text/plain; charset=utf-8",
  "Cache-Control": "no-store, no-transform",
  "X-Content-Type-Options": "nosniff",
} as const;

/** MSG-C04 + log is_sukses=false (A1: tidak mengurangi kuota). */
async function gagalAi(k: KonteksTanya, pemakaian: Pemakaian, err: unknown): Promise<Response> {
  await catatPemakaianAI({
    userId: k.userId,
    fitur: "tanya_ai",
    dokumenId: k.dokumenId,
    pemakaian,
    isSukses: false,
    pesanError: err instanceof Error ? err.message : String(err),
  });
  return gagal(502, "AI_GAGAL", PESAN["MSG-C04"]);
}

async function kuotaTerbaru(k: KonteksTanya): Promise<KuotaTanyaAi | null> {
  try {
    return await ambilKuotaTanya(k.admin, k.userId);
  } catch (e) {
    console.error("[chat] kuota setelah simpan tidak terbaca:", e instanceof Error ? e.message : e);
    return null;
  }
}

/** Simpan jawaban (fn_simpan_chat) lalu susun metadata penutup aliran. */
async function simpanDanMeta(
  k: KonteksTanya,
  r: PenjagaReservasi,
  h: Pick<HasilJawaban, "teks" | "rujukan" | "isTerputus" | "isTidakDitemukan">,
  pemakaian: Pemakaian,
  skor: number | null,
): Promise<MetaJawaban> {
  const dasar = {
    isTidakDitemukan: h.isTidakDitemukan,
    isTerputus: h.isTerputus,
    rujukan: h.rujukan.map((r) => ({ halaman: r.halaman, kutipan: r.kutipan })),
    createdAt: new Date().toISOString(),
  };
  try {
    const id = await simpanChat(k.admin, {
      userId: k.userId,
      dokumenId: k.dokumenId,
      topikId: k.topik?.id ?? null,
      pertanyaan: k.pertanyaan,
      jawaban: h.teks,
      isTidakDitemukan: h.isTidakDitemukan,
      skorRelevansi: skor,
      rujukan: h.rujukan,
      log: keBarisLog(pemakaian),
      isTerputus: h.isTerputus,
      reservasiId: k.reservasiId,
    });
    r.dipakai(); // reservasi terhapus di transaksi fn_simpan_chat
    return {
      ...dasar,
      status: h.isTerputus ? "terputus" : "selesai",
      chatUserId: id.chatUserId,
      chatAiId: id.chatAiId,
      kuota: await kuotaTerbaru(k),
    };
  } catch (e) {
    // Jawaban sudah tampil tetapi tidak tersimpan: catat biaya sebagai gagal (kuota tetap).
    await r.lepas();
    await catatPemakaianAI({
      userId: k.userId,
      fitur: "tanya_ai",
      dokumenId: k.dokumenId,
      pemakaian,
      isSukses: false,
      pesanError: e instanceof Error ? e.message : String(e),
    });
    return { ...dasar, status: "gagal_simpan", chatUserId: null, chatAiId: null, kuota: await kuotaTerbaru(k) };
  }
}

export async function prosesTanya(k: KonteksTanya): Promise<Response> {
  const r = buatPenjagaReservasi(k);
  let diserahkan = false; // aliran berjalan di after(): penutupnya yang melepas & menghentikan tenggat
  try {
    return await jalankanTanya(k, r, () => {
      diserahkan = true;
    });
  } finally {
    if (!diserahkan) {
      await r.lepas(); // no-op bila jawaban (mis. "tidak ditemukan") sudah tersimpan
      k.tenggat.hentikan();
    }
  }
}

async function jalankanTanya(k: KonteksTanya, r: PenjagaReservasi, serahkan: () => void): Promise<Response> {
  // BP-07 langkah 3: pertanyaan lanjutan → pertanyaan mandiri (tidak pernah melempar).
  // Langkah opsional → timeout pendek tanpa coba ulang; gagal = pakai pertanyaan asli.
  const mandiri = await susunPertanyaanMandiri(
    k.pertanyaan,
    k.riwayat,
    undefined,
    k.tenggat.permintaan(BATAS_WAKTU_LANGKAH_CHAT_MS, 0),
  );

  // UC-16: embedding + top-5 chunk dokumen ini (BR-16).
  let cari: Awaited<ReturnType<typeof pilihChunkRelevan>>;
  try {
    cari = await pilihChunkRelevan({
      dokumenId: k.dokumenId,
      pertanyaan: mandiri.teks,
      ambang: k.ambang,
      klienDb: k.admin,
      permintaan: k.tenggat.permintaan(BATAS_WAKTU_LANGKAH_CHAT_MS, COBA_ULANG_LANGKAH_CHAT),
    });
  } catch (e) {
    if (e instanceof AiGagalError) return gagalAi(k, gabungPemakaian(mandiri.pemakaian, e.pemakaian), e);
    await catatPemakaianAI({ userId: k.userId, fitur: "tanya_ai", dokumenId: k.dokumenId, pemakaian: mandiri.pemakaian, isSukses: false });
    return gagalServer("chat.cari", e);
  }
  const pemakaianAwal = gabungPemakaian(mandiri.pemakaian, cari.pemakaian);

  // F-14: skor tertinggi < ambang → MSG-C03 TANPA model jawaban; tetap disimpan & dihitung (BR-17).
  if (cari.chunks.length === 0) {
    const meta = await simpanDanMeta(
      k,
      r,
      { teks: JAWABAN_TIDAK_DITEMUKAN, rujukan: [], isTerputus: false, isTidakDitemukan: true },
      pemakaianAwal,
      cari.skorTertinggi,
    );
    if (meta.status === "gagal_simpan") return gagalServer("chat.simpan", new Error("simpan MSG-C03 gagal"));
    return new Response(JAWABAN_TIDAK_DITEMUKAN + kodekanMeta(meta), { headers: HEADER_ALIRAN });
  }

  const j = jawabPertanyaanStream({
    pertanyaan: k.pertanyaan,
    riwayat: k.riwayat,
    chunks: cari.chunks,
    judulTopik: k.topik?.judul ?? null,
    // Klien menutup koneksi ATAU tenggat habis → hentikan model, simpan parsial (B9).
    signal: AbortSignal.any([k.signal, k.tenggat.signal]),
    // Tanpa coba ulang SDK: percobaan kedua tidak akan muat dalam tenggat.
    permintaan: { timeoutMs: Math.max(1, k.tenggat.sisaMs()), maksCobaUlang: 0 },
  });
  const pembaca = j.aliran.getReader();

  // Tunggu potongan pertama sebelum mengirim header 200: galat sebelum teks → JSON 502 (MSG-C04).
  let pertama: string;
  try {
    const r = await pembaca.read();
    pertama = r.done ? "" : bersihkanPotongan(r.value);
    if (!pertama) throw new Error("Jawaban kosong.");
  } catch (e) {
    const h = await j.selesai.catch((err: unknown) => err);
    const p = h instanceof AiGagalError ? h.pemakaian : h instanceof Error ? null : (h as HasilJawaban).pemakaian;
    // Teks kosong (mis. dibatalkan sebelum token pertama) = gagal, tidak ada t_chat (B9).
    return gagalAi(k, gabungPemakaian(pemakaianAwal, p), h instanceof Error ? h : e);
  }

  const { readable, writable } = new TransformStream<string, string>();
  const penulis = writable.getWriter();
  let putus = false;
  const tulis = (s: string) => {
    if (putus || !s) return;
    penulis.write(s).catch(() => {
      // Klien menutup koneksi: hentikan model; hasil parsial tetap disimpan (B9).
      putus = true;
      j.batalkan();
    });
  };

  const tugas = (async () => {
    tulis(pertama);
    try {
      for (;;) {
        const r = await pembaca.read();
        if (r.done) break;
        tulis(bersihkanPotongan(r.value));
      }
    } catch {
      // aliran jawaban sudah ditandai terputus oleh jawabPertanyaanStream
    }
    let meta: MetaJawaban | null = null;
    try {
      const h = await j.selesai;
      const pemakaian = gabungPemakaian(pemakaianAwal, h.pemakaian);
      if (h.teks) meta = await simpanDanMeta(k, r, h, pemakaian, cari.skorTertinggi);
      else await catatPemakaianAI({ userId: k.userId, fitur: "tanya_ai", dokumenId: k.dokumenId, pemakaian, isSukses: false });
    } catch (e) {
      console.error("[chat] penyelesaian jawaban gagal:", e instanceof Error ? e.message : e);
    }
    // Semua jalur selain simpan sukses → kuota tidak berkurang (A1).
    await r.lepas();
    k.tenggat.hentikan();
    if (meta) tulis(kodekanMeta(meta));
    await penulis.close().catch(() => undefined);
  })();
  serahkan();
  // Pastikan penyimpanan selesai walau klien sudah pergi (B9).
  after(() => tugas);

  return new Response(readable.pipeThrough(new TextEncoderStream()), { headers: HEADER_ALIRAN });
}

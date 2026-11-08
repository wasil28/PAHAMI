import "server-only";
import { KATA_PER_CHUNK } from "@/lib/config";
import {
  KARAKTER_PER_TOKEN,
  RASIO_MAKS_CHUNK,
  RASIO_MIN_SEBELUM_JUDUL,
  RASIO_MIN_SISA_CHUNK,
} from "@/lib/ai/konfigurasi";
import type { HalamanTeks } from "@/lib/ai/tipe";

// Pemotongan teks menjadi chunk (BR-08): ± 500 kata, tidak memotong kalimat, tumpang tindih
// 1 kalimat, menyimpan halaman awal & akhir. Fungsi murni → mudah diuji (lib/ai/__tests__).

/** Baris siap simpan ke t_chunk (tanpa embedding). */
export interface ChunkBaru {
  urutan: number;
  halaman_awal: number;
  halaman_akhir: number;
  judul_bagian: string | null;
  isi: string;
  jumlah_token: number;
  jumlah_kata: number;
}

export interface OpsiChunk {
  /** Target kata per chunk. Default KATA_PER_CHUNK (500). */
  kataPerChunk?: number;
  /** Jumlah kalimat tumpang tindih. Default 1 (BR-08). */
  kalimatTumpang?: number;
}

/** Satu kalimat (atau judul) beserta halaman tempat ia mulai & berakhir. */
export interface Kalimat {
  teks: string;
  halaman_awal: number;
  halaman_akhir: number;
  kata: number;
  isJudul: boolean;
}

/** Perkiraan token tanpa tokenizer (cukup untuk kolom t_chunk.jumlah_token & anggaran prompt). */
export function estimasiToken(teks: string): number {
  return Math.ceil(teks.length / KARAKTER_PER_TOKEN);
}

export function hitungKata(teks: string): number {
  const t = teks.trim();
  return t ? t.split(/\s+/).length : 0;
}

/**
 * Memotong teks seluruh halaman menjadi chunk berurutan.
 * Aturan: kalimat ditambahkan selama total ≤ target; chunk boleh melebar s.d. 1,2× target
 * demi tidak memotong kalimat. Chunk berikutnya diawali kalimat terakhir chunk sebelumnya
 * (tumpang tindih). Judul bab memulai chunk baru (tanpa tumpang tindih) agar satu chunk tidak
 * mencampur dua bab. Pengecualian satu-satunya: "kalimat" tanpa tanda baca yang lebih panjang
 * dari batas (mis. tabel) dipotong per kata karena tidak ada batas kalimat yang bisa dipakai.
 */
export function buatChunk(halaman: readonly HalamanTeks[], opsi: OpsiChunk = {}): ChunkBaru[] {
  const target = Math.max(1, opsi.kataPerChunk ?? KATA_PER_CHUNK);
  const tumpang = Math.max(0, opsi.kalimatTumpang ?? 1);
  const maks = Math.floor(target * RASIO_MAKS_CHUNK);

  const kalimat = pecahPanjang(pecahKalimatHalaman(halaman), maks);
  const kelompok: Kalimat[][] = [];
  let kini: Kalimat[] = [];
  let kataKini = 0;
  let jumlahBaru = 0; // kalimat baru (bukan tumpang tindih) di chunk berjalan
  let judulKini: string | null = null;
  const judulPerKelompok: (string | null)[] = [];

  const tutup = (denganTumpang: boolean) => {
    if (jumlahBaru === 0) return;
    kelompok.push(kini);
    judulPerKelompok.push(judulKini);
    // Tumpang tindih hanya bila kalimatnya tidak terlalu panjang (hindari chunk berulang besar).
    const bawa = denganTumpang
      ? kini.slice(-tumpang).filter((k) => !k.isJudul && k.kata <= target / 2)
      : [];
    kini = bawa;
    kataKini = bawa.reduce((s, k) => s + k.kata, 0);
    jumlahBaru = 0;
  };

  for (const k of kalimat) {
    if (k.isJudul) {
      // Judul utama (bab/modul/KB) selalu memutus chunk agar konteks topik tidak bocor ke bab
      // lain; sub-judul hanya memutus bila chunk berjalan sudah cukup besar.
      const putus = adalahJudulUtama(k.teks) || kataKini >= target * RASIO_MIN_SEBELUM_JUDUL;
      if (jumlahBaru > 0 && putus) tutup(false);
      if (jumlahBaru === 0) {
        kini = []; // judul baru → buang tumpang tindih dari bab sebelumnya
        kataKini = 0;
      }
      judulKini = k.teks;
    } else if (jumlahBaru > 0 && kataKini + k.kata > target) {
      // Kalimat berikut membuat chunk > target: tutup sekarang, kecuali chunk masih terlalu
      // kecil dan kalimat ini masih muat di batas 1,2×.
      if (kataKini >= target * (1 - RASIO_MIN_SISA_CHUNK) || kataKini + k.kata > maks) {
        tutup(true);
      }
    }
    kini.push(k);
    kataKini += k.kata;
    jumlahBaru += 1;
  }
  // Sisa kecil digabung ke chunk sebelumnya agar tidak ada chunk "yatim" yang miskin konteks.
  if (jumlahBaru > 0) {
    const baru = kini.slice(kini.length - jumlahBaru);
    const kataBaru = baru.reduce((s, k) => s + k.kata, 0);
    const prev = kelompok[kelompok.length - 1];
    const kataPrev = prev?.reduce((s, k) => s + k.kata, 0) ?? 0;
    const tanpaJudul = !baru.some((k) => k.isJudul);
    if (prev && tanpaJudul && kataBaru < target * RASIO_MIN_SISA_CHUNK && kataPrev + kataBaru <= maks) {
      prev.push(...baru);
    } else {
      kelompok.push(kini);
      judulPerKelompok.push(judulKini);
    }
  }

  return kelompok.map((ks, i) => {
    const isi = ks.map((k) => k.teks).join(" ");
    return {
      urutan: i + 1,
      halaman_awal: Math.min(...ks.map((k) => k.halaman_awal)),
      halaman_akhir: Math.max(...ks.map((k) => k.halaman_akhir)),
      judul_bagian: judulPerKelompok[i]?.slice(0, 255) ?? null,
      isi,
      jumlah_token: estimasiToken(isi),
      jumlah_kata: hitungKata(isi),
    };
  });
}

// ── Pemecahan kalimat (sadar bahasa Indonesia) ─────────────────

/**
 * Singkatan yang diakhiri titik tetapi BUKAN akhir kalimat. Huruf kecil, tanpa titik akhir.
 * Memotong salah di sini akan memecah kalimat (melanggar BR-08); gagal memotong hanya membuat
 * dua kalimat menyatu, yang aman.
 */
const SINGKATAN = new Set([
  // umum
  "dll", "dsb", "dst", "dkk", "tsb", "yth", "spt", "sbg", "dgn", "utk", "krn", "tgl", "no",
  "hlm", "hal", "jl", "kab", "kec", "kel", "prov", "rp", "tbk", "pt", "cv", "vs", "etc", "cf",
  "a.n", "u.p", "a.l", "s.d", "e.g", "i.e", "op", "cit", "ibid",
  // gelar & sapaan
  "dr", "drs", "dra", "prof", "ir", "h", "hj", "st", "bpk", "sdr", "sdri", "mr", "mrs", "ms",
  "s.pd", "s.kom", "s.e", "m.si", "m.pd", "m.kom", "ph.d", "kol", "jend", "mayjen", "brigjen",
  // rujukan pustaka & peraturan (satuan seperti "kg" sengaja tidak dimasukkan: dalam bahasa
  // Indonesia ditulis tanpa titik, sehingga "kg." hampir selalu akhir kalimat)
  "gbr", "fig", "tab", "pers", "vol", "ed", "eds", "cet", "terj", "pp", "uu", "psl", "kep",
  "permen",
]);

/** Pola judul bab/sub-bab yang lazim di modul UT & buku ajar. */
const POLA_JUDUL =
  /^(?:BAB|Bab|MODUL|Modul|KEGIATAN BELAJAR|Kegiatan Belajar|PENDAHULUAN|Pendahuluan|RANGKUMAN|Rangkuman|TES FORMATIF|Tes Formatif|LATIHAN|DAFTAR PUSTAKA|Daftar Pustaka|GLOSARIUM|Glosarium|(?:\d{1,2}\.){1,3}\d{0,2}\s+\p{Lu}|[IVX]{1,5}\.\s+\p{Lu}|[A-H]\.\s+\p{Lu})/u;
const POLA_JUDUL_UTAMA = /^(?:BAB|MODUL|KEGIATAN BELAJAR)\b/iu;
const JUDUL_KATA_MAKS = 14;
const JUDUL_KARAKTER_MAKS = 120;

/** Baris pendek tanpa tanda baca akhir yang cocok pola judul dianggap judul bagian. */
export function adalahJudul(baris: string): boolean {
  const b = baris.trim();
  if (!b || b.length > JUDUL_KARAKTER_MAKS || /[.,;:!?]$/.test(b)) return false;
  if (hitungKata(b) > JUDUL_KATA_MAKS) return false;
  return POLA_JUDUL.test(b);
}

/** Judul tingkat bab (BAB/MODUL/KEGIATAN BELAJAR) — batas yang tidak boleh dilintasi chunk. */
export function adalahJudulUtama(judul: string): boolean {
  return POLA_JUDUL_UTAMA.test(judul.trim());
}

/**
 * Menggabungkan semua halaman menjadi satu aliran teks (kalimat boleh melintasi pergantian
 * halaman), lalu memecah per kalimat sambil mencatat halaman awal & akhir tiap kalimat.
 */
export function pecahKalimatHalaman(halaman: readonly HalamanTeks[]): Kalimat[] {
  const hasil: Kalimat[] = [];
  let buffer = ""; // teks paragraf berjalan
  let posHalaman: { pos: number; nomor: number }[] = [];

  const halamanDi = (pos: number): number => {
    let nomor = posHalaman[0]?.nomor ?? 1;
    for (const p of posHalaman) {
      if (p.pos <= pos) nomor = p.nomor;
      else break;
    }
    return nomor;
  };

  const kuras = () => {
    for (const { mulai, akhir } of batasKalimat(buffer)) {
      const teks = buffer.slice(mulai, akhir).trim();
      if (!teks) continue;
      const potong = buffer.slice(mulai, akhir);
      const offsetAwal = mulai + potong.length - potong.trimStart().length;
      hasil.push({
        teks,
        halaman_awal: halamanDi(offsetAwal),
        halaman_akhir: halamanDi(Math.max(offsetAwal, akhir - 1)),
        kata: hitungKata(teks),
        isJudul: false,
      });
    }
    buffer = "";
    posHalaman = [];
  };

  for (const h of halaman) {
    for (const baris of h.teks.split("\n")) {
      const b = baris.replace(/\s+/g, " ").trim();
      if (!b) continue;
      if (adalahJudul(b)) {
        kuras();
        hasil.push({ teks: b, halaman_awal: h.nomor, halaman_akhir: h.nomor, kata: hitungKata(b), isJudul: true });
        continue;
      }
      if (buffer) buffer += " ";
      const last = posHalaman[posHalaman.length - 1];
      if (!last || last.nomor !== h.nomor) posHalaman.push({ pos: buffer.length, nomor: h.nomor });
      buffer += b;
    }
  }
  kuras();
  return hasil;
}

/** Memecah satu teks menjadi kalimat (dipakai juga untuk memilih kutipan). */
export function pecahKalimat(teks: string): string[] {
  return batasKalimat(teks)
    .map(({ mulai, akhir }) => teks.slice(mulai, akhir).trim())
    .filter(Boolean);
}

function batasKalimat(teks: string): { mulai: number; akhir: number }[] {
  const batas: { mulai: number; akhir: number }[] = [];
  // Kandidat akhir kalimat: . ! ? (boleh diikuti tanda kutip/kurung tutup), lalu spasi, lalu
  // awal kalimat baru (huruf kapital, angka, kutip, atau kurung buka).
  const pola = /[.!?…]+["'”’)\]]*(?=\s+["'“‘(\[]?[\p{Lu}\d])/gu;
  let mulai = 0;
  for (let m = pola.exec(teks); m !== null; m = pola.exec(teks)) {
    const akhir = m.index + m[0].length;
    if (m[0].startsWith(".") && bukanAkhirKalimat(teks, m.index)) continue;
    batas.push({ mulai, akhir });
    mulai = akhir;
  }
  if (mulai < teks.length) batas.push({ mulai, akhir: teks.length });
  return batas;
}

/** Titik di posisi `idx` adalah bagian singkatan/angka/inisial, bukan akhir kalimat. */
function bukanAkhirKalimat(teks: string, idx: number): boolean {
  const sebelum = teks.slice(Math.max(0, idx - 20), idx);
  const token = sebelum.split(/\s+/).pop() ?? "";
  const bersih = token.replace(/^["'“‘(\[]+/, "");
  if (!bersih) return false;
  if (SINGKATAN.has(bersih.toLowerCase())) return true;
  // Inisial nama tunggal ("A. Rahman") atau gelar berantai ("S.Pd.").
  if (/^\p{Lu}$/u.test(bersih)) return true;
  if (/^(?:\p{L}{1,3}\.)+\p{L}{1,3}$/u.test(bersih)) return true;
  // Nomor butir daftar ("1. Pendahuluan", "2.3. Definisi") — angka ≤ 3 digit sebelum titik.
  if (/^(?:\d{1,3}\.)*\d{1,3}$/.test(bersih)) return true;
  return false;
}

/** Kalimat > maks kata (tabel/daftar tanpa tanda baca) dipotong per kata — lihat buatChunk. */
function pecahPanjang(kalimat: Kalimat[], maks: number): Kalimat[] {
  const hasil: Kalimat[] = [];
  for (const k of kalimat) {
    if (k.kata <= maks) {
      hasil.push(k);
      continue;
    }
    const kata = k.teks.split(/\s+/);
    for (let i = 0; i < kata.length; i += maks) {
      const bagian = kata.slice(i, i + maks).join(" ");
      hasil.push({ ...k, teks: bagian, kata: hitungKata(bagian) });
    }
  }
  return hasil;
}

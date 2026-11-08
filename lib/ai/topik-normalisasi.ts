import "server-only";
import { JUDUL_TOPIK_MAX, MAX_TOPIK } from "@/lib/config";

// Pasca-proses daftar topik dari AI agar SELALU memenuhi BR-09 apa pun keluaran modelnya:
// berurutan, rentang halaman tidak tumpang tindih, bersambung, mencakup 1..N, judul ≤ 120,
// jumlah ≤ 15 (KEPUTUSAN B4: < 4 diterima selama ≥ 1; > 15 digabung). Fungsi murni.

export interface TopikMentah {
  judul?: unknown;
  halaman_awal?: unknown;
  halaman_akhir?: unknown;
  deskripsi?: unknown;
}

export interface TopikBaru {
  urutan: number;
  judul: string;
  halaman_awal: number;
  halaman_akhir: number;
  deskripsi: string;
}

/**
 * Menormalkan topik. Strategi: hanya HALAMAN AWAL tiap topik yang dipercaya (model sering
 * salah di halaman akhir); halaman akhir = halaman awal topik berikutnya − 1, topik terakhir
 * berakhir di N, topik pertama dimulai di 1. Ini otomatis menutup celah & tumpang tindih.
 * Mengembalikan [] bila tidak ada satu pun topik yang layak (pemanggil menganggapnya gagal).
 */
export function normalisasiTopik(mentah: readonly TopikMentah[], jumlahHalaman: number): TopikBaru[] {
  const n = Math.max(1, Math.floor(jumlahHalaman));
  const kandidat = mentah
    .map((t, i) => {
      const awal = keBulat(t.halaman_awal);
      const akhir = keBulat(t.halaman_akhir);
      if (awal === null && akhir === null) return null;
      const a = Math.min(awal ?? akhir ?? 1, akhir ?? awal ?? 1);
      return {
        judul: rapikanJudul(typeof t.judul === "string" ? t.judul : "", i + 1),
        awal: jepit(a, 1, n),
        deskripsi: typeof t.deskripsi === "string" ? t.deskripsi.trim() : "",
        asal: i,
      };
    })
    .filter((t): t is NonNullable<typeof t> => t !== null)
    // Urut halaman awal; seri dipertahankan sesuai urutan model.
    .sort((x, y) => x.awal - y.awal || x.asal - y.asal);

  // Halaman awal kembar → ambil yang pertama (topik kedua tidak punya halaman sendiri).
  const unik: typeof kandidat = [];
  for (const t of kandidat) {
    if (unik.length === 0 || unik[unik.length - 1].awal !== t.awal) unik.push(t);
  }
  if (unik.length === 0) return [];
  unik[0].awal = 1;

  let topik = unik.map((t, i) => ({
    judul: t.judul,
    deskripsi: t.deskripsi,
    halaman_awal: t.awal,
    halaman_akhir: i + 1 < unik.length ? unik[i + 1].awal - 1 : n,
  }));

  // > MAX_TOPIK: gabungkan pasangan bertetangga dengan rentang gabungan tersempit, berulang.
  while (topik.length > MAX_TOPIK) {
    let terbaik = 0;
    let rentangTerbaik = Number.POSITIVE_INFINITY;
    for (let i = 0; i + 1 < topik.length; i++) {
      const r = topik[i + 1].halaman_akhir - topik[i].halaman_awal;
      if (r < rentangTerbaik) {
        rentangTerbaik = r;
        terbaik = i;
      }
    }
    const a = topik[terbaik];
    const b = topik[terbaik + 1];
    const gabung = {
      judul: gabungJudul(a.judul, b.judul),
      deskripsi: [a.deskripsi, b.deskripsi].filter(Boolean).join(" "),
      halaman_awal: a.halaman_awal,
      halaman_akhir: b.halaman_akhir,
    };
    topik = [...topik.slice(0, terbaik), gabung, ...topik.slice(terbaik + 2)];
  }

  return topik.map((t, i) => ({ urutan: i + 1, ...t }));
}

/** Memastikan BR-09 terpenuhi (dipakai di uji & sebagai penjaga sebelum simpan). */
export function cekAturanTopik(topik: readonly TopikBaru[], jumlahHalaman: number): string[] {
  const galat: string[] = [];
  if (topik.length < 1) galat.push("Tidak ada topik.");
  if (topik.length > MAX_TOPIK) galat.push(`Topik lebih dari ${MAX_TOPIK}.`);
  topik.forEach((t, i) => {
    if (t.urutan !== i + 1) galat.push(`Urutan topik ${i + 1} salah.`);
    if (!t.judul || t.judul.length > JUDUL_TOPIK_MAX) galat.push(`Judul topik ${i + 1} tidak valid.`);
    if (t.halaman_awal > t.halaman_akhir) galat.push(`Rentang topik ${i + 1} terbalik.`);
    const harapAwal = i === 0 ? 1 : topik[i - 1].halaman_akhir + 1;
    if (t.halaman_awal !== harapAwal) galat.push(`Topik ${i + 1} tidak bersambung.`);
  });
  if (topik.length && topik[topik.length - 1].halaman_akhir !== jumlahHalaman) {
    galat.push("Topik tidak mencakup halaman terakhir.");
  }
  return galat;
}

export function rapikanJudul(judul: string, cadanganNomor: number): string {
  const j = judul
    .replace(/\s+/g, " ")
    .replace(/^["'“”*#\s]+|["'“”*\s]+$/g, "")
    .trim();
  if (!j) return `Bagian ${cadanganNomor}`;
  return potongDiKata(j, JUDUL_TOPIK_MAX);
}

function gabungJudul(a: string, b: string): string {
  const g = `${a} & ${b}`;
  return g.length <= JUDUL_TOPIK_MAX ? g : a;
}

/** Memotong teks di batas kata + "…" tanpa melewati `maks` karakter. */
export function potongDiKata(teks: string, maks: number): string {
  if (teks.length <= maks) return teks;
  const potong = teks.slice(0, maks - 1);
  const spasi = potong.lastIndexOf(" ");
  return `${(spasi > maks / 2 ? potong.slice(0, spasi) : potong).trimEnd()}…`;
}

function keBulat(v: unknown): number | null {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number.parseInt(v, 10) : Number.NaN;
  return Number.isFinite(n) ? Math.round(n) : null;
}

function jepit(v: number, min: number, maks: number): number {
  return Math.min(maks, Math.max(min, v));
}

import "server-only";
import { createClient } from "@/lib/supabase/server";
import { STATUS_TOPIK, type StatusTopik } from "@/lib/pesan";

// Akses data progres belajar (FT-07, S-12). Semua angka turunan dihitung di view DB
// (v_progres_topik: status BR-13 · v_progres_dokumen: BR-14/15) — di sini hanya dirangkai.
// Klien sesi (RLS + view security_invoker) → hanya data milik sendiri (BR-06); filter
// user_id tetap ditulis eksplisit sebagai lapis kedua.

/** Riwayat latihan per halaman (FT-07 §3A.3 K-14). TODO: pindah ke lib/config.ts (RIWAYAT_PER_HALAMAN). */
export const RIWAYAT_PER_HALAMAN = 10;

export interface SkorTopik {
  topikId: number;
  urutan: number;
  judul: string;
  halamanAwal: number;
  halamanAkhir: number;
  status: StatusTopik;
  skorTerakhir: number | null;
  jumlahLatihan: number;
}

export interface ProgresDokumen {
  id: number;
  kode: string;
  judul: string;
  totalTopik: number;
  topikSelesai: number;
  topikLemah: number;
  persen: number; // BR-14
  rataRataSkor: number | null; // BR-15, null bila belum ada latihan
  jumlahLatihan: number;
  aktivitasTerakhirAt: string | null;
  topik: SkorTopik[];
}

export interface TopikLemah extends SkorTopik {
  dokumenId: number;
  judulDokumen: string;
}

export interface RingkasanProgres {
  jumlahDokumen: number; // dokumen siap
  topikSelesai: number;
  totalTopik: number;
  persenSelesai: number;
  rataRataSkor: number | null;
  perluDiulang: number;
  jumlahLatihan: number;
}

export interface DataProgres {
  ringkasan: RingkasanProgres;
  dokumen: ProgresDokumen[];
  topikLemah: TopikLemah[];
}

export interface BarisRiwayat {
  id: number;
  tanggal: string;
  judulTopik: string; // snapshot saat latihan (judul topik bisa berubah)
  judulDokumen: string | null;
  dokumenId: number | null;
  topikId: number;
  skor: number;
}

export interface HalamanRiwayat {
  baris: BarisRiwayat[];
  total: number;
  halaman: number;
  totalHalaman: number;
}

function keStatus(nilai: string | null): StatusTopik {
  return nilai !== null && nilai in STATUS_TOPIK ? (nilai as StatusTopik) : "belum";
}

/** Waktu ISO terbaru dulu; null paling akhir (urutan dokumen & topik lemah, K-05/K-12). */
function bandingAktivitas(a: string | null, b: string | null): number {
  if (a === b) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return b.localeCompare(a);
}

/** Seluruh data S-12 selain riwayat. Melempar error bila query gagal (ditangkap error.tsx → MSG-G02). */
export async function getProgres(userId: number): Promise<DataProgres> {
  const supabase = await createClient();
  const [topikRes, dokumenRes, progresRes] = await Promise.all([
    supabase
      .from("v_progres_topik")
      .select("dokumen_id, topik_id, urutan, judul_topik, halaman_awal, halaman_akhir, status, skor_terakhir, jumlah_latihan")
      .eq("user_id", userId)
      .order("dokumen_id")
      .order("urutan"),
    supabase
      .from("t_dokumen")
      .select("id, kode, judul, aktivitas_terakhir_at")
      .eq("user_id", userId)
      .eq("status", "siap"), // BR-07: hanya dokumen siap
    supabase
      .from("v_progres_dokumen")
      .select("dokumen_id, total_topik, topik_selesai, topik_lemah, persen_selesai, rata_rata_skor, jumlah_latihan")
      .eq("user_id", userId),
  ]);
  if (topikRes.error) throw new Error(`[getProgres] v_progres_topik: ${topikRes.error.message}`);
  if (dokumenRes.error) throw new Error(`[getProgres] t_dokumen: ${dokumenRes.error.message}`);
  if (progresRes.error) throw new Error(`[getProgres] v_progres_dokumen: ${progresRes.error.message}`);

  const topikPerDokumen = new Map<number, SkorTopik[]>();
  for (const t of topikRes.data) {
    if (t.dokumen_id === null || t.topik_id === null) continue;
    const daftar = topikPerDokumen.get(t.dokumen_id) ?? [];
    daftar.push({
      topikId: t.topik_id,
      urutan: t.urutan ?? 0,
      judul: t.judul_topik ?? "",
      halamanAwal: t.halaman_awal ?? 0,
      halamanAkhir: t.halaman_akhir ?? 0,
      status: keStatus(t.status),
      skorTerakhir: t.skor_terakhir,
      jumlahLatihan: t.jumlah_latihan ?? 0,
    });
    topikPerDokumen.set(t.dokumen_id, daftar);
  }
  const progresPerDokumen = new Map(progresRes.data.map((p) => [p.dokumen_id, p]));

  const dokumen: ProgresDokumen[] = dokumenRes.data
    .map((d) => {
      const p = progresPerDokumen.get(d.id);
      return {
        id: d.id,
        kode: d.kode,
        judul: d.judul,
        totalTopik: p?.total_topik ?? 0,
        topikSelesai: p?.topik_selesai ?? 0,
        topikLemah: p?.topik_lemah ?? 0,
        persen: p?.persen_selesai ?? 0,
        rataRataSkor: p?.rata_rata_skor ?? null,
        jumlahLatihan: p?.jumlah_latihan ?? 0,
        aktivitasTerakhirAt: d.aktivitas_terakhir_at,
        topik: topikPerDokumen.get(d.id) ?? [],
      };
    })
    .sort((a, b) => bandingAktivitas(a.aktivitasTerakhirAt, b.aktivitasTerakhirAt));

  const semuaTopik = dokumen.flatMap((d) => d.topik);
  const totalTopik = semuaTopik.length;
  const topikSelesai = semuaTopik.filter((t) => t.status === "selesai").length;
  // BR-15 lintas dokumen: rata-rata SKOR TERAKHIR tiap topik yang pernah dilatih (bukan rata-rata
  // dari rata-rata per dokumen, yang akan bias ke dokumen dengan sedikit topik).
  const skorTerlatih = semuaTopik.map((t) => t.skorTerakhir).filter((s): s is number => s !== null);
  const rataRataSkor = skorTerlatih.length
    ? Math.round(skorTerlatih.reduce((a, b) => a + b, 0) / skorTerlatih.length)
    : null;

  // Topik lemah: dokumen dengan aktivitas terbaru dulu, lalu urutan topik (FT-07 K-12, sejalan BR-35).
  const topikLemah: TopikLemah[] = dokumen.flatMap((d) =>
    d.topik.filter((t) => t.status === "lemah").map((t) => ({ ...t, dokumenId: d.id, judulDokumen: d.judul })),
  );

  return {
    ringkasan: {
      jumlahDokumen: dokumen.length,
      topikSelesai,
      totalTopik,
      persenSelesai: totalTopik > 0 ? Math.round((topikSelesai / totalTopik) * 100) : 0, // BR-14
      rataRataSkor,
      perluDiulang: topikLemah.length,
      jumlahLatihan: dokumen.reduce((n, d) => n + d.jumlahLatihan, 0),
    },
    dokumen,
    topikLemah,
  };
}

type RelasiTopik = { dokumen_id: number; t_dokumen: { judul: string } | null } | null;

async function ambilRiwayat(userId: number, halaman: number) {
  const supabase = await createClient();
  const dari = (halaman - 1) * RIWAYAT_PER_HALAMAN;
  return supabase
    .from("t_latihan")
    .select("id, topik_id, skor, created_at, snapshot_judul_topik, t_topik(dokumen_id, t_dokumen!fk_topik_dokumen(judul))", { count: "exact" })
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false }) // pemecah seri bila waktu sama
    .range(dari, dari + RIWAYAT_PER_HALAMAN - 1);
}

/** Riwayat latihan terbaru di atas, 10 per halaman (FT-07 L-11/L-13). Halaman di luar jangkauan → halaman terakhir (L-13a). */
export async function getRiwayatLatihan(userId: number, halamanDiminta: number): Promise<HalamanRiwayat> {
  let halaman = Math.max(1, Math.floor(halamanDiminta));
  let res = await ambilRiwayat(userId, halaman);
  // PostgREST menolak rentang di luar jumlah baris (PGRST103) → ulangi dari halaman 1 untuk tahu totalnya.
  if (res.error?.code === "PGRST103") {
    halaman = 1;
    res = await ambilRiwayat(userId, halaman);
  }
  if (res.error) throw new Error(`[getRiwayatLatihan] ${res.error.message}`);
  const total = res.count ?? 0;
  const totalHalaman = Math.max(1, Math.ceil(total / RIWAYAT_PER_HALAMAN));
  if (halaman > totalHalaman) {
    halaman = totalHalaman;
    res = await ambilRiwayat(userId, halaman);
    if (res.error) throw new Error(`[getRiwayatLatihan] ${res.error.message}`);
  }
  const baris: BarisRiwayat[] = (res.data ?? []).map((l) => {
    // PostgREST bisa mengembalikan objek atau array untuk relasi — terima keduanya.
    const mentah = l.t_topik as unknown as RelasiTopik | RelasiTopik[];
    const topik = Array.isArray(mentah) ? (mentah[0] ?? null) : mentah;
    return {
      id: l.id,
      tanggal: l.created_at,
      judulTopik: l.snapshot_judul_topik,
      judulDokumen: topik?.t_dokumen?.judul ?? null,
      dokumenId: topik?.dokumen_id ?? null,
      topikId: l.topik_id,
      skor: l.skor,
    };
  });
  return { baris, total, halaman, totalHalaman };
}

import "server-only";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  KATEGORI_QC,
  PRIORITAS_QC,
  STATUS_QC,
  kodeQc,
  type InfoPerangkat,
  type KategoriQc,
  type LaporanQc,
  type Penguji,
  type PrioritasQc,
  type RingkasanStatusQc,
  type StatusQc,
} from "@/lib/qc/tipe";
import type { Json } from "@/types/database";

// Akses data Laporan QC (KEPUTUSAN §4). Baca lewat klien sesi (RLS: pelapor melihat miliknya,
// admin melihat semua); screenshot lewat service role (bucket `qc` tanpa policy pengguna).

export const BUCKET_QC = "qc";
const PER_HALAMAN = 20;
const MASA_URL_DETIK = 60 * 60;

export interface FilterQc {
  status?: StatusQc;
  kategori?: KategoriQc;
  halaman: number;
}

export interface HalamanLaporanQc {
  laporan: LaporanQc[];
  total: number;
  halaman: number;
  totalHalaman: number;
  ringkasan: RingkasanStatusQc;
}

const KOLOM =
  "id, judul, deskripsi, kategori, prioritas, status, url_halaman, info_perangkat, lampiran_path, catatan_tim, " +
  "created_at, updated_at, selesai_at, pelapor:m_users!fk_qc_pelapor(id, nama, email), penangan:m_users!fk_qc_penangan(nama)";

type BarisQc = {
  id: number;
  judul: string;
  deskripsi: string;
  kategori: string;
  prioritas: string;
  status: string;
  url_halaman: string;
  info_perangkat: Json | null;
  lampiran_path: string | null;
  catatan_tim: string | null;
  created_at: string;
  updated_at: string;
  selesai_at: string | null;
  pelapor: { id: number; nama: string; email: string } | { id: number; nama: string; email: string }[] | null;
  penangan: { nama: string } | { nama: string }[] | null;
};

const satu = <T,>(v: T | T[] | null): T | null => (Array.isArray(v) ? (v[0] ?? null) : v);
const dalam = <K extends string>(daftar: Record<K, string>, nilai: string, cadangan: K): K =>
  nilai in daftar ? (nilai as K) : cadangan;

function keInfo(json: Json | null): InfoPerangkat | null {
  if (!json || typeof json !== "object" || Array.isArray(json)) return null;
  const o = json as Record<string, Json | undefined>;
  return {
    userAgent: typeof o.userAgent === "string" ? o.userAgent : "",
    lebarLayar: typeof o.lebarLayar === "number" ? o.lebarLayar : 0,
    tinggiLayar: typeof o.tinggiLayar === "number" ? o.tinggiLayar : 0,
    tema: o.tema === "gelap" ? "gelap" : "terang",
  };
}

async function urlLampiran(paths: string[]): Promise<Map<string, string>> {
  const peta = new Map<string, string>();
  if (paths.length === 0) return peta;
  const admin = createAdminClient();
  const { data, error } = await admin.storage.from(BUCKET_QC).createSignedUrls(paths, MASA_URL_DETIK);
  if (error) {
    console.error("[qc] signed URL", error.message);
    return peta;
  }
  for (const d of data ?? []) if (d.path && d.signedUrl) peta.set(d.path, d.signedUrl);
  return peta;
}

async function keLaporan(baris: BarisQc[]): Promise<LaporanQc[]> {
  const url = await urlLampiran(baris.flatMap((b) => (b.lampiran_path ? [b.lampiran_path] : [])));
  return baris.map((b) => {
    const pelapor = satu(b.pelapor);
    return {
      id: b.id,
      kode: kodeQc(b.id),
      judul: b.judul,
      deskripsi: b.deskripsi,
      kategori: dalam(KATEGORI_QC, b.kategori, "bug"),
      prioritas: dalam(PRIORITAS_QC, b.prioritas, "sedang"),
      status: dalam(STATUS_QC, b.status, "baru"),
      urlHalaman: b.url_halaman,
      infoPerangkat: keInfo(b.info_perangkat),
      lampiranUrl: b.lampiran_path ? (url.get(b.lampiran_path) ?? null) : null,
      catatanTim: b.catatan_tim,
      pelapor: { id: pelapor?.id ?? 0, nama: pelapor?.nama ?? "-", email: pelapor?.email ?? "" },
      ditanganiOleh: satu(b.penangan)?.nama ?? null,
      createdAt: b.created_at,
      updatedAt: b.updated_at,
      selesaiAt: b.selesai_at,
    };
  });
}

/** admin: semua laporan; selain admin: hanya milik pelaporId. 20 per halaman, terbaru dulu. */
export async function getDaftarLaporanQc(
  filter: FilterQc,
  lingkup: { semua: true } | { pelaporId: number },
): Promise<HalamanLaporanQc> {
  const supabase = await createClient();
  const pelaporId = "pelaporId" in lingkup ? lingkup.pelaporId : null;

  // Ringkasan per status (mengikuti filter kategori & lingkup, tidak mengikuti filter status).
  let qRingkas = supabase.from("t_laporan_qc").select("status");
  if (pelaporId !== null) qRingkas = qRingkas.eq("pelapor_id", pelaporId);
  if (filter.kategori) qRingkas = qRingkas.eq("kategori", filter.kategori);
  const { data: semuaStatus, error: errRingkas } = await qRingkas;
  if (errRingkas) throw errRingkas;
  const ringkasan: RingkasanStatusQc = { baru: 0, dikerjakan: 0, selesai: 0, ditolak: 0 };
  for (const r of semuaStatus ?? []) if (r.status in ringkasan) ringkasan[r.status as StatusQc] += 1;

  const ambil = async (halaman: number) => {
    let q = supabase.from("t_laporan_qc").select(KOLOM, { count: "exact" });
    if (pelaporId !== null) q = q.eq("pelapor_id", pelaporId);
    if (filter.kategori) q = q.eq("kategori", filter.kategori);
    if (filter.status) q = q.eq("status", filter.status);
    const dari = (halaman - 1) * PER_HALAMAN;
    return q.order("created_at", { ascending: false }).order("id", { ascending: false }).range(dari, dari + PER_HALAMAN - 1);
  };

  let halaman = Math.max(1, Math.floor(filter.halaman));
  let res = await ambil(halaman);
  if (res.error?.code === "PGRST103") {
    halaman = 1;
    res = await ambil(1);
  }
  if (res.error) throw res.error;
  const total = res.count ?? 0;
  const totalHalaman = Math.max(1, Math.ceil(total / PER_HALAMAN));
  if (halaman > totalHalaman) {
    halaman = totalHalaman;
    res = await ambil(halaman);
    if (res.error) throw res.error;
  }
  return {
    laporan: await keLaporan((res.data ?? []) as unknown as BarisQc[]),
    total,
    halaman,
    totalHalaman,
    ringkasan,
  };
}

/** Satu laporan (setelah PATCH). null bila tidak terlihat oleh pemanggil. */
export async function getLaporanQc(id: number): Promise<LaporanQc | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("t_laporan_qc").select(KOLOM).eq("id", id).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const [laporan] = await keLaporan([data as unknown as BarisQc]);
  return laporan ?? null;
}

/** Semua laporan sesuai filter (tanpa paging) untuk ekspor CSV admin. */
export async function getSemuaLaporanQc(filter: Omit<FilterQc, "halaman">): Promise<LaporanQc[]> {
  const supabase = await createClient();
  let q = supabase.from("t_laporan_qc").select(KOLOM);
  if (filter.kategori) q = q.eq("kategori", filter.kategori);
  if (filter.status) q = q.eq("status", filter.status);
  const { data, error } = await q.order("created_at", { ascending: false }).limit(5000);
  if (error) throw error;
  const baris = (data ?? []) as unknown as BarisQc[];
  // Ekspor tidak butuh signed URL (kedaluwarsa 1 jam) — cukup tandai ada/tidaknya screenshot.
  return baris.map((b) => {
    const pelapor = satu(b.pelapor);
    return {
      id: b.id,
      kode: kodeQc(b.id),
      judul: b.judul,
      deskripsi: b.deskripsi,
      kategori: dalam(KATEGORI_QC, b.kategori, "bug"),
      prioritas: dalam(PRIORITAS_QC, b.prioritas, "sedang"),
      status: dalam(STATUS_QC, b.status, "baru"),
      urlHalaman: b.url_halaman,
      infoPerangkat: keInfo(b.info_perangkat),
      lampiranUrl: b.lampiran_path ? "ada" : null,
      catatanTim: b.catatan_tim,
      pelapor: { id: pelapor?.id ?? 0, nama: pelapor?.nama ?? "-", email: pelapor?.email ?? "" },
      ditanganiOleh: satu(b.penangan)?.nama ?? null,
      createdAt: b.created_at,
      updatedAt: b.updated_at,
      selesaiAt: b.selesai_at,
    };
  });
}

export type HasilBuatQc = { status: "ok"; id: number } | { status: "bukan_penguji" };

/** Buat laporan lewat RPC sesi (cek penguji di DB), lalu unggah screenshot bila ada. */
export async function buatLaporanQc(
  pelaporId: number,
  data: {
    judul: string;
    deskripsi: string;
    kategori: KategoriQc;
    prioritas: PrioritasQc;
    urlHalaman: string;
    infoPerangkat: InfoPerangkat | null;
  },
  lampiran: { isi: ArrayBuffer; tipe: string } | null,
): Promise<HasilBuatQc> {
  const supabase = await createClient();
  const { data: id, error } = await supabase.rpc("fn_buat_laporan_qc", {
    p_judul: data.judul,
    p_deskripsi: data.deskripsi,
    p_kategori: data.kategori,
    p_prioritas: data.prioritas,
    p_url: data.urlHalaman,
    p_info: data.infoPerangkat as unknown as Json,
  });
  if (error) {
    if (error.message.includes("BUKAN_PENGUJI")) return { status: "bukan_penguji" };
    throw error;
  }
  if (lampiran) {
    const ekstensi = lampiran.tipe === "image/png" ? "png" : lampiran.tipe === "image/webp" ? "webp" : "jpg";
    const path = `${pelaporId}/${id}.${ekstensi}`;
    const admin = createAdminClient();
    const { error: errUnggah } = await admin.storage
      .from(BUCKET_QC)
      .upload(path, lampiran.isi, { contentType: lampiran.tipe, upsert: true });
    if (errUnggah) {
      // Laporan tetap tersimpan; screenshot gagal tidak menggagalkan laporan.
      console.error("[qc] unggah screenshot", errUnggah.message);
    } else {
      const { error: errSimpan } = await admin.from("t_laporan_qc").update({ lampiran_path: path }).eq("id", id);
      if (errSimpan) console.error("[qc] simpan path screenshot", errSimpan.message);
    }
  }
  return { status: "ok", id };
}

export async function ubahLaporanQc(
  id: number,
  data: { status?: StatusQc; prioritas?: PrioritasQc; catatanTim?: string },
): Promise<"ok" | "tidak_ditemukan"> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("fn_ubah_laporan_qc", {
    p_id: id,
    p_status: data.status ?? null,
    p_prioritas: data.prioritas ?? null,
    p_catatan: data.catatanTim ?? null,
  });
  if (error) {
    if (error.message.includes("TIDAK_DITEMUKAN")) return "tidak_ditemukan";
    throw error;
  }
  return "ok";
}

/** admin only */
export async function getDaftarPenguji(): Promise<Penguji[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("fn_daftar_penguji");
  if (error) throw error;
  return (data ?? []).map((p) => ({
    id: p.id,
    nama: p.nama,
    email: p.email,
    peran: p.peran === "admin" ? "admin" : "mahasiswa",
    jumlahLaporan: p.jumlah_laporan,
  }));
}

/** admin: tandai/lepas penguji. null = email belum terdaftar. */
export async function aturPenguji(email: string, penguji: boolean): Promise<Penguji | null> {
  const supabase = await createClient();
  const { data: id, error } = await supabase.rpc("fn_atur_penguji", { p_email: email, p_penguji: penguji });
  if (error) throw error;
  if (id === null || id === undefined) return null;
  if (!penguji) return null;
  return (await getDaftarPenguji()).find((p) => p.id === id) ?? null;
}

/** Baris CSV (RFC 4180, pemisah koma, BOM agar Excel membaca UTF-8). */
export function keCsv(laporan: LaporanQc[]): string {
  const sel = (v: string | number | null | undefined) => {
    const s = v === null || v === undefined ? "" : String(v);
    // Cegah formula injection saat dibuka di Excel/Sheets.
    const aman = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
    return `"${aman.replace(/"/g, '""')}"`;
  };
  const kepala = ["Kode", "Tanggal", "Pelapor", "Email", "Kategori", "Prioritas", "Status", "Judul", "Deskripsi", "Halaman", "Lebar layar", "Screenshot", "Catatan tim", "Ditangani", "Selesai"];
  const baris = laporan.map((l) =>
    [
      l.kode,
      l.createdAt,
      l.pelapor.nama,
      l.pelapor.email,
      KATEGORI_QC[l.kategori],
      PRIORITAS_QC[l.prioritas],
      STATUS_QC[l.status],
      l.judul,
      l.deskripsi,
      l.urlHalaman,
      l.infoPerangkat?.lebarLayar ?? "",
      l.lampiranUrl ? "ada" : "",
      l.catatanTim,
      l.ditanganiOleh,
      l.selesaiAt,
    ]
      .map(sel)
      .join(","),
  );
  return "﻿" + [kepala.map(sel).join(","), ...baris].join("\r\n");
}

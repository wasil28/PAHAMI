// Filter Laporan QC di URL (?status=&kategori=&halaman=) agar bisa dibagikan antar-anggota tim.
import { KATEGORI_QC, STATUS_QC, type KategoriQc, type StatusQc } from "@/lib/qc/tipe";

export type FilterUrlQc = { status?: StatusQc; kategori?: KategoriQc; halaman: number };

export const RUTE_QC_ADMIN = "/admin/laporan-qc";
export const RUTE_QC_SAYA = "/laporan-qc";
export const RUTE_QC_EKSPOR = "/api/qc/ekspor";

type SearchParams = Record<string, string | string[] | undefined>;

const ambil = (sp: SearchParams, k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined);

/** Nilai tak dikenal diabaikan (URL lama/ketikan manual tidak membuat halaman error). */
export function bacaFilterQc(sp: SearchParams): FilterUrlQc {
  const status = ambil(sp, "status");
  const kategori = ambil(sp, "kategori");
  const halaman = Number.parseInt(ambil(sp, "halaman") ?? "", 10);
  return {
    status: status && Object.hasOwn(STATUS_QC, status) ? (status as StatusQc) : undefined,
    kategori: kategori && Object.hasOwn(KATEGORI_QC, kategori) ? (kategori as KategoriQc) : undefined,
    halaman: Number.isFinite(halaman) && halaman > 0 ? halaman : 1,
  };
}

/** Nilai default (tanpa filter, halaman 1) dibuang agar URL tetap pendek. */
export function hrefQc(rute: string, { status, kategori, halaman }: Partial<FilterUrlQc>): string {
  const sp = new URLSearchParams();
  if (status) sp.set("status", status);
  if (kategori) sp.set("kategori", kategori);
  if (halaman && halaman > 1) sp.set("halaman", String(halaman));
  const s = sp.toString();
  return s ? `${rute}?${s}` : rute;
}

export function hrefEksporQc({ status, kategori }: Partial<FilterUrlQc>): string {
  const sp = new URLSearchParams({ status: status ?? "", kategori: kategori ?? "" });
  return `${RUTE_QC_EKSPOR}?${sp.toString()}`;
}

// Helper klien untuk form auth: POST JSON ke /api/auth/* dengan batas waktu 10 detik
// (ui-ux §6: respons > 10 detik dianggap gagal koneksi → MSG-G01).

import type { ErrorApi } from "@/lib/api/respon";

const BATAS_WAKTU_MS = 10_000;

export type HasilKirim<T> =
  | { jenis: "ok"; data: T }
  | { jenis: "gagal"; status: number; error: ErrorApi }
  | { jenis: "jaringan" };

export async function kirimJson<T>(url: string, body: unknown): Promise<HasilKirim<T>> {
  const pengendali = new AbortController();
  const waktu = setTimeout(() => pengendali.abort(), BATAS_WAKTU_MS);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: pengendali.signal,
    });
    const json = (await res.json().catch(() => null)) as { data?: T; error?: ErrorApi } | null;
    if (res.ok && json && "data" in json) return { jenis: "ok", data: json.data as T };
    if (json?.error) return { jenis: "gagal", status: res.status, error: json.error };
    return { jenis: "jaringan" };
  } catch {
    return { jenis: "jaringan" };
  } finally {
    clearTimeout(waktu);
  }
}

/** Kolom yang ditandai server (gagalValidasi menaruh `detail.field`). */
export function kolomDariError(error: ErrorApi): string | null {
  const detail = error.detail as { field?: unknown } | undefined;
  return typeof detail?.field === "string" && detail.field ? detail.field : null;
}

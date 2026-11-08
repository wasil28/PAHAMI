// Pemanggil API JSON untuk form profil (klien). Menyeragamkan bentuk respons
// { data } | { error: { kode, pesan, detail? } } (Panduan §3.6) dan gangguan jaringan (MSG-G01).

import type { ErrorApi } from "@/lib/api/respon";

export type HasilKirim<T> = { ok: true; data: T } | { ok: false; error: ErrorApi | null };

function isErrorApi(x: unknown): x is { error: ErrorApi } {
  if (typeof x !== "object" || x === null || !("error" in x)) return false;
  const e = (x as { error: unknown }).error;
  return typeof e === "object" && e !== null && "pesan" in e && "kode" in e;
}

/** error = null berarti gangguan koneksi / respons tak terbaca → tampilkan MSG-G01. */
export async function kirimJson<T>(url: string, method: "PATCH" | "POST", body: unknown): Promise<HasilKirim<T>> {
  try {
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const json: unknown = await res.json().catch(() => null);
    if (res.ok && typeof json === "object" && json !== null && "data" in json) return { ok: true, data: (json as { data: T }).data };
    return { ok: false, error: isErrorApi(json) ? json.error : null };
  } catch {
    return { ok: false, error: null };
  }
}

/** Nama kolom dari detail error API (`{ field }`), untuk menaruh pesan di bawah input yang tepat. */
export function kolomError(error: ErrorApi): string | undefined {
  const d = error.detail;
  if (typeof d === "object" && d !== null && "field" in d && typeof d.field === "string") return d.field;
  return undefined;
}

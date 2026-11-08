// Pemanggil API dari Client Component. Membaca format respons seragam
// { data } / { error: { kode, pesan } } (lib/api/respon.ts). Galat jaringan → kode JARINGAN.

export type HasilApi<T> =
  | { ok: true; status: number; data: T }
  | { ok: false; status: number; kode: string; pesan: string | null };

export async function ambilApi<T>(url: string, init?: RequestInit): Promise<HasilApi<T>> {
  let res: Response;
  try {
    res = await fetch(url, {
      ...init,
      headers: { "Content-Type": "application/json", ...init?.headers },
    });
  } catch {
    return { ok: false, status: 0, kode: "JARINGAN", pesan: null };
  }
  const body: unknown = await res.json().catch(() => null);
  if (res.ok && body && typeof body === "object" && "data" in body) {
    return { ok: true, status: res.status, data: (body as { data: T }).data };
  }
  const error =
    body && typeof body === "object" && "error" in body
      ? (body as { error: { kode?: string; pesan?: string } }).error
      : null;
  return { ok: false, status: res.status, kode: error?.kode ?? "SERVER_ERROR", pesan: error?.pesan ?? null };
}

/** Jeda polling (202 "sedang dibuat", KEPUTUSAN A7). */
export const JEDA_POLLING_MS = 3_000;
/** Berhenti menunggu setelah sewa klaim habis (210 dtk) — lebih dari itu dianggap gagal. */
export const BATAS_TUNGGU_MS = 210_000;

export function tunggu(ms: number): Promise<void> {
  return new Promise((selesai) => setTimeout(selesai, ms));
}

export type HasilTunggu<T> = { jenis: "siap"; data: T } | { jenis: "gagal"; kode: string } | { jenis: "batal" };

/**
 * Panggil API pembuat-sekali (ringkasan/soal) sampai siap: 202 → tunggu & ulangi (KEPUTUSAN A7),
 * hingga BATAS_TUNGGU_MS. `masihAktif` false (komponen dilepas) → berhenti tanpa hasil.
 */
export async function tungguSampaiSiap<T>(
  panggil: () => Promise<HasilApi<unknown>>,
  cocok: (d: unknown) => d is T,
  masihAktif: () => boolean,
): Promise<HasilTunggu<T>> {
  const mulai = Date.now();
  for (;;) {
    const r = await panggil();
    if (!masihAktif()) return { jenis: "batal" };
    if (r.ok && cocok(r.data)) return { jenis: "siap", data: r.data };
    if (!r.ok) return { jenis: "gagal", kode: r.kode };
    if (Date.now() - mulai >= BATAS_TUNGGU_MS) return { jenis: "gagal", kode: "BATAS_WAKTU" };
    await tunggu(JEDA_POLLING_MS);
    if (!masihAktif()) return { jenis: "batal" };
  }
}

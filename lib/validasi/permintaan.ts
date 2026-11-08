// Helper validasi untuk Route Handler (server). Dipisah dari common.ts karena memakai
// next/server — jangan diimpor dari Client Component. Alur: wajibLoginApi → cek pemilik → parseBody.

import type { NextResponse } from "next/server";
import type { z } from "zod";
import { gagal, gagalValidasi, type ErrorApi } from "@/lib/api/respon";
import { PESAN } from "@/lib/pesan";

export type HasilParse<T> = { data: T; error?: undefined } | { data?: undefined; error: NextResponse<{ error: ErrorApi }> };

/**
 * Baca body JSON lalu validasi.
 *   const hasil = await parseBody(req, skemaUbahJudul);
 *   if (hasil.error) return hasil.error;
 */
export async function parseBody<S extends z.ZodType>(
  req: Request,
  skema: S,
): Promise<HasilParse<z.output<S>>> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return { error: gagal(400, "INPUT_TIDAK_VALID", PESAN["MSG-V06"]) };
  }
  const hasil = await skema.safeParseAsync(body);
  if (!hasil.success) return { error: gagalValidasi(hasil.error) };
  return { data: hasil.data };
}

/** URLSearchParams → objek; nilai kosong dibuang supaya default skema berlaku. */
export function searchParamsKeObjek(sp: URLSearchParams): Record<string, string> {
  const obj: Record<string, string> = {};
  sp.forEach((nilai, kunci) => {
    if (nilai.trim() !== "") obj[kunci] = nilai;
  });
  return obj;
}

/** Validasi query string: parseSearchParams(req.url, skemaDaftarPenggunaQuery). */
export function parseSearchParams<S extends z.ZodType>(
  url: string | URL | URLSearchParams,
  skema: S,
): HasilParse<z.output<S>> {
  const sp = url instanceof URLSearchParams ? url : new URL(url).searchParams;
  const hasil = skema.safeParse(searchParamsKeObjek(sp));
  if (!hasil.success) return { error: gagalValidasi(hasil.error) };
  return { data: hasil.data };
}

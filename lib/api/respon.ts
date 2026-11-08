import { NextResponse } from "next/server";
import type { ZodError } from "zod";

// Format respons seragam (Panduan Standar §3.6):
//   berhasil → { data }      gagal → { error: { kode, pesan } }

export type KodeError =
  | "BELUM_LOGIN"
  | "AKUN_NONAKTIF"
  | "TIDAK_BERHAK"
  | "TIDAK_DITEMUKAN"
  | "INPUT_TIDAK_VALID"
  | "KONFLIK"
  | "FILE_TERLALU_BESAR"
  | "KUOTA_PENUH"
  | "AI_GAGAL"
  | "SERVER_ERROR"
  | (string & {});

export interface ErrorApi {
  kode: KodeError;
  pesan: string;
  detail?: unknown;
}

export function ok<T>(data: T, status = 200): NextResponse<{ data: T }> {
  return NextResponse.json({ data }, { status });
}

export function gagal(
  status: number,
  kode: KodeError,
  pesan: string,
  detail?: unknown,
): NextResponse<{ error: ErrorApi }> {
  return NextResponse.json({ error: { kode, pesan, ...(detail ? { detail } : {}) } }, { status });
}

/** 400 dari hasil validasi Zod — pesan diambil dari isu pertama (pesan Zod sudah berbahasa Indonesia). */
export function gagalValidasi(err: ZodError): NextResponse<{ error: ErrorApi }> {
  const pertama = err.issues[0];
  return gagal(400, "INPUT_TIDAK_VALID", pertama?.message ?? "Data yang dikirim tidak valid.", {
    field: pertama?.path.join("."),
  });
}

/** 500 dengan pesan umum; detail teknis hanya ke log server (Panduan §3.7). */
export function gagalServer(konteks: string, err: unknown): NextResponse<{ error: ErrorApi }> {
  console.error(`[${konteks}]`, err);
  return gagal(500, "SERVER_ERROR", "Terjadi kesalahan di server. Coba lagi beberapa saat lagi.");
}

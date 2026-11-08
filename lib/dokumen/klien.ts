// Pemanggil API dokumen dari browser. Galat jaringan → MSG-G01; galat server → pesan dari API
// (sudah berupa teks MSG, lib/api/respon.ts).

import { PESAN } from "@/lib/pesan";
import type { StatusDokumenApi } from "./tipe";

export type HasilApi<T> = { ok: true; data: T; status: number } | { ok: false; status: number; kode: string; pesan: string };

export async function panggilApi<T>(url: string, init?: RequestInit): Promise<HasilApi<T>> {
  let res: Response;
  try {
    res = await fetch(url, {
      ...init,
      headers: { "Content-Type": "application/json", ...init?.headers },
      cache: "no-store",
    });
  } catch {
    return { ok: false, status: 0, kode: "JARINGAN", pesan: PESAN["MSG-G01"] };
  }
  const json: unknown = await res.json().catch(() => null);
  if (res.ok && json && typeof json === "object" && "data" in json) {
    return { ok: true, data: (json as { data: T }).data, status: res.status };
  }
  const err = json && typeof json === "object" && "error" in json ? (json as { error: { kode?: string; pesan?: string } }).error : null;
  return { ok: false, status: res.status, kode: err?.kode ?? "SERVER_ERROR", pesan: err?.pesan ?? PESAN["MSG-G01"] };
}

export const ambilStatusDokumen = (id: number) => panggilApi<StatusDokumenApi>(`/api/dokumen/${id}`);

/** Picu (ulang) pengolahan BP-04 — idempoten di server. */
export const picuProsesDokumen = (id: number) =>
  panggilApi<{ id: number; status: StatusDokumenApi["status"]; tahap: StatusDokumenApi["tahap"] }>(`/api/dokumen/${id}/proses`, {
    method: "POST",
  });

export const hapusDokumen = (id: number) => panggilApi<{ id: number }>(`/api/dokumen/${id}`, { method: "DELETE" });

export const ubahJudulDokumen = (id: number, judul: string) =>
  panggilApi<{ id: number; judul: string }>(`/api/dokumen/${id}`, { method: "PATCH", body: JSON.stringify({ judul }) });

export interface HasilBuatDokumen {
  dokumen: { id: number; kode: string; judul: string; status: string; tahap: string };
  unggah: { signedUrl: string; token: string; path: string; bucket: string };
}

// Bantuan bersama Route Handler admin: IP pelaku (audit log_system) & pemetaan GagalData → HTTP.
import "server-only";
import { gagal, gagalServer } from "@/lib/api/respon";
import type { GagalData } from "@/lib/data/admin";
import { PESAN, pesan } from "@/lib/pesan";

/** IP admin untuk kolom log_system.ip_address (dipotong 50 karakter di DB). */
export function ipPermintaan(req: Request): string | null {
  const xff = req.headers.get("x-forwarded-for");
  return xff?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || null;
}

export function responsGagal(konteks: string, g: GagalData) {
  switch (g.jenis) {
    case "tidak_berhak":
      // BR-24 ditegakkan trigger DB (BR24_DIRI_SENDIRI / BR24_ADMIN_LAIN).
      if (g.kode?.startsWith("BR24")) return gagal(403, "TARGET_ADMIN", PESAN["MSG-M05"]);
      return gagal(403, "TIDAK_BERHAK", PESAN["MSG-G05"]);
    case "tidak_ditemukan":
      return gagal(404, "TIDAK_DITEMUKAN", pesan("MSG-G04", { objek: "Pengguna" }));
    case "konflik":
      return gagal(409, "KONFLIK_VERSI", PESAN["MSG-K05"]);
    case "input":
      return gagal(400, "INPUT_TIDAK_VALID", PESAN["MSG-V06"]);
    case "server":
      return gagalServer(konteks, g.error);
  }
}

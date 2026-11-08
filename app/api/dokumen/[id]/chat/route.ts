import type { NextRequest } from "next/server";
import { wajibLoginApi } from "@/lib/auth/sesi";
import { gagal, gagalServer, ok } from "@/lib/api/respon";
import { RIWAYAT_MAKS_PESAN } from "@/lib/ai/konfigurasi";
import { buatTenggat } from "@/lib/ai/tenggat";
import { TENGGAT_CHAT_MS } from "@/lib/config";
import { prosesTanya } from "@/lib/chat/proses-tanya";
import type { HalamanRiwayatChat } from "@/lib/chat/tipe";
import {
  ambilAmbangRelevansi,
  ambilDokumenSiap,
  ambilKuotaTanya,
  ambilRiwayatChat,
  ambilRiwayatKonteks,
  ambilTopikDokumen,
  klaimKuotaTanya,
} from "@/lib/data/chat";
import { pesan } from "@/lib/pesan";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { skemaKirimPertanyaan, skemaRiwayatChatQuery } from "@/lib/validasi";
import { parseIdParam } from "@/lib/validasi/common";
import { parseBody, parseSearchParams } from "@/lib/validasi/permintaan";

// FT-06 Tanya AI. POST = kirim pertanyaan (jawaban streaming, protokol di lib/chat/protokol.ts);
// GET = riwayat per dokumen dengan kursor (BR-19).

/**
 * Pertanyaan mandiri + embedding + jawaban streaming dibatasi tenggat internal TENGGAT_CHAT_MS
 * (75 dtk); sisa ±15 dtk menjamin fn_simpan_chat/pelepasan kuota sempat jalan.
 */
export const maxDuration = 90;

const tidakDitemukan = () => gagal(404, "TIDAK_DITEMUKAN", pesan("MSG-G04", { objek: "Dokumen" }));

export async function POST(req: NextRequest, ctx: RouteContext<"/api/dokumen/[id]/chat">) {
  // Tenggat dihitung sejak permintaan masuk (maxDuration juga dihitung dari sini).
  const tenggat = buatTenggat(TENGGAT_CHAT_MS);
  let diserahkan = false; // setelah prosesTanya dipanggil, prosesTanya yang menghentikan tenggat
  try {
    const pengguna = await wajibLoginApi("mahasiswa");
    if (pengguna instanceof Response) return pengguna;

    const dokumenId = parseIdParam((await ctx.params).id);
    if (dokumenId === null) return tidakDitemukan();

    const db = await createClient();
    // BR-06/07: bukan milik atau belum siap → 404 (jangan bocorkan keberadaan).
    const dokumen = await ambilDokumenSiap(db, pengguna.id, dokumenId);
    if (!dokumen) return tidakDitemukan();

    const body = await parseBody(req, skemaKirimPertanyaan); // BR-18 (MSG-C01)
    if (body.error) return body.error;
    const { pertanyaan, topikId } = body.data;

    const topik = topikId ? await ambilTopikDokumen(db, dokumenId, topikId) : null;
    if (topikId && !topik) return gagal(404, "TIDAK_DITEMUKAN", pesan("MSG-G04", { objek: "Topik" }));

    const [ambang, riwayat] = await Promise.all([
      ambilAmbangRelevansi(db),
      ambilRiwayatKonteks(db, pengguna.id, dokumenId, RIWAYAT_MAKS_PESAN),
    ]);

    // BR-17: kuota DIPESAN atomik (kunci per pengguna) sebelum AI dipanggil, supaya dua permintaan
    // paralel tidak sama-sama lolos. Langkah terakhir sebelum prosesTanya: sejak titik ini
    // prosesTanya menjamin reservasi dipakai (jawaban tersimpan) atau dilepas (AI gagal).
    const admin = createAdminClient();
    const { reservasiId, kuota } = await klaimKuotaTanya(admin, pengguna.id);
    if (reservasiId === null) return gagal(429, "KUOTA_PENUH", pesan("MSG-C02", { maks: kuota.maks }), { kuota });

    diserahkan = true;
    return await prosesTanya({
      userId: pengguna.id,
      dokumenId,
      topik,
      pertanyaan,
      riwayat,
      ambang,
      admin,
      signal: req.signal,
      reservasiId,
      tenggat,
    });
  } catch (e) {
    return gagalServer("POST /api/dokumen/[id]/chat", e);
  } finally {
    if (!diserahkan) tenggat.hentikan();
  }
}

export async function GET(req: NextRequest, ctx: RouteContext<"/api/dokumen/[id]/chat">) {
  const pengguna = await wajibLoginApi("mahasiswa");
  if (pengguna instanceof Response) return pengguna;

  const dokumenId = parseIdParam((await ctx.params).id);
  if (dokumenId === null) return tidakDitemukan();

  const query = parseSearchParams(req.nextUrl.searchParams, skemaRiwayatChatQuery);
  if (query.error) return query.error;

  try {
    const db = await createClient();
    const dokumen = await ambilDokumenSiap(db, pengguna.id, dokumenId);
    if (!dokumen) return tidakDitemukan();

    const halamanPertama = !query.data.sebelum;
    const [riwayat, kuota] = await Promise.all([
      ambilRiwayatChat(db, pengguna.id, dokumenId, query.data),
      halamanPertama ? ambilKuotaTanya(db) : Promise.resolve(null),
    ]);
    const data: HalamanRiwayatChat = { ...riwayat, kuota };
    return ok(data);
  } catch (e) {
    return gagalServer("GET /api/dokumen/[id]/chat", e);
  }
}

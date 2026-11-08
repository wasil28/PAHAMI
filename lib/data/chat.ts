import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { DEFAULT_AMBANG_RELEVANSI } from "@/lib/config";
import type { PesanRiwayat, Rujukan } from "@/lib/ai/tipe";
import type { KuotaTanyaAi, PesanChat } from "@/lib/chat/tipe";
import type { Database, FungsiArgs, Json } from "@/types/database";

// Akses data Tanya AI (FT-06). Klien sesi (RLS) untuk membaca milik pengguna; klien service role
// hanya untuk fn_simpan_chat (BR-27, A1) setelah kepemilikan diperiksa di route.

export type KlienDb = SupabaseClient<Database>;

/** Ukuran halaman riwayat (FT-06 ui-ux K-04: 30 pesan terakhir, sisanya saat menggulir ke atas). */
export const BATAS_RIWAYAT_CHAT = 30;

/** Dokumen milik pengguna yang berstatus siap (BR-06, BR-07); selain itu null → 404. */
export async function ambilDokumenSiap(
  db: KlienDb,
  userId: number,
  dokumenId: number,
): Promise<{ id: number; judul: string } | null> {
  const { data, error } = await db
    .from("t_dokumen")
    .select("id, judul, status")
    .eq("id", dokumenId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(`Gagal membaca dokumen: ${error.message}`);
  if (!data || data.status !== "siap") return null;
  return { id: data.id, judul: data.judul };
}

/** Topik yang sedang dibuka harus milik dokumen yang sama (fn_simpan_chat juga memeriksanya). */
export async function ambilTopikDokumen(
  db: KlienDb,
  dokumenId: number,
  topikId: number,
): Promise<{ id: number; judul: string } | null> {
  const { data, error } = await db
    .from("t_topik")
    .select("id, judul")
    .eq("id", topikId)
    .eq("dokumen_id", dokumenId)
    .maybeSingle();
  if (error) throw new Error(`Gagal membaca topik: ${error.message}`);
  return data ? { id: data.id, judul: data.judul } : null;
}

/**
 * Sisa kuota tanya hari ini (BR-17; hanya log is_sukses yang dihitung, A1). Klien sesi → tanpa
 * userId; service role → userId wajib (fn_pengguna_sasaran).
 */
export async function ambilKuotaTanya(db: KlienDb, userId?: number): Promise<KuotaTanyaAi> {
  const { data, error } = await db.rpc("fn_sisa_kuota_tanya", userId ? { p_user_id: userId } : {});
  if (error) throw new Error(`Gagal membaca kuota tanya: ${error.message}`);
  const baris = data?.[0];
  if (!baris) throw new Error("fn_sisa_kuota_tanya tidak mengembalikan baris.");
  return { terpakai: baris.terpakai, maks: baris.maks, sisa: baris.sisa, resetAt: baris.reset_at };
}

/**
 * BR-17: pesan satu kuota secara atomik SEBELUM AI dipanggil (fn_klaim_kuota_tanya, service role,
 * kunci advisory per pengguna). `reservasiId` null = kuota habis. Reservasi WAJIB dipakai
 * (simpanChat dengan reservasiId) atau dilepas (lepasKuotaTanya) di setiap jalur keluar.
 */
export async function klaimKuotaTanya(
  admin: KlienDb,
  userId: number,
): Promise<{ reservasiId: number | null; kuota: KuotaTanyaAi }> {
  const { data, error } = await admin.rpc("fn_klaim_kuota_tanya", { p_user_id: userId });
  if (error) throw new Error(`Gagal memesan kuota tanya: ${error.message}`);
  const b = data?.[0];
  if (!b) throw new Error("fn_klaim_kuota_tanya tidak mengembalikan baris.");
  return {
    reservasiId: b.reservasi_id,
    kuota: { terpakai: b.terpakai, maks: b.maks, sisa: b.sisa, resetAt: b.reset_at },
  };
}

/** Lepas reservasi kuota (AI gagal / tidak tersimpan → tidak dihitung, A1). Tidak pernah melempar. */
export async function lepasKuotaTanya(admin: KlienDb, reservasiId: number): Promise<void> {
  try {
    const { error } = await admin.rpc("fn_lepas_kuota_tanya", { p_reservasi_id: reservasiId });
    // Gagal melepas bukan bencana: reservasi kedaluwarsa sendiri setelah 3 menit.
    if (error) console.error("[chat] lepas reservasi kuota gagal:", error.message);
  } catch (e) {
    console.error("[chat] lepas reservasi kuota gagal:", e instanceof Error ? e.message : e);
  }
}

/** Ambang relevansi dari pengaturan (A6); gagal/kosong → DEFAULT_AMBANG_RELEVANSI (BR-16). */
export async function ambilAmbangRelevansi(db: KlienDb): Promise<number> {
  const { data, error } = await db.rpc("fn_pengaturan_numeric", { p_kode: "ambang_relevansi" });
  if (error || typeof data !== "number" || !Number.isFinite(data)) {
    if (error) console.error("[chat] ambang_relevansi tidak terbaca, memakai default:", error.message);
    return DEFAULT_AMBANG_RELEVANSI;
  }
  return data;
}

/** Beberapa pesan terakhir dokumen ini (urut lama → baru) untuk pertanyaan mandiri (BP-07 langkah 3). */
export async function ambilRiwayatKonteks(
  db: KlienDb,
  userId: number,
  dokumenId: number,
  jumlah: number,
): Promise<PesanRiwayat[]> {
  const { data, error } = await db
    .from("t_chat")
    .select("peran, isi")
    .eq("user_id", userId)
    .eq("dokumen_id", dokumenId)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(jumlah);
  if (error) throw new Error(`Gagal membaca riwayat chat: ${error.message}`);
  return (data ?? [])
    .reverse()
    .map((b): PesanRiwayat => ({ peran: b.peran === "ai" ? "ai" : "user", isi: b.isi }));
}

export interface KursorRiwayat {
  sebelum?: string;
  sebelumId?: number;
}

/**
 * Satu halaman riwayat per dokumen per mahasiswa (BR-19, F-15) — tidak difilter topik (ui-ux §3.1).
 * Kursor = (created_at, id) pesan teratas yang sudah tampil; hasil urut lama → baru.
 */
export async function ambilRiwayatChat(
  db: KlienDb,
  userId: number,
  dokumenId: number,
  kursor: KursorRiwayat,
  batas = BATAS_RIWAYAT_CHAT,
): Promise<{ pesan: PesanChat[]; adaSebelumnya: boolean }> {
  let q = db
    .from("t_chat")
    .select("id, peran, isi, is_tidak_ditemukan, is_terputus, topik_id, created_at, t_chat_rujukan(halaman, kutipan)")
    .eq("user_id", userId)
    .eq("dokumen_id", dokumenId);
  if (kursor.sebelum) {
    const t = `"${kursor.sebelum}"`; // dikutip: nilai ISO memuat ":" "." "+"
    q = kursor.sebelumId
      ? q.or(`created_at.lt.${t},and(created_at.eq.${t},id.lt.${kursor.sebelumId})`)
      : q.lt("created_at", kursor.sebelum);
  }
  const { data, error } = await q
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(batas + 1);
  if (error) throw new Error(`Gagal membaca riwayat chat: ${error.message}`);

  const baris = data ?? [];
  const adaSebelumnya = baris.length > batas;
  const pesan = baris
    .slice(0, batas)
    .reverse()
    .map(
      (b): PesanChat => ({
        id: b.id,
        peran: b.peran === "ai" ? "ai" : "user",
        isi: b.isi,
        isTidakDitemukan: b.is_tidak_ditemukan,
        isTerputus: b.is_terputus,
        topikId: b.topik_id,
        createdAt: b.created_at,
        rujukan: (b.t_chat_rujukan ?? []).map((r) => ({ halaman: r.halaman, kutipan: r.kutipan })),
      }),
    );
  return { pesan, adaSebelumnya };
}

export interface InputSimpanChat {
  userId: number;
  dokumenId: number;
  topikId: number | null;
  pertanyaan: string;
  jawaban: string;
  isTidakDitemukan: boolean;
  skorRelevansi: number | null;
  rujukan: readonly Rujukan[];
  /** Hasil keBarisLog(gabungPemakaian(...)) — satu baris log tanya_ai (A1). */
  log: { model: string; token_masuk: number; token_keluar: number; biaya_rp: number; durasi_ms: number };
  isTerputus: boolean;
  /** Reservasi dari klaimKuotaTanya — dipakai (dihapus) di transaksi yang sama dengan log sukses. */
  reservasiId: number | null;
}

/**
 * fn_simpan_chat (service role): pertanyaan + jawaban + rujukan + 1 log tanya_ai, atomik.
 * Rujukan tanpa chunk_id dibuang karena RPC mewajibkan chunk milik dokumen (BR-30).
 */
export async function simpanChat(admin: KlienDb, input: InputSimpanChat): Promise<{ chatUserId: number; chatAiId: number }> {
  const rujukan = input.isTidakDitemukan
    ? []
    : input.rujukan
        .filter((r) => r.chunk_id !== null)
        .map((r) => ({ chunk_id: r.chunk_id, halaman: r.halaman, kutipan: r.kutipan }));
  // Tipe hasil gen types menandai argumen RPC wajib non-null, padahal p_topik_id & p_skor_relevansi
  // boleh NULL di SQL — cast terkendali di satu tempat ini.
  const args = {
    p_user_id: input.userId,
    p_dokumen_id: input.dokumenId,
    p_topik_id: input.topikId,
    p_pertanyaan: input.pertanyaan,
    p_jawaban: input.jawaban,
    p_is_tidak_ditemukan: input.isTidakDitemukan,
    p_skor_relevansi: input.skorRelevansi,
    p_rujukan: rujukan as unknown as Json,
    p_log: input.log as unknown as Json,
    p_is_terputus: input.isTerputus,
    p_reservasi_id: input.reservasiId,
  } as unknown as FungsiArgs<"fn_simpan_chat">;
  const { data, error } = await admin.rpc("fn_simpan_chat", args);
  if (error) throw new Error(`fn_simpan_chat gagal: ${error.message}`);
  const baris = data?.[0];
  if (!baris) throw new Error("fn_simpan_chat tidak mengembalikan id.");
  return { chatUserId: baris.chat_user_id, chatAiId: baris.chat_ai_id };
}

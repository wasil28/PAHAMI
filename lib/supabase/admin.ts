import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/**
 * Klien service role — MELEWATI RLS. Hanya untuk proses server yang memang bukan atas nama
 * pengguna: pengolahan dokumen (t_chunk), pencatatan log, dan Auth Admin (blokir akun, BR-23).
 * Selalu filter manual berdasarkan user_id yang sudah diverifikasi.
 */
export function createAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

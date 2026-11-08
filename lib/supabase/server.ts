import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/types/database";

/** Klien Supabase untuk Server Component, Route Handler, dan Server Action (memakai sesi pengguna + RLS). */
export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(daftar) {
          try {
            daftar.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Dipanggil dari Server Component (cookie read-only) — sesi sudah diperbarui di proxy.ts.
          }
        },
      },
    },
  );
}

"use client";
import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database";

/** Klien Supabase di browser — hanya untuk Auth & unggah ke Storage lewat signed URL. Data lewat API. */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

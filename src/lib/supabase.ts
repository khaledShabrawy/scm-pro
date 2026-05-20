/**
 * Supabase client for SCM Pro
 *
 * Environment variables (add to .env.local):
 *   NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
 *
 * If env vars are missing the client is null — app falls back to mock data.
 */
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

const url  = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key  = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** Typed Supabase client. `null` when env vars are not configured. */
export const supabase: SupabaseClient<Database> | null =
  url && key ? createClient<Database>(url, key) : null;

/** True when Supabase is configured and ready to use. */
export const isSupabaseReady = !!supabase;

import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Server-only Supabase client using the service-role key.
 *
 * Why this exists: NEXT_PUBLIC_SUPABASE_ANON_KEY is readable in the page
 * source, so anything granted to `anon` can be called directly over PostgREST
 * with no browser involved — skipping the honeypot, Turnstile, and the real
 * client IP. Routing the inquiry insert through the service role lets us
 * revoke the `anon` grant, so the server action becomes the only door in.
 *
 * SUPABASE_SERVICE_ROLE_KEY has no NEXT_PUBLIC_ prefix and must never get one:
 * it bypasses row-level security entirely. Import this from server code only.
 *
 * Returns null when unconfigured so callers can fall back rather than crash.
 */
export function createAdminClient(): SupabaseClient | null {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) return null;

  return createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

import { createClient } from "@supabase/supabase-js";

/**
 * Server-only Supabase client.
 *
 * The browser bundle necessarily ships whatever key it uses, so a key that can
 * write is public the moment the app loads. Keeping writes on the server lets
 * the database be closed to the anon key entirely.
 *
 * SUPABASE_SERVICE_ROLE_KEY has no NEXT_PUBLIC_ prefix on purpose — Next.js
 * only inlines prefixed variables, so this one cannot reach the client. It
 * falls back to the anon key so the app keeps working before the service key
 * is configured; once the database denies anon, the service key is required.
 */
const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!URL_ || !SERVICE_KEY) {
  throw new Error(
    "Missing Supabase configuration. Set NEXT_PUBLIC_SUPABASE_URL and either " +
    "SUPABASE_SERVICE_ROLE_KEY (preferred) or NEXT_PUBLIC_SUPABASE_ANON_KEY."
  );
}

export const supabaseServer = createClient(URL_, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

/** True once a real service key is configured, rather than the public fallback. */
export const usingServiceKey = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);

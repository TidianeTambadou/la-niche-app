import { createClient } from "@supabase/supabase-js";

/**
 * Supabase client. NEXT_PUBLIC_* env vars are baked into the client bundle at
 * build time, so they MUST be set in the build environment (Vercel project
 * settings → Environment Variables), not just at runtime.
 *
 * If absent at build time, we fall back to a placeholder so the build can
 * complete (e.g. when generating the static /_not-found page). Any actual auth
 * or data call will fail with a clear network error in that case — the warning
 * below should make the misconfiguration visible.
 */

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anon) {
  // eslint-disable-next-line no-console
  console.warn(
    "[la-niche] Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. " +
      "Set both in .env.local for dev and in Vercel project settings for production.",
  );
}

export const supabase = createClient(
  url ?? "https://placeholder.supabase.co",
  anon ?? "placeholder-anon-key",
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  },
);

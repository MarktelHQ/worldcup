import { createClient } from "@supabase/supabase-js";

// Server-only admin client (service role). Used exclusively inside API route handlers.
// The browser never receives this key — all DB access is mediated through /api routes.
export function supabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env vars (see .env.local.example)");
  return createClient(url, key, {
    auth: { persistSession: false },
    global: {
      // CRITICAL: Next.js patches global fetch and caches GET responses by default.
      // Supabase reads go through fetch, so a holdings query that first ran while a
      // collection was empty would keep returning that cached empty result even after
      // new stickers were saved — the data was in the DB, the read was just stale.
      // Forcing no-store makes every Supabase request hit the live database.
      fetch: (input: any, init?: any) => fetch(input, { ...init, cache: "no-store" }),
    },
  });
}

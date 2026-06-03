import { createClient } from "@supabase/supabase-js";

// Server-only admin client (service role). Used exclusively inside API route handlers.
// The browser never receives this key — all DB access is mediated through /api routes.
export function supabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env vars (see .env.local.example)");
  return createClient(url, key, { auth: { persistSession: false } });
}

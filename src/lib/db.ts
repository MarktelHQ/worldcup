import { supabaseAdmin } from "@/lib/supabaseServer";

export type ProfileRow = { id: string; group_id: string; username: string; owner_token: string; updated_at: string };

export async function getProfile(username: string): Promise<ProfileRow | null> {
  const db = supabaseAdmin();
  const { data } = await db
    .from("profiles")
    .select("id, group_id, username, owner_token, updated_at")
    .eq("username", username)
    .limit(1)
    .single();
  return (data as ProfileRow) ?? null;
}

// holdings map for a profile: sticker_id -> { count, reserved }
export async function holdingsFor(profileId: string) {
  const db = supabaseAdmin();
  const { data } = await db.from("holdings").select("sticker_id, count, reserved_for").eq("profile_id", profileId);
  const map = new Map<string, { count: number; reserved: boolean }>();
  (data ?? []).forEach((h) => map.set(h.sticker_id, { count: h.count, reserved: !!h.reserved_for }));
  return map;
}

// stats for the Shell header (progress + request badge)
export async function headerStats(username: string) {
  const { supabaseAdmin } = await import("@/lib/supabaseServer");
  const db = supabaseAdmin();
  const { count: total } = await db.from("stickers").select("*", { count: "exact", head: true });
  const me = await getProfile(username);
  if (!me) return { exists: false, have: 0, total: total ?? 0, spares: 0, badge: 0 };
  const { data: hs } = await db.from("holdings").select("count").eq("profile_id", me.id);
  const have = (hs ?? []).filter((h) => h.count >= 1).length;
  const spares = (hs ?? []).reduce((n, h) => n + (h.count >= 2 ? h.count - 1 : 0), 0);
  const { count: badge } = await db
    .from("requests").select("*", { count: "exact", head: true })
    .eq("to_profile", me.id).eq("status", "open");
  return { exists: true, have, total: total ?? 0, spares, badge: badge ?? 0 };
}

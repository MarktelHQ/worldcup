import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseServer";
import { getProfile } from "@/lib/db";

export const dynamic = "force-dynamic";

// Public read: a collection is viewable by anyone with the /u/<username> link,
// so it is ALWAYS resolved by the username in the URL. (Writes are the things
// that must prove ownership via the token — see /api/holding.)
export async function GET(_req: Request, { params }: { params: { username: string } }) {
  const profile = await getProfile(params.username);
  if (!profile) return NextResponse.json({ error: "no such collector" }, { status: 404 });

  const db = supabaseAdmin();
  const { data: holdings } = await db.from("holdings").select("sticker_id, count").eq("profile_id", profile.id);
  const map: Record<string, number> = {};
  (holdings ?? []).forEach((h) => (map[h.sticker_id] = h.count));

  return NextResponse.json({
    profile: { username: profile.username, group_id: profile.group_id, updated_at: profile.updated_at },
    holdings: map,
  });
}

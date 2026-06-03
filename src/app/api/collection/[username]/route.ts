import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseServer";

export async function GET(_req: Request, { params }: { params: { username: string } }) {
  const db = supabaseAdmin();
  const { data: profile } = await db
    .from("profiles")
    .select("id, username, group_id, updated_at")
    .eq("username", params.username)
    .limit(1)
    .single();
  if (!profile) return NextResponse.json({ error: "no such collector" }, { status: 404 });

  const { data: holdings } = await db.from("holdings").select("sticker_id, count").eq("profile_id", profile.id);
  const map: Record<string, number> = {};
  (holdings ?? []).forEach((h) => (map[h.sticker_id] = h.count));

  return NextResponse.json({
    profile: { username: profile.username, group_id: profile.group_id, updated_at: profile.updated_at },
    holdings: map,
  });
}

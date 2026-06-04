import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseServer";
import { getProfileByToken } from "@/lib/db";

export const dynamic = "force-dynamic";

// body: { username, sticker_id, count }  header: x-owner-token
// count 0 = need (delete row), 1 = got, 2+ = got + (count-1) spares
export async function POST(req: Request) {
  const token = req.headers.get("x-owner-token") || "";
  const { sticker_id, count } = await req.json().catch(() => ({}));
  if (!sticker_id || typeof count !== "number")
    return NextResponse.json({ error: "sticker_id, count required" }, { status: 400 });
  if (!token) return NextResponse.json({ error: "not your list" }, { status: 403 });

  // Identify the owner by their token — unique to one profile — so the write
  // ALWAYS lands on exactly the profile this person owns. No username ambiguity,
  // no dependence on which duplicate row a username lookup happens to pick.
  const profile = await getProfileByToken(token);
  if (!profile) return NextResponse.json({ error: "not your list" }, { status: 403 });

  const db = supabaseAdmin();
  const c = Math.max(0, Math.floor(count));
  // delete-then-insert (not upsert): works without relying on a
  // (profile_id, sticker_id) unique constraint, and we surface DB errors
  // instead of silently reporting success.
  const del = await db.from("holdings").delete().eq("profile_id", profile.id).eq("sticker_id", sticker_id);
  if (del.error) return NextResponse.json({ error: del.error.message }, { status: 500 });
  if (c >= 1) {
    const ins = await db.from("holdings").insert({ profile_id: profile.id, sticker_id, count: c });
    if (ins.error) return NextResponse.json({ error: ins.error.message }, { status: 500 });
  }
  await db.from("profiles").update({ updated_at: new Date().toISOString() }).eq("id", profile.id);
  return NextResponse.json({ ok: true, sticker_id, count: c });
}

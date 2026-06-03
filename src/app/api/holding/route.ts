import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseServer";

// body: { username, sticker_id, count }  header: x-owner-token
// count 0 = need (delete row), 1 = got, 2+ = got + (count-1) spares
export async function POST(req: Request) {
  const token = req.headers.get("x-owner-token") || "";
  const { username, sticker_id, count } = await req.json().catch(() => ({}));
  if (!username || !sticker_id || typeof count !== "number")
    return NextResponse.json({ error: "username, sticker_id, count required" }, { status: 400 });

  const db = supabaseAdmin();
  const { data: profile } = await db
    .from("profiles")
    .select("id, owner_token")
    .eq("username", username)
    .limit(1)
    .single();
  if (!profile) return NextResponse.json({ error: "no such collector" }, { status: 404 });
  if (!token || token !== profile.owner_token)
    return NextResponse.json({ error: "not your list" }, { status: 403 });

  const c = Math.max(0, Math.floor(count));
  if (c === 0) {
    await db.from("holdings").delete().eq("profile_id", profile.id).eq("sticker_id", sticker_id);
  } else {
    await db
      .from("holdings")
      .upsert({ profile_id: profile.id, sticker_id, count: c }, { onConflict: "profile_id,sticker_id" });
  }
  await db.from("profiles").update({ updated_at: new Date().toISOString() }).eq("id", profile.id);
  return NextResponse.json({ ok: true, sticker_id, count: c });
}

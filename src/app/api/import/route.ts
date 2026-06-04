import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseServer";
import { getProfileByToken } from "@/lib/db";

// body: { username, holdings: { stickerId: count } }  header: x-owner-token
export async function POST(req: Request) {
  const token = req.headers.get("x-owner-token") || "";
  const { holdings } = await req.json().catch(() => ({}));
  // Identify the owner by their token (unique to one profile), not the username.
  const me = await getProfileByToken(token);
  if (!me) return NextResponse.json({ error: "not authorised" }, { status: 403 });
  if (!holdings || typeof holdings !== "object") return NextResponse.json({ error: "holdings required" }, { status: 400 });

  const db = supabaseAdmin();
  await db.from("holdings").delete().eq("profile_id", me.id);
  const rows = Object.entries(holdings)
    .map(([sticker_id, count]) => ({ profile_id: me.id, sticker_id, count: Math.max(1, Number(count) || 0) }))
    .filter((r) => r.count >= 1);
  if (rows.length) {
    const ins = await db.from("holdings").insert(rows);
    if (ins.error) return NextResponse.json({ error: ins.error.message }, { status: 500 });
  }
  await db.from("profiles").update({ updated_at: new Date().toISOString() }).eq("id", me.id);
  return NextResponse.json({ ok: true, count: rows.length });
}

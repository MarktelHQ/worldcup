import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseServer";
import { getProfile } from "@/lib/db";

// body: { username, holdings: { stickerId: count } }  header: x-owner-token
export async function POST(req: Request) {
  const token = req.headers.get("x-owner-token") || "";
  const { username, holdings } = await req.json().catch(() => ({}));
  const me = await getProfile(username);
  if (!me || token !== me.owner_token) return NextResponse.json({ error: "not authorised" }, { status: 403 });
  if (!holdings || typeof holdings !== "object") return NextResponse.json({ error: "holdings required" }, { status: 400 });

  const db = supabaseAdmin();
  await db.from("holdings").delete().eq("profile_id", me.id);
  const rows = Object.entries(holdings)
    .map(([sticker_id, count]) => ({ profile_id: me.id, sticker_id, count: Math.max(1, Number(count) || 0) }))
    .filter((r) => r.count >= 1);
  if (rows.length) await db.from("holdings").insert(rows);
  await db.from("profiles").update({ updated_at: new Date().toISOString() }).eq("id", me.id);
  return NextResponse.json({ ok: true, count: rows.length });
}

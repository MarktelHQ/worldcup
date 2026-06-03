import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseServer";
import { getProfile } from "@/lib/db";

export async function POST(req: Request) {
  const token = req.headers.get("x-owner-token") || "";
  const { from_username, to_username, offered, wanted } = await req.json().catch(() => ({}));
  if (!from_username || !to_username) return NextResponse.json({ error: "from/to required" }, { status: 400 });

  const from = await getProfile(from_username);
  const to = await getProfile(to_username);
  if (!from || !to) return NextResponse.json({ error: "unknown collector" }, { status: 404 });
  if (token !== from.owner_token) return NextResponse.json({ error: "not your list" }, { status: 403 });
  if (from.group_id !== to.group_id) return NextResponse.json({ error: "different group" }, { status: 400 });

  const db = supabaseAdmin();
  const { data, error } = await db.from("requests").insert({
    group_id: from.group_id, from_profile: from.id, to_profile: to.id,
    offered: Array.isArray(offered) ? offered : [], wanted: Array.isArray(wanted) ? wanted : [], status: "open",
  }).select("id").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, id: data.id });
}

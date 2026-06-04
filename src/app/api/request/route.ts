import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseServer";
import { getProfileByToken } from "@/lib/db";

export async function POST(req: Request) {
  const token = req.headers.get("x-owner-token") || "";
  const { to_username, offered, wanted } = await req.json().catch(() => ({}));
  if (!to_username) return NextResponse.json({ error: "to required" }, { status: 400 });

  // The sender is identified by their token (their true profile). The recipient
  // is then resolved WITHIN the sender's group, so a shared username can't point
  // at the wrong person.
  const from = await getProfileByToken(token);
  if (!from) return NextResponse.json({ error: "not your list" }, { status: 403 });

  const db = supabaseAdmin();
  const { data: to } = await db
    .from("profiles")
    .select("id, group_id, username")
    .eq("username", to_username)
    .eq("group_id", from.group_id)
    .limit(1)
    .maybeSingle();
  if (!to) return NextResponse.json({ error: "unknown collector" }, { status: 404 });

  const { data, error } = await db.from("requests").insert({
    group_id: from.group_id, from_profile: from.id, to_profile: to.id,
    offered: Array.isArray(offered) ? offered : [], wanted: Array.isArray(wanted) ? wanted : [], status: "open",
  }).select("id").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, id: data.id });
}

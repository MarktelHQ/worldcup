import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseServer";
import { newOwnerToken } from "@/lib/tokens";

export async function POST(req: Request) {
  const { invite_code, username } = await req.json().catch(() => ({}));
  if (!invite_code || !username) return NextResponse.json({ error: "invite_code and username required" }, { status: 400 });
  const clean = String(username).trim().replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 24);
  if (!clean) return NextResponse.json({ error: "invalid username" }, { status: 400 });

  const db = supabaseAdmin();
  const code = String(invite_code).trim().toUpperCase().replace(/\s+/g, "");
  const { data: group } = await db.from("groups").select("id").eq("invite_code", code).single();
  if (!group) return NextResponse.json({ error: "unknown invite code" }, { status: 404 });

  const owner_token = newOwnerToken();

  // Username is the app's global identity key (URLs are /u/<username>, and every
  // lookup keys on username alone). Reject a name already used in ANY group, so
  // we never create two profiles that the rest of the app can't tell apart.
  const { data: existing } = await db
    .from("profiles")
    .select("id")
    .eq("username", clean)
    .limit(1)
    .maybeSingle();
  if (existing)
    return NextResponse.json({ error: "that username is already taken" }, { status: 409 });

  const { data, error } = await db
    .from("profiles")
    .insert({ group_id: group.id, username: clean, owner_token })
    .select("id, username, group_id")
    .single();

  if (error) {
    if (String(error.message).includes("duplicate"))
      return NextResponse.json({ error: "that username is already taken" }, { status: 409 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  // owner_token returned ONCE — the client stores it as the edit key
  return NextResponse.json({ username: data.username, owner_token, group_id: data.group_id });
}

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseServer";
import { newInviteCode } from "@/lib/tokens";

export async function POST(req: Request) {
  const { name } = await req.json().catch(() => ({}));
  if (!name || typeof name !== "string") return NextResponse.json({ error: "name required" }, { status: 400 });
  const db = supabaseAdmin();
  // retry once on the (astronomically unlikely) invite-code collision
  for (let i = 0; i < 3; i++) {
    const invite_code = newInviteCode();
    const { data, error } = await db.from("groups").insert({ name, invite_code }).select().single();
    if (!error) return NextResponse.json({ id: data.id, name: data.name, invite_code });
    if (!String(error.message).includes("duplicate")) return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ error: "could not allocate invite code" }, { status: 500 });
}

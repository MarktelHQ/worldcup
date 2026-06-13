import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseServer";
import { getProfile } from "@/lib/db";

export async function GET(_req: Request, { params }: { params: { username: string } }) {
  const me = await getProfile(params.username);
  if (!me) return NextResponse.json({ error: "no such collector" }, { status: 404 });
  const db = supabaseAdmin();

  const { data: names } = await db.from("profiles").select("id, username").eq("group_id", me.group_id);
  const nameOf = new Map((names ?? []).map((n) => [n.id, n.username]));

  const { data: reqs } = await db
    .from("requests").select("*")
    .or(`from_profile.eq.${me.id},to_profile.eq.${me.id}`)
    .order("created_at", { ascending: false });

  // Cancelled requests stay in the DB but are hidden from the inbox — no need to
  // clutter the list with cancellations.
  const visible = (reqs ?? []).filter((r) => r.status !== "cancelled");

  const incoming = visible.filter((r) => r.to_profile === me.id)
    .map((r) => ({ ...r, with: nameOf.get(r.from_profile), direction: "in" }));
  const outgoing = visible.filter((r) => r.from_profile === me.id)
    .map((r) => ({ ...r, with: nameOf.get(r.to_profile), direction: "out" }));

  return NextResponse.json({ incoming, outgoing, openIncoming: incoming.filter((r) => r.status === "open").length });
}

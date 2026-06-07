import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseServer";
import { getProfile } from "@/lib/db";

export const dynamic = "force-dynamic";

type Row = { profile_id: string; sticker_id: string; count: number; reserved_for: string | null };

export async function GET(_req: Request, { params }: { params: { username: string } }) {
  const me = await getProfile(params.username);
  if (!me) return NextResponse.json({ error: "no such collector" }, { status: 404 });
  const db = supabaseAdmin();

  const { data: members } = await db
    .from("profiles").select("id, username, updated_at").eq("group_id", me.group_id);
  const ids = (members ?? []).map((m) => m.id);

  // Fetch ALL holdings for the group, PAGED. Supabase caps a single select at
  // ~1000 rows; a group's combined holdings easily exceed that (one collector can
  // hold ~750+), which silently truncated the data and made the matcher offer
  // cards people already owned. Paging guarantees every row is loaded.
  const rows: Row[] = [];
  const PAGE = 1000;
  for (let from = 0; from < 500000; from += PAGE) {
    const { data, error } = await db
      .from("holdings")
      .select("profile_id, sticker_id, count, reserved_for")
      .in("profile_id", ids)
      .range(from, from + PAGE - 1);
    if (error || !data) break;
    rows.push(...(data as Row[]));
    if (data.length < PAGE) break;
  }

  // per profile: set of held ids, and set of available spares (count>=2, not reserved)
  const held = new Map<string, Set<string>>();
  const spares = new Map<string, Set<string>>();
  ids.forEach((id) => { held.set(id, new Set()); spares.set(id, new Set()); });
  rows.forEach((r) => {
    held.get(r.profile_id)?.add(r.sticker_id);
    if (r.count >= 2 && !r.reserved_for) spares.get(r.profile_id)?.add(r.sticker_id);
  });

  const mySpares = spares.get(me.id)!;
  const myHeld = held.get(me.id)!;

  const out = (members ?? [])
    .filter((m) => m.id !== me.id)
    .map((m) => {
      const theirHeld = held.get(m.id)!;
      const theirSpares = spares.get(m.id)!;
      const youGive = [...mySpares].filter((s) => !theirHeld.has(s)).sort();
      const theyGive = [...theirSpares].filter((s) => !myHeld.has(s)).sort();
      return { username: m.username, updated_at: m.updated_at, youGive, theyGive, mutual: Math.min(youGive.length, theyGive.length) };
    })
    .sort((a, b) => b.mutual - a.mutual || b.theyGive.length - a.theyGive.length);

  return NextResponse.json({ members: out }, {
    headers: { "Cache-Control": "no-store, max-age=0", "CDN-Cache-Control": "no-store", "Vercel-CDN-Cache-Control": "no-store" },
  });
}

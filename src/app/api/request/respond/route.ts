import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseServer";
import { getProfileByToken } from "@/lib/db";

async function decHolding(db: any, profileId: string, stickerId: string) {
  const { data } = await db.from("holdings").select("count").eq("profile_id", profileId).eq("sticker_id", stickerId).single();
  if (!data) return;
  const next = data.count - 1;
  if (next < 1) await db.from("holdings").delete().eq("profile_id", profileId).eq("sticker_id", stickerId);
  else await db.from("holdings").update({ count: next, reserved_for: null }).eq("profile_id", profileId).eq("sticker_id", stickerId);
}
async function ensureGot(db: any, profileId: string, stickerId: string) {
  const { data } = await db.from("holdings").select("count").eq("profile_id", profileId).eq("sticker_id", stickerId).single();
  if (!data) await db.from("holdings").insert({ profile_id: profileId, sticker_id: stickerId, count: 1 });
  else await db.from("holdings").update({ reserved_for: null }).eq("profile_id", profileId).eq("sticker_id", stickerId);
}
async function reserve(db: any, profileId: string, stickerIds: string[], forId: string) {
  for (const s of stickerIds)
    await db.from("holdings").update({ reserved_for: forId }).eq("profile_id", profileId).eq("sticker_id", s);
}

export async function POST(req: Request) {
  const token = req.headers.get("x-owner-token") || "";
  const { request_id, action } = await req.json().catch(() => ({}));
  if (!request_id || !action) return NextResponse.json({ error: "request_id, action required" }, { status: 400 });

  const me = await getProfileByToken(token);
  if (!me) return NextResponse.json({ error: "not authorised" }, { status: 403 });

  const db = supabaseAdmin();
  const { data: r } = await db.from("requests").select("*").eq("id", request_id).single();
  if (!r) return NextResponse.json({ error: "no such request" }, { status: 404 });

  const isRecipient = r.to_profile === me.id;
  const isSender = r.from_profile === me.id;

  if (action === "accept") {
    if (!isRecipient) return NextResponse.json({ error: "only the recipient can accept" }, { status: 403 });
    await reserve(db, r.from_profile, r.offered, r.to_profile); // sender's offered doubles reserved for recipient
    await reserve(db, r.to_profile, r.wanted, r.from_profile);  // recipient's wanted doubles reserved for sender
    await db.from("requests").update({ status: "accepted" }).eq("id", r.id);
    return NextResponse.json({ ok: true, status: "accepted" });
  }
  if (action === "decline") {
    if (!isRecipient) return NextResponse.json({ error: "only the recipient can decline" }, { status: 403 });
    await db.from("requests").update({ status: "declined" }).eq("id", r.id);
    return NextResponse.json({ ok: true, status: "declined" });
  }
  if (action === "done") {
    if (!isRecipient && !isSender) return NextResponse.json({ error: "not your swap" }, { status: 403 });
    // sender gives offered -> recipient; recipient gives wanted -> sender
    for (const s of r.offered) { await decHolding(db, r.from_profile, s); await ensureGot(db, r.to_profile, s); }
    for (const s of r.wanted) { await decHolding(db, r.to_profile, s); await ensureGot(db, r.from_profile, s); }
    await db.from("requests").update({ status: "done" }).eq("id", r.id);
    return NextResponse.json({ ok: true, status: "done" });
  }
  return NextResponse.json({ error: "unknown action" }, { status: 400 });
}

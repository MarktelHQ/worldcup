import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseServer";
import { getProfileByToken } from "@/lib/db";

async function decHolding(db: any, profileId: string, stickerId: string) {
  const { data } = await db.from("holdings").select("count").eq("profile_id", profileId).eq("sticker_id", stickerId).maybeSingle();
  if (!data) return;
  // A swap only ever gives away a SPARE. Never let it punch a hole in the album:
  // if there's only one copy, keep it and just release any reservation.
  if (data.count <= 1) {
    await db.from("holdings").update({ reserved_for: null }).eq("profile_id", profileId).eq("sticker_id", stickerId);
    return;
  }
  await db.from("holdings").update({ count: data.count - 1, reserved_for: null }).eq("profile_id", profileId).eq("sticker_id", stickerId);
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
async function unreserve(db: any, profileId: string, stickerIds: string[]) {
  if (!stickerIds?.length) return;
  await db.from("holdings").update({ reserved_for: null }).eq("profile_id", profileId).in("sticker_id", stickerIds);
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
    if (r.status !== "open") return NextResponse.json({ ok: true, status: r.status }); // idempotent: already handled
    await reserve(db, r.from_profile, r.offered, r.to_profile); // sender's offered doubles reserved for recipient
    await reserve(db, r.to_profile, r.wanted, r.from_profile);  // recipient's wanted doubles reserved for sender
    await db.from("requests").update({ status: "accepted" }).eq("id", r.id);
    return NextResponse.json({ ok: true, status: "accepted" });
  }
  if (action === "decline") {
    if (!isRecipient) return NextResponse.json({ error: "only the recipient can decline" }, { status: 403 });
    if (r.status !== "open") return NextResponse.json({ ok: true, status: r.status });
    await db.from("requests").update({ status: "declined" }).eq("id", r.id);
    return NextResponse.json({ ok: true, status: "declined" });
  }
  if (action === "done") {
    if (!isRecipient && !isSender) return NextResponse.json({ error: "not your swap" }, { status: 403 });
    // CRITICAL: only transfer when currently accepted. This makes "done" idempotent —
    // if both parties (or a double-tap) mark it done, the second call is a no-op
    // instead of moving the stickers a second time and deleting them.
    if (r.status !== "accepted") return NextResponse.json({ ok: true, status: r.status });
    // sender gives offered -> recipient; recipient gives wanted -> sender
    for (const s of r.offered) { await decHolding(db, r.from_profile, s); await ensureGot(db, r.to_profile, s); }
    for (const s of r.wanted) { await decHolding(db, r.to_profile, s); await ensureGot(db, r.from_profile, s); }
    await db.from("requests").update({ status: "done" }).eq("id", r.id);
    return NextResponse.json({ ok: true, status: "done" });
  }
  if (action === "cancel") {
    // An open request can be cancelled by its sender; an accepted one by either
    // party (plans change). Cancelling MUST release any reservations made on
    // accept, or those spares stay locked out of other trades forever.
    if (r.status === "open" && !isSender) return NextResponse.json({ error: "only the sender can cancel" }, { status: 403 });
    if (r.status === "accepted" && !isSender && !isRecipient) return NextResponse.json({ error: "not your swap" }, { status: 403 });
    if (r.status !== "open" && r.status !== "accepted") return NextResponse.json({ error: "already settled" }, { status: 400 });
    await unreserve(db, r.from_profile, r.offered);
    await unreserve(db, r.to_profile, r.wanted);
    await db.from("requests").update({ status: "cancelled" }).eq("id", r.id);
    return NextResponse.json({ ok: true, status: "cancelled" });
  }
  return NextResponse.json({ error: "unknown action" }, { status: 400 });
}

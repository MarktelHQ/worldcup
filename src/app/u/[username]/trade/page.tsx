import Shell from "@/components/Shell";
import TradeClient from "@/components/TradeClient";
import { supabaseAdmin } from "@/lib/supabaseServer";
import { getProfile, headerStats } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function TradePage({ params }: { params: { username: string } }) {
  const h = await headerStats(params.username);
  const me = await getProfile(params.username);
  const db = supabaseAdmin();
  const { data: stickers } = await db.from("stickers").select("id");
  const allIds = (stickers ?? []).map((s) => s.id);

  let spares: string[] = [], needs: string[] = [];
  if (me) {
    const { data: hs } = await db.from("holdings").select("sticker_id, count").eq("profile_id", me.id);
    const held = new Set((hs ?? []).map((x) => x.sticker_id));
    spares = (hs ?? []).filter((x) => x.count >= 2).map((x) => x.sticker_id).sort();
    needs = allIds.filter((id) => !held.has(id)).sort();
  }
  return (
    <Shell username={params.username} have={h.have} total={h.total} spares={h.spares} requestBadge={h.badge}>
      <TradeClient username={params.username} spares={spares} needs={needs} />
    </Shell>
  );
}

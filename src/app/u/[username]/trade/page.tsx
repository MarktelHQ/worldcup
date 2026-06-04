import Shell from "@/components/Shell";
import TradeClient from "@/components/TradeClient";
import { supabaseAdmin } from "@/lib/supabaseServer";
import { headerStats } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function TradePage({ params }: { params: { username: string } }) {
  const h = await headerStats(params.username);
  const db = supabaseAdmin();
  const { data: stickers } = await db.from("stickers").select("id");
  const allIds = (stickers ?? []).map((s) => s.id);
  return (
    <Shell username={params.username} have={h.have} total={h.total} spares={h.spares} requestBadge={h.badge}>
      <TradeClient username={params.username} allIds={allIds} />
    </Shell>
  );
}

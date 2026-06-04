import Shell from "@/components/Shell";
import MarketClient from "@/components/MarketClient";
import { headerStats } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function MarketPage({ params }: { params: { username: string } }) {
  const h = await headerStats(params.username);
  return (
    <Shell username={params.username} have={h.have} total={h.total} spares={h.spares} requestBadge={h.badge}>
      <MarketClient username={params.username} />
    </Shell>
  );
}

import Shell from "@/components/Shell";
import RequestsClient from "@/components/RequestsClient";
import { headerStats } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function RequestsPage({ params }: { params: { username: string } }) {
  const h = await headerStats(params.username);
  return (
    <Shell username={params.username} have={h.have} total={h.total} spares={h.spares} requestBadge={h.badge}>
      <RequestsClient username={params.username} />
    </Shell>
  );
}

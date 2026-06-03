import Shell from "@/components/Shell";
import SettingsClient from "@/components/SettingsClient";
import { headerStats } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function SettingsPage({ params }: { params: { username: string } }) {
  const h = await headerStats(params.username);
  return (
    <Shell username={params.username} have={h.have} total={h.total} spares={h.spares} requestBadge={h.badge}>
      <SettingsClient username={params.username} have={h.have} total={h.total} spares={h.spares} />
    </Shell>
  );
}

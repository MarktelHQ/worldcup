import Shell from "@/components/Shell";
import SettingsClient from "@/components/SettingsClient";
import { headerStats, getProfile } from "@/lib/db";
import { supabaseAdmin } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

export default async function SettingsPage({ params }: { params: { username: string } }) {
  const h = await headerStats(params.username);
  const me = await getProfile(params.username);
  let inviteCode = "";
  if (me) {
    const { data: g } = await supabaseAdmin().from("groups").select("invite_code").eq("id", me.group_id).single();
    inviteCode = g?.invite_code ?? "";
  }
  return (
    <Shell username={params.username} have={h.have} total={h.total} spares={h.spares} requestBadge={h.badge}>
      <SettingsClient username={params.username} have={h.have} total={h.total} spares={h.spares} inviteCode={inviteCode} />
    </Shell>
  );
}

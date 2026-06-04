import { supabaseAdmin } from "@/lib/supabaseServer";
import { groupBySection, type Sticker, type Holdings } from "@/lib/types";
import Shell from "@/components/Shell";
import CollectionClient from "@/components/CollectionClient";

export const dynamic = "force-dynamic";

export default async function CollectionPage({ params }: { params: { username: string } }) {
  const db = supabaseAdmin();

  const { data: profile } = await db
    .from("profiles")
    .select("id, username")
    .eq("username", params.username)
    .limit(1)
    .single();

  const { data: stickers } = await db
    .from("stickers")
    .select("*")
    .order("section_order", { ascending: true })
    .order("num_in_section", { ascending: true });

  const sections = groupBySection((stickers ?? []) as Sticker[]);
  const total = stickers?.length ?? 0;

  let holdings: Holdings = {};
  if (profile) {
    const { data: hs } = await db.from("holdings").select("sticker_id, count").eq("profile_id", profile.id);
    (hs ?? []).forEach((h) => (holdings[h.sticker_id] = h.count));
  }

  const have = Object.values(holdings).filter((c) => c >= 1).length;
  const spares = Object.values(holdings).reduce((n, c) => n + (c >= 2 ? c - 1 : 0), 0);

  if (!profile) {
    return (
      <Shell username={params.username} have={0} total={total} spares={0}>
        <div className="stub">
          <h2>No collector named @{params.username}</h2>
          <p>Ask for the group invite link, or create your list from the home page.</p>
          <p style={{ marginTop: 12 }}><a className="muted" href="/">&larr; Home</a></p>
        </div>
      </Shell>
    );
  }

  return (
    <Shell username={params.username} have={have} total={total} spares={spares}>
      <CollectionClient username={params.username} sections={sections} initialHoldings={holdings} />
    </Shell>
  );
}

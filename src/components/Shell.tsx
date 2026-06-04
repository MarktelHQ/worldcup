"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n, LangSwitch, useStats } from "@/components/Providers";

const TABS = [
  { slug: "", key: "collection" },
  { slug: "trade", key: "trade" },
  { slug: "market", key: "market" },
  { slug: "requests", key: "requests" },
  { slug: "settings", key: "settings" },
];

export default function Shell({
  username, have, total, spares, requestBadge = 0, children,
}: {
  username: string; have: number; total: number; spares: number; requestBadge?: number; children: React.ReactNode;
}) {
  const path = usePathname();
  const { t } = useI18n();
  const { stats } = useStats();
  const liveHave = stats?.have ?? have;
  const liveSpares = stats?.spares ?? spares;
  const liveTotal = stats?.total ?? total;
  const base = `/u/${username}`;
  const pct = liveTotal ? Math.round((liveHave / liveTotal) * 100) : 0;
  return (
    <div className="wrap">
      <header className="masthead">
        <div className="top">
          <span>Panini &rsquo;26 &middot; Group Edition</span>
          <span>FIFA World Cup 2026</span>
        </div>
        <div className="logo-row">
          <div className="logo">Sticker<span>Swap.</span></div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <LangSwitch />
            <div className="you">YOU &middot; <b>@{username}</b></div>
          </div>
        </div>
      </header>

      <div className="ticker">
        <div className="big-figure"><i>{liveHave}</i><small>/{liveTotal}</small></div>
        <div className="meter">
          <div className="meter-bar"><div className="meter-fill" style={{ width: `${pct}%` }} /></div>
          <div className="meter-tags">
            <span>{pct}% {t("ticker.complete")}</span>
            <span>{liveSpares} {t("ticker.spares")}</span>
            <span>{liveTotal - liveHave} {t("ticker.needed")}</span>
          </div>
        </div>
      </div>

      <nav className="tabs">
        {TABS.map((tab) => {
          const href = tab.slug ? `${base}/${tab.slug}` : base;
          const active = path === href;
          return (
            <Link key={tab.key} href={href} aria-current={active ? "page" : undefined}>
              {t(`nav.${tab.key}`)}
              <span className="n">{t(`nav.${tab.key}.n`)}</span>
              {tab.key === "requests" && requestBadge > 0 && <span className="badge">{requestBadge}</span>}
            </Link>
          );
        })}
      </nav>

      {children}
    </div>
  );
}

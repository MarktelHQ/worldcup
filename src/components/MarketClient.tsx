"use client";
import { useEffect, useState } from "react";
import { useI18n } from "@/components/Providers";

type Member = { username: string; updated_at: string; youGive: string[]; theyGive: string[]; mutual: number };

export default function MarketClient({ username }: { username: string }) {
  const { t } = useI18n();
  const [members, setMembers] = useState<Member[] | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [sent, setSent] = useState<Record<string, boolean>>({});
  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(null), 2000); };

  useEffect(() => {
    fetch(`/api/market/${username}`).then((r) => r.json()).then((d) => setMembers(d.members ?? [])).catch(() => setMembers([]));
  }, [username]);

  async function request(m: Member) {
    const token = localStorage.getItem(`swap:token:${username}`);
    if (!token) return flash(t("set.notOwner"));
    await fetch("/api/request", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-owner-token": token },
      body: JSON.stringify({ from_username: username, to_username: m.username, offered: m.youGive, wanted: m.theyGive }),
    });
    setSent((s) => ({ ...s, [m.username]: true }));
    flash(t("market.requested", { who: "@" + m.username }));
  }
  function draft(m: Member) {
    const msg = `@${m.username} — you need ${m.youGive.slice(0, 8).join(", ")}${m.youGive.length > 8 ? "…" : ""}; I've got them spare. I need ${m.theyGive.slice(0, 8).join(", ")}${m.theyGive.length > 8 ? "…" : ""}. Swap?`;
    navigator.clipboard?.writeText(msg); flash(t("trade.copied"));
  }

  return (
    <>
      <div className="sheet-title">{t("market.title")}</div>
      <div className="sheet-sub">{t("market.sub")}</div>

      {members === null && <p className="muted" style={{ padding: 14 }}>{t("stub.soon")}</p>}
      {members !== null && members.length === 0 && <div className="stub"><p>{t("market.none")}</p></div>}

      {(members ?? []).map((m) => (
        <div className="ledger" key={m.username}>
          <div className="lh">
            <div className="ava">{m.username[0]?.toUpperCase()}</div>
            <div className="who">{m.username}<em>@{m.username}</em></div>
            <div className={`mutual${m.mutual === 0 ? " none" : ""}`}>
              {m.mutual > 0 ? t("market.mutual", { n: m.mutual }) : t("market.noMutual")}
            </div>
          </div>
          <div className="lbody">
            <div className="give">
              <div className="dir">→ {t("market.youGive", { who: "@" + m.username })} ({m.youGive.length})</div>
              <div className="chips">
                {m.youGive.length ? m.youGive.map((c) => <span key={c} className="chip hot">{c}</span>) : <span className="muted">—</span>}
              </div>
            </div>
            <div className="get">
              <div className="dir">← {t("market.theyGive", { who: "@" + m.username })} ({m.theyGive.length})</div>
              <div className="chips">
                {m.theyGive.length ? m.theyGive.map((c) => <span key={c} className="chip">{c}</span>) : <span className="muted">{t("market.nothingNeed")}</span>}
              </div>
            </div>
          </div>
          <div className="lfoot">
            <button className="btn" disabled={sent[m.username] || m.youGive.length + m.theyGive.length === 0} onClick={() => request(m)}>
              {sent[m.username] ? "✓" : t("market.request")}
            </button>
            <span className="copybar" onClick={() => draft(m)}>⧉ {t("market.draft")}</span>
          </div>
        </div>
      ))}
      {toast && <div className="toast show">{toast}</div>}
    </>
  );
}

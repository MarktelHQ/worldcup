"use client";
import { useEffect, useState } from "react";
import { useI18n } from "@/components/Providers";

type Member = { username: string; updated_at: string; youGive: string[]; theyGive: string[]; needs: string[]; mutual: number };

export default function MarketClient({ username }: { username: string }) {
  const { t } = useI18n();
  const [members, setMembers] = useState<Member[] | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [sent, setSent] = useState<Record<string, boolean>>({});
  const [showNeeds, setShowNeeds] = useState<Record<string, boolean>>({});
  // Per member, which sticker ids are EXCLUDED from the trade (default: none —
  // everything starts selected, tap a chip to leave it out).
  const [off, setOff] = useState<Record<string, Set<string>>>({});
  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(null), 2000); };
  const copy = (text: string, msg: string) => navigator.clipboard?.writeText(text).then(() => flash(msg)).catch(() => {});

  useEffect(() => {
    const load = () => fetch(`/api/market/${username}`, { cache: "no-store" }).then((r) => r.json()).then((d) => setMembers(d.members ?? [])).catch(() => setMembers([]));
    load();
    window.addEventListener("focus", load);
    return () => window.removeEventListener("focus", load);
  }, [username]);

  const isOff = (who: string, id: string) => off[who]?.has(id) ?? false;
  function toggle(who: string, id: string) {
    setOff((o) => {
      const next = new Set(o[who] ?? []);
      next.has(id) ? next.delete(id) : next.add(id);
      return { ...o, [who]: next };
    });
  }
  function setAll(who: string, ids: string[], selected: boolean) {
    setOff((o) => {
      const next = new Set(o[who] ?? []);
      ids.forEach((id) => (selected ? next.delete(id) : next.add(id)));
      return { ...o, [who]: next };
    });
  }
  const picked = (who: string, ids: string[]) => ids.filter((id) => !isOff(who, id));

  async function request(m: Member) {
    const token = localStorage.getItem(`swap:token:${username}`);
    if (!token) return flash(t("set.notOwner"));
    const offered = picked(m.username, m.youGive);
    const wanted = picked(m.username, m.theyGive);
    if (offered.length + wanted.length === 0) return flash(t("market.pickSome"));
    const res = await fetch("/api/request", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-owner-token": token },
      body: JSON.stringify({ from_username: username, to_username: m.username, offered, wanted }),
    }).catch(() => null);
    if (!res || !res.ok) return flash(t("market.failed"));
    setSent((s) => ({ ...s, [m.username]: true }));
    flash(t("market.requested", { who: "@" + m.username }));
  }

  return (
    <>
      <div className="sheet-title">{t("market.title")}</div>
      <div className="sheet-sub">{t("market.sub")}</div>

      {members === null && <p className="muted" style={{ padding: 14 }}>{t("stub.soon")}</p>}
      {members !== null && members.length === 0 && <div className="stub"><p>{t("market.none")}</p></div>}

      {(members ?? []).map((m) => {
        const give = picked(m.username, m.youGive);
        const get = picked(m.username, m.theyGive);
        return (
          <div className="ledger" key={m.username}>
            <div className="lh">
              <div className="ava">{m.username[0]?.toUpperCase()}</div>
              <div className="who">{m.username}<em>@{m.username}</em></div>
              <div className={`mutual${m.mutual === 0 ? " none" : ""}`}>
                {m.mutual > 0 ? t("market.mutual", { n: m.mutual }) : t("market.noMutual")}
              </div>
            </div>
            {(m.youGive.length > 0 || m.theyGive.length > 0) && (
              <div className="pickhint">{t("market.pickHint")}</div>
            )}
            <div className="lbody">
              <div className="give">
                <div className="dir">
                  → {t("market.youGive", { who: "@" + m.username })} ({give.length}/{m.youGive.length})
                  {m.youGive.length > 1 && (
                    <span className="selall">
                      <a onClick={() => setAll(m.username, m.youGive, true)}>{t("market.all")}</a>{" · "}
                      <a onClick={() => setAll(m.username, m.youGive, false)}>{t("market.none2")}</a>
                    </span>
                  )}
                </div>
                <div className="chips">
                  {m.youGive.length ? m.youGive.map((c) => (
                    <span key={c} className={`chip hot pick${isOff(m.username, c) ? " offc" : ""}`} onClick={() => toggle(m.username, c)}>{c}</span>
                  )) : <span className="muted">—</span>}
                </div>
              </div>
              <div className="get">
                <div className="dir">
                  ← {t("market.theyGive", { who: "@" + m.username })} ({get.length}/{m.theyGive.length})
                  {m.theyGive.length > 1 && (
                    <span className="selall">
                      <a onClick={() => setAll(m.username, m.theyGive, true)}>{t("market.all")}</a>{" · "}
                      <a onClick={() => setAll(m.username, m.theyGive, false)}>{t("market.none2")}</a>
                    </span>
                  )}
                </div>
                <div className="chips">
                  {m.theyGive.length ? m.theyGive.map((c) => (
                    <span key={c} className={`chip pick${isOff(m.username, c) ? " offc" : ""}`} onClick={() => toggle(m.username, c)}>{c}</span>
                  )) : <span className="muted">{t("market.nothingNeed")}</span>}
                </div>
              </div>
            </div>
            <div className="lfoot">
              <button className="btn" disabled={sent[m.username] || give.length + get.length === 0} onClick={() => request(m)}>
                {sent[m.username] ? "✓" : `${t("market.request")} (${give.length}↔${get.length})`}
              </button>
            </div>
            {m.needs.length > 0 && (
              <div className="watch">
                <div className="watch-h" onClick={() => setShowNeeds((s) => ({ ...s, [m.username]: !s[m.username] }))}>
                  <span>👀 {t("market.stillNeeds", { who: "@" + m.username, n: m.needs.length })}</span>
                  <span className="watch-tog">{showNeeds[m.username] ? "−" : "+"}</span>
                </div>
                {showNeeds[m.username] && (
                  <>
                    <div className="watch-sub">{t("market.watchHint")}</div>
                    <div className="chips watch-chips">
                      {m.needs.map((c) => <span key={c} className="chip ghostc">{c}</span>)}
                    </div>
                    <span className="copybar" onClick={() => copy(m.needs.join(", "), t("trade.copied"))}>⧉ {t("market.copyNeeds")}</span>
                  </>
                )}
              </div>
            )}
          </div>
        );
      })}
      {toast && <div className="toast show">{toast}</div>}
    </>
  );
}

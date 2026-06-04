"use client";
import { useEffect, useRef, useState } from "react";
import type { Section, Holdings } from "@/lib/types";
import { useI18n, useStats } from "@/components/Providers";
import { COUNTRY_DE } from "@/lib/i18n";

type Filter = "all" | "todo" | "spares" | "done" | "spec";

export default function CollectionClient({
  username, sections, initialHoldings,
}: { username: string; sections: Section[]; initialHoldings: Holdings }) {
  const { t, locale } = useI18n();
  const [holdings, setHoldings] = useState<Holdings>(initialHoldings);
  const [open, setOpen] = useState<string | null>(sections[0]?.code ?? null);
  const [filter, setFilter] = useState<Filter>("all");
  const [token, setToken] = useState<string | null>(null);
  const [pressing, setPressing] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => { setToken(localStorage.getItem(`swap:token:${username}`)); }, [username]);
  const isOwner = !!token;

  // Re-seed from the database every time this screen opens, so switching tabs
  // never shows a stale cached snapshot. Skip once the user starts editing so
  // we don't clobber their optimistic taps.
  const touched = useRef(false);
  useEffect(() => {
    let alive = true;
    fetch(`/api/collection/${encodeURIComponent(username)}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => { if (alive && !touched.current && d && d.holdings) setHoldings(d.holdings); })
      .catch(() => {});
    return () => { alive = false; };
  }, [username]);

  const { setStats } = useStats();
  useEffect(() => {
    let have = 0, sp = 0, total = 0;
    sections.forEach((sec) => sec.stickers.forEach((s) => { total++; const c = holdings[s.id] || 0; if (c >= 1) have++; if (c >= 2) sp += c - 1; }));
    setStats({ have, spares: sp, total });
  }, [holdings, sections, setStats]);
  useEffect(() => () => setStats(null), [setStats]);
  const secName = (s: Section) => (locale === "de" ? COUNTRY_DE[s.code] ?? s.name : s.name);

  const stat = (sec: Section) => {
    let have = 0, spDistinct = 0, spCopies = 0;
    for (const s of sec.stickers) { const c = holdings[s.id] || 0; if (c >= 1) have++; if (c >= 2) { spDistinct++; spCopies += c - 1; } }
    return { have, spDistinct, spCopies, total: sec.stickers.length, done: have === sec.stickers.length };
  };

  const queue = useRef<Promise<unknown>>(Promise.resolve());
  function persist(sticker_id: string, count: number, prev: number) {
    if (!isOwner || !token) return;
    const body = JSON.stringify({ username, sticker_id, count });
    // serialize writes so the last value always wins (prevents the got/double race)
    queue.current = queue.current.then(async () => {
      try {
        const res = await fetch("/api/holding", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-owner-token": token },
          body,
        });
        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          throw new Error(d.error || `save failed (${res.status})`);
        }
        setSaveError(null);
      } catch (e: any) {
        // Never lose a write silently: roll this tile back to its real value and
        // tell the user, instead of letting the next tab quietly show empty.
        setHoldings((h) => { const n = { ...h }; if (prev <= 0) delete n[sticker_id]; else n[sticker_id] = prev; return n; });
        setSaveError(e?.message || "couldn't save");
      }
    });
  }
  function setCount(id: string, count: number, animate = false) {
    if (!isOwner) return;
    touched.current = true;
    const prev = holdings[id] || 0;
    setHoldings((h) => { const n = { ...h }; if (count <= 0) delete n[id]; else n[id] = count; return n; });
    if (animate) { setPressing(id); setTimeout(() => setPressing((p) => (p === id ? null : p)), 320); }
    persist(id, Math.max(0, count), prev);
  }
  const toggle = (id: string) => { const c = holdings[id] || 0; c >= 1 ? setCount(id, 0) : setCount(id, 1, true); };
  const addSpare = (id: string) => setCount(id, (holdings[id] || 0) >= 1 ? (holdings[id] || 0) + 1 : 1, (holdings[id] || 0) < 1);
  const subSpare = (id: string) => setCount(id, Math.max(1, (holdings[id] || 1) - 1));

  const visible = (sec: Section) => {
    const { done, spDistinct } = stat(sec);
    if (filter === "todo") return !done;
    if (filter === "done") return done;
    if (filter === "spares") return spDistinct > 0;
    if (filter === "spec") return sec.isSpecial;
    return true;
  };

  return (
    <>
      {!isOwner && <div className="err" style={{ padding: "10px 2px" }}>{t("col.readonly", { u: username })}</div>}
      {saveError && (
        <div className="err" style={{ padding: "10px 2px" }}>
          ⚠ {saveError}. Open your personal edit link (Settings tab) on this device and try again.
        </div>
      )}

      <div className="controls">
        <div className="filters">
          {(["all", "todo", "spares", "done", "spec"] as Filter[]).map((f) => (
            <span key={f} className="fchip" aria-pressed={filter === f} onClick={() => setFilter(f)}>
              {f === "all" ? t("filter.all", { n: sections.length }) : t(`filter.${f}`)}
            </span>
          ))}
        </div>
      </div>

      <div className="legend">
        <span><i className="sw need" /> {t("col.legendNeed")}</span>
        <span><i className="sw have">&#10003;</i> {t("col.legendGot")}</span>
        <span><i className="sw dbl" /> {t("col.legendSpare")}</span>
      </div>

      <div className="list">
        {sections.map((sec, idx) => {
          if (!visible(sec)) return null;
          const { have, spDistinct, spCopies, total, done } = stat(sec);
          const isOpen = open === sec.code;
          const ticks = Array.from({ length: total }, (_, i) => (i < spDistinct ? "d" : i < have ? "h" : ""));
          return (
            <div key={sec.code}
              className={`sec${done ? " done" : ""}${have === 0 ? " empty" : ""}${sec.isSpecial ? " spec" : ""}${isOpen ? " open" : ""}`}>
              <div className="sec-row" onClick={() => setOpen(isOpen ? null : sec.code)}>
                <span className="sec-idx">{String(idx + 1).padStart(2, "0")}</span>
                <span className="fstamp">{sec.code}</span>
                <span className="sname">{secName(sec)}</span>
                <span className="mini">{ticks.map((tk, i) => <i key={i} className={tk} />)}</span>
                {spCopies > 0 && <span className="spare-pill">+{spCopies}</span>}
                <span className="scount">{have}/{total}</span>
                <span className="chev">&#8250;</span>
              </div>
              {isOpen && (
                <div className="panel">
                  <div className="panel-tools"><span className="hint">{t("col.hint")}</span></div>
                  <div className="mgrid">
                    {sec.stickers.map((s) => {
                      const c = holdings[s.id] || 0;
                      const got = c >= 1, spares = c >= 2 ? c - 1 : 0;
                      const state = !got ? "need" : spares > 0 ? "dbl" : "have";
                      const typeCls = s.type === "crest" ? "crest" : s.type === "photo" ? "photo" : "";
                      const shiny = s.id === "0" ? "shiny" : "";
                      return (
                        <div key={s.id}
                          className={`mtile ${state} ${typeCls} ${shiny}${pressing === s.id ? " pressing" : ""}`}
                          onClick={() => toggle(s.id)}>
                          {shiny && <div className="foil" />}
                          <span className="tick">&#10003;</span>
                          <div className="mnum">{s.num_in_section}</div>
                          {spares > 0 && <span className="sp">&times;{spares}</span>}
                          <div className="mname">{s.label}</div>
                          <div className="step" onClick={(e) => e.stopPropagation()} title={t("col.sparesLabel")}>
                            <button className="minus" onClick={() => subSpare(s.id)} aria-label="one fewer spare">&minus;</button>
                            <span className="cnt">{spares}</span>
                            <button className="plus" onClick={() => addSpare(s.id)} aria-label="one more spare">+</button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}

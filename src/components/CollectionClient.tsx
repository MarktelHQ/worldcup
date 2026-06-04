"use client";
import { useEffect, useState } from "react";
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

  useEffect(() => { setToken(localStorage.getItem(`swap:token:${username}`)); }, [username]);
  const isOwner = !!token;

  const { setStats } = useStats();
  useEffect(() => {
    let have = 0, sp = 0, total = 0;
    sections.forEach((sec) => sec.stickers.forEach((s) => { total++; const c = holdings[s.id] || 0; if (c >= 1) have++; if (c >= 2) sp++; }));
    setStats({ have, spares: sp, total });
  }, [holdings, sections, setStats]);
  useEffect(() => () => setStats(null), [setStats]);
  const secName = (s: Section) => (locale === "de" ? COUNTRY_DE[s.code] ?? s.name : s.name);

  const stat = (sec: Section) => {
    let have = 0, sp = 0;
    for (const s of sec.stickers) { const c = holdings[s.id] || 0; if (c >= 1) have++; if (c >= 2) sp++; }
    return { have, sp, total: sec.stickers.length, done: have === sec.stickers.length };
  };

  async function persist(sticker_id: string, count: number) {
    if (!isOwner) return;
    try {
      await fetch("/api/holding", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-owner-token": token! },
        body: JSON.stringify({ username, sticker_id, count }),
      });
    } catch {}
  }
  function setCount(id: string, count: number, animate = false) {
    if (!isOwner) return;
    setHoldings((h) => { const n = { ...h }; if (count <= 0) delete n[id]; else n[id] = count; return n; });
    if (animate) { setPressing(id); setTimeout(() => setPressing((p) => (p === id ? null : p)), 320); }
    persist(id, Math.max(0, count));
  }
  const toggle = (id: string) => { const c = holdings[id] || 0; c >= 1 ? setCount(id, 0) : setCount(id, 1, true); };
  const addSpare = (id: string) => setCount(id, (holdings[id] || 0) >= 1 ? (holdings[id] || 0) + 1 : 1, (holdings[id] || 0) < 1);
  const subSpare = (id: string) => setCount(id, Math.max(1, (holdings[id] || 1) - 1));

  const visible = (sec: Section) => {
    const { done, sp } = stat(sec);
    if (filter === "todo") return !done;
    if (filter === "done") return done;
    if (filter === "spares") return sp > 0;
    if (filter === "spec") return sec.isSpecial;
    return true;
  };

  return (
    <>
      {!isOwner && <div className="err" style={{ padding: "10px 2px" }}>{t("col.readonly", { u: username })}</div>}

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
          const { have, sp, total, done } = stat(sec);
          const isOpen = open === sec.code;
          const ticks = Array.from({ length: total }, (_, i) => (i < sp ? "d" : i < have ? "h" : ""));
          return (
            <div key={sec.code}
              className={`sec${done ? " done" : ""}${have === 0 ? " empty" : ""}${sec.isSpecial ? " spec" : ""}${isOpen ? " open" : ""}`}>
              <div className="sec-row" onClick={() => setOpen(isOpen ? null : sec.code)}>
                <span className="sec-idx">{String(idx + 1).padStart(2, "0")}</span>
                <span className="fstamp">{sec.code}</span>
                <span className="sname">{secName(sec)}</span>
                <span className="mini">{ticks.map((tk, i) => <i key={i} className={tk} />)}</span>
                {sp > 0 && <span className="spare-pill">+{sp}</span>}
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

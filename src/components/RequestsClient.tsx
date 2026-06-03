"use client";
import { useCallback, useEffect, useState } from "react";
import { useI18n } from "@/components/Providers";

type Req = { id: string; with: string; direction: "in" | "out"; offered: string[]; wanted: string[]; status: string };

export default function RequestsClient({ username }: { username: string }) {
  const { t } = useI18n();
  const [incoming, setIncoming] = useState<Req[]>([]);
  const [outgoing, setOutgoing] = useState<Req[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(null), 2000); };

  const load = useCallback(() => {
    fetch(`/api/requests/${username}`).then((r) => r.json()).then((d) => {
      setIncoming(d.incoming ?? []); setOutgoing(d.outgoing ?? []); setLoaded(true);
    });
  }, [username]);
  useEffect(load, [load]);

  async function respond(id: string, action: "accept" | "decline" | "done", okMsg: string) {
    const token = localStorage.getItem(`swap:token:${username}`);
    if (!token) return flash(t("set.notOwner"));
    await fetch("/api/request/respond", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-owner-token": token },
      body: JSON.stringify({ request_id: id, action, username }),
    });
    flash(okMsg); load();
  }
  function reply(r: Req) {
    const msg = `@${r.with} — about our swap: you get ${r.offered.join(", ")}; I get ${r.wanted.join(", ")}. 👍`;
    navigator.clipboard?.writeText(msg); flash(t("trade.copied"));
  }
  const statusLabel = (s: string) => t(`req.status${s.charAt(0).toUpperCase() + s.slice(1)}`);
  const statusCls = (s: string) => (s === "open" ? "new" : s === "accepted" ? "agreed" : s === "done" ? "agreed" : "pending");

  return (
    <>
      <div className="sheet-title">{t("req.title")}</div>
      <div className="sheet-sub">{t("req.sub")}</div>

      {loaded && incoming.length === 0 && outgoing.length === 0 && <div className="stub"><p>{t("req.none")}</p></div>}

      {incoming.map((r) => (
        <div className="telegram" key={r.id}>
          <div className="tg-head"><span>{t("req.incoming")} · @{r.with}</span><span className={`status ${statusCls(r.status)}`}>{statusLabel(r.status)}</span></div>
          <div className="tg-body">
            <div className="tg-line"><span className="who">@{r.with}</span></div>
            <div className="tg-trade">
              <span className="lbl">{t("req.wants")}</span>{r.wanted.map((c) => <span key={c} className="chip hot">{c}</span>)}
              <span className="lbl" style={{ marginLeft: 8 }}>{t("req.offers")}</span>{r.offered.map((c) => <span key={c} className="chip">{c}</span>)}
            </div>
          </div>
          <div className="tg-foot">
            {r.status === "open" && <>
              <button className="btn sm mint" onClick={() => respond(r.id, "accept", t("req.accepted"))}>{t("req.accept")}</button>
              <button className="btn sm ghost" onClick={() => respond(r.id, "decline", t("req.declined"))}>{t("req.decline")}</button>
            </>}
            {r.status === "accepted" && <button className="btn sm" onClick={() => respond(r.id, "done", t("req.swapped"))}>{t("req.markDone")}</button>}
            <span className="copybar" onClick={() => reply(r)}>⧉ {t("req.reply")}</span>
          </div>
        </div>
      ))}

      {outgoing.map((r) => (
        <div className="telegram" key={r.id} style={{ opacity: 0.9 }}>
          <div className="tg-head"><span>{t("req.outgoing")} · @{r.with}</span><span className={`status ${statusCls(r.status)}`}>{statusLabel(r.status)}</span></div>
          <div className="tg-body">
            <div className="tg-trade">
              <span className="lbl">{t("req.youGive")}</span>{r.offered.map((c) => <span key={c} className="chip hot">{c}</span>)}
              <span className="lbl" style={{ marginLeft: 8 }}>{t("req.youGet")}</span>{r.wanted.map((c) => <span key={c} className="chip">{c}</span>)}
            </div>
          </div>
          {r.status === "accepted" && <div className="tg-foot"><button className="btn sm" onClick={() => respond(r.id, "done", t("req.swapped"))}>{t("req.markDone")}</button></div>}
        </div>
      ))}
      {toast && <div className="toast show">{toast}</div>}
    </>
  );
}

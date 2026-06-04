"use client";
import { useEffect, useState } from "react";
import { useI18n } from "@/components/Providers";

export default function TradeClient({ username, spares, needs }: { username: string; spares: string[]; needs: string[] }) {
  const { t } = useI18n();
  const [origin, setOrigin] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  useEffect(() => setOrigin(window.location.origin), []);
  const link = `${origin}/u/${username}`;

  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(null), 1800); };
  const copy = (text: string, msg: string) => { navigator.clipboard?.writeText(text); flash(msg); };

  return (
    <>
      <div className="sheet-title">{t("trade.title")}</div>
      <div className="sheet-sub">@{username} — {t("trade.sub")}</div>

      <div className="stamps">
        <div className="stamp" onClick={() => copy(link, t("trade.copied"))}>↗ {t("trade.copyLink")}</div>
        <div className="stamp" onClick={() => window.print()}>⎙ {t("trade.pdf")}</div>
      </div>
      <hr className="perf" />

      <div className="cols">
        <div className="col">
          <h3 className="hot">{t("trade.gotSpares")} <span className="ct">×{spares.length}</span></h3>
          <div className="chips">
            {spares.length ? spares.map((c) => <span key={c} className="chip hot">{c}</span>) : <span className="muted">{t("trade.noSpares")}</span>}
          </div>
          {spares.length > 0 && <span className="copybar" onClick={() => copy(spares.join(", "), t("trade.copied"))}>⧉ {t("trade.copySpares")}</span>}
        </div>
        <div className="col">
          <h3>{t("trade.stillNeed")} <span className="ct">×{needs.length}</span></h3>
          <div className="chips">
            {needs.length ? <>
              {needs.slice(0, 60).map((c) => <span key={c} className="chip">{c}</span>)}
              {needs.length > 60 && <span className="chip">+ {needs.length - 60}…</span>}
            </> : <span className="muted">{t("trade.noNeeds")}</span>}
          </div>
          {needs.length > 0 && <span className="copybar" onClick={() => copy(needs.join(", "), t("trade.copied"))}>⧉ {t("trade.copyNeeds")}</span>}
        </div>
      </div>
      {toast && <div className="toast show">{toast}</div>}
    </>
  );
}

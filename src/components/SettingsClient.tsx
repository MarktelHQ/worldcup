"use client";
import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/components/Providers";

export default function SettingsClient({ username, have, total, spares }: { username: string; have: number; total: number; spares: number }) {
  const { t } = useI18n();
  const [token, setToken] = useState<string | null>(null);
  const [origin, setOrigin] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(null), 2000); };

  useEffect(() => { setToken(localStorage.getItem(`swap:token:${username}`)); setOrigin(window.location.origin); }, [username]);
  const editLink = token ? `${origin}/u/${username}#token=${token}` : "";

  async function exportBackup() {
    if (!token) return flash(t("set.notOwner"));
    const d = await fetch(`/api/collection/${username}`).then((r) => r.json());
    const blob = new Blob([JSON.stringify({ username, token, holdings: d.holdings ?? {} }, null, 2)], { type: "application/json" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = `stickerswap-${username}.json`; a.click();
  }
  async function importBackup(file: File) {
    const text = await file.text();
    try {
      const data = JSON.parse(text);
      const tok = data.token || token;
      if (!tok) return flash(t("set.notOwner"));
      if (data.token) { localStorage.setItem(`swap:token:${username}`, data.token); setToken(data.token); }
      await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-owner-token": tok },
        body: JSON.stringify({ username, holdings: data.holdings ?? {} }),
      });
      flash(t("set.imported")); setTimeout(() => location.reload(), 900);
    } catch { flash("Invalid file"); }
  }
  async function reset() {
    if (!token) return flash(t("set.notOwner"));
    if (!confirm(t("set.resetConfirm"))) return;
    await fetch("/api/import", {
      method: "POST", headers: { "Content-Type": "application/json", "x-owner-token": token },
      body: JSON.stringify({ username, holdings: {} }),
    });
    flash(t("set.imported")); setTimeout(() => location.reload(), 900);
  }

  return (
    <>
      <div className="sheet-title">{t("set.title")}</div>

      <div className="card">
        <h2>{t("set.profile")}</h2>
        <p className="muted">{t("set.username")}: <b>@{username}</b></p>
        <p className="muted" style={{ marginTop: 12 }}>{t("set.editLink")}</p>
        <p className="muted" style={{ fontSize: 10, wordBreak: "break-all", color: "var(--cobalt)" }}>{editLink || "—"}</p>
        <p className="muted">{t("set.editLinkHelp")}</p>
        <button className="btn" style={{ marginTop: 8 }} onClick={() => { if (editLink) { navigator.clipboard?.writeText(editLink); flash(t("set.linkCopied")); } else flash(t("set.notOwner")); }}>
          {t("set.copyLink")}
        </button>
      </div>

      <div className="card">
        <h2>{t("set.backup")}</h2>
        <p className="muted">{t("set.cards", { have, total, sp: spares })}</p>
        <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
          <button className="btn" style={{ background: "var(--panel)", color: "var(--ink)" }} onClick={exportBackup}>↓ {t("set.export")}</button>
          <button className="btn" style={{ background: "var(--panel)", color: "var(--ink)" }} onClick={() => fileRef.current?.click()}>↑ {t("set.import")}</button>
          <input ref={fileRef} type="file" accept="application/json" hidden onChange={(e) => e.target.files?.[0] && importBackup(e.target.files[0])} />
        </div>
      </div>

      <div className="card" style={{ borderColor: "var(--vermilion)" }}>
        <h2 style={{ color: "var(--vermilion)" }}>{t("set.danger")}</h2>
        <button className="btn" onClick={reset}>↺ {t("set.reset")}</button>
      </div>
      {toast && <div className="toast show">{toast}</div>}
    </>
  );
}

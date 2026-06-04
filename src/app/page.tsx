"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n, LangSwitch } from "@/components/Providers";

export default function Home() {
  const router = useRouter();
  const { t } = useI18n();
  const [tab, setTab] = useState<"join" | "create">("join");
  const [invite, setInvite] = useState("");
  const [username, setUsername] = useState("");
  const [groupName, setGroupName] = useState("");
  const [createdCode, setCreatedCode] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const j = new URLSearchParams(window.location.search).get("join");
    if (j) { setInvite(j); setTab("join"); }
  }, []);

  async function join() {
    setErr(null); setBusy(true);
    try {
      const r = await fetch("/api/join", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invite_code: invite.trim(), username: username.trim() }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "join failed");
      localStorage.setItem(`swap:token:${d.username}`, d.owner_token);
      localStorage.setItem("swap:me", d.username);
      router.push(`/u/${d.username}`);
    } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  }
  async function createGroup() {
    setErr(null); setBusy(true);
    try {
      const r = await fetch("/api/group", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: groupName.trim() }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "create failed");
      setCreatedCode(d.invite_code); setInvite(d.invite_code); setTab("join");
    } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  }

  return (
    <div className="center">
      <div style={{ display: "flex", justifyContent: "flex-end" }}><LangSwitch /></div>
      <div className="logo" style={{ fontFamily: "'Big Shoulders Display'", fontWeight: 900, fontSize: 56, lineHeight: 0.82, textTransform: "uppercase" }}>
        Sticker<span style={{ color: "var(--vermilion)" }}>Swap.</span>
      </div>
      <p className="muted">{t("home.tagline")}</p>

      <div className="card">
        <div className="filters" style={{ marginBottom: 14 }}>
          <span className="fchip" aria-pressed={tab === "join"} onClick={() => setTab("join")}>{t("home.joinTab")}</span>
          <span className="fchip" aria-pressed={tab === "create"} onClick={() => setTab("create")}>{t("home.createTab")}</span>
        </div>
        {tab === "join" ? (
          <>
            <h2>{t("home.join")}</h2>
            {createdCode && <p className="muted">{t("home.created", { code: createdCode })}</p>}
            <input className="field" placeholder={t("home.invite")} value={invite} onChange={(e) => setInvite(e.target.value)} />
            <input className="field" placeholder={t("home.username")} value={username} onChange={(e) => setUsername(e.target.value)} />
            <button className="btn" onClick={join} disabled={busy}>{busy ? "…" : t("home.createList")}</button>
          </>
        ) : (
          <>
            <h2>{t("home.create")}</h2>
            <p className="muted">{t("home.createHelp")}</p>
            <input className="field" placeholder={t("home.groupName")} value={groupName} onChange={(e) => setGroupName(e.target.value)} />
            <button className="btn" onClick={createGroup} disabled={busy}>{busy ? "…" : t("home.createGroup")}</button>
          </>
        )}
        {err && <p className="err">{err}</p>}
      </div>
      <p className="muted" style={{ marginTop: 16 }}>{t("home.already")}</p>
    </div>
  );
}

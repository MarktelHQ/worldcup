"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { tr, type Locale } from "@/lib/i18n";

type Ctx = { locale: Locale; setLocale: (l: Locale) => void; t: (k: string, v?: Record<string, string | number>) => string };
const I18nCtx = createContext<Ctx>({ locale: "en", setLocale: () => {}, t: (k) => k });
export const useI18n = () => useContext(I18nCtx);

type Stats = { have: number; spares: number; total: number } | null;
const StatsCtx = createContext<{ stats: Stats; setStats: (s: Stats) => void }>({ stats: null, setStats: () => {} });
export const useStats = () => useContext(StatsCtx);

export default function Providers({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");
  const [stats, setStats] = useState<Stats>(null);

  useEffect(() => {
    // 1) language: saved choice, else browser default
    const saved = (localStorage.getItem("swap:lang") as Locale) || (navigator.language.startsWith("de") ? "de" : "en");
    setLocaleState(saved);
    document.documentElement.lang = saved;

    // 2) token sync: if arriving via a personal edit link /u/<name>#token=XXX, capture + clean it
    const m = window.location.pathname.match(/^\/u\/([^\/]+)/);
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const token = hash.get("token");
    if (m && token) {
      localStorage.setItem(`swap:token:${decodeURIComponent(m[1])}`, token);
      localStorage.setItem("swap:me", decodeURIComponent(m[1]));
      history.replaceState(null, "", window.location.pathname + window.location.search);
    }
  }, []);

  const setLocale = (l: Locale) => {
    setLocaleState(l);
    localStorage.setItem("swap:lang", l);
    document.documentElement.lang = l;
  };
  const t = (k: string, v?: Record<string, string | number>) => tr(locale, k, v);

  return (
    <I18nCtx.Provider value={{ locale, setLocale, t }}>
      <StatsCtx.Provider value={{ stats, setStats }}>{children}</StatsCtx.Provider>
    </I18nCtx.Provider>
  );
}

export function LangSwitch() {
  const { locale, setLocale } = useI18n();
  return (
    <button
      onClick={() => setLocale(locale === "en" ? "de" : "en")}
      style={{
        fontFamily: "'Martian Mono',monospace", fontSize: 10, fontWeight: 600, letterSpacing: ".06em",
        border: "2px solid var(--ink)", background: "var(--paper)", color: "var(--ink)",
        padding: "6px 9px", cursor: "pointer", alignSelf: "center",
      }}
      aria-label="switch language"
    >
      {locale === "en" ? "DE" : "EN"}
    </button>
  );
}

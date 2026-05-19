"use client";

interface NavbarProps {
  lang: "en" | "ar";
  onLangChange: () => void;
  pageTitle: string;
  pageAr: string;
  module: string;
}

export default function Navbar({ lang, onLangChange, pageTitle, pageAr, module }: NavbarProps) {
  return (
    <header style={{
      height: 56,
      background: "#0D1220",
      borderBottom: "1px solid rgba(201,168,76,0.12)",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "0 20px",
      flexShrink: 0,
    }}>
      {/* Breadcrumb */}
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ fontSize: 12, color: "var(--text-muted)" }}>SCM Pro</span>
        <span style={{ fontSize: 12, color: "var(--text-muted)" }}>›</span>
        <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text)" }}>
          {lang === "ar" ? pageAr : pageTitle}
        </span>
      </div>

      {/* Right controls */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {/* Module badge */}
        <span style={{
          fontSize: 10, fontWeight: 700, padding: "2px 8px",
          borderRadius: 4, border: "1px solid rgba(201,168,76,0.3)",
          color: "var(--gold)", background: "rgba(201,168,76,0.08)"
        }}>APICS V8.1</span>

        {/* Lang toggle */}
        <button onClick={onLangChange} style={{
          display: "flex", alignItems: "center", gap: 1,
          background: "rgba(96,184,212,0.08)",
          border: "1px solid rgba(96,184,212,0.3)",
          borderRadius: 6, padding: "4px 2px",
          cursor: "pointer",
        }}>
          {(["AR","EN"] as const).map((l) => (
            <span key={l} style={{
              padding: "2px 8px", borderRadius: 4, fontSize: 11, fontWeight: 700,
              background: (lang === "ar" ? "AR" : "EN") === l ? "var(--blue-light)" : "transparent",
              color: (lang === "ar" ? "AR" : "EN") === l ? "#0A0E1A" : "var(--text-muted)",
              transition: "all 0.2s",
            }}>{l}</span>
          ))}
        </button>

        {/* Notification */}
        <div style={{ position: "relative", cursor: "pointer" }}>
          <span style={{ fontSize: 18 }}>🔔</span>
          <span style={{
            position: "absolute", top: -4, right: -4,
            width: 16, height: 16, borderRadius: "50%",
            background: "var(--red)", fontSize: 9, fontWeight: 800,
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "white"
          }}>3</span>
        </div>

        {/* Avatar */}
        <div style={{
          width: 32, height: 32, borderRadius: "50%",
          background: "linear-gradient(135deg,#C9A84C,#E07B2A)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontWeight: 800, fontSize: 12, color: "#0A0E1A", cursor: "pointer"
        }}>KM</div>
      </div>
    </header>
  );
}

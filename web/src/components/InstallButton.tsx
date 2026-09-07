import { useState } from "react";
import { usePWAInstall } from "../hooks/usePWAInstall";

export default function InstallButton({ variant = "primary" }: { variant?: "primary" | "ghost" }) {
  const { canInstall, isStandalone, showIOSHint, install } = usePWAInstall();
  const [showHint, setShowHint] = useState(false);

  if (isStandalone) {
    return <span style={{ fontSize: 12, color: "var(--success)" }}>✓ App instalado</span>;
  }

  if (canInstall) {
    return (
      <button className={variant === "primary" ? "btn-primary" : "btn-ghost"} onClick={install} title="Instalar Mobile Cast no dispositivo">
        ⬇️ Instalar app
      </button>
    );
  }

  if (showIOSHint) {
    return (
      <div style={{ display: "inline-block" }}>
        <button className={variant === "primary" ? "btn-primary" : "btn-ghost"} onClick={() => setShowHint(!showHint)}>
          ⬇️ Instalar app
        </button>
        {showHint && (
          <div style={{ marginTop: 8, background: "#1a1a1f", border: "1px solid #2a2a30", padding: 10, borderRadius: 8, fontSize: 12, color: "var(--muted)", maxWidth: 260, textAlign: "left" }}>
            No iPhone: toque <b>Compartilhar</b> (⎙) → <b>Adicionar à Tela de Início</b>
          </div>
        )}
      </div>
    );
  }

  // Fallback: navegador sem prompt ainda (Chrome precisa de engajamento)
  return (
    <div style={{ display: "inline-block" }}>
      <button className={variant === "primary" ? "btn-primary" : "btn-ghost"} onClick={() => setShowHint(!showHint)} title="Instalar">
        ⬇️ Instalar app
      </button>
      {showHint && (
        <div style={{ marginTop: 8, background: "#1a1a1f", border: "1px solid #2a2a30", padding: 10, borderRadius: 8, fontSize: 12, color: "var(--muted)", maxWidth: 300, textAlign: "left" }}>
          No Chrome/Edge: menu ⋮ → <b>Instalar app</b> ou <b>Adicionar à tela inicial</b>.<br />
          No Android Chrome: menu ⋮ → <b>Instalar app</b>.
        </div>
      )}
    </div>
  );
}

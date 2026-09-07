import { useState } from "react";
import { useNavigate } from "react-router-dom";
import InstallButton from "../components/InstallButton";

export default function Home() {
  const [code, setCode] = useState("");
  const navigate = useNavigate();

  const connect = () => {
    const c = code.trim().toUpperCase();
    if (c.length < 4) return;
    navigate(`/r/${c}`);
  };

  return (
    <div className="container">
      <header style={{ textAlign: "center", margin: "40px 0 24px" }}>
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 12, marginBottom: 8 }}>
          <img src="/icons/icon-192.png" alt="Mobile Cast" width={48} height={48} style={{ borderRadius: 12, border: "1px solid var(--border)" }} />
          <h1 style={{ fontSize: 32, fontWeight: 800 }}>Mobile Cast</h1>
        </div>
        <p style={{ color: "var(--muted)", marginTop: 8 }}>Transmissão P2P via WebRTC — escolha o modo</p>
        <div style={{ marginTop: 12 }}>
          <InstallButton />
        </div>
      </header>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16, maxWidth: 640, margin: "0 auto" }}>
        <div className="card" style={{ textAlign: "center", padding: 24 }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>📤</div>
          <h3 style={{ fontSize: 18, marginBottom: 8 }}>Transmitir</h3>
          <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 16, lineHeight: 1.5 }}>
            Compartilhe a tela deste dispositivo.<br />Gera um código para o receptor.
          </p>
          <button className="btn-primary" style={{ width: "100%" }} onClick={() => navigate("/transmitir")}>
            Transmitir tela
          </button>
          <p style={{ fontSize: 11, color: "var(--muted)", marginTop: 8 }}>
            No celular, prefira o app Android<br />(captura nativa + áudio interno)
          </p>
        </div>

        <div className="card" style={{ textAlign: "center", padding: 24 }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>📥</div>
          <h3 style={{ fontSize: 18, marginBottom: 8 }}>Receber</h3>
          <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 16, lineHeight: 1.5 }}>
            Assista a transmissão de outro dispositivo.<br />Digite o código exibido no transmissor.
          </p>
          <input
            className="input"
            placeholder="ABC742"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            maxLength={10}
            onKeyDown={(e) => e.key === "Enter" && connect()}
            style={{ textAlign: "center", letterSpacing: "0.12em", fontWeight: 700 }}
          />
          <button className="btn-primary" style={{ width: "100%", marginTop: 12 }} onClick={connect}>
            Receber transmissão
          </button>
        </div>
      </div>

      <div className="card" style={{ maxWidth: 640, margin: "16px auto 0", fontSize: 13, color: "var(--muted)", lineHeight: 1.6 }}>
        <p>📱 <b>Fluxo clássico (Android → PC):</b> abra o <b>app Android</b> → <b>Transmitir tela</b> → anote <code>ABC742</code> → digite em <b>Receber</b> aqui.</p>
        <p style={{ marginTop: 8 }}>🖥️ <b>Fluxo web (PC → PC):</b> clique <b>Transmitir</b> → <b>Compartilhar tela</b> → envie o código ao outro dispositivo.</p>
        <p style={{ marginTop: 8 }}>💡 Ambos podem estar em redes diferentes (STUN Google + TURN openrelay já configurado).</p>
      </div>

      <div style={{ textAlign: "center", marginTop: 24, fontSize: 13, color: "var(--muted)" }}>
        <a href="/api/health" target="_blank" rel="noreferrer">health check</a>
        {" · "}
        <span>docs: <code>docs/architecture.md</code></span>
      </div>
    </div>
  );
}

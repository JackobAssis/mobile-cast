import { useState } from "react";
import { useNavigate } from "react-router-dom";

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
      <header style={{ textAlign: "center", margin: "40px 0" }}>
        <h1 style={{ fontSize: 32, fontWeight: 800 }}>Mobile Cast</h1>
        <p style={{ color: "var(--muted)", marginTop: 8 }}>Receba a tela do seu Android no PC via WebRTC</p>
      </header>

      <div className="card" style={{ maxWidth: 480, margin: "0 auto" }}>
        <label style={{ display: "block", marginBottom: 8, fontSize: 14, color: "var(--muted)" }}>
          Digite o código exibido no celular
        </label>
        <input
          className="input"
          placeholder="ABC742"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          maxLength={10}
          onKeyDown={(e) => e.key === "Enter" && connect()}
        />
        <button className="btn-primary" style={{ width: "100%", marginTop: 16 }} onClick={connect}>
          Conectar
        </button>

        <div style={{ marginTop: 24, paddingTop: 16, borderTop: "1px solid var(--border)", fontSize: 13, color: "var(--muted)" }}>
          <p>📱 No celular: abra o app → <b>Transmitir tela</b> → anote o código.</p>
          <p style={{ marginTop: 8 }}>💡 Ambos precisam estar no mesmo Wi-Fi (MVP).</p>
          <p style={{ marginTop: 8 }}>🔗 Ou escaneie o QR code com a câmera do PC.</p>
        </div>
      </div>

      <div style={{ textAlign: "center", marginTop: 32, fontSize: 13, color: "var(--muted)" }}>
        <a href="/api/health" target="_blank" rel="noreferrer">health check</a>
        {" · "}
        <span>docs: <code>docs/architecture.md</code></span>
      </div>
    </div>
  );
}

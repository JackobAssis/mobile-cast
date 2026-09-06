import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { SignalingClient } from "../webrtc/Signaling";
import { PeerClient } from "../webrtc/PeerClient";
import { useRecorder, formatDuration } from "../recording/useRecorder";

export default function Receiver() {
  const { code } = useParams();
  const navigate = useNavigate();
  const sessionId = (code ?? "").toUpperCase();

  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [connState, setConnState] = useState<RTCPeerConnectionState>("new");
  const [iceState, setIceState] = useState<RTCIceConnectionState>("new");
  const [latency, setLatency] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [volume, setVolume] = useState(1);
  const [joined, setJoined] = useState(false);

  const signalingRef = useRef<SignalingClient | null>(null);
  const peerRef = useRef<PeerClient | null>(null);

  const { recording, duration, toggle } = useRecorder(stream);

  const statusColor =
    connState === "connected" ? "dot-connected" :
    connState === "connecting" ? "dot-connecting" : "dot-disconnected";

  const statusLabel =
    connState === "connected" ? "Conectado" :
    connState === "connecting" ? "Conectando..." :
    connState === "failed" ? "Falha — verifique Wi-Fi/firewall" :
    iceState === "checking" ? "Negociando..." :
    joined ? "Aguardando oferta do celular..." : "Conectando ao servidor...";

  useEffect(() => {
    if (!sessionId) return;

    const signaling = new SignalingClient({
      onJoined: () => { console.log("[receiver] joined", sessionId); setJoined(true); setError(null); },
      onOffer: async (sdp) => {
        console.log("[receiver] offer received", sdp.slice(0,80));
        await peerRef.current?.handleOffer(sdp);
      },
      onAnswer: async (sdp) => {
        await peerRef.current?.handleAnswer(sdp);
      },
      onIceCandidate: async (candidate, sdpMid, sdpMLineIndex) => {
        await peerRef.current?.handleIce(candidate, sdpMid, sdpMLineIndex);
      },
      onPeerLeft: () => setError("Celular desconectou"),
      onError: (msg) => setError(msg),
      onClose: () => setError("Conexão com servidor perdida — recarregue a página"),
    });

    const peer = new PeerClient(
      { send: (msg) => signaling.send(msg) },
      {
        onTrack: (s) => {
          setStream(s);
          if (videoRef.current) {
            videoRef.current.srcObject = s;
            videoRef.current.play().catch(() => {});
          }
        },
        onConnectionState: setConnState,
        onIceState: setIceState,
        onError: setError,
      }
    );

    signalingRef.current = signaling;
    peerRef.current = peer;
    peer.createPeer();

    signaling.connect()
      .then(() => signaling.join(sessionId))
      .catch((e) => setError(e.message));

    const latencyTimer = window.setInterval(async () => {
      const ms = await peer.getLatencyMs();
      if (ms !== null) setLatency(ms);
    }, 2000);

    return () => {
      clearInterval(latencyTimer);
      signaling.close();
      peer.close();
    };
  }, [sessionId]);

  useEffect(() => {
    if (videoRef.current) videoRef.current.volume = volume;
  }, [volume]);

  const fullscreen = useCallback(() => {
    videoRef.current?.requestFullscreen().catch(() => {});
  }, []);

  const hasStream = !!stream;

  return (
    <div className="container">
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div>
          <h2 style={{ fontSize: 20 }}>Mobile Cast</h2>
          <div style={{ fontSize: 13, color: "var(--muted)" }}>Sessão: <b style={{ color: "var(--text)", letterSpacing: "0.08em" }}>{sessionId}</b></div>
        </div>
        <button className="btn-ghost" onClick={() => navigate("/")}>← Voltar</button>
      </header>

      {error && (
        <div style={{ background: "#2a1215", border: "1px solid #4a1a1f", padding: 12, borderRadius: 8, marginBottom: 16, fontSize: 14 }}>
          ⚠️ {error}
          <button style={{ marginLeft: 12, background: "#4a1a1f", color: "#fff", padding: "4px 8px", borderRadius: 6, fontSize: 12 }} onClick={() => location.reload()}>Recarregar</button>
        </div>
      )}

      <div className="video-wrap">
        <video ref={videoRef} autoPlay playsInline muted={false} controls={false} />
        {!hasStream && (
          <div className="video-overlay">
            <div style={{ textAlign: "center", maxWidth: 320 }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>📡</div>
              <div>{joined ? "Aguardando transmissão do celular..." : "Conectando..."}</div>
              <div style={{ fontSize: 12, marginTop: 8, color: "#aaa" }}>Verifique se o app está transmitindo com o mesmo código e na mesma rede Wi-Fi</div>
            </div>
          </div>
        )}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12, flexWrap: "wrap", gap: 12 }}>
        <span className="badge">
          <span className={`dot ${statusColor}`} /> {statusLabel}
        </span>
        <span className="latency">
          {latency !== null ? `⏱ ${latency} ms` : "⏱ -- ms"}
          {recording && <span style={{ marginLeft: 12, color: "var(--danger)" }}>🔴 REC {formatDuration(duration)}</span>}
        </span>
      </div>

      <div className="controls">
        <button className="btn-ghost" onClick={fullscreen} disabled={!hasStream}>⛶ Tela cheia</button>
        <label style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--card)", border: "1px solid var(--border)", padding: "10px 14px", borderRadius: "var(--radius)" }}>
          🔊
          <input type="range" min={0} max={1} step={0.05} value={volume} onChange={(e) => setVolume(Number(e.target.value))} />
        </label>
        <button className={`btn-record ${recording ? "recording" : ""}`} onClick={toggle} disabled={!hasStream}>
          {recording ? "⏹ Parar gravação" : "⏺ Gravar"}
        </button>
        {!hasStream && <span style={{ fontSize: 12, color: "var(--muted)" }}>Gravação disponível após conectar</span>}
      </div>

      <div style={{ marginTop: 24, fontSize: 12, color: "var(--muted)", lineHeight: 1.6 }}>
        <p>Arquivo salvo como <code>mobilecast_YYYY-MM-DD_HH-mm-ss.webm</code> na pasta Downloads.</p>
        <p>Codecs: VP9/VP8 + Opus — reproduzível no Chrome/VLC.</p>
      </div>
    </div>
  );
}

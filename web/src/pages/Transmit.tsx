import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { SignalingClient } from "../webrtc/Signaling";
import { PeerClient } from "../webrtc/PeerClient";

export default function Transmit() {
  const navigate = useNavigate();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [connState, setConnState] = useState<RTCPeerConnectionState>("new");
  const [viewerJoined, setViewerJoined] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [copied, setCopied] = useState(false);

  const signalingRef = useRef<SignalingClient | null>(null);
  const peerRef = useRef<PeerClient | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const previewRef = useRef<HTMLVideoElement>(null);

  const shareUrl = sessionId ? `${window.location.origin}/r/${sessionId}` : "";

  const stopSharing = useCallback(() => {
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    localStreamRef.current = null;
    peerRef.current?.close();
    signalingRef.current?.close();
    setSharing(false);
    setViewerJoined(false);
    setConnState("new");
  }, []);

  const startSharing = useCallback(async () => {
    setError(null);
    try {
      // Solicita captura de tela + áudio (navegador)
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { displaySurface: "monitor" } as any,
        audio: true,
      }).catch(async () => {
        // fallback: tenta sem áudio se usuário negar
        return await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
      });

      localStreamRef.current = stream;
      if (previewRef.current) {
        previewRef.current.srcObject = stream;
        previewRef.current.play().catch(() => {});
      }
      setSharing(true);

      // Quando a trilha termina (usuário clica "Parar compartilhamento" nativo)
      stream.getVideoTracks()[0]?.addEventListener("ended", () => {
        stopSharing();
      });

      // Se já tem peer criado (viewer já entrou), cria offer agora
      if (peerRef.current && signalingRef.current && viewerJoined) {
        await peerRef.current.createOfferForHost(stream);
      } else if (peerRef.current) {
        // adiciona tracks ao peer para quando viewer entrar
        stream.getTracks().forEach(track => peerRef.current!.pc?.addTrack(track, stream));
        // offer será criada no onPeerJoined
        if (viewerJoined) {
          await peerRef.current.createOfferForHost(stream);
        }
      }
    } catch (e: any) {
      setError(e?.message ?? "Falha ao capturar tela — verifique permissão.");
    }
  }, [viewerJoined, stopSharing]);

  useEffect(() => {
    const signaling = new SignalingClient({
      onCreated: (sid) => {
        console.log("[transmit] created", sid);
        setSessionId(sid);
      },
      onPeerJoined: async () => {
        console.log("[transmit] peer joined");
        setViewerJoined(true);
        setError(null);
        // Se já está compartilhando, cria offer imediatamente
        if (localStreamRef.current && peerRef.current) {
          try {
            // Se tracks ainda não foram adicionadas
            const senders = peerRef.current.pc?.getSenders() ?? [];
            if (senders.length === 0 && localStreamRef.current) {
              await peerRef.current.createOfferForHost(localStreamRef.current);
            } else {
              const offer = await peerRef.current.pc!.createOffer();
              await peerRef.current.pc!.setLocalDescription(offer);
              signalingRef.current?.send({ type: "offer", sdp: offer.sdp });
            }
          } catch (e) {
            console.error("[transmit] offer failed", e);
            setError("Falha ao iniciar transmissão");
          }
        }
      },
      onAnswer: async (sdp) => {
        console.log("[transmit] answer received");
        await peerRef.current?.handleAnswer(sdp);
      },
      onIceCandidate: async (candidate, sdpMid, sdpMLineIndex) => {
        await peerRef.current?.handleIce(candidate, sdpMid, sdpMLineIndex);
      },
      onPeerLeft: () => {
        setViewerJoined(false);
        setConnState("new");
      },
      onError: (msg) => setError(msg),
      onClose: () => setError("Conexão com servidor perdida"),
    });

    const peer = new PeerClient(
      { send: (msg) => signaling.send(msg) },
      {
        onTrack: () => {},
        onConnectionState: setConnState,
        onIceState: () => {},
        onError: setError,
      }
    );

    signalingRef.current = signaling;
    peerRef.current = peer;
    peer.createPeer();

    signaling.connect()
      .then(() => signaling.create())
      .catch(e => setError(e.message));

    return () => {
      stopSharing();
      signaling.close();
      peer.close();
    };
  }, [stopSharing]);

  // Quando viewer entra e ainda não está compartilhando, apenas aguarda usuário clicar "Compartilhar tela"
  useEffect(() => {
    if (viewerJoined && sharing && localStreamRef.current && peerRef.current) {
      // Já em sharing, mas offer ainda não enviada (caso tracks foram adicionadas antes)
      const senders = peerRef.current.pc?.getSenders() ?? [];
      if (senders.length === 0) {
        peerRef.current.createOfferForHost(localStreamRef.current).catch(console.error);
      }
    }
  }, [viewerJoined, sharing]);

  const copyLink = async () => {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const statusLabel = connState === "connected" ? "● Conectado ao receptor" :
    viewerJoined ? "● Receptor entrou — clique Compartilhar tela" :
    sessionId ? "● Aguardando receptor..." : "Conectando...";

  return (
    <div className="container">
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div>
          <h2 style={{ fontSize: 20 }}>Mobile Cast — Transmitir</h2>
          <div style={{ fontSize: 13, color: "var(--muted)" }}>{statusLabel}</div>
        </div>
        <button className="btn-ghost" onClick={() => navigate("/")}>← Voltar</button>
      </header>

      {error && (
        <div style={{ background: "#2a1215", border: "1px solid #4a1a1f", padding: 12, borderRadius: 8, marginBottom: 16, fontSize: 14 }}>
          ⚠️ {error}
          <button style={{ marginLeft: 12, background: "#4a1a1f", color: "#fff", padding: "4px 8px", borderRadius: 6, fontSize: 12 }} onClick={() => setError(null)}>Fechar</button>
        </div>
      )}

      {!sessionId ? (
        <div className="card" style={{ textAlign: "center", padding: 32 }}>
          <p style={{ color: "var(--muted)" }}>Conectando ao servidor...</p>
        </div>
      ) : (
        <>
          <div className="card" style={{ maxWidth: 520, margin: "0 auto", textAlign: "center" }}>
            <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 8 }}>Código para o receptor digitar</div>
            <div style={{ fontSize: 36, fontWeight: 800, letterSpacing: "0.18em", color: "var(--accent)" }}>{sessionId}</div>
            <div style={{ marginTop: 12, display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
              <input className="input" readOnly value={shareUrl} style={{ flex: 1, minWidth: 240, textAlign: "center" }} />
              <button className="btn-primary" onClick={copyLink}>{copied ? "✓ Copiado" : "📋 Copiar link"}</button>
            </div>
            <div style={{ marginTop: 8, fontSize: 12, color: "var(--muted)" }}>
              Link direto: <code>{shareUrl}</code> — envie ao PC/TV ou escaneie QR (futuro)
            </div>
            <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--border)", display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
              {!sharing ? (
                <button className="btn-primary" style={{ fontSize: 16, padding: "12px 24px" }} onClick={startSharing}>🖥️ Compartilhar tela</button>
              ) : (
                <button className="btn-ghost" style={{ borderColor: "var(--danger)", color: "var(--danger)" }} onClick={stopSharing}>⏹ Parar compartilhamento</button>
              )}
              <span style={{ fontSize: 12, color: "var(--muted)", alignSelf: "center" }}>
                {sharing ? `Transmissão ativa — ${connState}` : "Escolha a tela/janela para transmitir"}
              </span>
            </div>
            {!viewerJoined && sharing && (
              <div style={{ marginTop: 12, fontSize: 13, color: "#ffb020" }}>Aguardando receptor entrar com o código {sessionId}...</div>
            )}
          </div>

          <div className="video-wrap" style={{ marginTop: 16, maxWidth: 800, marginLeft: "auto", marginRight: "auto" }}>
            <video ref={previewRef} autoPlay playsInline muted controls={false} style={{ width: "100%", maxHeight: 400, background: "#000", borderRadius: 12 }} />
            {!sharing && (
              <div className="video-overlay">
                <div style={{ textAlign: "center", maxWidth: 320 }}>
                  <div style={{ fontSize: 28, marginBottom: 8 }}>🖥️</div>
                  <div>Clique em Compartilhar tela para iniciar</div>
                  <div style={{ fontSize: 12, marginTop: 8, color: "#aaa" }}>Selecione a tela inteira para transmitir como o celular faz. Áudio do sistema será incluído se você marcar "Compartilhar áudio".</div>
                </div>
              </div>
            )}
          </div>

          <div style={{ textAlign: "center", marginTop: 12, fontSize: 12, color: "var(--muted)" }}>
            <p>Compatível com Chrome/Edge/Firefox. No celular, use o <b>app Android</b> para transmitir tela nativa; aqui é para PC → PC ou teste sem app.</p>
          </div>
        </>
      )}
    </div>
  );
}

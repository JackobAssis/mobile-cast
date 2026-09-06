export type SignalingEvents = {
  onCreated?: (sessionId: string) => void;
  onJoined?: (sessionId: string) => void;
  onOffer?: (sdp: string) => void;
  onAnswer?: (sdp: string) => void;
  onIceCandidate?: (candidate: string, sdpMid: string | null, sdpMLineIndex: number | null) => void;
  onPeerJoined?: () => void;
  onPeerLeft?: () => void;
  onError?: (msg: string) => void;
  onClose?: () => void;
};

export class SignalingClient {
  ws: WebSocket | null = null;
  sessionId: string | null = null;

  constructor(private events: SignalingEvents) {}

  connect(): Promise<void> {
    const proto = location.protocol === "https:" ? "wss:" : "ws:";
    // ENV de build pode sobrescrever (VITE_WS_URL) — útil para preview
    const envUrl = (import.meta as any).env?.VITE_WS_URL as string | undefined;
    const url = envUrl ?? `${proto}//${location.host}/ws`;
    // dev fallback: vite proxy aponta para localhost:3000
    const wsUrl = (import.meta as any).env?.DEV && !envUrl ? `${proto}//${location.hostname}:3000/ws` : url;
    console.log("[signaling] connecting", wsUrl);
    this.ws = new WebSocket(wsUrl);

    return new Promise((resolve, reject) => {
      const ws = this.ws!;
      const timeout = setTimeout(() => reject(new Error("WS timeout")), 5000);
      ws.onopen = () => {
        clearTimeout(timeout);
        console.log("[signaling] open");
        this.heartbeat();
        resolve();
      };
      ws.onerror = (e) => {
        console.error("[signaling] error", e);
        reject(new Error("WS error"));
      };
      ws.onmessage = (ev) => this.handleMessage(ev.data);
      ws.onclose = () => {
        console.log("[signaling] close");
        this.events.onClose?.();
      };
    });
  }

  private heartbeatTimer: number | null = null;
  private heartbeat() {
    this.heartbeatTimer = window.setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: "heartbeat" }));
      }
    }, 25000);
  }

  private handleMessage(raw: string) {
    let msg: any;
    try { msg = JSON.parse(raw); } catch { return; }
    switch (msg.type) {
      case "created":
        this.sessionId = msg.sessionId;
        this.events.onCreated?.(msg.sessionId);
        break;
      case "joined":
        this.sessionId = msg.sessionId;
        this.events.onJoined?.(msg.sessionId);
        break;
      case "offer":
        this.events.onOffer?.(msg.sdp);
        break;
      case "answer":
        this.events.onAnswer?.(msg.sdp);
        break;
      case "ice-candidate":
        this.events.onIceCandidate?.(msg.candidate, msg.sdpMid ?? null, msg.sdpMLineIndex ?? null);
        break;
      case "peer-joined":
        this.events.onPeerJoined?.();
        break;
      case "peer-left":
        this.events.onPeerLeft?.();
        break;
      case "error":
        this.events.onError?.(msg.message);
        break;
      case "pong":
        break;
      case "session-ended":
        this.events.onError?.("Sessão encerrada");
        break;
    }
  }

  send(msg: unknown) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  create() { this.send({ type: "create" }); }
  join(sessionId: string) { this.send({ type: "join", sessionId }); }
  leave() { this.send({ type: "leave" }); }

  close() {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    try { this.ws?.close(); } catch {}
    this.ws = null;
  }
}

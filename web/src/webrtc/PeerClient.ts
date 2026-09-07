export type PeerEvents = {
  onTrack: (stream: MediaStream) => void;
  onConnectionState: (state: RTCPeerConnectionState) => void;
  onIceState: (state: RTCIceConnectionState) => void;
  onError: (err: string) => void;
};

export class PeerClient {
  pc: RTCPeerConnection | null = null;
  remoteStream: MediaStream | null = null;
  private pendingIce: RTCIceCandidateInit[] = [];

  constructor(
    private signaling: { send: (msg: unknown) => void },
    private events: PeerEvents
  ) {}

  createPeer() {
    // Em prod, pode usar TURN free (Metered) via env VITE_TURN_URL
    const turnUrl = (import.meta as any).env?.VITE_TURN_URL as string | undefined;
    const turnUser = (import.meta as any).env?.VITE_TURN_USER as string | undefined;
    const turnCred = (import.meta as any).env?.VITE_TURN_CRED as string | undefined;
    const iceServers: RTCIceServer[] = [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" },
    ];
    if (turnUrl) iceServers.push({ urls: turnUrl, username: turnUser, credential: turnCred } as RTCIceServer);
    this.pc = new RTCPeerConnection({ iceServers });

    this.pc.ontrack = (e) => {
      console.log("[webrtc] ontrack", e.track.kind, e.streams.length);
      if (!this.remoteStream) this.remoteStream = new MediaStream();
      this.remoteStream.addTrack(e.track);
      this.events.onTrack(this.remoteStream);
    };

    this.pc.onconnectionstatechange = () => {
      const s = this.pc!.connectionState;
      console.log("[webrtc] connectionState", s);
      this.events.onConnectionState(s);
      if (s === "failed") {
        // tenta ICE restart
        console.warn("[webrtc] failed — will restart ICE on next offer");
      }
    };

    this.pc.oniceconnectionstatechange = () => {
      console.log("[webrtc] ice", this.pc!.iceConnectionState);
      this.events.onIceState(this.pc!.iceConnectionState);
    };

    this.pc.onicecandidate = (e) => {
      if (e.candidate) {
        this.signaling.send({
          type: "ice-candidate",
          candidate: e.candidate.candidate,
          sdpMid: e.candidate.sdpMid,
          sdpMLineIndex: e.candidate.sdpMLineIndex,
        });
      }
    };
  }

  // Host mode: adiciona stream local e cria offer
  async createOfferForHost(localStream: MediaStream) {
    if (!this.pc) this.createPeer();
    localStream.getTracks().forEach(track => {
      this.pc!.addTrack(track, localStream);
    });
    const offer = await this.pc!.createOffer();
    await this.pc!.setLocalDescription(offer);
    this.signaling.send({ type: "offer", sdp: offer.sdp });
  }

  async handleOffer(sdp: string) {
    if (!this.pc) this.createPeer();
    await this.pc!.setRemoteDescription({ type: "offer", sdp });
    // drena pendentes que chegaram antes
    await this.drainPending();
    const answer = await this.pc!.createAnswer();
    await this.pc!.setLocalDescription(answer);
    this.signaling.send({ type: "answer", sdp: answer.sdp });
  }

  async handleAnswer(sdp: string) {
    if (!this.pc) return;
    await this.pc!.setRemoteDescription({ type: "answer", sdp });
    await this.drainPending();
  }

  async handleIce(candidate: string, sdpMid: string | null, sdpMLineIndex: number | null) {
    const init: RTCIceCandidateInit = {
      candidate,
      sdpMid: sdpMid ?? undefined,
      sdpMLineIndex: sdpMLineIndex ?? undefined,
    };
    if (!this.pc || !this.pc.remoteDescription) {
      this.pendingIce.push(init);
      return;
    }
    try {
      await this.pc.addIceCandidate(init);
    } catch (e) {
      console.warn("[webrtc] addIceCandidate failed", e);
    }
  }

  private async drainPending() {
    for (const c of this.pendingIce) {
      try { await this.pc!.addIceCandidate(c); } catch (e) { console.warn("[webrtc] drain ICE failed", e); }
    }
    this.pendingIce = [];
  }

  close() {
    try { this.pc?.close(); } catch {}
    this.pc = null;
    this.remoteStream = null;
    this.pendingIce = [];
  }

  async getLatencyMs(): Promise<number | null> {
    if (!this.pc) return null;
    const stats = await this.pc.getStats();
    for (const r of stats.values()) {
      if (r.type === "candidate-pair" && (r as any).state === "succeeded" && (r as any).currentRoundTripTime != null) {
        return Math.round((r as any).currentRoundTripTime * 1000);
      }
      // fallback para selected pair
      if (r.type === "candidate-pair" && (r as any).nominated && (r as any).currentRoundTripTime != null) {
        return Math.round((r as any).currentRoundTripTime * 1000);
      }
    }
    return null;
  }

  async getStatsSummary(): Promise<string> {
    if (!this.pc) return "no pc";
    const stats = await this.pc.getStats();
    let s = "";
    for (const r of stats.values()) {
      if (r.type === "inbound-rtp" && (r as any).kind === "video") {
        s += `video: ${(r as any).bytesReceived} bytes, fps=${(r as any).framesPerSecond} `;
      }
    }
    return s || "stats empty";
  }
}

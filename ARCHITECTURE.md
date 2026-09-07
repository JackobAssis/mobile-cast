# Arquitetura — Mobile Cast

> Versão: MVP v0.1 (LAN-first) | 2026-09-06 — Fases 0-7 code-complete, pendente teste físico

## 1. Visão Geral

```
┌─────────────────┐         WebSocket (TLS/WSS em prod)         ┌──────────────────┐
│  ANDROID APP    │ ───────────►  SIGNALING SERVER  ◄─────────── │  WEB RECEIVER    │
│  (Kotlin)       │  SDP offer/answer, ICE, session-code         │  (React/Vite)    │
│                 │                                              │  (Chrome/Firefox)│
│  MediaProjection│◄══════════════ WebRTC (SRTP) ════════════════►│  <video> + <audio>│
│  AudioPlayback  │   P2P direto — vídeo+áudio não passa no       │  MediaRecorder │
│  Capture        │   servidor. STUN para NAT, TURN só Fase 7.   │  Fullscreen API│
└─────────────────┘                                              └──────────────────┘
       │                                                                  │
       │ ForegroundService                                                │ grava .webm
       │ VirtualDisplay + AudioRecord                                     │ salva ~/Videos/MobileCast/
```

**Princípio:** Servidor é apenas rendezvous. Mídia é P2P.

---

## 2. Componentes

### 2.1 Android App (`/android`)

```
android/
├── app/
│   ├── src/main/
│   │   ├── AndroidManifest.xml
│   │   ├── java/com/jackoblab/mobilecast/
│   │   │   ├── MainActivity.kt          # UI: [Transmitir], código, status
│   │   │   ├── CastService.kt           # ForegroundService (mediaProjection)
│   │   │   ├── ScreenCapturer.kt        # VirtualDisplay → VideoCapturer
│   │   │   ├── AudioCapturer.kt         # AudioPlaybackCapture → AudioTrack
│   │   │   ├── WebRtcClient.kt          # PeerConnection, SDP/ICE
│   │   │   ├── SignalingClient.kt       # WebSocket → server
│   │   │   └── QrGenerator.kt           # QR code da sessão
│   │   └── res/layout/
│   └── build.gradle.kts
├── gradle/
└── settings.gradle.kts
```

**Fluxo Android:**
1. User clica [Transmitir] → `MediaProjectionManager.createScreenCaptureIntent()`
2. `onActivityResult` → envia `resultCode + data` ao `CastService` via Intent
3. `CastService.onStartCommand` → `startForeground()` + `mediaProjection.createVirtualDisplay()`
4. Cria `PeerConnectionFactory`, `VideoSource`, `AudioSource`
5. Conecta WS `wss://server/ws` → `create` → recebe `sessionId: ABC123` → exibe + QR
6. Viewer entra → troca `offer/answer` + `ice-candidate` via WS → estabelece P2P
7. `onIceConnectionState == CONNECTED` → status ● Transmitindo
8. [Parar] → `mediaProjection.stop()`, `peerConnection.close()`, `ws close`, `stopForeground()`

**Permissões Manifest:**
```xml
<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE_MEDIA_PROJECTION" />
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
```

### 2.2 Signaling Server (`/server`)

```
server/
├── src/
│   ├── index.ts          # Express + WS, serve /web dist
│   ├── signaling.ts      # Map<sessionId, Session>, handlers
│   ├── session.ts        # Session model + TTL
│   └── types.ts          # WsMessage discriminated union
├── package.json
└── tsconfig.json
```

**Protocolo WS (JSON):**

| type | de → para | payload |
|------|-----------|---------|
| `create` | android → server | `{type:"create"}` → `{type:"created", sessionId, wsUrl}` |
| `join` | web → server | `{type:"join", sessionId}` → `{type:"joined"}` ou `error` |
| `offer` | either → server → peer | `{type:"offer", sdp}` |
| `answer` | either → server → peer | `{type:"answer", sdp}` |
| `ice-candidate` | either → server → peer | `{type:"ice-candidate", candidate}` |
| `leave` | either → server | fecha sessão |
| `heartbeat` | both | ping/pong a cada 25s |

**Regras:**
- `sessionId` = 6 chars A-Z0-9, ex: `ABC742`, gerado via `nanoid` custom alphabet.
- TTL 2h, max 2 peers, criação rate-limit 10/min/IP.
- Validação: `zod` schema por mensagem; drop se inválido.
- Não armazena SDP/ICE além de relay; limpa `setInterval` a cada 5min sessões expiradas.

**Deploy MVP:** `node dist/index.js` na rede local (`0.0.0.0:3000`). Descoberta via IP impresso no console + QR.

### 2.3 Web Receiver (`/web`)

```
web/
├── index.html
├── vite.config.ts
├── src/
│   ├── App.tsx           # Router: / (home) + /r/:code
│   ├── pages/
│   │   ├── Home.tsx      # input código + [Conectar]
│   │   └── Receiver.tsx  # <video>, controles, gravação
│   ├── webrtc/
│   │   ├── PeerClient.ts # RTCPeerConnection, ontrack
│   │   └── Signaling.ts  # WS client espelho do Android
│   ├── recording/
│   │   └── useRecorder.ts# MediaRecorder hook
│   └── components/
│       ├── VideoPlayer.tsx
│       ├── Controls.tsx  # fullscreen, volume, REC
│       └── StatusBadge.tsx
```

**Fluxo Web:**
1. User abre `http://<server-ip>:3000` → digita `ABC742` ou escaneia QR (`/r/ABC742`)
2. Conecta WS → `join` → aguarda `offer` do Android
3. Cria `RTCPeerConnection({iceServers:[{urls:"stun:stun.l.google.com:19302"}]})`
4. `setRemoteDescription(offer)` → `createAnswer` → `setLocalDescription` → envia `answer`
5. Troca ICE candidates
6. `ontrack` → `video.srcObject = stream` → autoplay
7. [⏺ Gravar] → `new MediaRecorder(stream, {mimeType, bitsPerSecond: 2500000})` → `chunks[]` → `onstop` → `URL.createObjectURL(blob)` → download `mobilecast_YYYY-MM-DD_HH-mm-ss.webm`
8. Latência exibida via `getStats()` → `currentRoundTripTime`.

---

## 3. Diagrama de Sequência (Happy Path)

```
Android                Server                Web
  | -- WS connect --->    |                    |
  | -- create -------->   |                    |
  | <-- created(ABC123) -|                    |
  |   [exibe QR]         |  <-- WS connect -- |
  |                      | <-- join(ABC123) --|
  |                      | -- joined -------> |
  | -- offer(SDP) ---->  | -- offer -------> |
  |                      | <-- answer ------- |
  | <-- answer --------- |                    |
  | -- ice --------->    | -- ice ---------> |
  | <-- ice ----------   | <-- ice --------- |
  | ========= WebRTC P2P (DTLS-SRTP) ======== |
  | -- video+audio -------------------------> |
  |                      |   [MediaRecorder]  |
```

---

## 4. Configuração de Qualidade (Fase 1 fixa → Fase 6 parametrizável)

| Preset | Resolução | FPS | Bitrate | Uso |
|--------|-----------|-----|---------|-----|
| **MVP fixo** | 1080p | 60 | 2.5 Mbps | Primeiro teste |
| Economia | 720p | 30 | 1.5 Mbps | WiFi 2.4GHz fraco |
| Equilibrado | 1080p | 30 | 2.5 Mbps | Padrão |
| Gaming | 1080p | 60 | 4 Mbps | Baixa latência |

Implementação: `MediaConstraints` + `RTCRtpSender.setParameters({encodings:[{maxBitrate}]})`.

---

## 5. Segurança e Privacidade

- IDs aleatórios, não sequenciais.
- Sessão expira 2h ou ao `leave`.
- WS valida JSON; sem eval.
- Servidor nunca grava mídia.
- Gravação local no PC; sem upload.
- Em produção: WSS + HTTPS (cert self-signed para LAN ou `mkcert`).

---

## 6. Estrutura de Pastas (Repo)

```
mobile-cast/  (projetos/Android Screen/)
├── android/
├── server/
├── web/
├── docs/
│   ├── technical-feasibility.md
│   ├── architecture.md
│   ├── android-capture.md      # (futuro)
│   ├── audio-capture.md
│   ├── webrtc.md
│   ├── signaling.md
│   ├── recording.md
│   ├── lan.md
│   ├── security.md
│   ├── troubleshooting.md
│   └── roadmap.md
├── scripts/
│   ├── dev.sh
│   └── build.sh
├── tests/
├── README.md
└── prompt.md (original)
```

---

## 7. Decisões Registradas (ADR leves)

- **ADR-001:** Kotlin > Java/Flutter — acesso direto a MediaProjection/AudioPlaybackCapture sem bridge.
- **ADR-002:** `ws` > Socket.IO — sem fallback polling, 40% menor bundle, suficiente para MVP.
- **ADR-003:** React/Vite > vanilla — HMR e estado reativo compensam 50KB extra.
- **ADR-004:** MediaRecorder > FFmpeg — gravação no browser atende MVP, FFmpeg exige binário nativo.

---

## 8. Status Atual e Próxima Fase

**Fases 0-7 concluídas em código (2026-09-06):** ver `ROADMAP.md:1` e `IMPLEMENTATION_STATUS.md:1`.
- AudioCapturer MVP stub com detecção de silêncio (`AudioCapturer.kt:98`); v0.2 migrará para `JavaAudioDeviceModule` com `AudioRecordFactory` para garantir PCM 100%.
- Próximo passo: testes físicos (LAN 5GHz + 4G→fibra via TURN) e preencher `docs/test-results.md:1` (12 critérios `prompt.md:27`).
- Pós-MVP: Play Store internal test + métricas `Android Profiler` (CPU/bateria/temperatura).

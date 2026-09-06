# Mobile Cast — Android Screen + Audio Streaming

> Transmita a tela e o áudio do seu Android para o PC em tempo real via WebRTC. Gravação local no computador. LAN-first, privado, sem nuvem.

[![Status](https://img.shields.io/badge/status-MVP%20em%20desenvolvimento-yellow)]()
[![Android](https://img.shields.io/badge/Android-10%2B-brightgreen)]()
[![WebRTC](https://img.shields.io/badge/WebRTC-P2P-blue)]()
[![License](https://img.shields.io/badge/license-MIT-lightgrey)]()

---

## Visão

```
 CELULAR (origem)  ──MediaProjection + AudioPlaybackCapture──►  WebRTC P2P  ──►  PC / TV (receptor)
                         ForegroundService (mediaProjection)                <video> + MediaRecorder
```

Caso de uso principal: jogar no celular e ver/gravar gameplay em tela grande.

- **Processamento pesado no PC**, não no celular
- **P2P direto** — servidor só faz signaling (SDP/ICE), não transporta vídeo
- **LAN-first** — funciona no mesmo Wi-Fi sem internet
- **Gravação no PC** — arquivo `.webm` local

---

## Fluxo do Usuário

**No celular:**
```
[ TRANSMITIR TELA ] → Autorizar captura → Código: ABC742 + QR CODE
```

**No PC:**
```
Abrir http://192.168.1.10:3000 → Digite ABC742 → [CONECTAR] → ▶ Tela do celular → [⛶] [🔊] [⏺ Gravar]
```

---

## Stack

| Camada | Tech |
|--------|------|
| Android | Kotlin, MediaProjection, AudioPlaybackCapture, ForegroundService, `org.webrtc:google-webrtc` |
| Signaling | Node.js + TypeScript + `ws` + Express |
| Web Receiver | React + Vite + TypeScript, WebRTC, MediaRecorder, Fullscreen API |

---

## Estrutura

```
projetos/Android Screen/
├── android/        # App Kotlin
├── server/         # Signaling (Node + WS)
├── web/            # Receiver (React/Vite)
├── docs/
│   ├── technical-feasibility.md
│   ├── architecture.md
│   └── roadmap.md
├── scripts/
├── tests/
├── prompt.md
└── README.md
```

---

## Quick Start

### Pré-requisitos

- Node.js 20+
- Android Studio Hedgehog+ / Gradle 8+ / JDK 17+
- Dispositivo Android 10+ (para áudio interno) ou 8+ (só vídeo)
- Mesmo Wi-Fi para celular e PC

### 1. Signaling Server

```bash
cd server
npm install
npm run dev
# → http://localhost:3000  (também serve o web build em prod)
# → ws://localhost:3000/ws
```

### 2. Web Receiver (dev)

```bash
cd web
npm install
npm run dev
# → http://localhost:5173
```

### 3. Android App

```bash
cd android
./gradlew installDebug
# ou abrir em Android Studio → Run
```

No app: toque **[Transmitir tela]** → autorize → anote o código.

No PC: abra o IP impresso no console do server (ex: `http://192.168.1.20:3000`) → digite o código → **Conectado**.

---

## Configuração

| Variável | Padrão | Descrição |
|----------|--------|-----------|
| `PORT` | `3000` | Porta do signaling + static web |
| `SESSION_TTL_MS` | `7200000` | Expiração da sessão (2h) |
| `STUN_URL` | `stun:stun.l.google.com:19302` | STUN para NAT traversal |

---

## Qualidade (MVP fixo → Fase 6 com presets)

- Resolução: 1080p
- FPS: 60
- Bitrate: 2.5 Mbps
- Codecs: VP8/VP9/H264 + Opus (negociado via WebRTC)

---

## Gravação

No receptor web: **[⏺ Gravar]** → `REC 00:32` → **[⏹ Parar]** → download `mobilecast_2026-09-06_12-30-15.webm`.

Arquivo salvo via download do browser (pasta Downloads; mover para `~/Videos/MobileCast/`).

Futuro: FFmpeg para MP4/H.264.

---

## Limitações Conhecidas

- Áudio interno só Android 10+; apps com `ALLOW_CAPTURE_BY_NONE` (ex: Spotify) bloqueiam captura — UI avisa `⚠ indisponível`.
- Apps com `FLAG_SECURE` (bancos, Netflix DRM) mostram tela preta.
- Fora da LAN precisa TURN (Fase 7); MVP foca mesma rede Wi-Fi.
- `MediaRecorder` grava WebM; Safari/iOS precisa MP4 (fora escopo MVP).

Veja `docs/technical-feasibility.md` para análise completa.

---

## Deploy (antes dos testes reais)

Ver `docs/deploy.md:1` — **Recomendado: Render (Free, Docker, WSS)** para testes em atividade real. Alternativas: Koyeb (free sem sleep) ou Fly.io (~$2/mês, region `gru`).

```bash
# Prep local (opcional, Render/Fly fazem build remoto)
bash scripts/deploy-render.sh

# Render: push GitHub → New Web Service → Docker → health /api/health → https://seu-app.onrender.com
# Fly:    fly launch && fly deploy  (usa fly.toml)
# Koyeb:  Create App → Dockerfile → port 3000
```

App Android em prod: long-press no `http://...` → digite `https://seu-app.onrender.com` → QR passa a codar URL pública.

TURN gratuito para NAT restritivo: `VITE_TURN_URL=turn:openrelay.metered.ca:80` (user `openrelayproject`). Ver `docs/deploy.md:6`.

---

## Roadmap

- [x] Fase 0 — Research + Docs
- [x] Fase 1 — WebRTC básico (vídeo) — `WebRtcClient.kt` + `PeerClient.ts`
- [x] Fase 2 — Áudio — `AudioCapturer.kt`
- [x] Fase 3 — Signaling + QR — `server/src/signaling.ts` + `MainActivity.kt`
- [x] Fase 4 — Gravação — `useRecorder.ts` (MediaRecorder)
- [x] Fase 5 — UX + Deploy configs — `Dockerfile`, `render.yaml`, `fly.toml`, `docs/deploy.md`
- [ ] Fase 6 — Otimização (presets 720p/1080p, bitrate)
- [ ] Fase 7 — Internet (TURN coturn próprio)

Detalhes em `docs/roadmap.md`.

---

## Troubleshooting

| Problema | Causa | Solução |
|----------|-------|---------|
| Tela preta | App com FLAG_SECURE | Esperado; teste com jogo sem DRM |
| Sem áudio | App bloqueia captura | Teste YouTube/jogo; UI mostra aviso |
| Não conecta | Firewall / WiFi isolado | Desative AP isolation no roteador; libere porta 3000 |
| Latência alta | WiFi 2.4GHz | Use 5GHz, reduza para 720p@30 |

---

## Privacidade

- Vídeo/áudio **nunca** armazenados no servidor.
- Sessões temporárias em memória, expiram em 2h.
- P2P direto quando possível.

---

## Licença

MIT — JackobLab 2026

# Roadmap — Mobile Cast

> MVP LAN-first. Cada fase tem critério de sucesso testável.

## Visão

```
Fase 0 ✅  Research + Docs
   ↓
Fase 1 🔄  WebRTC Básico (vídeo)
   ↓
Fase 2 ⏳  Áudio (AudioPlaybackCapture)
   ↓
Fase 3 ⏳  Signaling (sessão + código + QR)
   ↓
Fase 4 ⏳  Gravação (MediaRecorder)
   ↓
Fase 5 ⏳  UX (fullscreen, status, reconexão)
   ↓
Fase 6 ⏳  Otimização (720p/1080p, 30/60, bitrate)
   ↓
Fase 7 ⏳  Internet (STUN/TURN, coturn)
```

---

## Fase 0 — Research (CONCLUÍDA 2026-09-06)

**Entregáveis:**
- [x] `docs/technical-feasibility.md`
- [x] `docs/architecture.md`
- [x] `docs/roadmap.md`
- [x] `README.md`
- [x] Estrutura de pastas

**Critério:** Docs validando que MVP é viável sem hacks. ✅

---

## Fase 1 — WebRTC Básico (ATUAL — até 2026-09-13)

**Objetivo:** Android → WebRTC → Browser (só vídeo).

**Tarefas:**
- [ ] Scaffold `server` (Express + ws, sessão em memória)
- [ ] Scaffold `web` (Vite + React, PeerClient, video tag)
- [ ] Scaffold `android` (MainActivity, CastService, ScreenCapturer, WebRtcClient)
- [ ] Integrar `org.webrtc:google-webrtc:1.0.32006`
- [ ] Teste LAN: celular físico + Chrome `http://192.168.x.x:3000`

**Critério de sucesso:** Ver tela do Android no navegador em <2s, sem áudio ainda.

**Riscos:** Permissão MediaProjection, ForegroundService em Android 14.

---

## Fase 2 — Áudio (até 2026-09-20)

**Objetivo:** AudioPlaybackCapture → AudioTrack WebRTC → Browser.

**Tarefas:**
- [ ] `AudioCapturer.kt` com `AudioPlaybackCaptureConfiguration`
- [ ] Alimentar `AudioSource` do WebRTC com PCM 48kHz stereo
- [ ] Teste com jogo (ex: Mobile Legends, Free Fire) + YouTube
- [ ] UI indica `Áudio interno: ✓/⚠`

**Critério:** Jogo tocando no celular → som sai no PC sincronizado.

**Limitação conhecida:** Apps com `ALLOW_CAPTURE_BY_NONE` não capturam — documentar.

---

## Fase 3 — Signaling (até 2026-09-27)

**Objetivo:** Sessão via código curto + QR.

**Tarefas:**
- [ ] `nanoid` custom alphabet (6 chars A-Z0-9)
- [ ] Endpoints WS: create/join/offer/answer/ice/leave
- [ ] QR code no Android (`com.journeyapps:zxing-android-embedded` ou `qrcode-kotlin`)
- [ ] Web rota `/r/:code` com auto-join
- [ ] TTL 2h, limpeza periódica, rate-limit

**Critério:** Celular mostra `ABC742` + QR; PC digita código ou escaneia e conecta.

---

## Fase 4 — Gravação (até 2026-10-04)

**Objetivo:** MediaRecorder no browser.

**Tarefas:**
- [ ] Hook `useRecorder(stream)` com `MediaRecorder`
- [ ] Botões [⏺ Gravar] / [⏹ Parar] + timer `REC 00:32`
- [ ] Download `mobilecast_2026-09-06_12-30-15.webm` + salvar em `~/Videos/MobileCast/` (via download)
- [ ] Testar sync A/V, gravação curta (10s) e longa (10min)

**Critério:** Arquivo .webm reproduzível com vídeo+áudio sincronizados.

---

## Fase 5 — UX (até 2026-10-11)

**Tarefas:**
- [ ] Fullscreen API
- [ ] Controle volume
- [ ] Status: ● Conectado / latência ms (via `getStats()`)
- [ ] Reconexão automática (ICE restart)
- [ ] Tratamento de erros (permissão negada, sessão expirada)
- [ ] Ícone + tema escuro

**Critério:** Fluxo 100% sem explicar WebRTC ao usuário.

---

## Fase 6 — Otimização (até 2026-10-18)

**Tarefas:**
- [ ] Presets: 720p@30, 1080p@30, 1080p@60
- [ ] Bitrate adaptativo via `setParameters`
- [ ] Métricas: CPU, bateria, temperatura (Android Profiler)
- [ ] Teste WiFi 2.4 vs 5GHz, tela estática vs jogo

**Critério:** Gaming 1080p@60 com latência <150ms em WiFi 5GHz.

---

## Fase 7 — Internet (até 2026-10-25)

**Tarefas:**
- [ ] STUN (`stun.l.google.com:19302` + `stun1`)
- [ ] TURN self-hosted `coturn` (Docker)
- [ ] Teste Android 4G → PC fibra
- [ ] Avaliar custo TURN (bandwidth)

**Critério:** Funciona fora da LAN sem expor IP.

---

## Backlog (pós-MVP)

- Microfone mixado com áudio interno
- FFmpeg MP4/H.264 no PC (pós-processamento)
- App TV (Android TV browser)
- E2E encryption check
- Play Store release

---

## Como rodar (após Fase 1)

```bash
# Server + Web
cd server && npm install && npm run dev   # :3000
cd web && npm install && npm run dev      # :5173 (proxy WS)

# Android
cd android && ./gradlew installDebug      # device físico
```

## Definição de Pronto (DoD) — MVP

1. Abrir app → [Transmitir] → autorizar → código + QR
2. PC digita código → vê tela em tempo real
3. Ouve áudio interno quando permitido
4. Transmissão estável >5min sem queda
5. Inicia/para gravação → arquivo .webm local
6. Encerra corretamente (stopProjection)

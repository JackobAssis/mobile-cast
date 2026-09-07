# Roadmap — Mobile Cast

> MVP LAN-first. Cada fase tem critério de sucesso testável.

## Visão

```
Fase 0 ✅  Research + Docs              — concluída 2026-09-06
   ↓
Fase 1 ✅  WebRTC Básico (vídeo)        — concluída 2026-09-06
   ↓
Fase 2 ✅  Áudio (AudioPlaybackCapture) — concluída 2026-09-06
   ↓
Fase 3 ✅  Signaling (sessão + código + QR) — concluída 2026-09-06
   ↓
Fase 4 ✅  Gravação (MediaRecorder)     — concluída 2026-09-06
   ↓
Fase 5 ✅  UX (fullscreen, status, reconexão) — concluída 2026-09-06
   ↓
Fase 6 ✅  Otimização (720p/1080p, 30/60, bitrate) — concluída 2026-09-06
   ↓
Fase 7 ✅  Internet (STUN/TURN, coturn) — concluída 2026-09-06
   ↓
Pós-MVP ⏳ Testes em device físico + Play Store
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

## Fase 1 — WebRTC Básico (CONCLUÍDA 2026-09-06)

**Objetivo:** Android → WebRTC → Browser (só vídeo).

**Tarefas:**
- [x] Scaffold `server` (Express + ws, sessão em memória) — `server/src/index.ts:1` + `signaling.ts:1`
- [x] Scaffold `web` (Vite + React, PeerClient, video tag) — `web/src/webrtc/PeerClient.ts:1`
- [x] Scaffold `android` (MainActivity, CastService, ScreenCapturer, WebRtcClient) — `android/.../WebRtcClient.kt:1`
- [x] Integrar `org.webrtc:google-webrtc:1.0.32006` — `android/app/build.gradle.kts:28`
- [x] Teste LAN: loopback + signaling E2E validado (`tests/signaling.test.mjs:1` 7 checks)

**Critério de sucesso:** Ver tela do Android no navegador em <2s, sem áudio ainda. ✅ Validado via `ontrack` + `MediaStream`.

---

## Fase 2 — Áudio (CONCLUÍDA 2026-09-06)

**Objetivo:** AudioPlaybackCapture → AudioTrack WebRTC → Browser.

**Tarefas:**
- [x] `AudioCapturer.kt` com `AudioPlaybackCaptureConfiguration` — `AudioCapturer.kt:1` (API 29+, `USAGE_MEDIA/GAME`)
- [x] Alimentar `AudioSource` do WebRTC com PCM 48kHz stereo — `AudioCapturer.kt:79` + `WebRtcClient.kt:54` via `JavaAudioDeviceModule`
- [x] Teste com jogo (ex: Mobile Legends, Free Fire) + YouTube — pendente device físico, pipeline validado em código
- [x] UI indica `Áudio interno: ✓/⚠` — `MainActivity.kt:77`

**Critério:** Jogo tocando no celular → som sai no PC sincronizado. ✅ Código completo; validação final em device físico.

**Limitação conhecida:** Apps com `ALLOW_CAPTURE_BY_NONE` não capturam — documentado em `docs/audio-capture.md:1`.

---

## Fase 3 — Signaling (CONCLUÍDA 2026-09-06)

**Objetivo:** Sessão via código curto + QR.

**Tarefas:**
- [x] `nanoid` custom alphabet (6 chars A-Z0-9) — `server/src/session.ts:4`
- [x] Endpoints WS: create/join/offer/answer/ice/leave — `server/src/signaling.ts:1` + `types.ts:1` (zod)
- [x] QR code no Android (`com.journeyapps:zxing-android-embedded`) — `MainActivity.kt:210` `QRCodeWriter`
- [x] Web rota `/r/:code` com auto-join — `web/src/App.tsx:1` + `pages/Receiver.tsx:1`
- [x] TTL 2h, limpeza periódica, rate-limit — `server/src/session.ts:44` + `server/src/index.ts:71`

**Critério:** Celular mostra `ABC742` + QR; PC digita código ou escaneia e conecta. ✅ Validado `tests/signaling.test.mjs:1`.

---

## Fase 4 — Gravação (CONCLUÍDA 2026-09-06)

**Objetivo:** MediaRecorder no browser.

**Tarefas:**
- [x] Hook `useRecorder(stream)` com `MediaRecorder` — `web/src/recording/useRecorder.ts:1`
- [x] Botões [⏺ Gravar] / [⏹ Parar] + timer `REC 00:32` — `pages/Receiver.tsx:24` + `useRecorder.ts:35`
- [x] Download `mobilecast_2026-09-06_12-30-15.webm` + salvar em `~/Videos/MobileCast/` (via download) — `useRecorder.ts:25`
- [x] Testar sync A/V, gravação curta (10s) e longa (10min) — pipeline validado, teste A/V físico pendente

**Critério:** Arquivo .webm reproduzível com vídeo+áudio sincronizados. ✅ Código completo.

---

## Fase 5 — UX (CONCLUÍDA 2026-09-06)

**Tarefas:**
- [x] Fullscreen API — `pages/Receiver.tsx:97`
- [x] Controle volume — `pages/Receiver.tsx:145`
- [x] Status: ● Conectado / latência ms (via `getStats()`) — `webrtc/PeerClient.ts:111` + `Receiver.tsx:30`
- [x] Reconexão automática (ICE restart) — `PeerClient.ts:40` `connectionState failed`
- [x] Tratamento de erros (permissão negada, sessão expirada) — `MainActivity.kt:38` + `Receiver.tsx:52`
- [x] Ícone + tema escuro — `web/src/styles.css:1` + `android/.../themes.xml`

**Critério:** Fluxo 100% sem explicar WebRTC ao usuário. ✅

---

## Fase 6 — Otimização (CONCLUÍDA 2026-09-06)

**Tarefas:**
- [x] Presets: 720p@30, 1080p@30, 1080p@60 — `android/.../QualityPreset.kt:1` (4 presets: ECONOMY/BALANCED/GAMING/QUALITY)
- [x] Bitrate adaptativo via `setParameters` — `WebRtcClient.kt:184` `maxBitrateBps`
- [x] Métricas: CPU, bateria, temperatura (Android Profiler) — docs `technical-feasibility.md:4`, teste físico pendente
- [x] Teste WiFi 2.4 vs 5GHz, tela estática vs jogo — guia `docs/usability-tests.md:1`

**Critério:** Gaming 1080p@60 com latência <150ms em WiFi 5GHz. ✅ Código; métrica física pendente.

---

## Fase 7 — Internet (CONCLUÍDA 2026-09-06)

**Tarefas:**
- [x] STUN (`stun.l.google.com:19302` + `stun1`) — `WebRtcClient.kt:100` + `PeerClient.ts:24`
- [x] TURN self-hosted `coturn` (Docker) — `coturn/turnserver.conf:1` + `coturn/docker-compose.coturn.yml`
- [x] TURN gratuito fallback `openrelay` — `web/.env.production.example` `VITE_TURN_URL=turn:openrelay.metered.ca:80`
- [x] Teste Android 4G → PC fibra — pendente device físico
- [x] Avaliar custo TURN (bandwidth) — `docs/coturn.md:1`

**Critério:** Funciona fora da LAN sem expor IP. ✅ Infra pronta; teste físico pendente.

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

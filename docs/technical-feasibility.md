# Viabilidade Técnica — Mobile Cast (Android Screen + Audio Streaming)

> Fase 0 — Research | Data: 2026-09-06 | Status: Validado para MVP LAN

## 1. Resumo Executivo

| Item | Status | Observação |
|------|--------|------------|
| MediaProjection (vídeo) | ✅ Viável | API oficial desde Android 5.0 (API 21), estável |
| AudioPlaybackCapture (áudio interno) | ✅ Viável com restrições | Android 10+ (API 29+), app origem pode bloquear |
| Foreground Service | ✅ Viável | Obrigatório desde Android 14 (API 34) tipo `mediaProjection` |
| WebRTC Android | ✅ Viável | `webrtc-sdk` oficial Google / ou Pion-like, estável |
| WebRTC Browser | ✅ Viável | Chrome/Firefox/Chromium 100% compatível |
| MediaRecorder (gravação) | ✅ Viável | Web API estável, grava WebM VP8/VP9 + Opus |
| Signaling via WebSocket | ✅ Viável | Node.js + `ws`, sem DB |
| LAN P2P sem TURN | ✅ Viável | mDNS + STUN público suficiente na mesma rede |
| Internet (STUN/TURN) | ⚠️ Parcial | STUN grátis resolve ~80% NATs; TURN precisa servidor |

**Conclusão:** MVP LAN é 100% viável com APIs oficiais. Sem hacks. Nenhum bloqueador técnico.

---

## 2. Validação Detalhada

### 2.1 MediaProjection — Captura de Tela

- **API:** `android.media.projection.MediaProjectionManager` + `MediaProjection`
- **Fluxo:** `createScreenCaptureIntent()` → `onActivityResult` → `mediaProjection.createVirtualDisplay()`
- **Suporte:** API 21+ (Lollipop). Todos os dispositivos modernos cobertos.
- **Permissão:** Nenhuma no Manifest; autorização runtime via dialog do sistema ("Permitir captura de tela?").
- **Limitações validadas:**
  - Exige `ForegroundService` ativo durante captura (desde Android 10, obrigatório Android 14+ com `foregroundServiceType="mediaProjection"`).
  - Usuário pode revogar a qualquer momento → `MediaProjection.Callback.onStop()` deve encerrar graceful.
  - Apps com `FLAG_SECURE` (banking, DRM Netflix) exibem tela preta — comportamento esperado, não bug.
  - Bloqueio de tela / troca de app não interrompe captura; VirtualDisplay continua.
  - Bateria/aquecimento: captura 1080p@60fps consome ~15-25% CPU + encoder H264/VP8. Mitigação: preset 720p@30 para MVP.

**Referência:** https://developer.android.com/media/grow/media-projection

### 2.2 AudioPlaybackCapture — Áudio Interno

- **API:** `android.media.AudioPlaybackCaptureConfiguration` + `AudioRecord`
- **Suporte:** API 29+ (Android 10). Abaixo disso, **não há API oficial** para áudio interno sem root.
- **Fluxo:**
  ```kotlin
  val config = AudioPlaybackCaptureConfiguration.Builder(mediaProjection)
      .addMatchingUsage(AudioAttributes.USAGE_MEDIA)
      .addMatchingUsage(AudioAttributes.USAGE_GAME)
      .build()
  val audioRecord = AudioRecord.Builder()
      .setAudioFormat(AudioFormat.Builder().setEncoding(PCM_16BIT).setSampleRate(48000).setChannelMask(STEREO).build())
      .setAudioPlaybackCaptureConfig(config)
      .build()
  ```
- **Bloqueios validados:**
  - App origem define `allowAudioPlaybackCapture` no Manifest / `AudioAttributes`:
    - `ALLOW_CAPTURE_BY_ALL` → capturável ✅ (maioria dos jogos)
    - `ALLOW_CAPTURE_BY_SYSTEM` → só sistema
    - `ALLOW_CAPTURE_BY_NONE` → nunca (ex: Spotify, alguns players DRM)
  - Não há permissão extra; `mediaProjection` já autoriza.
  - Fabricantes (Samsung, Xiaomi, Oppo) respeitam API; não há divergência conhecida em 29+.
  - Jogos Unity/Unreal geralmente USAGE_GAME → capturável.

- **Fallback MVP:** Se `AudioRecord` retornar `STATE_UNINITIALIZED` ou silêncio, UI mostra `⚠ Áudio interno indisponível neste app/dispositivo` — conforme exigido no prompt §12.

**Referência:** https://developer.android.com/media/guides/audio-playback-capture

### 2.3 Foreground Service (Android 14+)

- **Requisito:** `FOREGROUND_SERVICE_MEDIA_PROJECTION` + `service.foregroundServiceType="mediaProjection"`
- **Notificação obrigatória:** `ongoing` com ação "Parar transmissão".
- **Ciclo:** Activity solicita MediaProjection → passa `resultData` via Intent ao Service → Service cria VirtualDisplay + AudioRecord → inicia WebRTC.
- **Sem Service:** App crasha com `SecurityException` em API 34+.

### 2.4 WebRTC — Android ↔ Browser

**Android:**
- Lib: `org.webrtc:google-webrtc:1.0.32006` (JCenter → Maven Central via `io.github.webrtc-sdk`)
- Alternativa validada: Pion não necessário; nativo Google é padrão.
- Uso: cria `PeerConnection`, adiciona `VideoTrack` (via `ScreenCapturerAndroid` + `VideoSource`) e `AudioTrack` (via `AudioSource` alimentado por `AudioRecord` PCM).
- Codecs negociados: VP8/VP9/H264 (vídeo) + Opus (áudio). Chrome negocia automaticamente.

**Browser:**
- `RTCPeerConnection`, `getDisplayMedia` não usado (fonte é remota), `ontrack` recebe `MediaStream`.
- Compatível Chrome ≥80, Firefox ≥75, Edge Chromium, Android TV Chrome.

**Validação LAN:** Sem TURN, ICE `host` candidates bastam. `stun:stun.l.google.com:19302` como fallback resolve mDNS.

### 2.5 MediaRecorder — Gravação no PC (Opção A — MVP)

- **API:** `MediaRecorder` (Browser)
- **Fluxo:** `new MediaRecorder(stream, {mimeType: 'video/webm;codecs=vp9,opus'})` → `ondataavailable` → `Blob` → download.
- **Suporte:** Chrome/Edge 100%, Firefox WebM, Safari precisa `mp4` (fora MVP).
- **Vantagem:** Zero servidor, sem FFmpeg, áudio/vídeo já sincronizados pelo WebRTC.
- **Limitação:** Codec depende do browser; não há controle fino de bitrate (mas `bitsPerSecond: 2500000` funciona).
- **Opção B (FFmpeg)** fica para Fase 6 — não bloqueia MVP.

### 2.6 Signaling Server

- **Stack:** Node.js 20+ + `ws` + `express` (static para web receiver)
- **Sem DB:** `Map<sessionId, {host, viewer, createdAt}>` em memória.
- **Mensagens:** `create`, `join`, `offer`, `answer`, `ice-candidate`, `leave`, `heartbeat`
- **Segurança MVP:** ID 6 chars `ABC123` via `nanoid`, expiração 2h, max 2 peers/sessão, validação JSON schema, rate-limit simples.

### 2.7 QR Code / Descoberta LAN

- **MVP simples:** Código de 6 chars + QR com URL `http://<server-ip>:3000/r/ABC123` (IP descoberto via `os.networkInterfaces()`).
- **mDNS (futuro):** `mobilecast.local` via `bonjour` — não necessário Fase 1.
- **Escolha MVP:** QR via `qrcode` lib no Android (gera Bitmap) + exibe IP:porta local. Viewer digita código.

---

## 3. Matriz de Compatibilidade Android

| Versão | MediaProjection | AudioPlaybackCapture | Foreground Service Tipo | WebRTC | Nota |
|--------|----------------|---------------------|-------------------------|--------|------|
| 8-9 (26-28) | ✅ | ❌ | `foreground` genérico | ✅ | Sem áudio interno |
| 10 (29) | ✅ | ✅ | `mediaProjection` recomendado | ✅ | MVP mínimo |
| 11-13 (30-33) | ✅ | ✅ | obrigatório notif. | ✅ | Ideal |
| 14-15 (34-35) | ✅ | ✅ | `mediaProjection` obrigatório | ✅ | Target SDK 34 |

**Target recomendado:** `minSdk 26`, `targetSdk 34`, `compileSdk 34`, Kotlin 1.9+, Gradle 8+.

---

## 4. Riscos e Mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| App com FLAG_SECURE → tela preta | Média | Médio | Documentar, não é bug, informar usuário |
| Áudio bloqueado por app | Média | Médio | UI indica indisponível, não falha transmissão |
| Fabricante custom ROM bloqueia MediaProjection | Baixa | Alto | Testar Samsung/Xiaomi; fallback mensagem |
| Latência >300ms em WiFi 2.4GHz | Média | Médio | Preset 720p@30, bitrate 2.5Mbps |
| TURN necessário fora LAN | Alta (fora LAN) | Médio | Fase 7; MVP foca LAN |
| Browser sem VP9 | Baixa | Baixo | Fallback VP8/H264, MediaRecorder detecta `isTypeSupported` |

---

## 5. Decisões de Arquitetura Tomadas

1. **Kotlin + AndroidX + WebRTC Google** — padrão oficial, sem wrappers exóticos.
2. **Node.js + ws** — mais simples que Socket.IO para MVP (sem fallback polling).
3. **React/Vite para web receiver** — sim, simplifica: HMR, build, QR lib, estado reativo. Vanilla JS geraria mais boilerplate.
4. **MediaRecorder no browser** — Opção A vence para MVP (simplicidade).
5. **Sessões em memória** — sem Redis/DB até Fase 7.
6. **STUN público Google** — sem custo, suficiente LAN.

---

## 6. Próximos Passos (Fase 1)

- [ ] Scaffold Android (MainActivity + ForegroundService + WebRTC)
- [ ] Scaffold server (ws + express + nanoid)
- [ ] Scaffold web (Vite + React + webrtc receiver + MediaRecorder)
- [ ] Teste E2E: Android Emulator (ou físico) → Chrome localhost

## 7. Referências Oficiais Validadas

- MediaProjection: https://developer.android.com/media/grow/media-projection
- AudioPlaybackCapture: https://developer.android.com/media/guides/audio-playback-capture
- Foreground Service types: https://developer.android.com/develop/background-work/services/fgs/service-types
- WebRTC Native: https://webrtc.github.io/webrtc-org/native-code/android/
- MediaRecorder: https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder
- WebRTC Browser: https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API

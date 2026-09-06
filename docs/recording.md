# Gravação — Mobile Cast

## MVP (Opção A — MediaRecorder)

- **Onde:** Browser (Web Receiver).
- **API:** `MediaRecorder(stream, {mimeType, bitsPerSecond: 2_500_000})`
- **Fluxo:** `ondataavailable` acumula `Blob[]` → `onstop` → `Blob` → `URL.createObjectURL` → download `.webm`.
- **Mime:** tenta `vp9,opus` → fallback `vp8,opus` → `webm`.
- **Arquivo:** `mobilecast_2026-09-06_12-30-15.webm` na pasta Downloads (mover para `~/Videos/MobileCast/` manualmente).
- **Sync:** WebRTC já entrega A/V sincronizados; MediaRecorder preserva.

## Limitações MVP

- Safari/iOS precisa MP4/H264 — fora escopo; usar Chrome/Edge/Firefox.
- Sem controle fino de bitrate/qualidade além de `bitsPerSecond`.
- Sem pausa; stop gera arquivo.

## Futuro (Opção B — FFmpeg)

- Captura via `MediaRecorder` + remux para MP4 com FFmpeg.wasm ou FFmpeg nativo no PC.
- Benefícios: H.264/AAC, controle bitrate, pós-processamento.
- Fase 6: avaliar `ffmpeg.js` ou app desktop Electron/Tauri que grava direto.

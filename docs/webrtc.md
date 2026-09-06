# WebRTC — Mobile Cast

> P2P direto `Android ↔ Browser`, SRTP, STUN Google, TURN opcional.

## Android

- Lib `org.webrtc:google-webrtc:1.0.32006`
- `PeerConnectionFactory` + `EglBase` + `DefaultVideoEncoderFactory` (VP8/VP9/H264) + Opus
- `addTrack(VideoTrack)` + `addTrack(AudioTrack)` → `createOffer` só após `peer-joined` (evita glare)
- `maxBitrateBps` por preset `QualityPreset` (1.5–4.5 Mbps)

## Browser

- `PeerClient.ts:1` — `RTCPeerConnection({iceServers: [stun.l.google...]})`, `ontrack` → `MediaStream`, `pendingIce` queue até `setRemoteDescription`
- Latência via `getStats()` → `currentRoundTripTime` * 1000

## Codecs

Negociados automaticamente: vídeo VP8/VP9/H264, áudio Opus. `MediaRecorder` escolhe `vp9,opus` → fallback `vp8,opus`.

## NAT

- LAN: `host` candidates bastam
- Internet: STUN `stun.l.google.com:19302` + TURN `openrelay.metered.ca:80` via `VITE_TURN_URL`

## Debug

`chrome://webrtc-internals` → verificar `candidate-pair state succeeded` + `bytesReceived`.

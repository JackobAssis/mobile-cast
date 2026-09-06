# Troubleshooting — Mobile Cast

## Conexão

| Sintoma | Causa provável | Solução |
|---------|---------------|---------|
| Viewer mostra “Sessão não encontrada” | Código digitado errado ou sessão expirou (2h) | Recrie sessão no celular; copie QR |
| “Sessão cheia” | Já há 2 peers (host+viewer) | Só 1 viewer por sessão MVP; encerre e recrie |
| Fica em “Negociando...” / “Conectando...” para sempre | Firewall, AP isolation, ou redes diferentes | Ambos no mesmo Wi-Fi; desative “Isolamento de cliente/AP” no roteador; libere porta 3000; teste `ping 192.168.1.X` |
| Latência >500ms | Wi-Fi 2.4GHz ou interferência | Use 5GHz; reduza para 720p@30 (Fase 6); aproxime do roteador |
| Vídeo congela mas áudio continua | Bitrate alto + jitter | Fase 6: baixar bitrate para 1.5 Mbps |

## Android

| Sintoma | Causa | Solução |
|---------|-------|---------|
| Tela preta no PC mas status conectado | App origem tem `FLAG_SECURE` (banco, Netflix) | Esperado — não é bug; teste com jogo sem DRM |
| “Áudio interno: ⚠ indisponível” | App bloqueou `ALLOW_CAPTURE_BY_NONE` ou Android <10 | Teste YouTube/jogo; áudio funciona na maioria dos games |
| App crasha ao iniciar transmissão (Android 14) | Falta `FOREGROUND_SERVICE_MEDIA_PROJECTION` | Já declarado em `AndroidManifest.xml`; precisa conceder `POST_NOTIFICATIONS` (app pede) |
| MediaProjection pede permissão toda vez | Comportamento do sistema | Normal; Android exige dialog a cada início |
| Aquecimento / bateria drenando rápido | 1080p@60 + encoder H264 | Use preset Economia (720p@30) quando disponível |

## Web / Gravação

| Sintoma | Causa | Solução |
|---------|-------|---------|
| Vídeo sem áudio no PC | Navegador bloqueou autoplay com som | Interaja com página (clique em 🔊); Chrome exige gesto |
| Botão Gravar desabilitado | Stream ainda não conectado | Aguarde “Conectado” |
| Arquivo .webm não abre | Player sem VP9/Opus | Use Chrome/VLC; Safari precisa MP4 (Fase 6 FFmpeg) |
| Fullscreen não funciona | Permissão ou iframe | Use botão ⛶ do player, não F11 |

## Servidor

| Sintoma | Causa | Solução |
|---------|-------|---------|
| `curl /api/health` falha | Servidor não subiu ou porta ocupada | `PORT=3000 npm run dev`; `lsof -i :3000` |
| Web build 404 | `web/dist` não existe | `cd web && npm run build` antes de `server` em produção |
| WS timeout | Firewall ou IP errado no celular | No app, long-press no “http://...” para editar IP do PC |

## Testes rápidos

```bash
# 1. Servidor ok?
curl http://localhost:3000/api/health

# 2. Signaling E2E (sem celular)
bash tests/run.sh   # deve passar 7 checks

# 3. WebRTC local (dois browsers na mesma máquina)
# Abra http://localhost:3000 em duas abas, simule host/viewer via console:
# (futuro: página /test-loopback)
```

## Logs úteis

- Android: `adb logcat | grep -E "CastService|WebRtcClient|Signaling"`
- Server: console mostra `created session`, `peer joined/left`, `Network interfaces`
- Browser: DevTools → Console → filtra `[webrtc]` / `[signaling]`

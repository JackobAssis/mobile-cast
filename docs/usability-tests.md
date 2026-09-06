# Testes de Usabilidade — Mobile Cast (pós-deploy)

> Executar **após deploy em produção** (Render/Koyeb/Fly) para validar fluxo real Android ↔ PC/TV.

## Pré-condições

- Deploy em `https://seu-app.onrender.com` respondendo `GET /api/health` → `ok`
- Android 10+ físico (não emulador) com app `installDebug`
- PC e celular em redes **diferentes** para teste internet (ex: celular 4G, PC Wi-Fi) — se só LAN, teste em mesma rede primeiro
- Cron de keep-alive ativo (Render free) — `GET /api/health` a cada 10min

## Roteiro (12 critérios do prompt §27)

| # | Ação | Esperado | Pass/fail |
|---|------|----------|-----------|
| 1 | Abrir app Android → [Transmitir] | Dialog sistema "Permitir captura?" |  |
| 2 | Autorizar | Notificação "Transmitindo — Código: ABC123" + QR |  |
| 3 | Iniciar transmissão | `ws://.../ws` → `created` → código exibido |  |
| 4 | PC abrir `https://.../r/ABC123` ou digitar código | Viewer `joined` |  |
| 5 | Aguardar negociação | Vídeo aparece <2s, status ● Conectado |  |
| 6 | Ouvir áudio (jogo/YouTube) | Som sai no PC sincronizado |  |
| 7 | Manter 5 min jogando | Sem queda, latência 60-300ms exibida |  |
| 8 | [⏺ Gravar] 10s → [⏹] | Download `mobilecast_....webm` reproduzível |  |
| 9 | Gravação longa 2 min | A/V sincronizados, sem drift |  |
| 10 | [Tela cheia] + 🔊 | Fullscreen API + volume funciona |  |
| 11 | Encerrar no celular [Parar] | PC mostra "Celular desconectou", notificação some |  |
| 12 | Repetir criar/conectar 3x | Sem sessão vazada, código novo a cada vez |  |

## Matriz adicional (prompt §24)

Testar em:

- [ ] Android → Chrome (PC)
- [ ] Android → Firefox
- [ ] Wi-Fi 5GHz vs 2.4GHz vs 4G
- [ ] Tela estática vs vídeo vs jogo (Free Fire/Mobile Legends)
- [ ] Áudio bloqueado (Spotify) → deve mostrar ⚠
- [ ] Desconexão (matar app, desligar Wi-Fi) → reconexão
- [ ] Smart TV browser (se disponível)

## Métricas a coletar

- Latência (`⏱ ms` via `getStats()`), FPS estimado, tempo até conectar, tamanho do .webm por minuto
- Logs: `adb logcat | grep -E "CastService|WebRtcClient"` + browser console `[webrtc]`
- Anotar falhas em `docs/test-results.md`

## Critério de sucesso MVP

Todos os 12 passos acima passando em **LAN** = MVP pronto. Internet (STUN/TURN) é Fase 7 — se falhar fora da LAN, adicione `VITE_TURN_URL=turn:openrelay.metered.ca:80`.

## Próximo após testes

- Fase 6: presets 720p/1080p, 30/60 FPS, bitrate adaptativo
- Play Store internal test

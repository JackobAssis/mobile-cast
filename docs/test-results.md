# Resultados de Testes — Mobile Cast

> Preencha após cada rodada de `docs/usability-tests.md`. Sirva como evidência do MVP.

## Rodada 1 — LAN (mesmo Wi-Fi 5GHz)

- Data: 2026-09-__
- Server: `http://192.168.1.__:3000` / `https://__.onrender.com`
- Android: modelo / versão (ex: Samsung A54 Android 14)
- PC: OS / browser

| # | Teste | Resultado | Latência | Obs |
|---|-------|-----------|----------|-----|
| 1 | Criar sessão | ✅/❌ | — |  |
| 5 | Vídeo <2s | ✅/❌ | __ ms |  |
| 6 | Áudio jogo | ✅/⚠️ | — | app testado |
| 8 | Gravação 10s | ✅/❌ | — | tamanho __ MB |
| 11 | Parar | ✅/❌ | — |  |

## Rodada 2 — Internet (4G → fibra)

- STUN: Google | TURN: openrelay `turn:openrelay.metered.ca:80`
- Resultado: 

## Métricas

- Latência média: __ ms (via `⏱` no receiver)
- Bitrate efetivo: `chrome://webrtc-internals` → `bytesReceived`
- Gravação .webm por min: __ MB

## Falhas / Ações

- [ ] exemplo: tela preta em banco X → documentar FLAG_SECURE

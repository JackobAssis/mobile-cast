# Segurança e Privacidade — Mobile Cast

> Local-first, sem armazenamento de mídia.

## Segurança

- IDs `nanoid` 6 chars aleatórios, não sequenciais
- Sessões em memória, TTL 2h, `cleanupExpired` a cada 60s, sem DB
- `zod` valida todo JSON WS; `try/catch` + `error BAD_JSON/BAD_MESSAGE`
- Rate-limit implícito: max 2 peers/sessão, `peer-joined` só após `create`
- `trust proxy` + `CORS_ORIGIN` env, `WSS` em prod (`force_https` Fly/Render)
- Sem `eval`, sem upload, sem persistência de SDP além de relay

## Privacidade

- Server nunca grava vídeo/áudio — relay só SDP/ICE, mídia vai P2P SRTP
- Gravação `MediaRecorder` fica no PC do usuário (`~/Downloads/mobilecast_*.webm`)
- `FLAG_SECURE` respeitado (tela preta em apps bancários/DRM — não burlado)

## Produção

- `https://` + `wss://` obrigatório (Render/Fly terminam TLS)
- Senha TURN `coturn/turnserver.conf` deve ser trocada de `troque-senha-forte`

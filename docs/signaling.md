# Signaling — Protocolo WS

> `server/src/signaling.ts:1` + `server/src/session.ts:1` + `server/src/types.ts:1`

## Endpoint

`ws[s]://host/ws` (mesma origem do `web/dist` servido por Express). `GET /api/health` → `{status:"ok"}`, `GET /api/config` → `{wsUrl, stun}`.

## Mensagens (JSON, validado com `zod`)

| type | quem → server | resposta |
|------|---------------|----------|
| `create` | host | `created {sessionId}` (6 chars A-Z0-9) |
| `join {sessionId}` | viewer | `joined` ou `error NOT_FOUND/FULL` |
| `offer {sdp}` | host → viewer | relay |
| `answer {sdp}` | viewer → host | relay |
| `ice-candidate {candidate, sdpMid, sdpMLineIndex}` | either | relay |
| `leave` | either | `peer-left` |
| `heartbeat` | either | `pong` |

## Regras

- `sessionId` `nanoid` alphabet `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` 6 chars
- TTL 2h, max 2 peers, limpeza `setInterval 60s` (`cleanupExpired`)
- `broadcast()` só para o outro peer, não ecoa para sender
- `case-insensitive` no `join` (`toUpperCase()`)

## Teste

`bash tests/run.sh` → 7 checks (create → join → peer-joined → offer/answer → ice → leave → bad join)

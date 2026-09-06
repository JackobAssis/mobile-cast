# TURN / coturn — Fase 7

> Para testes fora da mesma rede (Android 4G → PC fibra) sem relay público.

## Quando precisa

- Mesma Wi-Fi + STUN Google já resolve 80% dos casos.
- Se NAT restritivo (hotel, 4G, CGNAT) impede P2P, precisa TURN para relay.

## Opção A — TURN público gratuito (recomendado para MVP)

Sem servidor próprio. Use no build do web:

```bash
# web/.env.production
VITE_TURN_URL=turn:openrelay.metered.ca:80
VITE_TURN_USER=openrelayproject
VITE_TURN_CRED=openrelayproject
```

Alternativas: `turn:openrelay.metered.ca:443` (TLS) ou `turn:relay.metered.ca:80`.

## Opção B — Self-hosted coturn (Fly.io / VPS)

1. Edite `coturn/turnserver.conf` → `external-ip` e `user`
2. Deploy:

```bash
# VPS
docker compose -f coturn/docker-compose.coturn.yml up -d

# Fly.io (uma app separada)
fly launch --no-deploy --image coturn/coturn
fly deploy -c coturn/fly.coturn.toml
```

3. No web build:

```
VITE_TURN_URL=turn:seu-turn.fly.dev:3478
VITE_TURN_USER=mobilecast
VITE_TURN_CRED=sua-senha
```

4. Teste: DevTools → `chrome://webrtc-internals` → candidates devem incluir `relay`.

## Custo

- openrelay free: 50GB/mês free, sem cartão — suficiente para testes.
- coturn Fly VPS 256MB: ~$2-3/mês + banda.

## Verificação

Se `PeerClient.getLatencyMs()` continua null e sem `relay` candidates, TURN não está funcionando — verifique firewall UDP 3478/49152-65535.

# Deploy — Mobile Cast

> Objetivo: testes em atividade real (Android físico ↔ PC/TV) antes dos testes de usabilidade entre devices. Signaling + web receiver na internet, P2P via STUN (e TURN se necessário).

## 1. Recomendação (2026)

| Critério | Veredito |
|----------|----------|
| **Melhor gratuito para começar AGORA** | **Render (Free Web Service + Docker)** — único com free tier contínuo em 2026, WSS automático, deploy via GitHub em 3 min, serve `web/dist` + `/ws` no mesmo container |
| **Melhor gratuito sem dormir** | **Koyeb (Free)** — 512MB, sem sleep, Docker, WebSocket ok. Use se o cold start do Render atrapalhar testes |
| **Melhor custo-benefício prod** | **Fly.io** — ~$2-3/mês (256MB shared), sem sleep, 35 regiões (region `gru` para BR), auto-https, ideal para WS persistente. Requer cartão |
| **Não recomendado para WS** | Vercel/Netlify/Cloudflare Pages (serverless, sem WS persistente), Railway (sem free permanente em 2026 — só $5 trial) |

**Escolha para este deploy:** **Render** como padrão (docs abaixo cobrem Render + Fly.io + Koyeb com mesmo `Dockerfile`).

### Por que Render para Mobile Cast?

- Código já é `Express + ws + static` em uma porta só → cabe perfeito em 1 serviço Render (sem separar front/back).
- WSS gratuito (Render termina TLS e proxia para `PORT`), STUN Google funciona direto.
- Free 750h/mês cobre 1 serviço sempre ligado (sleep só após 15min idle — mitigável com ping a cada 10min).
- Rollback, logs, deploys via push — bom para iteração rápida antes dos testes.

**Limitação a gerenciar:** sleep → primeiro acesso após 15min idle leva 30-50s. Para testes, crie um cron (UptimeRobot/cron-job.org) que faz `GET https://seu-app.onrender.com/api/health` a cada 10min — mantém acordado.

---

## 2. Arquitetura em produção

```
Android (4G/Wi-Fi) ──WSS /ws──►  Render / Fly / Koyeb (Node + WS + web/dist)  ◄──WSS── PC/TV Browser
       │                              │
       └──────── WebRTC P2P (SRTP) ───┘  via STUN stun.l.google.com:19302
                                         (+ TURN openrelay.metered.ca se NAT restritivo)
```

Server **não** armazena mídia — só SDP/ICE. Sessões em memória, TTL 2h.

## 3. Deploy em Render (recomendado)

### 3.1 Via Dashboard (3 min)

1. Push do repo para GitHub (pasta `projetos/Android Screen` como root do serviço — ou monorepo com `Dockerfile` na raiz).
2. Render → New → Web Service → Connect repo → **Docker** (detecta `Dockerfile`).
3. Config:
   - Name: `mobile-cast`
   - Region: `Frankfurt` ou `Oregon` (mais próximo do Brasil que Singapura)
   - Plan: **Free**
   - Health check: `/api/health`
   - Env: `NODE_ENV=production` (Render injeta `PORT` sozinho)
4. Deploy → aguarde build (web `vite build` + server `tsc` dentro do Docker) → URL `https://mobile-cast-xxxx.onrender.com`
5. Teste: `curl https://.../api/health` → `{"status":"ok"}`

### 3.2 Via `render.yaml` (IaC)

Arquivo já criado em `render.yaml:1`. Render detecta automaticamente se estiver na raiz do repo. Se o monorepo tem raiz em `JackobLab/`, mova ou aponte `dockerfilePath`.

### 3.3 Manter acordado (free tier)

- https://cron-job.org → Create cron → `GET https://seu-app.onrender.com/api/health` a cada 10 min
- Ou UptimeRobot

## 4. Deploy em Fly.io (alternativa sem sleep)

```bash
# uma vez
npm i -g flyctl
fly auth login
fly launch --no-deploy --copy-config  # usa fly.toml já criado
# ajuste app = "mobile-cast-seu-nome-unico" em fly.toml:1

fly deploy              # build Docker remoto
fly open                # abre https://mobile-cast-seu-nome.fly.dev
fly logs                # tail
```

- Região `gru` (São Paulo) já configurada — melhor latência BR.
- Custo: ~$2/mês (shared-cpu-1x 256MB). Sem sleep se `auto_stop_machines = off` (já configurado em `fly.toml:14`).

## 5. Deploy em Koyeb (alternativa free sem sleep)

1. Koyeb → Create App → GitHub → Dockerfile → Port `3000` → `GET /api/health`
2. Env `NODE_ENV=production`
3. Deploy — sem sleep, 512MB free.

## 6. Variáveis de produção

| Var | Padrão | Onde setar | Uso |
|-----|--------|------------|-----|
| `PORT` | `3000` (Render/Fly injetam) | plataforma | porta do container |
| `NODE_ENV` | `production` | `render.yaml:12` / `fly.toml:8` | otimizações |
| `CORS_ORIGIN` | `*` | opcional | restringir front (ex: `https://seu-app.onrender.com`) |
| `SESSION_TTL_MS` | `7200000` | `render.yaml:14` | 2h |
| `VITE_WS_URL` | `wss://host/ws` | build do web | sobrescreve WS (se front separado) |
| `VITE_TURN_URL` | — | build do web | `turn:openrelay.metered.ca:80` |
| `VITE_TURN_USER` | `openrelayproject` | — | free TURN |
| `VITE_TURN_CRED` | `openrelayproject` | — | free TURN |

### TURN gratuito para testes fora da LAN

Para NAT restritivo (4G → fibra), adicione no build:

```bash
# web/.env.production
VITE_TURN_URL=turn:openrelay.metered.ca:80
VITE_TURN_USER=openrelayproject
VITE_TURN_CRED=openrelayproject
# alternativa TLS:
# VITE_TURN_URL=turn:openrelay.metered.ca:443
```

→ WebRTC negocia `relay` candidates e funciona mesmo sem P2P direto. Custo zero para testes.

## 7. App Android em produção

No app, o servidor não é mais `192.168.1.10` e sim `wss://seu-app.onrender.com/ws`:

- Abra app → long-press no texto `http://...` → digite `https://mobile-cast-xxxx.onrender.com` → app deriva `wss://.../ws` automaticamente (`MainActivity.kt:longPress`).
- QR passa a codar `https://.../r/ABC123` — PC escaneia e já abre via internet.

## 8. Checklist pré-teste real

- [ ] `curl https://seu-app.onrender.com/api/health` OK
- [ ] `wss://.../ws` conecta (DevTools → Network → WS → 101)
- [ ] Android cria sessão → código + QR com `https://...`
- [ ] PC entra com código → `peer-joined` → vídeo aparece <2s
- [ ] Áudio interno (Android 10+, jogo) → som no PC
- [ ] Gravação → `.webm` baixa
- [ ] Desconexão → reconexão com novo código

## 9. Rollback / Logs

- Render: Dashboard → Events → Rollback; Logs em tempo real
- Fly: `fly logs`, `fly deploy --strategy immediate`
- Health: `GET /api/health` + `GET /api/config` (retorna wsUrl/stun)

## 10. Custo real (2026)

| Plataforma | Grátis? | Sleep? | Custo para testes (1 mês) |
|------------|---------|--------|---------------------------|
| **Render Free** | sim (750h) | sim 15min | **$0** (com keep-alive) |
| Koyeb Free | sim (512MB) | não | **$0** |
| Fly.io | não (trial 2h) | não | **~$2-3** |
| Railway | não ($5 trial) | não | **$5 + uso** |

**Recomendação final:** faça o **primeiro deploy em Render** (zero cartão, zero custo, valida fluxo). Se cold start atrapalhar testes de usabilidade, migre o mesmo `Dockerfile` para **Koyeb** (ainda $0) ou **Fly.io** (pague $2 para eliminar sleep).

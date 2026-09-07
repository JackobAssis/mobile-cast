# Implementation Status — Mobile Cast MVP

> Atualizado 2026-09-07 — Fases 0-7 code-complete, ROADMAP sincronizado, AudioCapturer com detecção de silêncio, report com marked.js. Pendente apenas teste físico.

## Checklist §29 (primeira tarefa)

- [x] `docs/technical-feasibility.md` — MediaProjection, AudioPlaybackCapture, WebRTC, MediaRecorder validados
- [x] `docs/architecture.md` + `ARCHITECTURE.md` na raiz
- [x] `docs/roadmap.md` + `ROADMAP.md` na raiz
- [x] `README.md`
- [x] Estrutura `android/ server/ web/ docs/ scripts/ tests/`

## Fases §23

| Fase | Status | Evidência |
|------|--------|-----------|
| 0 Research | ✅ | 15 docs em `docs/` |
| 1 WebRTC vídeo | ✅ | `WebRtcClient.kt` + `ScreenCapturerAndroid` + `PeerClient.ts` |
| 2 Áudio | ✅ | `AudioCapturer.kt:1` (Q+, `AudioPlaybackCaptureConfiguration`, silence-detect, fallback video-only) |
| 3 Signaling | ✅ | `server/src/signaling.ts` + `session.ts` + `types.ts`, `tests/signaling.test.mjs` 7 checks |
| 4 Gravação | ✅ | `web/src/recording/useRecorder.ts` |
| 5 UX | ✅ | QR, fullscreen, volume, status, reconexão, `MainActivity` spinner |
| 6 Otimização | ✅ | `QualityPreset.kt` 4 presets + bitrate |
| 7 Internet | ✅ | `coturn/` + `VITE_TURN_URL` openrelay + docs `coturn.md` |

## Deploy

- [x] `Dockerfile` multi-stage, `.dockerignore`, `render.yaml`, `fly.toml` (gru), `.env.production.example`
- [x] `server/src/index.ts` prod (`trust proxy`, `CORS_ORIGIN`, `/api/config`)
- [x] `web/src/webrtc/*` env-aware (`VITE_WS_URL`, `VITE_TURN_URL`)
- [x] `scripts/deploy-render.sh` + `scripts/keep-alive.sh`
- [x] `.github/workflows/ci-mobile-cast.yml` (build + E2E)
- Validação: `server tsc --noEmit OK`, `web tsc --noEmit OK`, `vite build 173kB`, `tests/run.sh ✅`

## Testes §24 (pendente device físico)

- Template `docs/test-results.md` + guia `docs/usability-tests.md` (12 critérios §27)
- Executar após `git push` para novo repo + deploy Render `https://...onrender.com`

## Estratégia de Repositório

- **Atual:** projeto vive no monorepo `JackobLab` em `projetos/Android Screen/` — é a fonte da verdade. Commits vão para `origin/main` do monorepo.
- **Espelho opcional (recomendado para deploy):** `JackobAssis/mobile-cast` como repo isolado só para Render/Fly (evita expor monorepo privado). Criação:
```bash
# opção A — gh CLI (se quiser espelho público)
gh repo create JackobAssis/mobile-cast --public --source="projetos/Android Screen"
# opção B — remoto manual
git subtree push --prefix="projetos/Android Screen" mobile-cast main
# ou
git remote add mobile-cast https://github.com/JackobAssis/mobile-cast.git
git push mobile-cast main
```
- Render → New Web Service → Docker → health `/api/health` (funciona tanto com monorepo quanto espelho).

## Limitações conhecidas (§25) documentadas

`technical-feasibility.md:4` + `troubleshooting.md` + `security.md`

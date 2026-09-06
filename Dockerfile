# Mobile Cast — Dockerfile (multi-stage)
# Build web + server em uma imagem única. Serve web estático via Express + WS /ws
# Compatível com Render, Fly.io, Koyeb, Railway, qualquer host Docker.

# --- Stage 1: build web ---
FROM node:20-alpine AS web-build
WORKDIR /app/web
COPY web/package*.json ./
RUN npm ci
COPY web/ ./
RUN npm run build

# --- Stage 2: build server ---
FROM node:20-alpine AS server-build
WORKDIR /app/server
COPY server/package*.json ./
RUN npm ci
COPY server/ ./
RUN npm run build

# --- Stage 3: runtime ---
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
# server espera web/dist em ../../web/dist (relativo a server/dist)
COPY --from=server-build /app/server/dist ./server/dist
COPY --from=server-build /app/server/package*.json ./server/
COPY --from=web-build /app/web/dist ./web/dist
# instala apenas prod deps do server
WORKDIR /app/server
RUN npm ci --omit=dev && apk add --no-cache curl
EXPOSE 3000
# PORT será injetado por Render/Fly (10000 em Render) — não fixar 3000 aqui, mas manter fallback
ENV PORT=3000
# healthcheck usa $PORT dinâmico (Render injeta 10000)
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD sh -c "curl -f http://localhost:${PORT:-3000}/api/health || exit 1"
CMD ["node", "dist/index.js"]

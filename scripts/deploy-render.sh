#!/usr/bin/env bash
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
echo "🚀 Mobile Cast — deploy prep (Render/Fly/Koyeb)"
echo "   Root: $ROOT"

echo "→ building web"
cd "$ROOT/web"
npm ci
# Se houver .env.production, vite usa automaticamente
npm run build
ls -lh dist/ | head -5

echo "→ building server"
cd "$ROOT/server"
npm ci
npm run build
ls -lh dist/ | head

echo "→ testing Docker build (requires docker)"
if command -v docker >/dev/null 2>&1; then
  cd "$ROOT"
  docker build -t mobile-cast:test .
  echo "✅ Docker image built: mobile-cast:test"
  echo "   Run: docker run -p 3000:3000 mobile-cast:test"
  echo "   Test: curl http://localhost:3000/api/health"
else
  echo "⚠️  docker not found — skip image build (Render/Fly will build remoto)"
fi

echo ""
echo "✅ Prep done. Next:"
echo "   Render: push to GitHub → New Web Service → Docker → health /api/health"
echo "   Fly:    fly deploy (usa fly.toml)"
echo "   Koyeb:  Create App → Dockerfile → port 3000"

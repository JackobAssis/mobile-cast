#!/usr/bin/env bash
# Keep-alive para Render free tier (sleep 15min) — pinga /api/health a cada 10min
# Uso: nohup bash scripts/keep-alive.sh https://seu-app.onrender.com &
# Ou cron: */10 * * * * curl -s https://seu-app.onrender.com/api/health > /dev/null
set -e
URL="${1:-https://mobile-cast-xxxx.onrender.com}"
INTERVAL="${2:-600}" # 10min
echo "🔁 Keep-alive $URL a cada ${INTERVAL}s (Ctrl+C para parar)"
while true; do
  if curl -s --max-time 10 "$URL/api/health" | grep -q '"status":"ok"'; then
    echo "$(date -Iseconds) ✅ $URL ok"
  else
    echo "$(date -Iseconds) ⚠️  $URL falhou"
  fi
  sleep "$INTERVAL"
done

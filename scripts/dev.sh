#!/usr/bin/env bash
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
echo "🚀 Mobile Cast dev"

# Server
echo "→ server..."
cd "$ROOT/server"
if [ ! -d node_modules ]; then npm install; fi
npm run dev &
SERVER_PID=$!

# Web
echo "→ web..."
cd "$ROOT/web"
if [ ! -d node_modules ]; then npm install; fi
npm run dev &
WEB_PID=$!

echo ""
echo "✅ Running:"
echo "   Server: http://localhost:3000  (WS ws://localhost:3000/ws)"
echo "   Web:    http://localhost:5173"
echo "   Health: curl http://localhost:3000/api/health"
echo ""
echo "Press Ctrl+C to stop"

trap "kill $SERVER_PID $WEB_PID 2>/dev/null; echo 'Stopped.'" INT TERM
wait

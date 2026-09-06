#!/usr/bin/env bash
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PORT=${PORT:-3099}

echo "🧪 Starting signaling server on :$PORT for tests"
cd "$ROOT/server"
PORT=$PORT timeout 30 node dist/index.js &
SERVER_PID=$!
sleep 2
if ! curl -s http://localhost:$PORT/api/health > /dev/null; then
  echo "❌ Server not ready"
  kill $SERVER_PID 2>/dev/null || true
  exit 1
fi

echo "🧪 Running signaling.test.mjs"
cd "$ROOT"
PORT=$PORT node tests/signaling.test.mjs
RESULT=$?

kill $SERVER_PID 2>/dev/null || true
wait $SERVER_PID 2>/dev/null || true

if [ $RESULT -eq 0 ]; then echo "✅ tests/run.sh passed"; else echo "❌ tests/run.sh failed"; fi
exit $RESULT

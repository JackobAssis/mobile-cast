#!/usr/bin/env bash
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
echo "🔨 Building Mobile Cast"

echo "→ web build"
cd "$ROOT/web"
npm install
npm run build

echo "→ server build"
cd "$ROOT/server"
npm install
npm run build

echo "→ android (requires Android SDK)"
if command -v ./gradlew &>/dev/null; then
  cd "$ROOT/android"
  ./gradlew assembleDebug || echo "⚠️ Android build skipped (no SDK)"
else
  echo "⚠️ Android SDK not found — skip"
fi

echo "✅ Done. Server dist: $ROOT/server/dist  Web dist: $ROOT/web/dist"

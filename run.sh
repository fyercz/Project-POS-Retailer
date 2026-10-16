#!/usr/bin/env bash
# Ulilmart POS - jalankan kasir (Linux / macOS).  Pakai: ./run.sh [--dev]
set -e
cd "$(dirname "$0")"
URL="http://localhost:3000"

buka_kasir() {
    for b in google-chrome chromium chromium-browser brave-browser microsoft-edge; do
        if command -v "$b" >/dev/null; then "$b" --app="$URL" >/dev/null 2>&1 & return; fi
    done
    if command -v xdg-open >/dev/null; then xdg-open "$URL"; else open "$URL"; fi >/dev/null 2>&1 &
}

command -v node >/dev/null || { echo "Node.js belum terpasang. Unduh versi LTS dari https://nodejs.org"; exit 1; }

# Server sudah jalan? Langsung buka kasir.
if (echo >/dev/tcp/127.0.0.1/3000) 2>/dev/null; then buka_kasir; exit 0; fi

# Persiapan (hanya pertama kali)
[ -f .env ] || cp .env.example .env
[ -d node_modules/express ] || npm install --no-audit --no-fund

echo "Kasir berjalan di $URL  (Ctrl+C untuk berhenti)"
(sleep 2; buka_kasir) &
if [ "$1" = "--dev" ]; then exec npm run dev; fi
[ -f dist/server.cjs ] || npm run build
exec node dist/server.cjs

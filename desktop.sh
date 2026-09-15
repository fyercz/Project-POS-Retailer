#!/usr/bin/env bash
# ==============================================================================
# Point of Sales - Desktop Application Runner (Linux & macOS)
# ==============================================================================

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd "$DIR"

echo "=========================================================="
echo "   🏪 Menjalankan Ulilmart POS (Mode Desktop Kasir)"
echo "=========================================================="

if [ ! -d "node_modules" ]; then
    echo "[INFO] Menginstal dependensi..."
    npm install
fi

if [ ! -d "dist" ]; then
    echo "[INFO] Mengompilasi aplikasi..."
    npm run build
fi

echo "[INFO] Menyalakan Server Kasir Lokal (Port 3000)..."
npm start &
SERVER_PID=$!

sleep 2

URL="http://localhost:3000"

if command -v google-chrome &> /dev/null; then
    google-chrome --app=$URL &
elif command -v chromium &> /dev/null; then
    chromium --app=$URL &
elif command -v chromium-browser &> /dev/null; then
    chromium-browser --app=$URL &
elif command -v brave-browser &> /dev/null; then
    brave-browser --app=$URL &
else
    if [[ "$OSTYPE" == "darwin"* ]]; then
        open "$URL"
    else
        xdg-open "$URL"
    fi
fi

trap "kill $SERVER_PID 2>/dev/null" EXIT
wait $SERVER_PID

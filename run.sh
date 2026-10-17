#!/usr/bin/env bash
# Ulilmart POS - jalankan kasir (Linux / macOS)
#   ./run.sh                     jalankan kasir (pertama kali: pasang otomatis)
#   ./run.sh --dev               mode pengembangan
#   ./run.sh --autostart         nyalakan kasir otomatis saat login (Linux desktop)
#   ./run.sh --remove-autostart  matikan auto-start
set -e
cd "$(dirname "$0")"
DIR="$(pwd)"
URL="http://localhost:3000"
AUTOSTART_FILE="$HOME/.config/autostart/ulilmart-pos.desktop"

case "$1" in
    --autostart|--install-startup)
        mkdir -p "$(dirname "$AUTOSTART_FILE")"
        printf '[Desktop Entry]\nType=Application\nName=Ulilmart POS Kasir\nExec=bash "%s/run.sh"\nIcon=%s/public/icon.svg\nX-GNOME-Autostart-enabled=true\n' "$DIR" "$DIR" > "$AUTOSTART_FILE"
        echo "Auto-start aktif: $AUTOSTART_FILE"; exit 0 ;;
    --remove-autostart|--remove-startup)
        rm -f "$AUTOSTART_FILE"; echo "Auto-start dimatikan."; exit 0 ;;
esac

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
if [ ! -d node_modules/express ]; then
    echo "Memasang komponen kasir (pertama kali saja, perlu internet)..."
    npm install --no-audit --no-fund
    chmod +x ./*.sh 2>/dev/null || true
fi

echo "Kasir berjalan di $URL  (Ctrl+C untuk berhenti)"
(sleep 2; buka_kasir) &
if [ "$1" = "--dev" ]; then exec npm run dev; fi
[ -f dist/server.cjs ] || npm run build
exec node dist/server.cjs

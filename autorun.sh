#!/usr/bin/env bash
# Ulilmart POS - autorun.sh
#   (tanpa argumen)      jalankan kasir, sama dengan run.sh
#   --autostart          jalankan kasir otomatis saat login (Linux desktop)
#   --remove-autostart   matikan auto-start
cd "$(dirname "$0")"
DIR="$(pwd)"
FILE="$HOME/.config/autostart/ulilmart-pos.desktop"

case "$1" in
    --autostart|--install-startup)
        mkdir -p "$(dirname "$FILE")"
        printf '[Desktop Entry]\nType=Application\nName=Ulilmart POS Kasir\nExec=bash "%s/run.sh"\nIcon=%s/public/icon.svg\nX-GNOME-Autostart-enabled=true\n' "$DIR" "$DIR" > "$FILE"
        echo "Auto-start aktif: $FILE" ;;
    --remove-autostart|--remove-startup)
        rm -f "$FILE"
        echo "Auto-start dimatikan." ;;
    *)
        exec bash ./run.sh "$@" ;;
esac

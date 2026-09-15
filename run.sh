#!/usr/bin/env bash

# ==============================================================================
# Point of Sales - Application Runner (Linux / macOS)
# ==============================================================================

# 1. Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "⚠️  Folder node_modules belum ditemukan. Menjalankan auto-install..."
    ./install.sh
fi

MODE="production"
if [ "$1" == "--dev" ] || [ "$1" == "dev" ]; then
    MODE="development"
fi

# 2. Check if build exists if in production mode
if [ "$MODE" == "production" ] && [ ! -d "dist" ]; then
    echo "⚠️  Build produksi belum tersedia. Mengompilasi aplikasi..."
    npm run build
fi

echo ""
echo "=========================================================="
echo "   🏪 Menjalankan Point of Sales ($MODE)                  "
echo "=========================================================="
echo ""
echo "  🌐 URL Lokal   : http://localhost:3000"
echo "  📌 Tekan Ctrl+C untuk menghentikan aplikasi"
echo ""

# Helper to automatically open browser in background after short delay
(
    sleep 2
    if command -v xdg-open >/dev/null 2>&1; then
        xdg-open "http://localhost:3000" >/dev/null 2>&1 &
    elif command -v open >/dev/null 2>&1; then
        open "http://localhost:3000" >/dev/null 2>&1 &
    fi
) &

if [ "$MODE" == "development" ]; then
    npm run dev
else
    npm run start
fi

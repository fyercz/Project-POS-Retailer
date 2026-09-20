#!/usr/bin/env bash

# ==============================================================================
# Ulilmart POS - Universal Auto-Run Launcher (Linux / macOS)
# Memeriksa dependensi, auto-install, auto-build, dan langsung membuka kasir
# ==============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

if [ "$1" == "--autostart" ] || [ "$1" == "--install-startup" ]; then
    echo "=========================================================="
    echo "   ⚙️  Mendaftarkan Auto-Start Linux Desktop              "
    echo "=========================================================="
    AUTOSTART_DIR="$HOME/.config/autostart"
    mkdir -p "$AUTOSTART_DIR"
    DESKTOP_FILE="$AUTOSTART_DIR/ulilmart-pos.desktop"
    
    cat <<EOF > "$DESKTOP_FILE"
[Desktop Entry]
Type=Application
Exec=$SCRIPT_DIR/autorun.sh
Hidden=false
NoDisplay=false
X-GNOME-Autostart-enabled=true
Name=Ulilmart POS Kasir
Comment=Auto-start Ulilmart Point of Sales saat login
Icon=$SCRIPT_DIR/public/icon.svg
EOF
    chmod +x "$DESKTOP_FILE"
    echo "✅ Berhasil! File autostart dibuat di: $DESKTOP_FILE"
    echo "Aplikasi kasir akan otomatis berjalan setiap kali pengguna login."
    exit 0
fi

if [ "$1" == "--remove-autostart" ] || [ "$1" == "--remove-startup" ]; then
    DESKTOP_FILE="$HOME/.config/autostart/ulilmart-pos.desktop"
    if [ -f "$DESKTOP_FILE" ]; then
        rm -f "$DESKTOP_FILE"
        echo "✅ Auto-start Linux berhasil dinonaktifkan."
    else
        echo "ℹ️ File autostart tidak ditemukan."
    fi
    exit 0
fi

echo "=========================================================="
echo "   🏪 Ulilmart POS - Auto-Run Cashier System             "
echo "=========================================================="
echo ""

# 1. Periksa Node.js
if ! command -v node >/dev/null 2>&1; then
    echo "❌ [ERROR] Node.js belum terpasang di sistem ini!"
    echo "Silakan pasang Node.js LTS terlebih dahulu: https://nodejs.org/"
    exit 1
fi

NODE_VER=$(node -v)
echo "✅ [1/4] Node.js terdeteksi: $NODE_VER"

# 2. Periksa .env
if [ ! -f ".env" ]; then
    echo "⚙️  [2/4] Menyiapkan konfigurasi environment (.env)..."
    if [ -f ".env.example" ]; then
        cp .env.example .env
    else
        echo "GEMINI_API_KEY=" > .env
    fi
    echo "✅ File .env berhasil disiapkan."
else
    echo "✅ [2/4] File konfigurasi .env siap."
fi

# 3. Periksa node_modules
if [ ! -d "node_modules" ]; then
    echo "📦 [3/4] Folder node_modules belum ada. Menginstal dependensi..."
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ Gagal menginstal dependensi."
        exit 1
    fi
else
    echo "✅ [3/4] Dependensi node_modules siap."
fi

# 4. Periksa dist build
if [ ! -d "dist" ]; then
    echo "🔨 [4/4] Mengompilasi aplikasi untuk produksi (npm run build)..."
    npm run build
    if [ $? -ne 0 ]; then
        echo "❌ Gagal melakukan build aplikasi."
        exit 1
    fi
else
    echo "✅ [4/4] Build produksi siap digunakan."
fi

echo ""
echo "=========================================================="
echo "   🚀 Memulai Server Kasir Lokal (Port 3000)             "
echo "=========================================================="
echo "  🌐 URL Kasir   : http://localhost:3000"
echo "  📌 Tekan Ctrl+C untuk menghentikan server"
echo "=========================================================="
echo ""

TARGET_URL="http://localhost:3000"

# Buka browser / app window setelah delay 2 detik
(
    sleep 2
    if command -v google-chrome >/dev/null 2>&1; then
        google-chrome --app="$TARGET_URL" >/dev/null 2>&1 &
    elif command -v chromium-browser >/dev/null 2>&1; then
        chromium-browser --app="$TARGET_URL" >/dev/null 2>&1 &
    elif command -v xdg-open >/dev/null 2>&1; then
        xdg-open "$TARGET_URL" >/dev/null 2>&1 &
    elif command -v open >/dev/null 2>&1; then
        open "$TARGET_URL" >/dev/null 2>&1 &
    fi
) &

npm start

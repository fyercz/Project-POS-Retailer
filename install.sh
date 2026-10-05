#!/usr/bin/env bash
set -e

# ==============================================================================
# Ulilmart POS - Auto-Install & Repository Setup Script (Linux / macOS)
# ==============================================================================

REPO_URL="https://github.com/fyercz/Project-POS-Retailer.git"

echo ""
echo "=============================================================================="
echo "   ██╗   ██╗██╗     ██╗██╗     ███╗   ███╗ █████╗ ██████╗ ████████╗"
echo "   ██║   ██║██║     ██║██║     ████╗ ████║██╔══██╗██╔══██╗╚══██╔══╝"
echo "   ██║   ██║██║     ██║██║     ██╔████╔██║███████║██████╔╝   ██║   "
echo "   ██║   ██║██║     ██║██║     ██║╚██╔╝██║██╔══██║██╔══██╗   ██║   "
echo "   ╚██████╔╝███████╗██║███████╗██║ ╚═╝ ██║██║  ██║██║  ██║   ██║   "
echo "    ╚═════╝ ╚══════╝╚═╝╚══════╝╚═╝     ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝   ╚═╝   "
echo "                S M A R T   R E T A I L   P O S"
echo "             [ WIZARD INSTALASI & PERSIAPAN SISTEM ]"
echo "=============================================================================="
echo "  Repositori Resmi : $REPO_URL"
echo ""

# 1. Check Node.js installation
echo "[1/6] Memeriksa instalasi Node.js & npm..."
if ! command -v node >/dev/null 2>&1; then
    echo "❌ Error: Node.js belum terinstall pada sistem ini."
    echo "Silakan install Node.js (versi 18 ke atas) dari: https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(node -v)
echo "✅ Node.js terdeteksi: $NODE_VERSION"

if ! command -v npm >/dev/null 2>&1; then
    echo "❌ Error: npm belum terinstall."
    exit 1
fi
NPM_VERSION=$(npm -v)
echo "✅ npm terdeteksi: $NPM_VERSION"

# 2. Check Git & Configure Official Repository
echo ""
echo "[2/6] Memeriksa Git & repositori GitHub..."
if command -v git >/dev/null 2>&1; then
    if [ ! -d .git ]; then
        echo "ℹ️  Menginisialisasi repositori Git lokal..."
        git init
        git remote add origin "$REPO_URL"
    else
        git remote set-url origin "$REPO_URL" 2>/dev/null || git remote add origin "$REPO_URL" 2>/dev/null
    fi
    echo "✅ Repositori terhubung ke: $REPO_URL"
else
    echo "ℹ️  Git belum terpasang. Aplikasi tetap dapat beroperasi secara lokal."
fi

# 3. Check & create .env configuration
echo ""
echo "[3/6] Memeriksa file konfigurasi environment (.env)..."
if [ ! -f .env ]; then
    if [ -f .env.example ]; then
        cp .env.example .env
        echo "✅ Berhasil membuat file .env dari .env.example."
    else
        touch .env
        echo "GEMINI_API_KEY=" >> .env
        echo "✅ File .env baru telah dibuat."
    fi
else
    echo "✅ File .env sudah ada."
fi

# 4. Install npm dependencies
echo ""
echo "[4/6] Menginstal seluruh package dependencies (npm install)..."
npm install

# 5. Build application
echo ""
echo "[5/6] Mengompilasi aplikasi untuk mode produksi (npm run build)..."
npm run build

# 6. Make shell scripts executable
echo ""
echo "[6/6] Memberikan hak akses eksekusi script (*.sh)..."
chmod +x *.sh 2>/dev/null || true

echo ""
echo "=========================================================="
echo "🎉 Instalasi Selesai dengan Sukses!"
echo "=========================================================="
echo ""
echo "Cara menjalankan aplikasi:"
echo "  ▶️  Mode Desktop Kasir : ./desktop.sh"
echo "  ▶️  Mode Server Kasir  : ./run.sh"
echo "  ▶️  Auto-Update GitHub : ./update.sh"
echo ""
echo "URL Akses Kasir: http://localhost:3000"
echo ""

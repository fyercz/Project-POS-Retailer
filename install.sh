#!/usr/bin/env bash
set -e

# ==============================================================================
# Point of Sales - Auto-Install Script (Linux / macOS)
# ==============================================================================

echo ""
echo "=========================================================="
echo "   Point of Sales - Installation & Setup Wizard           "
echo "=========================================================="
echo ""

# 1. Check Node.js installation
echo "[1/5] Memeriksa instalasi Node.js & npm..."
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

# 2. Check & create .env configuration
echo ""
echo "[2/5] Memeriksa file konfigurasi environment (.env)..."
if [ ! -f .env ]; then
    if [ -f .env.example ]; then
        cp .env.example .env
        echo "✅ Berhasil membuat file .env dari .env.example."
        echo "ℹ️  Anda dapat mengisi GEMINI_API_KEY di file .env jika ingin mengaktifkan fitur AI Copilot."
    else
        touch .env
        echo "GEMINI_API_KEY=" >> .env
        echo "✅ File .env baru telah dibuat."
    fi
else
    echo "✅ File .env sudah ada."
fi

# 3. Install npm dependencies
echo ""
echo "[3/5] Menginstal seluruh package dependencies (npm install)..."
npm install

# 4. Build application
echo ""
echo "[4/5] Mengompilasi aplikasi untuk mode produksi (npm run build)..."
npm run build

# 5. Make shell scripts executable
echo ""
echo "[5/5] Memberikan hak akses eksekusi script (*.sh)..."
chmod +x *.sh 2>/dev/null || true

echo ""
echo "=========================================================="
echo "🎉 Instalasi Selesai dengan Sukses!"
echo "=========================================================="
echo ""
echo "Cara menjalankan aplikasi:"
echo "  ▶️  Mode Produksi (Rekomendasi Kasir) : ./run.sh"
echo "  ▶️  Mode Pengembang (Development)      : ./run.sh --dev"
echo ""
echo "Atau buka langsung di browser: http://localhost:3000"
echo ""

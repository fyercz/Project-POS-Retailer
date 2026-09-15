#!/usr/bin/env bash
set -e

# ==============================================================================
# Point of Sales - Auto-Update Script (Linux / macOS)
# ==============================================================================

echo ""
echo "=========================================================="
echo "   Point of Sales - Auto-Update Wizard                    "
echo "=========================================================="
echo ""

# 1. Pull latest code if Git repository exists
if [ -d .git ] && command -v git >/dev/null 2>&1; then
    echo "[1/3] Menarik pembaruan kode terbaru dari Git (git pull)..."
    git pull || echo "⚠️  Peringatan: Gagal melakukan git pull, melanjutkan dengan kode lokal."
else
    echo "[1/3] Direktori Git tidak terdeteksi atau Git tidak terinstall. Melewati langkah git pull."
fi

# 2. Update dependencies
echo ""
echo "[2/3] Memperbarui package dependencies (npm install)..."
npm install

# 3. Rebuild production bundle
echo ""
echo "[3/3] Mengompilasi ulang aplikasi (npm run build)..."
npm run build

# Ensure scripts remain executable
chmod +x *.sh 2>/dev/null || true

echo ""
echo "=========================================================="
echo "🎉 Aplikasi Berhasil Diperbarui ke Versi Terbaru!"
echo "=========================================================="
echo ""
echo "Untuk menjalankan aplikasi kembali:"
echo "  ▶️  ./run.sh"
echo ""

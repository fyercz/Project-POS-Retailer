#!/usr/bin/env bash
# Ulilmart POS - instalasi (Linux / macOS)
set -e
cd "$(dirname "$0")"
command -v node >/dev/null || { echo "Node.js belum terpasang. Unduh versi LTS dari https://nodejs.org"; exit 1; }
echo "Node.js $(node -v) ditemukan."

[ -f .env ] || cp .env.example .env
echo "[1/2] Memasang dependensi (npm install)..."
npm install --no-audit --no-fund
echo "[2/2] Membangun aplikasi (npm run build)..."
npm run build
chmod +x ./*.sh

echo "Instalasi selesai! Jalankan kasir dengan: ./run.sh"

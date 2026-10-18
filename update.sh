#!/usr/bin/env bash
# Ulilmart POS - ambil kode terbaru dari GitHub lalu build ulang (Linux / macOS).
# Data toko di folder data/ dicadangkan dulu ke data-backup/ dan tetap aman.
# Matikan server kasir (Ctrl+C) sebelum update agar versi baru yang dipakai.
#
# Seluruh isi dibungkus { ... } agar bash membacanya sekaligus,
# karena file ini ikut ditimpa oleh git saat update.
{
set -e
cd "$(dirname "$0")"
REPO_URL="https://github.com/fyercz/Project-POS-Retailer.git"
command -v node >/dev/null || { echo "Node.js belum terpasang. Unduh versi LTS dari https://nodejs.org"; exit 1; }

if command -v git >/dev/null; then
    echo "[1/3] Mencadangkan data dan mengambil kode terbaru..."
    [ -d .git ] || { git init -q; git remote add origin "$REPO_URL"; }
    STAMP=""
    if [ -d data ]; then
        STAMP="$(date +%Y%m%d-%H%M%S)"
        mkdir -p data-backup
        cp -R data "data-backup/$STAMP"   # gagal = update dibatalkan (set -e)
        echo "Data toko dicadangkan ke data-backup/$STAMP"
        git rm -r --cached --ignore-unmatch -q data || true
    fi
    git fetch --tags --force origin main
    # Versi tujuan: argumen (mis. v1.0.0), atau tag rilis tertinggi, atau main bila belum ada rilis
    TARGET="${1:-$(git tag -l 'v*' --sort=-v:refname | head -n1)}"
    TARGET="${TARGET:-origin/main}"
    echo "Memasang versi: $TARGET"
    git reset --hard "$TARGET"
    git branch -M main 2>/dev/null || true
    # Jika database toko hilang karena update, pulihkan dari cadangan
    if [ -n "$STAMP" ] && [ ! -f data/pos-master.sqlite ]; then
        mkdir -p data && cp -R "data-backup/$STAMP/." data/
    fi
    echo "Versi sekarang: $(git describe --tags --always)"
    echo "Untuk kembali ke versi sebelumnya: ./update.sh vX.Y.Z  (daftar: git tag -l)"
else
    echo "[1/3] Git tidak ditemukan, kode tidak diunduh (hanya build ulang)."
fi

echo "[2/3] Memperbarui dependensi (npm install)..."
if [ -f package-lock.json ]; then npm ci --no-audit --no-fund; else npm install --no-audit --no-fund; fi
echo "[3/3] Membangun ulang aplikasi (npm run build)..."
npm run build
chmod +x ./*.sh 2>/dev/null || true

echo "Update selesai! Jalankan kasir dengan: ./run.sh"
exit 0
}

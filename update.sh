#!/usr/bin/env bash
set -e

# ==============================================================================
# Ulilmart POS - Auto-Update, Verification & System Cleaner (Linux / macOS)
# Menarik pembaruan kode terbaru dari repositori GitHub resmi,
# membersihkan file yang tidak perlu, dan mengompilasi ulang aplikasi kasir.
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
echo "             [ AUTO-UPDATE & PEMELIHARAAN SISTEM ]"
echo "=============================================================================="
echo "  Repositori Resmi : $REPO_URL"
echo ""
echo "  Pembaruan ini akan menarik file kode terbaru dari GitHub."
echo "  [CATATAN PENTING KEAMANAN DATA]:"
echo "  - Seluruh data transaksi, riwayat kasir, produk, dan stok"
echo "    tersimpan di database lokal browser (IndexedDB) sehingga"
echo "    100% AMAN dan TIDAK AKAN HILANG setelah update!"
echo ""
echo "=============================================================================="
echo ""

# 1. Bersihkan file yang tidak perlu pada sistem (logs, temp, cache, OS junk)
echo "[1/4] Membersihkan file-file yang tidak perlu pada sistem..."
find . -maxdepth 4 -type f \( \
    -name "*.log" -o \
    -name "*.tmp" -o \
    -name "*.temp" -o \
    -name "*.bak" -o \
    -name "*.swp" -o \
    -name ".DS_Store" -o \
    -name "Thumbs.db" -o \
    -name "*~" \
\) -delete 2>/dev/null || true
rm -rf node_modules/.vite 2>/dev/null || true
echo "      [OK] Pembersihan file sementara dan cache selesai."
echo ""

# 2. Hubungkan ke Git dan tarik kode terbaru dari repositori resmi
echo "[2/4] Menghubungkan ke GitHub ($REPO_URL)..."
if command -v git >/dev/null 2>&1; then
    if [ ! -d .git ]; then
        echo "      Menginisialisasi repositori Git lokal..."
        git init
        git remote add origin "$REPO_URL"
    else
        git remote set-url origin "$REPO_URL" 2>/dev/null || git remote add origin "$REPO_URL" 2>/dev/null
    fi

    echo "      Mengambil rilis aktual dari GitHub (git fetch)..."
    if git fetch origin main --depth=10 2>/dev/null || git fetch origin main; then
        echo "      Menyelaraskan seluruh file proyek ke rilis GitHub terbaru (origin/main)..."
        git branch -M main 2>/dev/null || true
        git reset --hard origin/main
    else
        echo "      Mencoba cabang cadangan (master)..."
        git fetch origin master 2>/dev/null || true
        git branch -M master 2>/dev/null || true
        git reset --hard origin/master 2>/dev/null || git pull origin main 2>/dev/null || git pull || echo "⚠️ Peringatan: Gagal pull, melanjutkan dengan kode lokal."
    fi
    
    echo ""
    echo "[INFO] Versi Commit Aktual Terbaru di Komputer Ini:"
    git log -1 --pretty=format:"  Commit : %h%n  Pesan  : %s%n  Waktu  : %cd%n" 2>/dev/null || true
    echo ""
else
    echo "⚠️ Git belum terpasang di sistem ini. Melewati penarikan kode Git."
fi

# 3. Update dependencies
echo ""
echo "[3/4] Memperbarui package dependencies (npm install)..."
npm install

# 4. Rebuild production bundle
echo ""
echo "[4/4] Mengompilasi ulang aplikasi (npm run build)..."
npm run build

# Ensure scripts remain executable
chmod +x *.sh 2>/dev/null || true

echo ""
echo "=========================================================="
echo "🎉 [SUKSES] Ulilmart POS Berhasil Diperbarui & Dibersihkan!"
echo "=========================================================="
echo ""
echo "Untuk menjalankan kasir kembali:"
echo "  ▶️  ./desktop.sh  (Mode Desktop)"
echo "  ▶️  ./run.sh      (Mode Server)"
echo ""

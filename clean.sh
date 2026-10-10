#!/usr/bin/env bash
# ==============================================================================
# Ulilmart POS - System & Obsolete File Cleaner (Linux / macOS)
# ==============================================================================
set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"

echo "=============================================================================="
echo " 🧹 Ulilmart POS - Pembersihan File Usang & Sampah Sistem"
echo "=============================================================================="

if [ "$1" == "--dry-run" ] || [ "$1" == "-d" ]; then
    node scripts/cleaner.mjs --dry-run
elif [ "$1" == "--all" ] || [ "$1" == "--dist" ]; then
    node scripts/cleaner.mjs --dist
else
    node scripts/cleaner.mjs
fi

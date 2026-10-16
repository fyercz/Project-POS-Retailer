#!/usr/bin/env bash
# Bersihkan log, file temp, dan cache. Database kasir TIDAK dihapus.
# Pilihan:  --dry-run (lihat saja)   --dist (ikut hapus folder dist)
cd "$(dirname "$0")"
exec node scripts/cleaner.mjs "$@"

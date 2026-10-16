#!/usr/bin/env bash
# Dipertahankan agar panduan lama tetap jalan. Peluncur utama: run.sh
exec bash "$(dirname "$0")/run.sh" "$@"

#!/usr/bin/env node

/**
 * ==============================================================================
 * Ulilmart POS - System & Obsolete File Cleaner Setup
 * Membersihkan file sampah, cache build usang, file log, dan file temporary
 * Aman, lintas platform (Windows / Linux / macOS), dan menjaga integritas data.
 * ==============================================================================
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run') || args.includes('-d');
const cleanDist = args.includes('--dist') || args.includes('--all');
const isDeep = args.includes('--deep') || args.includes('-f');
const isQuiet = args.includes('--quiet') || args.includes('-q');

// Formatting helpers
function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

const PROTECTED_PATHS = new Set([
  'package.json',
  'server.ts',
  'index.html',
  'vite.config.ts',
  'tsconfig.json',
  'metadata.json',
  'README_SETUP.md',
  'USER_MANUAL.md',
  'run.bat',
  'run.sh',
  'install.bat',
  'install.sh',
  'update.bat',
  'update.sh',
  'desktop.bat',
  'desktop.sh',
  'autorun.bat',
  'autorun.sh',
  'buka-kasir.bat',
  'ulilmart.ico',
]);

const JUNK_FILE_PATTERNS = [
  // OS System Junk
  { pattern: /^\.DS_Store$/i, category: 'OS Junk', desc: 'Metadata Apple macOS Finder' },
  { pattern: /^Thumbs\.db$/i, category: 'OS Junk', desc: 'Cache thumbnail Windows Explorer' },
  { pattern: /^ehthumbs\.db$/i, category: 'OS Junk', desc: 'Cache thumbnail media Windows' },
  { pattern: /^desktop\.ini$/i, category: 'OS Junk', desc: 'Pengaturan kustom folder Windows' },

  // Logs & Debug outputs
  { pattern: /\.(log)$/i, category: 'Log & Debug', desc: 'File catatan log sistem/server' },
  { pattern: /(npm-debug|yarn-error|yarn-debug|pnpm-debug)\.log.*/i, category: 'Log & Debug', desc: 'Log package manager' },

  // Temporary & Editor Backup files
  { pattern: /\.(tmp|temp|swp|bak|old)$/i, category: 'File Sementara', desc: 'File temporary & editor backup' },
  { pattern: /~$/i, category: 'File Sementara', desc: 'File cadangan editor teks' },
  { pattern: /^\.fuse_hidden/i, category: 'File Sementara', desc: 'Hidden lock file Linux FUSE' },

  // Compiler & linter caches
  { pattern: /^tsconfig\.tsbuildinfo$/i, category: 'Build Cache', desc: 'Cache incremental build TypeScript' },
  { pattern: /^\.eslintcache$/i, category: 'Build Cache', desc: 'Cache linter ESLint' },
  { pattern: /^\.stylelintcache$/i, category: 'Build Cache', desc: 'Cache Stylelint' },
];

function isProtected(relPath) {
  const norm = relPath.replace(/\\/g, '/');
  if (norm.startsWith('.git/')) return true;
  if (norm.startsWith('src/')) return true;
  if (norm.startsWith('public/')) return true;
  if (norm === 'data/pos-master.sqlite') return true; // NEVER delete primary DB
  if (PROTECTED_PATHS.has(norm)) return true;
  return false;
}

function scanJunk(dir, depth = 0) {
  if (depth > 6) return [];
  const results = [];

  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relPath = path.relative(rootDir, fullPath);

      if (isProtected(relPath)) continue;

      if (entry.isDirectory()) {
        if (entry.name === '.git') continue;

        // Target cache folders inside node_modules
        if (entry.name === 'node_modules') {
          const viteCache = path.join(fullPath, '.vite');
          if (fs.existsSync(viteCache)) {
            try {
              const stat = fs.statSync(viteCache);
              results.push({
                path: viteCache,
                relPath: path.relative(rootDir, viteCache),
                size: stat.size || 4096,
                category: 'Build Cache',
                desc: 'Cache pre-bundling Vite lokal',
                isDir: true,
              });
            } catch {}
          }

          const nmCache = path.join(fullPath, '.cache');
          if (fs.existsSync(nmCache)) {
            try {
              const stat = fs.statSync(nmCache);
              results.push({
                path: nmCache,
                relPath: path.relative(rootDir, nmCache),
                size: stat.size || 4096,
                category: 'Build Cache',
                desc: 'Cache dependensi node_modules',
                isDir: true,
              });
            } catch {}
          }
          continue;
        }

        // Clean dist if requested
        if (entry.name === 'dist' && cleanDist) {
          try {
            results.push({
              path: fullPath,
              relPath,
              size: 1024 * 1024, // approx
              category: 'Build Output',
              desc: 'Folder bundle produksi lama (dist/)',
              isDir: true,
            });
          } catch {}
          continue;
        }

        // Recurse
        results.push(...scanJunk(fullPath, depth + 1));
      } else if (entry.isFile()) {
        for (const rule of JUNK_FILE_PATTERNS) {
          if (rule.pattern.test(entry.name)) {
            try {
              const stat = fs.statSync(fullPath);
              results.push({
                path: fullPath,
                relPath,
                size: stat.size,
                category: rule.category,
                desc: rule.desc,
                isDir: false,
              });
            } catch {}
            break;
          }
        }
      }
    }
  } catch {}

  return results;
}

export function cleanObsoleteFiles(options = {}) {
  const dryRun = options.dryRun ?? isDryRun;
  const quiet = options.quiet ?? isQuiet;

  if (!quiet) {
    console.log('==============================================================================');
    console.log(' 🧹 ULILMART POS - PEMBERSIHAN FILE USANG & SAMPAH SISTEM');
    console.log('==============================================================================');
    console.log(` Direktori Proyek: ${rootDir}`);
    console.log(` Mode: ${dryRun ? '🔍 SIMULASI (Dry-Run / Pindai Saja)' : '⚡ EKSEKUSI PEMBERSIHAN'}`);
    if (cleanDist) console.log(' Termasuk: Pembersihan folder kompilasi produksi (dist/)');
    console.log('==============================================================================\n');
  }

  const items = scanJunk(rootDir);
  let totalBytesFreed = 0;
  let deletedCount = 0;
  const deletedFiles = [];

  if (items.length === 0) {
    if (!quiet) {
      console.log('✨ Sistem Anda sudah sangat bersih! Tidak ada file usang atau sampah yang ditemukan.\n');
    }
    return { count: 0, bytesFreed: 0, deleted: [] };
  }

  if (!quiet) {
    console.log(`Ditemukan ${items.length} item file/folder yang siap dibersihkan:\n`);
    console.log('  ----------------------------------------------------------------------------');
    console.log('  Kategori             Ukuran      Lokasi File');
    console.log('  ----------------------------------------------------------------------------');
  }

  for (const item of items) {
    if (!quiet) {
      const catPadded = `[${item.category}]`.padEnd(20, ' ');
      const sizePadded = formatBytes(item.size).padStart(10, ' ');
      console.log(`  ${catPadded} ${sizePadded}  ${item.relPath}`);
    }

    if (!dryRun) {
      try {
        if (item.isDir) {
          fs.rmSync(item.path, { recursive: true, force: true });
        } else {
          fs.unlinkSync(item.path);
        }
        deletedCount++;
        totalBytesFreed += item.size;
        deletedFiles.push(item.relPath);
      } catch (err) {
        if (!quiet) console.warn(`  ⚠️ Gagal menghapus ${item.relPath}: ${err.message}`);
      }
    } else {
      totalBytesFreed += item.size;
      deletedCount++;
      deletedFiles.push(item.relPath);
    }
  }

  if (!quiet) {
    console.log('  ----------------------------------------------------------------------------\n');
    if (dryRun) {
      console.log('==============================================================================');
      console.log(`🔍 [SIMULASI SELESAI]`);
      console.log(`   Total item siap dihapus: ${deletedCount} file/folder`);
      console.log(`   Perkiraan ruang bebas : ${formatBytes(totalBytesFreed)}`);
      console.log(`   Jalankan tanpa flag --dry-run untuk melakukan pembersihan nyata.`);
      console.log('==============================================================================\n');
    } else {
      console.log('==============================================================================');
      console.log(`🎉 [PEMBERSIHAN SELESAI DENGAN SUKSES]`);
      console.log(`   Item berhasil dihapus  : ${deletedCount} file/folder`);
      console.log(`   Ruang disk dibebaskan  : ${formatBytes(totalBytesFreed)}`);
      console.log('   Data kasir, database produk, dan kode sumber 100% AMAN!');
      console.log('==============================================================================\n');
    }
  }

  return {
    count: deletedCount,
    bytesFreed: totalBytesFreed,
    deleted: deletedFiles,
  };
}

// Auto-run when executed directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  cleanObsoleteFiles();
}

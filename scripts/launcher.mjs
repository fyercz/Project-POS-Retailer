#!/usr/bin/env node

import { execSync, spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const command = process.argv[2] || 'run';

function runStep(title, cmd, options = {}) {
  console.log(`\n▶️ ${title}`);
  try {
    execSync(cmd, {
      cwd: rootDir,
      stdio: 'inherit',
      ...options,
    });
    return true;
  } catch (err) {
    console.error(`❌ Gagal mengeksekusi: ${cmd}`);
    return false;
  }
}

function ensureEnv() {
  const envPath = path.join(rootDir, '.env');
  const envExamplePath = path.join(rootDir, '.env.example');
  if (!fs.existsSync(envPath)) {
    if (fs.existsSync(envExamplePath)) {
      fs.copyFileSync(envExamplePath, envPath);
      console.log('✅ File .env berhasil dibuat dari .env.example.');
    } else {
      fs.writeFileSync(envPath, 'GEMINI_API_KEY=\n');
      console.log('✅ File .env baru dibuat.');
    }
  }
}

function install() {
  console.log('\n==========================================================');
  console.log('   Point of Sales - Installation Wizard');
  console.log('==========================================================');

  ensureEnv();
  const okInstall = runStep('Menginstal dependensi npm...', 'npm install');
  if (!okInstall) process.exit(1);

  const okBuild = runStep('Mengompilasi aplikasi untuk produksi (npm run build)...', 'npm run build');
  if (!okBuild) process.exit(1);

  console.log('\n==========================================================');
  console.log('🎉 Instalasi Selesai! Jalankan dengan: node scripts/launcher.mjs run');
  console.log('==========================================================\n');
}

function update() {
  console.log('\n==========================================================');
  console.log('   Point of Sales - Auto-Update');
  console.log('==========================================================');

  const gitDir = path.join(rootDir, '.git');
  if (fs.existsSync(gitDir)) {
    runStep('Menarik update kode terbaru dari Git...', 'git pull');
  } else {
    console.log('ℹ️ Bukan repositori Git, melewati git pull.');
  }

  runStep('Memperbarui dependensi (npm install)...', 'npm install');
  runStep('Mengompilasi ulang aplikasi (npm run build)...', 'npm run build');

  console.log('\n==========================================================');
  console.log('🎉 Pembaruan Berhasil! Jalankan dengan: node scripts/launcher.mjs run');
  console.log('==========================================================\n');
}

function run(mode = 'production', asDesktop = false) {
  const nodeModulesDir = path.join(rootDir, 'node_modules');
  if (!fs.existsSync(nodeModulesDir)) {
    console.log('⚠️ node_modules belum ada. Menjalankan instalasi terlebih dahulu...');
    install();
  }

  const distDir = path.join(rootDir, 'dist');
  if (mode === 'production' && !fs.existsSync(distDir)) {
    console.log('⚠️ Build produksi belum tersedia. Mengompilasi aplikasi...');
    runStep('Build aplikasi...', 'npm run build');
  }

  console.log('\n==========================================================');
  console.log(`   🏪 Menjalankan Point of Sales (${asDesktop ? 'Mode Desktop App' : mode})`);
  console.log('==========================================================');
  console.log('  🌐 URL Kasir: http://localhost:3000');
  console.log('  📌 Tekan Ctrl+C untuk menghentikan server\n');

  // Open browser or desktop app window after 2 seconds
  setTimeout(() => {
    const url = 'http://localhost:3000';
    try {
      if (asDesktop) {
        if (process.platform === 'win32') {
          // Try edge app mode or chrome app mode
          spawn('cmd', ['/c', 'start', 'msedge', `--app=${url}`], { detached: true, stdio: 'ignore' }).unref();
        } else if (process.platform === 'darwin') {
          spawn('open', ['-a', 'Google Chrome', '--args', `--app=${url}`], { detached: true, stdio: 'ignore' }).unref();
        } else {
          spawn('google-chrome', [`--app=${url}`], { detached: true, stdio: 'ignore' }).unref();
        }
      } else {
        if (process.platform === 'win32') {
          spawn('cmd', ['/c', 'start', url], { detached: true, stdio: 'ignore' }).unref();
        } else if (process.platform === 'darwin') {
          spawn('open', [url], { detached: true, stdio: 'ignore' }).unref();
        } else {
          spawn('xdg-open', [url], { detached: true, stdio: 'ignore' }).unref();
        }
      }
    } catch {
      // ignore
    }
  }, 2000);

  const scriptToRun = mode === 'development' ? 'npm run dev' : 'npm start';
  execSync(scriptToRun, {
    cwd: rootDir,
    stdio: 'inherit',
  });
}

switch (command) {
  case 'install':
  case 'setup':
    install();
    break;
  case 'update':
    update();
    break;
  case 'dev':
    run('development');
    break;
  case 'desktop':
  case 'app':
  case 'autorun':
    run('production', true);
    break;
  case 'run':
  case 'start':
  default:
    run('production');
    break;
}

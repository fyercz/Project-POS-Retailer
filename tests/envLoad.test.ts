/** Server memuat berkas .env di folder kerjanya (dulu .env tidak pernah dibaca). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// Jalur lengkap ke tsx: server dijalankan dari folder sementara (tempat .env uji), yang tidak
// punya node_modules, sehingga '--import tsx' biasa tidak ditemukan
const TSX_LOADER = import.meta.resolve('tsx');

test('GEMINI_API_KEY di .env terbaca server', async () => {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'pos-env-'));
  fs.writeFileSync(path.join(cwd, '.env'), 'GEMINI_API_KEY=kunci-uji-123\n');
  const PORT = 3988;
  const env = { ...process.env, PORT: String(PORT), POS_DATA_DIR: path.join(cwd, 'data'), NODE_ENV: 'production' };
  delete (env as any).GEMINI_API_KEY;
  const server = spawn(process.execPath, ['--import', TSX_LOADER, path.resolve('server.ts')], { cwd, env, stdio: 'ignore' });
  try {
    let health: any = null;
    for (let i = 0; i < 80 && !health; i++) {
      try {
        health = await (await fetch(`http://127.0.0.1:${PORT}/api/health`)).json();
      } catch {
        await new Promise((r) => setTimeout(r, 250));
      }
    }
    assert.ok(health, 'server menyala');
    assert.equal(health.hasGeminiKey, true);
  } finally {
    server.kill();
    await new Promise((r) => setTimeout(r, 300));
    try {
      fs.rmSync(cwd, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
    } catch {}
  }
});

test('nilai contoh dari .env.example lama (MY_GEMINI_API_KEY) dianggap kosong', async () => {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'pos-env-'));
  fs.writeFileSync(path.join(cwd, '.env'), 'GEMINI_API_KEY="MY_GEMINI_API_KEY"\nAPP_URL="MY_APP_URL"\n');
  const PORT = 3989;
  const env = { ...process.env, PORT: String(PORT), POS_DATA_DIR: path.join(cwd, 'data'), NODE_ENV: 'production' };
  delete (env as any).GEMINI_API_KEY;
  const server = spawn(process.execPath, ['--import', TSX_LOADER, path.resolve('server.ts')], { cwd, env, stdio: 'ignore' });
  try {
    let health: any = null;
    for (let i = 0; i < 80 && !health; i++) {
      try {
        health = await (await fetch(`http://127.0.0.1:${PORT}/api/health`)).json();
      } catch {
        await new Promise((r) => setTimeout(r, 250));
      }
    }
    assert.ok(health, 'server menyala');
    assert.equal(health.hasGeminiKey, false, 'teks contoh bukan API key');
  } finally {
    server.kill();
    await new Promise((r) => setTimeout(r, 300));
    try {
      fs.rmSync(cwd, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
    } catch {}
  }
});

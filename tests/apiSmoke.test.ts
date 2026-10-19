/**
 * Tes asap SEMUA endpoint server yang aman dipanggil: tidak boleh ada error 500 (crash) atau
 * respons non-JSON, baik dengan badan kosong maupun contoh data yang wajar.
 * Tanpa GEMINI_API_KEY: endpoint AI/online boleh 503, asalkan rapi.
 * Sengaja TIDAK dipanggil (mengubah repositori/sistem/database): git-pull, git-configure,
 * cleanup-execute, clean-obsolete, database/seed.
 */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, type ChildProcess } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const PORT = 3991;
const BASE = `http://127.0.0.1:${PORT}`;
const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pos-smoke-'));
let server: ChildProcess | null = null;

before(async () => {
  server = spawn(process.execPath, ['--import', 'tsx', 'server.ts'], {
    env: { ...process.env, PORT: String(PORT), POS_DATA_DIR: dataDir, NODE_ENV: 'production', GEMINI_API_KEY: '' },
    stdio: 'ignore',
  });
  for (let i = 0; i < 100; i++) {
    try {
      if ((await fetch(`${BASE}/api/health`)).ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error('Server tes tidak menyala');
});

after(async () => {
  if (server) {
    const s = server;
    await new Promise<void>((resolve) => {
      s.once('exit', () => resolve());
      s.kill();
    });
  }
  try {
    fs.rmSync(dataDir, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
  } catch {}
});

async function call(method: string, url: string, body?: unknown) {
  const r = await fetch(`${BASE}${url}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  const text = await r.text();
  let json: unknown = undefined;
  try {
    json = JSON.parse(text);
  } catch {}
  return { status: r.status, json, text };
}

const AI_OR_ONLINE = /^\/api\/(ai|online)\//;

const POSTS: Array<[string, unknown]> = [
  ['/api/ai/map-category', { productName: 'Sabun Mandi Lifebuoy 85g' }],
  ['/api/ai/batch-map-categories', { products: [{ id: 'p1', name: 'Sabun Mandi' }] }],
  ['/api/ai/daily-insights', { transactions: [], products: [] }],
  ['/api/ai/dynamic-pricing', { products: [], strategy: 'balanced' }],
  ['/api/ai/generate-promo', { products: [], transactions: [] }],
  ['/api/ai/generate-segment-promo', { segment: 'vip', customers: [] }],
  ['/api/ai/inventory-forecast', { products: [], transactions: [] }],
  ['/api/ai/smart-chat', { message: 'Produk apa yang paling laris?', history: [] }],
  ['/api/ai/upsell-recommendations', { cartItems: [], products: [] }],
  ['/api/ai/price-search', { mode: 'competitor', productName: 'Gula Pasir 1kg' }],
  ['/api/ai/scan-invoice', { imageBase64: 'aGVsbG8=', mimeType: 'image/png', catalogProducts: [] }],
  ['/api/ai/visual-stock-opname', { imagesBase64: ['aGVsbG8='], catalogProducts: [] }],
  ['/api/online/lookup-barcode', { barcode: '8992388101016' }],
  ['/api/online/match-batch', { products: [{ id: 'p1', name: 'Indomie Goreng' }] }],
  ['/api/online/search-products', { query: 'indomie goreng' }],
  ['/api/lan/client/register', { clientId: 'smoke-1', name: 'Kasir Uji', role: 'CLIENT' }],
  ['/api/lan/client/heartbeat', { clientId: 'smoke-1' }],
  ['/api/lan/data/sync-products', { products: [] }],
  ['/api/lan/data/push-transaction', { transaction: null }],
  ['/api/lan/data/stock-adjust', { adjustments: [] }],
  ['/api/lan/data/stock-return', { items: [] }],
  ['/api/lan/orders/held', { id: 'held-smoke', items: [], createdAt: new Date().toISOString() }],
  ['/api/pos/transactions', { transactions: [] }],
  ['/api/pos/transactions/sync', { transactions: [] }],
  ['/api/pos/database/check-integrity', {}],
];

const GETS = [
  '/api/health',
  '/api/lan/status',
  '/api/lan/data/pull',
  '/api/lan/orders/held',
  '/api/pos/database/status',
  '/api/pos/sync-status',
  '/api/pos/transactions',
  '/api/pos/transactions?preset=today',
  '/api/shelf/produk-tidak-ada',
  '/api/system/cleanup-scan',
  '/api/system/git-status',
  '/api/system/verify-files',
];

test('semua endpoint GET menjawab tanpa crash & dengan JSON', async () => {
  for (const url of GETS) {
    const r = await call('GET', url);
    assert.ok(r.status < 500, `${url} -> ${r.status} ${r.text.slice(0, 160)}`);
    assert.notEqual(r.json, undefined, `${url} harus JSON`);
  }
});

test('semua endpoint POST: badan kosong & contoh data tidak membuat server crash', async () => {
  for (const [url, body] of POSTS) {
    for (const b of [{}, body]) {
      const r = await call('POST', url, b);
      const allowed = AI_OR_ONLINE.test(url) ? r.status < 500 || r.status === 503 : r.status < 500;
      assert.ok(allowed, `${url} ${JSON.stringify(b).slice(0, 60)} -> ${r.status} ${r.text.slice(0, 200)}`);
      assert.notEqual(r.json, undefined, `${url} harus JSON (status ${r.status})`);
    }
  }
});

test('hapus pesanan parkir & JSON rusak ditolak rapi (bukan 500)', async () => {
  const del = await call('DELETE', '/api/lan/orders/held/held-smoke');
  assert.ok(del.status < 500, `DELETE held -> ${del.status}`);
  const r = await fetch(`${BASE}/api/pos/transactions`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{rusak' });
  assert.ok(r.status >= 400 && r.status < 500, `JSON rusak -> ${r.status}`);
});

test('server tetap sehat setelah semua panggilan di atas', async () => {
  const r = await call('GET', '/api/health');
  assert.equal(r.status, 200);
  assert.equal((r.json as any).status, 'ok');
});

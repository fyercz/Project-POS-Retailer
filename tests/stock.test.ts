/**
 * Tes integrasi server kasir: menjalankan server sungguhan (port & folder data sementara)
 * untuk memastikan stok, retur, dan data produk/member benar, termasuk setelah restart.
 */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, type ChildProcess } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const PORT = 3987;
const BASE = `http://127.0.0.1:${PORT}`;
const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pos-test-'));
let server: ChildProcess | null = null;

async function startServer(extraEnv: Record<string, string> = {}) {
  server = spawn(process.execPath, ['--import', 'tsx', 'server.ts'], {
    env: { ...process.env, PORT: String(PORT), POS_DATA_DIR: dataDir, NODE_ENV: 'production', GEMINI_API_KEY: '', ...extraEnv },
    stdio: 'ignore',
  });
  for (let i = 0; i < 100; i++) {
    try {
      const r = await fetch(`${BASE}/api/health`);
      if (r.ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error('Server tes tidak menyala');
}

async function stopServer() {
  if (!server) return;
  const s = server;
  server = null;
  await new Promise<void>((resolve) => {
    s.once('exit', () => resolve());
    s.kill();
  });
}

async function restartServer() {
  await new Promise((r) => setTimeout(r, 1300)); // beri waktu simpanan JSON terjadwal (1 detik)
  await stopServer();
  await startServer();
}

async function post(url: string, body: unknown, headers: Record<string, string> = {}) {
  const r = await fetch(`${BASE}${url}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
  return { status: r.status, data: await r.json().catch(() => ({})) };
}

async function pull() {
  return (await fetch(`${BASE}/api/lan/data/pull`)).json();
}

async function stockOf(id: string): Promise<number> {
  const d = await pull();
  return d.products.find((p: any) => p.id === id).stock;
}

before(async () => {
  await startServer();
});

after(async () => {
  await stopServer();
  fs.rmSync(dataDir, { recursive: true, force: true });
});

test('data produk lengkap (harga grosir, foto, rak) tetap ada setelah server restart', async () => {
  await post('/api/lan/data/sync-products', {
    products: [
      {
        id: 'p-grosir',
        name: 'Uji Grosir',
        price: 5000,
        costPrice: 4000,
        stock: 100,
        image: 'data:image/png;base64,AAA',
        aisle: 'Rak 9',
        priceHistory: [{ date: '2026-01-01', previousSellingPrice: 4500, changeType: 'manual' }],
        wholesaleUnits: [{ id: 'w1', name: 'Dus', multiplier: 12, price: 55000, costPrice: 45000 }],
      },
    ],
  });
  await restartServer();
  const p = (await pull()).products.find((x: any) => x.id === 'p-grosir');
  assert.equal(p.aisle, 'Rak 9');
  assert.equal(p.image, 'data:image/png;base64,AAA');
  assert.equal(p.wholesaleUnits?.[0]?.multiplier, 12);
  assert.equal(p.priceHistory?.length, 1);
  assert.equal(p.stock, 100);
});

test('stok hanya terpotong sekali walau transaksi dikirim ulang, juga setelah restart', async () => {
  await post('/api/lan/data/sync-products', { products: [{ id: 'p-idem', name: 'Idem', price: 1000, stock: 50 }] });
  const tx = { id: 'tx-idem', invoiceNumber: 'INV-IDEM', finalTotal: 2000, subtotal: 2000, items: [{ productId: 'p-idem', quantity: 2 }] };

  await post('/api/lan/data/push-transaction', { transaction: tx });
  assert.equal(await stockOf('p-idem'), 48);

  await post('/api/lan/data/push-transaction', { transaction: tx });
  await post('/api/pos/transactions', tx); // checkout juga mengirim ke endpoint ini
  await post('/api/pos/transactions/sync', { transactions: [tx] });
  const again = await post('/api/lan/data/push-transaction', { transaction: tx });
  assert.equal(again.data.duplicate, true);
  assert.equal(await stockOf('p-idem'), 48);

  await restartServer();
  await post('/api/lan/data/push-transaction', { transaction: tx });
  assert.equal(await stockOf('p-idem'), 48);
});

test('penjualan satuan Dus memotong stok sebesar isi Dus', async () => {
  await post('/api/lan/data/sync-products', { products: [{ id: 'p-dus', name: 'Dus', price: 1000, stock: 30 }] });
  await post('/api/lan/data/push-transaction', {
    transaction: { id: 'tx-dus', finalTotal: 1, items: [{ productId: 'p-dus', quantity: 2, selectedUnit: { multiplier: 12 } }] },
  });
  assert.equal(await stockOf('p-dus'), 6);
});

test('retur mengembalikan stok (x isi satuan) sekali saja, dan transaksi retur tidak memotong stok', async () => {
  await post('/api/lan/data/sync-products', { products: [{ id: 'p-ret', name: 'Retur', price: 1000, stock: 40 }] });
  const tx = { id: 'tx-ret', invoiceNumber: 'INV-RET', finalTotal: 24000, items: [{ productId: 'p-ret', quantity: 2, selectedUnit: { multiplier: 12 } }] };
  await post('/api/lan/data/push-transaction', { transaction: tx });
  assert.equal(await stockOf('p-ret'), 16);

  // Transaksi berstatus refunded tidak boleh memotong stok
  await post('/api/lan/data/push-transaction', {
    transaction: { id: 'tx-ret-x', status: 'refunded', finalTotal: -1000, items: [{ productId: 'p-ret', quantity: 1 }] },
  });
  assert.equal(await stockOf('p-ret'), 16);

  const ret = {
    key: 'ret-1',
    kind: 'return',
    items: [{ productId: 'p-ret', quantity: 1, unitMultiplier: 12 }],
    transactionId: 'tx-ret',
    transactionUpdate: { status: 'completed', returnedAmount: 12000, returnReason: 'Rusak' },
  };
  const r1 = await post('/api/lan/data/stock-return', ret);
  assert.equal(r1.status, 200);
  assert.equal(await stockOf('p-ret'), 28);
  const r2 = await post('/api/lan/data/stock-return', ret);
  assert.equal(r2.data.duplicate, true);
  assert.equal(await stockOf('p-ret'), 28);

  const stored = (await pull()).transactions.find((t: any) => t.id === 'tx-ret');
  assert.equal(stored.returnedAmount, 12000);

  const bad = await post('/api/lan/data/stock-return', { key: 'ret-bad', items: [{ productId: 'p-ret', quantity: -5 }] });
  assert.equal(bad.status, 400);
});

test('void mengembalikan stok dan mengubah status transaksi', async () => {
  await post('/api/lan/data/sync-products', { products: [{ id: 'p-void', name: 'Void', price: 1000, stock: 10 }] });
  await post('/api/lan/data/push-transaction', { transaction: { id: 'tx-void', finalTotal: 3000, items: [{ productId: 'p-void', quantity: 3 }] } });
  assert.equal(await stockOf('p-void'), 7);
  await post('/api/lan/data/stock-return', {
    key: 'tx-void',
    kind: 'void',
    items: [{ productId: 'p-void', quantity: 3 }],
    transactionId: 'tx-void',
    transactionUpdate: { status: 'void' },
  });
  assert.equal(await stockOf('p-void'), 10);
  const stored = (await pull()).transactions.find((t: any) => t.id === 'tx-void');
  assert.equal(stored.status, 'void');
});

test('poin dan riwayat member tetap ada setelah restart', async () => {
  await post('/api/lan/database/seed', {
    customers: [{ id: 'c-1', name: 'Bu Ani', phone: '0812', tier: 'Gold', points: 10, totalSpent: 0, ordersCount: 0, pointsHistory: [{ id: 'h1', points: 10 }] }],
  });
  await post('/api/lan/data/push-transaction', {
    transaction: { id: 'tx-member', finalTotal: 50000, pointsEarned: 5, customer: { id: 'c-1', name: 'Bu Ani' }, items: [] },
  });
  await restartServer();
  const c = (await pull()).customers.find((x: any) => x.id === 'c-1');
  assert.equal(c.points, 15);
  assert.equal(c.pointsHistory?.length, 1);
});

test('halaman QR rak tidak menampilkan harga modal', async () => {
  const r = await (await fetch(`${BASE}/api/shelf/p-grosir`)).json();
  assert.equal(r.success, true);
  assert.equal(r.costPrice, undefined);
  assert.equal(r.product.costPrice, undefined);
  assert.equal(r.product.wholesaleUnits[0].costPrice, undefined);
  assert.equal(r.product.wholesaleUnits[0].price, 55000);
});

test('halaman web lain di jaringan (port berbeda) tidak boleh mengubah data', async () => {
  const blocked = await post('/api/lan/data/sync-products', { products: [] }, { Origin: 'http://192.168.1.99:8080' });
  assert.equal(blocked.status, 403);
  const terminal = await post('/api/lan/data/sync-products', { products: [] }, { Origin: `http://192.168.1.20:${PORT}` });
  assert.equal(terminal.status, 200);
});

test('edit produk dari kasir tidak menimpa stok di server (stok lama di kasir diabaikan)', async () => {
  await post('/api/lan/data/sync-products', { products: [{ id: 'p-edit', name: 'Lama', price: 1000, stock: 20 }] });
  await post('/api/lan/data/push-transaction', { transaction: { id: 'tx-edit', finalTotal: 1, items: [{ productId: 'p-edit', quantity: 5 }] } });
  assert.equal(await stockOf('p-edit'), 15);

  // Kasir lain mengedit harga dengan data stok lamanya (20)
  const r = await post('/api/lan/data/sync-products', { products: [{ id: 'p-edit', name: 'Baru', price: 1200, stock: 20 }] });
  assert.equal(r.data.updatedStocks[0].newStock, 15);
  const p = (await pull()).products.find((x: any) => x.id === 'p-edit');
  assert.equal(p.name, 'Baru');
  assert.equal(p.price, 1200);
  assert.equal(p.stock, 15);

  await restartServer();
  assert.equal(await stockOf('p-edit'), 15);
});

test('penyesuaian stok dikirim sebagai selisih, digabung dengan penjualan kasir lain, dan idempoten', async () => {
  await post('/api/lan/data/sync-products', { products: [{ id: 'p-adj', name: 'Opname', price: 1000, stock: 10 }] });
  // Kasir A menjual 3, kasir B mencatat barang masuk +24 (berdasarkan stok lamanya)
  await post('/api/lan/data/push-transaction', { transaction: { id: 'tx-adj', finalTotal: 1, items: [{ productId: 'p-adj', quantity: 3 }] } });
  const adj = { key: 'adj-1', items: [{ productId: 'p-adj', delta: 24 }], reason: 'Barang masuk' };
  const r1 = await post('/api/lan/data/stock-adjust', adj);
  assert.equal(r1.data.updatedStocks[0].newStock, 31);
  const r2 = await post('/api/lan/data/stock-adjust', adj);
  assert.equal(r2.data.duplicate, true);
  assert.equal(await stockOf('p-adj'), 31);

  // Koreksi turun (barang rusak) tidak bisa membuat stok negatif
  await post('/api/lan/data/stock-adjust', { key: 'adj-2', items: [{ productId: 'p-adj', delta: -100 }] });
  assert.equal(await stockOf('p-adj'), 0);

  const bad = await post('/api/lan/data/stock-adjust', { key: 'adj-3', items: [{ productId: 'p-adj', delta: 'abc' }] });
  assert.equal(bad.status, 400);
});

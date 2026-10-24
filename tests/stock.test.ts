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
  await new Promise((r) => setTimeout(r, 300)); // beri waktu tulis SQLite yang tidak ditunggu (mis. pesanan parkir)
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
  // Windows bisa menahan file database sesaat setelah proses berhenti: hapus dengan toleransi
  try {
    fs.rmSync(dataDir, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
  } catch {}
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

test('jaringan putus-sambung: transaksi terkirim sudah void tidak menambah stok', async () => {
  await post('/api/lan/data/sync-products', { products: [{ id: 'p-off1', name: 'Off1', price: 1000, stock: 10 }] });
  // Dijual & di-void saat offline: penjualan tiba berstatus void (tidak memotong stok), lalu void-nya
  await post('/api/lan/data/push-transaction', { transaction: { id: 'tx-off1', status: 'void', finalTotal: 3000, items: [{ productId: 'p-off1', quantity: 3 }] } });
  await post('/api/lan/data/stock-return', { key: 'void-off1', kind: 'void', items: [{ productId: 'p-off1', quantity: 3 }], transactionId: 'tx-off1', transactionUpdate: { status: 'void' } });
  assert.equal(await stockOf('p-off1'), 10, 'stok tidak boleh membengkak menjadi 13');
});

test('jaringan putus-sambung: void tiba lebih dulu dari penjualannya, stok tetap benar', async () => {
  await post('/api/lan/data/sync-products', { products: [{ id: 'p-off2', name: 'Off2', price: 1000, stock: 10 }] });
  await post('/api/lan/data/stock-return', { key: 'void-off2', kind: 'void', items: [{ productId: 'p-off2', quantity: 2 }], transactionId: 'tx-off2', transactionUpdate: { status: 'void' } });
  await post('/api/lan/data/push-transaction', { transaction: { id: 'tx-off2', finalTotal: 2000, items: [{ productId: 'p-off2', quantity: 2 }] } });
  assert.equal(await stockOf('p-off2'), 10, 'penjualan yang sudah dibatalkan tidak boleh memotong stok');
});

test('poin yang ditukar member dipotong di server (field pointsUsed)', async () => {
  await post('/api/lan/database/seed', {
    customers: [{ id: 'c-tukar', name: 'Pak Tukar', phone: '0813', tier: 'Gold', points: 100, totalSpent: 0, ordersCount: 0 }],
  });
  await post('/api/lan/data/push-transaction', {
    transaction: { id: 'tx-tukar', finalTotal: 40000, pointsUsed: 50, pointsEarned: 4, customer: { id: 'c-tukar', name: 'Pak Tukar' }, items: [] },
  });
  const c = (await pull()).customers.find((x: any) => x.id === 'c-tukar');
  assert.equal(c.points, 54, '100 - 50 ditukar + 4 diperoleh');
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

test('nomor invoice kembar tidak membuat transaksi hilang, dan server hanya melaporkan yang tersimpan', async () => {
  await post('/api/pos/transactions/sync', { transactions: [{ id: 'tx-inv-a', invoiceNumber: 'INV-KEMBAR-1', finalTotal: 1000, items: [] }] });
  const r = await post('/api/pos/transactions/sync', {
    transactions: [
      { id: 'tx-inv-c', invoiceNumber: 'INV-UNIK-3', finalTotal: 3000, items: [] },
      { id: 'tx-inv-d', invoiceNumber: 'INV-KEMBAR-1', finalTotal: 4000, items: [] },
      { id: 'tx-inv-e', invoiceNumber: 'INV-UNIK-5', finalTotal: 5000, items: [] },
    ],
  });
  assert.deepEqual([...r.data.syncedIds].sort(), ['tx-inv-c', 'tx-inv-d', 'tx-inv-e']);

  const list = await (await fetch(`${BASE}/api/pos/transactions?search=INV-&pageSize=100`)).json();
  const byId = new Map(list.transactions.map((t: any) => [t.id, t]));
  for (const id of ['tx-inv-a', 'tx-inv-c', 'tx-inv-d', 'tx-inv-e']) assert.ok(byId.has(id), `${id} harus tersimpan`);
  // Nomor invoice yang ditampilkan tetap nomor asli
  assert.equal((byId.get('tx-inv-d') as any).invoiceNumber, 'INV-KEMBAR-1');

  // Kirim ulang transaksi yang sama tetap aman (tidak dobel, tidak gagal)
  const again = await post('/api/pos/transactions', { id: 'tx-inv-d', invoiceNumber: 'INV-KEMBAR-1', finalTotal: 4000, items: [] });
  assert.equal(again.status, 200);
});

test('filter tanggal ke server memakai batas hari lokal (penjualan dini hari WIB tidak pindah hari)', async () => {
  // 18 Okt 2026 pukul 01.30 WIB = 17 Okt 2026 18.30 UTC
  await post('/api/pos/transactions', { id: 'tx-dinihari', invoiceNumber: 'INV-DINIHARI', finalTotal: 7000, items: [], createdAt: '2026-10-17T18:30:00.000Z' });
  const wibStart = '2026-10-17T17:00:00.000Z'; // 18 Okt 00.00 WIB
  const wibEnd = '2026-10-18T16:59:59.999Z'; // 18 Okt 23.59 WIB
  const r = await (await fetch(`${BASE}/api/pos/transactions?startDate=${wibStart}&endDate=${wibEnd}&pageSize=100`)).json();
  assert.ok(r.transactions.some((t: any) => t.id === 'tx-dinihari'));
});

test('AI faktur & opname visual: tanpa AI menjawab error, tidak mengarang data', async () => {
  const catalog = [{ id: 'p-ai', name: 'Produk AI', price: 1000, costPrice: 800, stock: 10 }];
  const inv = await post('/api/ai/scan-invoice', { imageBase64: 'aGVsbG8=', mimeType: 'image/png', catalogProducts: catalog });
  assert.equal(inv.status, 503);
  assert.equal(inv.data.items, undefined, 'tidak boleh ada barang karangan');

  const noImage = await post('/api/ai/scan-invoice', { catalogProducts: catalog });
  assert.equal(noImage.status, 400);

  const opname = await post('/api/ai/visual-stock-opname', { imagesBase64: ['aGVsbG8='], catalogProducts: catalog });
  assert.equal(opname.status, 503);
  assert.equal(opname.data.items, undefined, 'tidak boleh ada hitungan stok karangan');
});

test('SQLite satu-satunya penyimpanan: pesanan parkir bertahan setelah restart, tanpa snapshot JSON', async () => {
  const id = `held-${Date.now()}`;
  const res = await post('/api/lan/orders/held', { heldOrder: { id, items: [], note: 'uji' }, clientName: 'Kasir 2' });
  assert.equal(res.status, 200);
  await restartServer();
  const list = await (await fetch(`${BASE}/api/lan/orders/held`)).json();
  const orders = list.heldOrders || list.orders || list.data || [];
  assert.ok(orders.some((o: any) => o.id === id), 'pesanan parkir dimuat ulang dari SQLite');
  await new Promise((r) => setTimeout(r, 1500));
  assert.equal(fs.existsSync(path.join(dataDir, 'lan-database.json')), false, 'snapshot JSON tidak lagi ditulis');
});

test('cari harga di web (AI): tanpa API key menolak jujur, tanpa harga karangan', async () => {
  for (const body of [{ mode: 'competitor', productName: 'Gula Pasir 1kg' }, { mode: 'official', commodity: 'Gula Konsumsi', region: 'Kab. Magetan' }]) {
    const r = await post('/api/ai/price-search', body);
    assert.equal(r.status, 503);
    assert.equal(r.data.results, undefined);
  }
});

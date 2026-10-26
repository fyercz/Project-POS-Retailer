/**
 * Simulasi operasional 1 bulan (Oktober 2026) + tutup buku. Lihat tests/sim/*.
 * Memastikan: laporan aplikasi = pembukuan bayangan, server menerima semua operasi dengan stok
 * akhir sama persis, dan semua fitur operasional ikut terpakai.
 */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, type ChildProcess } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { runMonthSimulation } from './sim/monthSimulation.ts';
import { monthClosing } from './sim/monthClosing.ts';

const sim = runMonthSimulation();
const closing = monthClosing(sim);
const PORT = 3993;
const BASE = `http://127.0.0.1:${PORT}`;
const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pos-sim-'));
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

test('cakupan: semua fitur operasional terpakai dalam sebulan', () => {
  const tx = sim.transactions;
  const methods = new Set(tx.map((t) => t.payment.method));
  for (const m of ['cash', 'qris', 'card', 'transfer']) assert.ok(methods.has(m), `metode bayar ${m}`);
  assert.ok(tx.some((t) => t.items.some((l: any) => l.selectedUnit)), 'satuan grosir');
  assert.ok(tx.some((t) => t.customer) && tx.some((t) => t.pointsUsed > 0) && tx.some((t) => t.voucherCode), 'member, tukar poin, voucher');
  assert.ok(tx.some((t) => t.status === 'void'), 'void');
  const rm = new Set(sim.salesReturns.map((r) => r.refundMethod));
  for (const m of ['cash', 'transfer', 'store_credit']) assert.ok(rm.has(m), `retur ${m}`);
  assert.ok(sim.salesReturns.some((r) => !r.items[0].restockToInventory), 'retur barang rusak');
  assert.ok(sim.shadow.storeCreditUsedCount > 0, 'saldo toko dipakai belanja');
  assert.ok(sim.purchases.some((p: any) => p.ppnAmount > 0 && p.discountAmount > 0), 'faktur dengan diskon & PPN');
  assert.ok(sim.customers.every((c: any) => (c.storeCredit || 0) >= 0), 'saldo toko tidak pernah negatif');
  const terms = sim.purchases.map((p) => p.paymentTerms).join('|');
  assert.match(terms, /Tunai/); assert.match(terms, /Tempo/); assert.match(terms, /Konsinyasi/);
  assert.ok(sim.purchases.some((p) => p.payments.length > 0), 'pembayaran hutang');
  assert.ok(sim.purchaseReturns.length > 0 && sim.opname.length > 0 && sim.priceChanges.length > 0, 'retur supplier, opname, perubahan harga');
  assert.ok(sim.shifts.length === 31 && sim.shifts.some((s) => s.difference), 'shift harian & selisih kas');
  assert.ok(sim.products.every((p) => p.stock >= 0), 'tidak ada stok negatif');
});

test('tutup buku: setiap pos laporan aplikasi = pembukuan bayangan', () => {
  const wrong = closing.rows.filter((r) => !r.ok);
  assert.deepEqual(wrong.map((r) => `${r.area} / ${r.item}: aplikasi ${r.app} vs bayangan ${r.shadow}`), []);
});

test('server: semua operasi diterima & stok akhir sama persis dengan aplikasi', async () => {
  for (const op of sim.serverOps) {
    const r = await fetch(`${BASE}${op.path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(op.body) });
    assert.ok(r.status < 300, `${op.path} -> ${r.status} ${(await r.text()).slice(0, 160)}`);
  }
  const pulled = await (await fetch(`${BASE}/api/lan/data/pull`)).json();
  const serverStock = new Map<string, number>((pulled.products || []).map((p: any) => [p.id, Number(p.stock)]));
  const mismatch = sim.products.filter((p) => serverStock.get(p.id) !== p.stock).map((p) => `${p.name}: aplikasi ${p.stock} vs server ${serverStock.get(p.id)}`);
  assert.deepEqual(mismatch, []);
  // Putar ulang semua operasi: idempoten, stok tidak berubah
  for (const op of sim.serverOps.filter((o) => o.path !== '/api/lan/data/sync-products')) {
    await fetch(`${BASE}${op.path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(op.body) });
  }
  const again = await (await fetch(`${BASE}/api/lan/data/pull`)).json();
  const changed = (again.products || []).filter((p: any) => serverStock.get(p.id) !== Number(p.stock)).map((p: any) => p.name);
  assert.deepEqual(changed, [], 'kirim ulang (mis. jaringan putus) tidak memotong stok dua kali');
});

test('tutup buku tetap cocok untuk 10 bulan dengan data acak berbeda', () => {
  const failures: string[] = [];
  for (let seed = 1; seed <= 10; seed++) {
    const s = runMonthSimulation(seed * 7919);
    if (s.products.some((p) => p.stock < 0)) failures.push(`seed ${seed}: stok negatif`);
    for (const r of monthClosing(s).rows.filter((x) => !x.ok)) failures.push(`seed ${seed}: ${r.area} / ${r.item}: aplikasi ${r.app} vs bayangan ${r.shadow}`);
  }
  assert.deepEqual(failures, []);
});

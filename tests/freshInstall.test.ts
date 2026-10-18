/** Instalasi baru dimulai kosong: tidak ada produk, member, supplier, atau transaksi contoh. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

test('database server pada instalasi baru tidak berisi data contoh', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pos-fresh-'));
  process.env.POS_DATA_DIR = dir;
  const db = await import('../src/server/sqliteMasterDb.ts');
  await db.initSqliteMasterDatabase();
  assert.equal((await db.getAllProducts()).length, 0);
  assert.equal((await db.getAllCustomers()).length, 0);
  assert.equal((await db.getAllSuppliers()).length, 0);
  // Windows tidak bisa menghapus file database yang masih terbuka: tutup dulu, lalu hapus dengan toleransi
  try {
    db.getSqliteClient().close();
  } catch {}
  try {
    fs.rmSync(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
  } catch {}
});

test('pengaturan bawaan tidak memuat identitas toko mana pun & modal awal 0', async () => {
  const { DEFAULT_STORE_SETTINGS: d } = await import('../src/data/mockData.ts');
  for (const key of ['storeName', 'branchName', 'address', 'phone', 'googleMapsUrl', 'storeTagline', 'operatingHours'] as const) {
    assert.equal((d as any)[key], '', `${key} harus kosong`);
  }
  assert.equal(d.initialCapital, 0);
  assert.doesNotMatch(JSON.stringify(d), /ULIL|Magetan|Parang|0851/i);
});

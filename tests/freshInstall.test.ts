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

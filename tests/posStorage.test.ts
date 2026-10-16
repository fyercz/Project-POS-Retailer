/**
 * Penyimpanan di browser: IndexedDB adalah sumber utama. Salinan localStorage yang basi
 * (karena kuota 5 MB penuh) tidak boleh menimpa data di IndexedDB.
 */
import 'fake-indexeddb/auto';
import { test } from 'node:test';
import assert from 'node:assert/strict';

class QuotaLimitedStorage {
  private map = new Map<string, string>();
  constructor(private limitChars: number) {}
  get length() { return this.map.size; }
  key(i: number) { return [...this.map.keys()][i] ?? null; }
  getItem(k: string) { return this.map.has(k) ? this.map.get(k)! : null; }
  removeItem(k: string) { this.map.delete(k); }
  clear() { this.map.clear(); }
  setItem(k: string, v: string) {
    const used = [...this.map.entries()].filter(([key]) => key !== k).reduce((n, [, val]) => n + val.length, 0);
    if (used + v.length > this.limitChars) {
      const err: any = new Error('QuotaExceededError');
      err.name = 'QuotaExceededError';
      throw err;
    }
    this.map.set(k, v);
  }
}

(globalThis as any).window = globalThis;
(globalThis as any).localStorage = new QuotaLimitedStorage(2000);

test('data besar tersimpan di IndexedDB, salinan basi di localStorage dihapus, dan migrasi tidak menimpa', async () => {
  const { posStorage } = await import('../src/utils/posStorage.ts');
  const key = 'pos_retail_tx_v3';

  // 1. Data kecil: tersimpan di IndexedDB dan localStorage
  await posStorage.setItem(key, [{ id: 'tx-lama' }]);
  assert.ok(localStorage.getItem(key));

  // 2. Data membesar melewati kuota localStorage
  const big = Array.from({ length: 200 }, (_, i) => ({ id: `tx-${i}`, note: 'x'.repeat(20) }));
  await posStorage.setItem(key, big);
  assert.equal(localStorage.getItem(key), null, 'salinan basi di localStorage harus dihapus');
  assert.equal((await posStorage.readFromIndexedDB<any[]>(key))?.length, 200);

  // 3. Salinan lama di localStorage (mis. dari versi sebelumnya) tidak boleh menimpa IndexedDB
  localStorage.setItem(key, JSON.stringify([{ id: 'tx-lama' }]));
  (posStorage as any).hasMigrated = false;
  await posStorage.autoMigrateFromLocalStorage();
  assert.equal((await posStorage.readFromIndexedDB<any[]>(key))?.length, 200);

  // 4. Kunci yang belum ada di IndexedDB tetap dimigrasikan
  localStorage.setItem('pos_vouchers', JSON.stringify([{ code: 'HEMAT' }]));
  (posStorage as any).hasMigrated = false;
  await posStorage.autoMigrateFromLocalStorage();
  assert.equal((await posStorage.readFromIndexedDB<any[]>('pos_vouchers'))?.[0]?.code, 'HEMAT');
});

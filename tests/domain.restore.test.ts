import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  sanitizeRestoredProducts,
  mergeRestoredEmployees,
  mergeRestoredSettings,
  mergeProductsKeepExisting,
  mergeCustomersKeepExisting,
  mergeSuppliersKeepExisting,
  addMissingById,
} from '../src/domain/restore.ts';

test('karyawan & PIN sekarang tidak ditimpa; karyawan dari backup ditambahkan NONAKTIF', () => {
  const current = [{ id: 'own', name: 'Owner Baru', pin: '2580', isActive: true }];
  const fromBackup = [
    { id: 'own', name: 'Owner Lama', pin: '9999', isActive: true },
    { id: 'old', name: 'Mantan Kasir', pin: '1234', isActive: true },
  ];
  const merged = mergeRestoredEmployees(current as any, fromBackup) as any[];
  assert.equal(merged.length, 2);
  assert.equal(merged[0].pin, '2580', 'PIN Owner sekarang tetap');
  assert.equal(merged[1].isActive, false, 'mantan karyawan tidak bisa langsung login');
});

test('pengaturan digabung (backup lama tidak mengosongkan pengaturan baru)', () => {
  const merged = mergeRestoredSettings({ storeName: 'Baru', welcomeBonusPoints: 0 } as any, { storeName: 'Lama' });
  assert.equal(merged.storeName, 'Lama');
  assert.equal(merged.welcomeBonusPoints, 0);
  assert.equal(mergeRestoredSettings({ a: 1 } as any, null).a, 1);
});

test('produk dari backup dibersihkan: angka rusak jadi 0, data rusak dibuang', () => {
  const list = sanitizeRestoredProducts<any>([
    { id: 'p1', name: 'Gula', price: 'abc', costPrice: -5, stock: '7' },
    { id: 'p2' },
    null,
  ]);
  assert.equal(list.length, 1);
  assert.equal(list[0].price, 0);
  assert.equal(list[0].costPrice, 0);
  assert.equal(list[0].stock, 7);
});

test('mode gabung: hanya menambah yang belum ada (id, barcode, HP, nama supplier)', () => {
  assert.equal(mergeProductsKeepExisting([{ id: 'a', barcode: '111' }], [{ id: 'b', barcode: '111' }, { id: 'c', barcode: '222' }]).length, 2);
  assert.equal(mergeCustomersKeepExisting([{ id: 'c1', name: 'A', phone: '0812' }], [{ id: 'c2', name: 'B', phone: '0812' }]).length, 1);
  assert.equal(mergeSuppliersKeepExisting([{ id: 's1', name: 'Grosir Jaya' }], [{ id: 's2', name: ' grosir jaya ' }]).length, 1);
  assert.equal(addMissingById([{ id: 't1' }], [{ id: 't1' }, { id: 't2' }, null]).length, 2);
});

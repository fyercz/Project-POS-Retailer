import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nextSupplierCode, assignMissingSupplierCodes } from '../src/domain/supplierCode.ts';

test('kode supplier otomatis: urut 3 digit, melanjutkan kode terbesar', () => {
  assert.equal(nextSupplierCode([]), '001');
  assert.equal(nextSupplierCode([{ code: '043' }, { code: '013' }]), '044');
  assert.equal(nextSupplierCode([{ code: '999' }]), '1000');
});

test('supplier lama tanpa kode diberi kode sesuai urutan dibuat', () => {
  // disimpan terbaru-dulu
  const list = [
    { name: 'C', createdAt: '2026-10-03' },
    { name: 'B', createdAt: '2026-10-02', code: '005' },
    { name: 'A', createdAt: '2026-10-01' },
  ];
  assert.deepEqual(assignMissingSupplierCodes(list).map((s) => `${s.name}:${s.code}`), ['C:007', 'B:005', 'A:006']);
  const full = [{ name: 'X', code: '001' }];
  assert.equal(assignMissingSupplierCodes(full), full, 'tanpa perubahan bila semua sudah berkode');
});

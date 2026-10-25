import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateCustomerEdit } from '../src/domain/customerEdit.ts';

const others = [{ id: 'a', phone: '0812-1111-2222' }, { id: 'b', phone: '081233334444' }];

test('ubah data member: valid, nomor HP unik, nama & email diperiksa', () => {
  const ok = validateCustomerEdit('a', { name: '  Bu   Sri ', phone: '0812-1111-2222', email: 'sri@contoh.id', tier: 'Gold' }, others);
  assert.ok(ok.ok && ok.updates.name === 'Bu Sri' && ok.updates.tier === 'Gold', 'nomor sendiri boleh tetap');
  assert.equal(validateCustomerEdit('a', { name: 'Bu Sri', phone: '0812 3333 4444' }, others).ok, false, 'nomor milik member lain (beda format) ditolak');
  assert.equal(validateCustomerEdit('a', { name: 'B', phone: '081211112222' }, others).ok, false);
  assert.equal(validateCustomerEdit('a', { name: 'Bu Sri', phone: '0812' }, others).ok, false);
  assert.equal(validateCustomerEdit('a', { name: 'Bu Sri', phone: '081211112222', email: 'bukan-email' }, others).ok, false);
});

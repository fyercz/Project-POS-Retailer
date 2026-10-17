import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newShift, applySaleToShift, applyCashOut, expectedCashOf, canEditStartingCash, closeShift } from '../src/domain/shiftCash.ts';

const owner = { id: 'e1', name: 'Bu Ani', role: 'cashier' as const };

test('kas diharapkan = modal + penjualan tunai - uang keluar; non-tunai tidak masuk laci', () => {
  let s = newShift(owner, 200_000);
  s = applySaleToShift(s, 50_000, true);
  s = applySaleToShift(s, 30_000, false);
  s = applyCashOut(s, 20_000); // retur tunai
  assert.equal(expectedCashOf(s), 230_000);
  assert.equal(s.totalSales, 80_000);
  assert.equal(s.totalTransactions, 2);
});

test('uang keluar: pembatalan tidak membuat negatif', () => {
  let s = applyCashOut(newShift(owner), 10_000);
  s = applyCashOut(s, -25_000);
  assert.equal(s.cashOut, 0);
});

test('tutup shift: selisih dihitung terhadap kas diharapkan (termasuk uang keluar)', () => {
  let s = applySaleToShift(newShift(owner, 100_000), 50_000, true);
  s = applyCashOut(s, 15_000); // pengeluaran dari laci
  const closed = closeShift(s, 135_000, 'pas');
  assert.equal(closed.difference, 0, 'tidak ada kekurangan palsu');
  assert.equal(closed.status, 'closed');
  assert.equal(closeShift(s, 130_000).difference, -5_000);
});

test('modal awal: kasir hanya sebelum transaksi pertama; Supervisor/Owner kapan saja', () => {
  const fresh = newShift(owner);
  const busy = applySaleToShift(fresh, 10_000, true);
  assert.equal(canEditStartingCash('cashier', fresh), true);
  assert.equal(canEditStartingCash('cashier', busy), false);
  assert.equal(canEditStartingCash('supervisor', busy), true);
  assert.equal(canEditStartingCash('owner', busy), true);
  assert.equal(canEditStartingCash('owner', null), false);
});

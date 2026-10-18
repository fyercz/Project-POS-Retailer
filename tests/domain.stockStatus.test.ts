import { test } from 'node:test';
import assert from 'node:assert/strict';
import { stockStatusOf, buildStockHistoryIds, needsRestock } from '../src/domain/stockStatus.ts';

test('produk impor stok 0 tanpa riwayat = "Belum ada stok", bukan "Habis", dan tidak masuk peringatan', () => {
  const s = stockStatusOf({ id: 'imp', stock: 0, minStock: 2 }, new Set());
  assert.equal(s, 'unstocked');
  assert.equal(needsRestock(s), false);
});

test('stok 0 setelah pernah terjual / diterima / tercatat = "Habis"', () => {
  const history = buildStockHistoryIds(
    [{ items: [{ product: { id: 'laku' } }] }],
    [{ items: [{ productId: 'diterima' }] }]
  );
  assert.equal(stockStatusOf({ id: 'laku', stock: 0, minStock: 2 }, history), 'out');
  assert.equal(stockStatusOf({ id: 'diterima', stock: 0, minStock: 2 }, history), 'out');
  assert.equal(stockStatusOf({ id: 'x', stock: 0, minStock: 2, stockInitializedAt: '2026-10-01' }, history), 'out');
  assert.equal(needsRestock('out'), true);
});

test('stok di atas 0: menipis bila <= minimal, selain itu aman', () => {
  assert.equal(stockStatusOf({ id: 'a', stock: 2, minStock: 2 }), 'low');
  assert.equal(stockStatusOf({ id: 'a', stock: 3, minStock: 2 }), 'ok');
  assert.equal(stockStatusOf({ id: 'a', stock: 1, minStock: 0 }), 'ok');
});

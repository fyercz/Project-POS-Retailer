import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeStockAdjustments, summarizeAdjustments } from '../src/domain/stockAdjustments.ts';

test('penyesuaian dicatat dengan nilai harga modal; tanpa perubahan tidak dicatat', () => {
  const before = [
    { id: 'a', name: 'Permen', stock: 100, costPrice: 400 },
    { id: 'b', name: 'Kopi', stock: 50, costPrice: 1100 },
    { id: 'c', name: 'Gula', stock: 10, costPrice: 16500 },
  ];
  const adj = makeStockAdjustments(before, [{ id: 'a', stock: 88 }, { id: 'b', stock: 53 }, { id: 'c', stock: 10 }], 'Opname Oktober', 'Owner', new Date('2026-10-31T10:00:00Z'));
  assert.deepEqual(adj.map((x) => [x.productId, x.delta, x.value]), [['a', -12, -4800], ['b', 3, 3300]]);
  assert.equal(adj[0]!.reason, 'Opname Oktober');
  assert.deepEqual(summarizeAdjustments(adj), { loss: 4800, gain: 3300 });
  assert.deepEqual(summarizeAdjustments(adj, Date.parse('2026-11-01')), { loss: 0, gain: 0 });
});

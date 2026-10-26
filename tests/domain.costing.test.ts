import { test } from 'node:test';
import assert from 'node:assert/strict';
import { weightedAverageCost } from '../src/domain/costing.ts';

test('harga modal rata-rata tertimbang', () => {
  assert.equal(weightedAverageCost(10, 16500, 30, 17200), 17025, '(10x16.500 + 30x17.200) / 40');
  assert.equal(weightedAverageCost(0, 16500, 30, 17200), 17200, 'stok habis: modal = harga beli');
  assert.equal(weightedAverageCost(10, 0, 30, 17200), 17200, 'modal lama kosong: modal = harga beli');
  assert.equal(weightedAverageCost(10, 16500, 30, 0), 16500, 'harga beli kosong: modal lama tetap');
  assert.equal(weightedAverageCost(-3, 16500, 30, 17200), 17200, 'stok negatif dianggap 0');
});

test('modal per unit memperhitungkan diskon & PPN faktur (sama dengan jurnal)', async () => {
  const { invoiceCostFactor, landedUnitCost } = await import('../src/domain/costing.ts');
  // Subtotal 1.000.000, diskon 5% (950.000), PPN 11% -> 1.054.500
  const f = invoiceCostFactor({ subtotal: 1_000_000, totalAmount: 1_054_500 });
  assert.equal(landedUnitCost(5000, f), 5273, '5.000 x 1,0545');
  assert.equal(invoiceCostFactor({ subtotal: 0, totalAmount: 100 }), 1);
  assert.equal(invoiceCostFactor({ subtotal: 500, totalAmount: 500 }), 1);
});

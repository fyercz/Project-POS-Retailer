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

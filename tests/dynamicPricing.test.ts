import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getEffectiveCompetitors } from '../src/utils/dynamicPricingEngine.ts';

const product: any = { id: 'p1', name: 'Gula 1kg', price: 16000, costPrice: 14000, stock: 10, minStock: 2 };

test('harga pesaing otomatis ditandai ESTIMASI tanpa klaim sumber palsu', () => {
  const list = getEffectiveCompetitors(product);
  assert.ok(list.length > 0);
  for (const c of list) {
    assert.equal(c.isEstimate, true);
    assert.doesNotMatch(c.notes || '', /Toko Fisik|Alfagift|Survei/);
  }
});

test('harga pesaing yang diisi pengguna dipakai apa adanya (bukan estimasi)', () => {
  const manual = [{ competitorName: 'Indomaret', price: 15500, isEstimate: false, notes: 'Input manual' }];
  assert.deepEqual(getEffectiveCompetitors({ ...product, competitorPrices: manual }), manual);
});

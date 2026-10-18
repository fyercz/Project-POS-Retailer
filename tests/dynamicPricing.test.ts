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

test('rekomendasi tidak memakai harga pesaing estimasi; harga manual dipakai sebagai data pasar', async () => {
  const { generateDynamicPricingSuggestions } = await import('../src/utils/dynamicPricingEngine.ts');
  const cats = new Map([['c1', 'Sembako']]);
  const p = { ...product, price: 16000, costPrice: 14000, categoryId: 'c1' };
  const noMarket = generateDynamicPricingSuggestions([p], [], cats, 'balanced');
  assert.equal(noMarket.length, 1);
  assert.equal(noMarket[0]!.hasMarketData, false);
  assert.equal(noMarket[0]!.competitorAvgPrice, 0);
  assert.match(noMarket[0]!.aiReasoning, /harga pesaing/i);

  const manual = { ...p, competitorPrices: [{ competitorName: 'Toko A', price: 15000, isEstimate: false }] };
  const withMarket = generateDynamicPricingSuggestions([manual], [], cats, 'balanced');
  assert.equal(withMarket[0]!.hasMarketData, true);
  assert.equal(withMarket[0]!.competitorAvgPrice, 15000);
});

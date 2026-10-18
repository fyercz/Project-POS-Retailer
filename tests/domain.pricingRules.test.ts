import { test } from 'node:test';
import assert from 'node:assert/strict';
import { recommendFromOwnData } from '../src/domain/pricingRules.ts';

const base = { costPrice: 10000, unitsSold30d: 60, daysOfInventory: 10, strategy: 'balanced' as const, minSafePrice: 10600, round: (p: number) => Math.round(p / 100) * 100 };

test('margin terlalu tipis -> naik ke ~12%', () => {
  const r = recommendFromOwnData({ ...base, currentPrice: 10500, turnoverSpeed: 'moderate' });
  assert.equal(r.suggestedPrice, 11400);
  assert.equal(r.strategyTag, 'Peluang Margin');
});

test('laris & margin di bawah target -> naik kecil, maksimal +5%', () => {
  const r = recommendFromOwnData({ ...base, currentPrice: 11000, turnoverSpeed: 'fast' });
  assert.ok(r.suggestedPrice > 11000 && r.suggestedPrice <= 11550, String(r.suggestedPrice));
  assert.match(r.reasoning, /Belum ada harga pesaing asli/);
});

test('stok mengendap & margin longgar -> turun 5% (10% bila strategi percepat stok), tidak di bawah batas aman', () => {
  const slow = { ...base, currentPrice: 15000, turnoverSpeed: 'dead_stock' as const, daysOfInventory: 90 };
  assert.equal(recommendFromOwnData(slow).suggestedPrice, 14300);
  assert.equal(recommendFromOwnData({ ...slow, strategy: 'accelerate_turnover' }).suggestedPrice, 13500);
  const tight = recommendFromOwnData({ ...slow, currentPrice: 11000 });
  assert.equal(tight.suggestedPrice, 11000, 'margin tidak longgar: dipertahankan');
});

test('tanpa alasan kuat -> dipertahankan dengan keyakinan rendah', () => {
  const r = recommendFromOwnData({ ...base, currentPrice: 12500, turnoverSpeed: 'moderate' });
  assert.equal(r.suggestedPrice, 12500);
  assert.ok(r.confidenceScore < 70);
});

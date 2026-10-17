import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeCartTotals, calcVoucherDiscount, calcCustomerDiscount, tierPointsMultiplier } from '../src/domain/cartTotals.ts';

const line = (id: string, total: number, eligible = true) => ({ product: { id }, totalPrice: total, isPointsEligible: eligible });
const cart = [line('a', 60_000), line('b', 40_000, false)]; // subtotal 100.000

test('voucher: minimal belanja, batas maxDiscount, dan nominal', () => {
  const pct = { code: 'P', discountType: 'percentage', value: 20, minSpend: 50_000, maxDiscount: 15_000, description: '' } as any;
  assert.equal(calcVoucherDiscount(pct, 100_000), 15_000, '20% dari 100rb dibatasi maks. 15rb');
  assert.equal(calcVoucherDiscount(pct, 40_000), 0, 'di bawah minimal belanja');
  const fixed = { code: 'F', discountType: 'fixed', value: 5_000, minSpend: 30_000, description: '' } as any;
  assert.equal(calcVoucherDiscount(fixed, 30_000), 5_000);
  assert.equal(calcVoucherDiscount(null, 100_000), 0);
});

test('diskon member: per item, per keranjang, minimal belanja', () => {
  assert.equal(calcCustomerDiscount({ type: 'percentage', value: 10, targetType: 'item', targetProductId: 'a' } as any, cart, 100_000), 6_000);
  assert.equal(calcCustomerDiscount({ type: 'percentage', value: 10, targetType: 'item', targetProductId: 'zzz' } as any, cart, 100_000), 0);
  assert.equal(calcCustomerDiscount({ type: 'fixed', value: 250_000 } as any, cart, 100_000), 100_000, 'tidak melebihi subtotal');
  assert.equal(calcCustomerDiscount({ type: 'percentage', value: 10, minSpend: 150_000 } as any, cart, 100_000), 0);
});

test('poin: dibatasi saldo member dan sisa tagihan; total tidak pernah negatif', () => {
  const t = computeCartTotals({ cart, customer: { points: 5_000, tier: 'Bronze' }, pointsToRedeem: 5_000, pointRedemptionRate: 100 });
  assert.equal(t.maxRedeemablePoints, 1_000, 'sisa tagihan 100rb / Rp100 per poin');
  assert.equal(t.pointsDiscount, 100_000);
  assert.equal(t.finalTotal, 0);

  const stacked = computeCartTotals({
    cart,
    voucher: { code: 'F', discountType: 'fixed', value: 90_000, minSpend: 0, description: '' } as any,
    customerDiscount: { type: 'fixed', value: 50_000 } as any,
    customer: { points: 999, tier: 'Bronze' },
    pointsToRedeem: 999,
  });
  assert.equal(stacked.finalTotal, 0, 'voucher + diskon member melebihi subtotal tetap 0');
  assert.equal(stacked.pointsDiscount, 0, 'tidak ada poin terpakai bila tagihan sudah habis');
});

test('tanpa member: poin tidak bisa ditukar dan tidak ada pengali tier', () => {
  const t = computeCartTotals({ cart, pointsToRedeem: 500 });
  assert.equal(t.pointsDiscount, 0);
  assert.equal(t.finalTotal, 100_000);
});

test('perolehan poin: hanya barang berpoin, proporsional setelah diskon, dikali tier', () => {
  const t = computeCartTotals({ cart, customer: { points: 0, tier: 'Gold' }, pointsRatio: 10_000 });
  // barang berpoin 60rb dari 100rb -> 6 poin x 1.5 = 9
  assert.equal(t.pointsEarned, 9);
  assert.equal(tierPointsMultiplier('Platinum'), 2);
  assert.equal(tierPointsMultiplier('Silver'), 1.2);
  assert.equal(tierPointsMultiplier(undefined), 1);
});

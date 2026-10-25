import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mergeCategories, validateNewCategory } from '../src/domain/categories.ts';
import { buildVoucher } from '../src/domain/voucherInput.ts';

const base: any[] = [{ id: 'all', name: 'Semua Produk', iconName: 'x' }, { id: 'snacks', name: 'Snack & Biskuit', iconName: 'x' }];

test('kategori: bawaan + buatan toko + dari produk (mis. dibuat di kasir lain)', () => {
  const cats = mergeCategories(base, [{ id: 'c_frozen_food', name: 'Frozen Food' }], [{ categoryId: 'snacks' }, { categoryId: 'c_mainan_anak' }]);
  assert.deepEqual(cats.map((c) => c.name), ['Semua Produk', 'Snack & Biskuit', 'Frozen Food', 'Mainan Anak']);
});

test('kategori baru: nama unik, id aman, tidak bentrok', () => {
  const r = validateNewCategory('  Frozen   Food ', base as any);
  assert.ok(r.ok && r.category.id === 'c_frozen_food' && r.category.name === 'Frozen Food');
  assert.equal(validateNewCategory('snack & biskuit', base as any).ok, false, 'nama sama (tanpa beda huruf besar) ditolak');
  assert.equal(validateNewCategory('x', base as any).ok, false);
  const r2 = validateNewCategory('Frozen-Food', [...base, { id: 'c_frozen_food', name: 'Frozen Food 1', iconName: 'x' }] as any);
  assert.ok(r2.ok && r2.category.id === 'c_frozen_food_2');
});

test('voucher manual: validasi & bentuk data', () => {
  const ok = buildVoucher({ code: 'hemat 10', discountType: 'percentage', value: 10, minSpend: 50000, maxDiscount: 5000, expiresAt: '2026-12-31' }, '2026-10-25');
  assert.ok(ok.ok);
  if (ok.ok) {
    assert.equal(ok.voucher.code, 'HEMAT10');
    assert.equal(ok.voucher.expiresAt, '2026-12-31T23:59:59');
    assert.equal(ok.voucher.maxDiscount, 5000);
    assert.match(ok.voucher.description, /Diskon 10%/);
  }
  assert.equal(buildVoucher({ code: 'AB', discountType: 'fixed', value: 1000, minSpend: 0 }, '2026-10-25').ok, false, 'kode terlalu pendek');
  assert.equal(buildVoucher({ code: 'BESAR', discountType: 'percentage', value: 95, minSpend: 0 }, '2026-10-25').ok, false, 'persen > 90');
  assert.equal(buildVoucher({ code: 'RUGI', discountType: 'fixed', value: 30000, minSpend: 25000 }, '2026-10-25').ok, false, 'potongan >= minimal belanja');
  assert.equal(buildVoucher({ code: 'LAMA', discountType: 'fixed', value: 2000, minSpend: 0, expiresAt: '2026-10-01' }, '2026-10-25').ok, false, 'sudah lewat');
});

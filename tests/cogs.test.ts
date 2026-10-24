import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lineCogs, baseUnitsOf } from '../src/utils/cogs.ts';

test('HPP satuan grosir: 2 Dus isi 40 dihitung 80 pcs, bukan 2 pcs', () => {
  const dus = { quantity: 2, product: { costPrice: 2750 }, selectedUnit: { multiplier: 40 } };
  assert.equal(lineCogs(dus), 2 * 40 * 2750);
  assert.equal(baseUnitsOf(dus), 80);
});

test('HPP grosir = modal produk x isi (nilai stok yang keluar); modal Dus hanya cadangan bila modal produk kosong', () => {
  // Modal Dus tersimpan 105.000 (usang) tetapi stok yang keluar 3 x 40 x 2.750
  assert.equal(lineCogs({ quantity: 3, product: { costPrice: 2750 }, selectedUnit: { multiplier: 40, costPrice: 105000 } }), 330000);
  assert.equal(lineCogs({ quantity: 3, product: { costPrice: 0 }, selectedUnit: { multiplier: 40, costPrice: 105000 } }), 315000);
  assert.equal(lineCogs({ quantity: 5, product: { costPrice: 2750 } }), 13750);
  assert.equal(lineCogs({ quantity: 1, product: {} }), 0);
});

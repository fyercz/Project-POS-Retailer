import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkMargin, suggestPrice } from '../src/domain/marginCheck.ts';

test('margin terhadap harga kulakan baru: rugi, tipis, aman', () => {
  const rugi = checkMargin(5000, 5200, 10);
  assert.equal(rugi.status, 'loss');
  assert.equal(rugi.marginRp, -200);
  assert.equal(rugi.suggestedPrice, 6000, '5.200 x 1,1 = 5.720 -> 6.000');
  assert.equal(checkMargin(5000, 5000, 10).status, 'loss', 'margin 0 = rugi (belum termasuk biaya lain)');
  assert.equal(checkMargin(5000, 4700, 10).status, 'thin', 'margin 6% < 10%');
  assert.equal(checkMargin(5000, 4400, 10).status, 'ok', 'margin 12%');
  assert.equal(checkMargin(5000, 0, 10).status, 'ok', 'kulakan kosong: tidak dinilai');
});

test('usulan harga dibulatkan ke atas ke Rp 500 dan selalu di atas kulakan', () => {
  assert.equal(suggestPrice(792, 10), 1000);
  assert.equal(suggestPrice(35425, 10), 39000);
  assert.equal(suggestPrice(1000, 0), 1500, 'margin 0%: tetap di atas kulakan');
  assert.equal(suggestPrice(0, 10), 0);
});

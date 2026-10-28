import { test } from 'node:test';
import assert from 'node:assert/strict';
import { code128B } from '../src/utils/code128.ts';

test('Code 128-B sama dengan python-barcode & panjang sesuai spesifikasi', () => {
  // Referensi dari python-barcode (teks tanpa deret angka panjang -> tetap mode B)
  assert.equal(code128B('ABC-123'), '1101001000010100011000100010110001000100011010011011100100111001101100111001011001011100101100001001100011101011');
  // start + 25 karakter + checksum = 27 simbol x 11 modul + stop 13 modul
  assert.equal(code128B('INV-20261028-083114-YMPRY').length, 27 * 11 + 13);
  assert.throws(() => code128B('Nota\u00e9'));
});

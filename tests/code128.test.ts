import { test } from 'node:test';
import assert from 'node:assert/strict';
import { code128B, code128, receiptBarcodeValue } from '../src/utils/code128.ts';

test('Code 128-B sama dengan python-barcode & panjang sesuai spesifikasi', () => {
  // Referensi dari python-barcode (teks tanpa deret angka panjang -> tetap mode B)
  assert.equal(code128B('ABC-123'), '1101001000010100011000100010110001000100011010011011100100111001101100111001011001011100101100001001100011101011');
  // start + 25 karakter + checksum = 27 simbol x 11 modul + stop 13 modul
  assert.equal(code128B('INV-20261028-083114-YMPRY').length, 27 * 11 + 13);
  assert.throws(() => code128B('Nota\u00e9'));
});

test('Code 128 ringkas (mode C untuk deret angka) sama dengan python-barcode', () => {
  const ref: Record<string, string> = {"1234": "110100111001011001110010001011000100100111101100011101011", "20261028084253TSE22": "1101001110011001001110111001001101100100010011100110100100011001001011011100011011101110101111011101101110001011011101000100011010001100111001011001110010101100111001100011101011", "A12345678B": "110100100001010001100010111011110101100111001000101100011100010110110000101001011110111010001011000101000011001100011101011"};
  for (const [text, pattern] of Object.entries(ref)) assert.equal(code128(text), pattern, text);
  // Nomor nota: isi barcode tanpa 'INV-' & tanda hubung; 310 -> 178 modul (garis ~2x lebih lebar)
  assert.equal(receiptBarcodeValue('INV-20261028-084253-TSE22'), '20261028084253TSE22');
  assert.equal(code128(receiptBarcodeValue('INV-20261028-084253-TSE22')).length, 178);
  assert.equal(code128B('INV-20261028-084253-TSE22').length, 310);
});

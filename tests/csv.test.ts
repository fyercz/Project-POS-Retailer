import { test } from 'node:test';
import assert from 'node:assert/strict';
import { csvCell, csvRow } from '../src/utils/csv.ts';

test('csvCell: teks berawalan = + - @ tidak dijalankan sebagai rumus di Excel', () => {
  assert.equal(csvCell('=HYPERLINK("http://jahat","klik")'), `"'=HYPERLINK(""http://jahat"",""klik"")"`);
  assert.equal(csvCell('+62812'), "'+62812");
  assert.equal(csvCell('-10 diskon'), "'-10 diskon");
  assert.equal(csvCell('@SUM(A1)'), "'@SUM(A1)");
});

test('csvCell: angka, teks biasa, koma, dan kutip tetap benar', () => {
  assert.equal(csvCell(-5000), '-5000');
  assert.equal(csvCell(12.5), '12.5');
  assert.equal(csvCell('Indomie Goreng'), 'Indomie Goreng');
  assert.equal(csvCell('Gula, 1 kg'), '"Gula, 1 kg"');
  assert.equal(csvCell('Kopi "Kapal"'), '"Kopi ""Kapal"""');
  assert.equal(csvCell(undefined), '');
  assert.equal(csvRow(['A', 1, '', null]), 'A,1,,');
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateInvoiceNumber, toLocalDateString } from '../src/utils/formatters.ts';

test('nomor invoice: format baru, tanggal lokal, dan praktis tidak pernah kembar', () => {
  const inv = generateInvoiceNumber();
  assert.match(inv, /^INV-\d{8}-\d{6}-[A-Z2-9]{5}$/);
  assert.equal(inv.slice(4, 12), toLocalDateString().replace(/-/g, ''));
  // Puluhan transaksi dalam detik yang sama (jauh di atas kenyataan) tetap mendapat nomor berbeda
  const many = new Set(Array.from({ length: 50 }, () => generateInvoiceNumber()));
  assert.equal(many.size, 50);
});

test('toLocalDateString memakai kalender lokal, bukan UTC', () => {
  assert.equal(toLocalDateString(new Date(2026, 9, 18, 1, 30)), '2026-10-18');
  assert.equal(toLocalDateString(new Date(2026, 0, 5, 23, 59)), '2026-01-05');
});

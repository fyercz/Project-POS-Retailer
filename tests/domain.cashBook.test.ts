import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateCashEntry, summarizeCashBook, type CashEntry } from '../src/domain/cashBook.ts';

test('buku kas: validasi & uraian otomatis seperti laporan manual', () => {
  const r = validateCashEntry({ kind: 'income', category: 'sewa_rak', amount: 10000, counterparty: 'T ALAN', date: '2026-10-01T09:00:00' });
  assert.ok(r.ok && r.entry.description === 'Sewa Rak dari T ALAN');
  assert.equal(validateCashEntry({ kind: 'income', amount: 5000 }).ok, false, 'jenis kas masuk wajib');
  assert.equal(validateCashEntry({ kind: 'withdrawal', amount: 0 }).ok, false);
  const w = validateCashEntry({ kind: 'withdrawal', amount: 11_000_000 });
  assert.ok(w.ok && w.entry.description === 'Penarikan Kas');
});

test('buku kas: ringkasan pendapatan lain, penarikan, PPOB (angka laporan Oktober 2026)', () => {
  const e = (kind: CashEntry['kind'], amount: number, category?: CashEntry['category'], date = '2026-10-15T10:00:00Z'): CashEntry => ({ id: Math.random().toString(), date, kind, amount, category, description: '' });
  const entries = [
    e('income', 210_000, 'sewa_rak'),
    e('income', 450_000, 'sewa_tempat'),
    e('income', 175_000, 'jual_kardus'),
    e('income', 483_500, 'laba_ppob'),
    e('withdrawal', 11_000_000),
    e('ppob_sale', 640_000),
    e('ppob_topup', 4_500_000),
    e('income', 99_999, 'sewa_rak', '2026-11-01T10:00:00Z'), // di luar periode
  ];
  const s = summarizeCashBook(entries, Date.parse('2026-10-01T00:00:00Z'), Date.parse('2026-10-31T23:59:59Z'));
  assert.equal(s.otherIncome, 1_318_500, 'sama dengan "Pendapatan Lain2" di lembar LABA');
  assert.equal(s.income.sewa_rak, 210_000);
  assert.equal(s.withdrawals, 11_000_000);
  assert.equal(s.ppobSales, 640_000);
  assert.equal(s.ppobTopups, 4_500_000);
});

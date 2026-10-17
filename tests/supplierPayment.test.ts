import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeBalanceSheet, generateJournalEntries, purchaseOutstandingOf } from '../src/utils/accountingLedger.ts';

const po = (payments: any[] = []) =>
  ({
    id: 'po-1',
    invoiceNumber: 'FKT-1',
    supplierName: 'Grosir Jaya',
    paymentTerms: 'Tempo 30 Hari',
    items: [],
    totalAmount: 1_000_000,
    createdAt: '2026-10-01T03:00:00.000Z',
    payments,
  }) as any;

test('sisa hutang berkurang sesuai pembayaran, lunas = 0, pembelian tunai = 0', () => {
  assert.equal(purchaseOutstandingOf(po()), 1_000_000);
  assert.equal(purchaseOutstandingOf(po([{ id: 'a', amount: 400_000 }])), 600_000);
  assert.equal(purchaseOutstandingOf(po([{ id: 'a', amount: 400_000 }, { id: 'b', amount: 600_000 }])), 0);
  assert.equal(purchaseOutstandingOf({ ...po(), paymentTerms: 'Tunai / Cash' }), 0);
});

test('neraca: hutang dagang hanya sisa yang belum dibayar; jurnal pembayaran seimbang', () => {
  const unpaid = computeBalanceSheet({ products: [], transactions: [], supplierPurchases: [po()] }) as any;
  const paid = computeBalanceSheet({
    products: [],
    transactions: [],
    supplierPurchases: [po([{ id: 'p1', amount: 1_000_000, source: 'bank_transfer', date: '2026-10-05', recordedBy: 'Owner' }])],
  }) as any;
  const apOf = (bs: any) => bs.liabilities?.accountsPayable ?? bs.accountsPayable;
  assert.equal(apOf(unpaid), 1_000_000);
  assert.equal(apOf(paid), 0);

  const entries = generateJournalEntries({
    transactions: [],
    supplierPurchases: [po([{ id: 'p1', amount: 250_000, source: 'cash_drawer', date: '2026-10-05', recordedBy: 'Owner' }])],
  } as any);
  const payEntry = entries.find((e: any) => e.sourceType === 'supplier_payment')!;
  assert.ok(payEntry, 'jurnal pembayaran dibuat');
  assert.equal(payEntry.totalDebit, 250_000);
  assert.equal(payEntry.lines[0].accountCode, '2010');
  assert.equal(payEntry.lines[1].accountCode, '1010');
});

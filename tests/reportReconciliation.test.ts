/**
 * Rekonsiliasi laporan keuangan dengan jawaban yang dihitung manual (lihat validasi laporan).
 * Data: 2 x A tunai, 1 Dus B (isi 40) QRIS diskon 5.000, 1 x A di-void, 3 x A tunai,
 * retur 1 x A tunai & 1 x A saldo toko (keduanya kembali ke stok), listrik 50.000 dari laci,
 * kekurangan kas shift 2.000.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeIncomeStatement, computeBalanceSheet, generateJournalEntries } from '../src/utils/accountingLedger.ts';

const D = '2026-10-20T03:00:00.000Z';
const A: any = { id: 'A', name: 'Produk A', price: 12000, costPrice: 10000, stock: 20, minStock: 2 };
const B: any = { id: 'B', name: 'Produk B', price: 3000, costPrice: 2500, stock: 400, minStock: 2 };
const line = (p: any, qty: number, price: number, unit?: any) => ({ id: `${p.id}-${qty}`, product: p, quantity: qty, unitPrice: price, totalPrice: price * qty, ...(unit ? { selectedUnit: unit } : {}) });
const tx = (id: string, items: any[], disc: number, method: string, status = 'completed'): any => {
  const subtotal = items.reduce((s, i) => s + i.totalPrice, 0);
  return { id, invoiceNumber: id, items, subtotal, discountAmount: disc, taxAmount: 0, serviceChargeAmount: 0, finalTotal: subtotal - disc, payment: { method }, createdAt: D, status, cashierName: 'Uji' };
};
const transactions = [
  tx('T1', [line(A, 2, 12000)], 0, 'cash'),
  tx('T2', [line(B, 1, 115000, { name: 'Dus', multiplier: 40, price: 115000, costPrice: 100000 })], 5000, 'qris'),
  tx('T3', [line(A, 1, 12000)], 0, 'cash', 'void'),
  tx('T4', [line(A, 3, 12000)], 0, 'cash'),
];
const ret = (id: string, txId: string, method: string): any => ({
  id, returnNumber: id, transactionId: txId, invoiceNumber: txId, cashierName: 'Uji', createdAt: D, refundMethod: method, totalRefundAmount: 12000,
  items: [{ productId: 'A', productName: 'A', quantity: 1, unitPrice: 12000, totalRefund: 12000, reason: 'uji', restockToInventory: true }],
});
const salesReturns = [ret('R1', 'T4', 'cash'), ret('R2', 'T1', 'store_credit')];
const expenses: any[] = [{ id: 'E1', date: '2026-10-20', amount: 50000, category: 'listrik_air_internet', paymentSource: 'cash_drawer', description: 'Listrik', recordedBy: 'Uji' }];
const shifts: any[] = [{ id: 'S1', employeeId: 'e', employeeName: 'Uji', role: 'owner', startTime: D, endTime: '2026-10-20T10:00:00.000Z', startingCash: 100000, cashOut: 0, totalSales: 0, totalTransactions: 0, cashSales: 0, nonCashSales: 0, difference: -2000, status: 'closed' }];

test('laba rugi: retur mengurangi penjualan DAN HPP barang yang kembali ke stok', () => {
  const pl = computeIncomeStatement({ transactions, salesReturns, expenses, shifts });
  assert.equal(pl.grossSales, 175000);
  assert.equal(pl.salesDiscounts, 5000);
  assert.equal(pl.salesReturns, 24000);
  assert.equal(pl.netSales, 146000);
  assert.equal(pl.costOfGoodsSold, 130000, 'HPP 150.000 dikurangi HPP 2 barang retur (20.000)');
  assert.equal(pl.grossProfit, 16000);
  assert.equal(pl.operatingExpenses.totalOperatingExpenses, 52000);
  assert.equal(pl.netOperatingProfit, -36000);
});

test('laba rugi: penjualan bersih boleh negatif (tidak disembunyikan sebagai 0)', () => {
  const pl = computeIncomeStatement({ transactions: [], salesReturns: [ret('R9', 'TX-LAMA', 'cash')] });
  assert.equal(pl.netSales, -12000);
});

test('jurnal: seimbang, saldo toko = kewajiban (bukan kas), HPP retur dibalik ke persediaan', () => {
  const je = generateJournalEntries({ transactions, salesReturns, supplierPurchases: [], expenses, shifts } as any);
  assert.equal(je.filter((e: any) => Math.abs(e.totalDebit - e.totalCredit) > 0.5).length, 0);
  const linesOf = (ref: string) => je.filter((e: any) => e.referenceNumber === ref).flatMap((e: any) => e.lines);
  const r2 = linesOf('R2');
  assert.equal(r2.filter((l: any) => l.accountCode === '1010').length, 0, 'retur saldo toko tidak mengurangi kas');
  assert.equal(r2.find((l: any) => l.accountCode === '2040')?.credit, 12000);
  const net = (code: string) => je.reduce((s: number, e: any) => s + e.lines.filter((l: any) => l.accountCode === code).reduce((a: number, l: any) => a + l.debit - l.credit, 0), 0);
  assert.equal(net('5010'), 130000, 'HPP bersih di jurnal = laporan laba rugi');
  assert.equal(je.some((e: any) => e.referenceNumber === 'T3'), false, 'transaksi void tidak dijurnal');
  assert.equal(je.some((e: any) => e.sourceType === 'initial_balance'), false, 'tanpa modal awal karangan');
});

test('neraca: ekuitas dari bawah, selisih belum tercatat ditampilkan, tanpa angka karangan', () => {
  const bs = computeBalanceSheet({ products: [A, B], transactions, customers: [], supplierPurchases: [], shifts, expenses, salesReturns } as any);
  assert.equal(bs.assets.cashOnHand, -4000, '60.000 tunai - 50.000 listrik - 12.000 retur tunai - 2.000 kekurangan kas shift (boleh negatif)');
  assert.equal(bs.assets.bankAndQris, 110000);
  assert.equal(bs.assets.merchandiseInventory, 1200000);
  assert.equal(bs.assets.openingFunds, 0, 'tanpa modal awal: 0 (dulu Rp 50 juta)');
  assert.equal(bs.liabilities.storeCreditLiability, 12000);
  assert.equal(bs.equity.ownerInitialCapital, 0);
  assert.equal(bs.equity.currentPeriodNetIncome, -36000, 'laba neraca = laporan laba rugi (termasuk retur)');
  assert.equal(bs.equity.unrecordedCapital, 1330000, 'stok yang diinput tanpa faktur terlihat sebagai selisih');
  assert.equal(bs.isReconciled, false);
  assert.equal(bs.isBalanced, true);

  const withCapital = computeBalanceSheet({ products: [A, B], transactions, customers: [], supplierPurchases: [], shifts, expenses, salesReturns, initialCapital: 100000 } as any);
  assert.equal(withCapital.assets.openingFunds, 100000, 'modal awal utuh (dulu dipecah 40/60)');
  assert.equal(withCapital.equity.unrecordedCapital, 1330000);
});

test('jurnal modal awal: utuh ke Dana Awal, tanggal transaksi pertama (bukan 1 Jan 2026)', () => {
  const je = generateJournalEntries({ transactions, salesReturns: [], supplierPurchases: [], expenses: [], shifts: [], initialCapital: 500000 } as any);
  const init = je.find((e: any) => e.sourceType === 'initial_balance')!;
  assert.equal(init.date, D);
  assert.deepEqual(init.lines.map((l: any) => [l.accountCode, l.debit, l.credit]), [['1005', 500000, 0], ['3010', 0, 500000]]);
});

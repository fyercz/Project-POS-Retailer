import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildKasBulanan } from '../src/domain/kasReport.ts';

// Data hari pertama dari LAPORAN_BULAN_OKTOBER_2026.xlsx (LAP.HARI, Kamis 01 Oktober 2026)
const suppliers = [
  ['CHAMPION', '043'], ['YAKULT', '013'], ['PELITA N R', '029'], ['TELUR', '048'], ['AICE', '004'],
  ['T ALAN', '020'], ['ENSEVAL', '140'], ['PUTRA N', '148'], ['WINGS', '064'],
].map(([name, code]) => ({ name: name!, code }));
const at = (d: string, h: number) => new Date(`2026-${d}T${String(h).padStart(2, '0')}:00:00`).toISOString();
const cashPO = (name: string, amount: number) => ({ supplierName: name, createdAt: at('10-01', 9), finalTotal: amount, paymentTerms: 'Tunai / Cash' });
// Tagihan dibayar dari kas toko sebelum shift dibuka (seperti praktik toko), bukan dari laci shift berjalan
const pay = (name: string, amount: number) => ({ supplierName: name, createdAt: at('09-20', 9), finalTotal: amount, paymentTerms: 'Tempo 14 Hari', payments: [{ amount, date: at('10-01', 6), source: 'cash_drawer' }] });

test('laporan kas: 1 Oktober 2026 sama persis dengan LAP.HARI toko (saldo akhir Rp 11.425.500)', () => {
  const r = buildKasBulanan({
    year: 2026,
    month: 10,
    openingBalance: 11_983_000,
    shifts: [
      { id: 's0a', startTime: at('09-30', 7), endTime: at('09-30', 14), status: 'closed', startingCash: 0, actualCashEnding: 1_000_000 },
      { id: 's0b', startTime: at('09-30', 14), endTime: at('09-30', 21), status: 'closed', startingCash: 0, actualCashEnding: 2_921_000 },
      { id: 's1a', startTime: at('10-01', 7), endTime: at('10-01', 14), status: 'closed', startingCash: 0, actualCashEnding: 960_000 },
    ],
    transactions: [],
    supplierPurchases: [cashPO('CHAMPION', 560_000), cashPO('YAKULT', 89_500), cashPO('PELITA N R', 198_000), cashPO('TELUR', 220_000), cashPO('AICE', 567_000), pay('T ALAN', 203_000), pay('ENSEVAL', 389_500), pay('PUTRA N', 1_129_500), pay('WINGS', 838_000)],
    suppliers,
    expenses: [{ date: at('10-01', 6), amount: 254_000, description: 'PERALATAN TOKO', category: 'peralatan_toko', paymentSource: 'cash_drawer' }],
    cashEntries: [{ id: 'c1', date: at('10-01', 12), kind: 'income', category: 'sewa_rak', counterparty: 'T ALAN', amount: 10_000, description: 'Sewa Rak dari T ALAN' }],
  });
  const d1 = r.days[0]!;
  assert.equal(d1.title, 'LAPORAN KAS HARI KAMIS, 01 OKTOBER 2026');
  const ur = d1.rows.map((x) => x.uraian);
  assert.equal(ur[0], 'Sisa Saldo Bulan September');
  assert.ok(ur.includes('Penjualan Kasir Sift 2 Tgl 30 September'), 'Sift 2 kemarin dicatat hari ini');
  assert.ok(ur.includes('Penjualan Kasir Sift 1'));
  assert.ok(ur.includes('Pembelian Barang dari CHAMPION (043)'));
  assert.ok(ur.includes('Bayar tagihan kpd WINGS (064)'));
  assert.ok(ur.includes('Terima Sewa Rak Dari T ALAN'));
  assert.equal(d1.closing, 11_425_500, 'sama dengan saldo LAP.HARI 1 Oktober');
  // Sift 1 tanggal 30 September (bulan lalu) tidak ikut bulan ini
  assert.ok(!ur.some((u) => /Sift 1 Tgl 30/.test(u)));
});

test('laporan kas: debit sebulan satu baris, PPOB terpisah dengan saldo berjalan', () => {
  const r = buildKasBulanan({
    year: 2026, month: 10, openingBalance: 0, ppobOpeningBalance: 3_571_000,
    shifts: [], suppliers: [], expenses: [], supplierPurchases: [],
    transactions: [
      { status: 'completed', createdAt: at('10-05', 10), finalTotal: 50_000, payment: { method: 'qris' } },
      { status: 'void', createdAt: at('10-06', 10), finalTotal: 99_000, payment: { method: 'card' } },
      { status: 'completed', createdAt: at('10-07', 10), finalTotal: 20_000, payment: { method: 'cash' } },
    ],
    cashEntries: [
      { id: 'p1', date: at('10-01', 20), kind: 'ppob_sale', shiftLabel: 'Sift 1', amount: 120_500, description: '' },
      { id: 'p2', date: at('10-02', 9), kind: 'ppob_topup', amount: 4_500_000, description: '' },
      { id: 'w', date: at('10-31', 9), kind: 'withdrawal', amount: 11_000_000, description: 'PENARIKAN KAS' },
    ],
  });
  const debitRows = r.days.flatMap((d) => d.rows).filter((x) => x.jenis === 'debit');
  assert.equal(debitRows.length, 1);
  assert.equal(debitRows[0]!.debet, 50_000, 'void tidak dihitung, tunai bukan debit');
  assert.deepEqual(r.ppobRows.map((p) => p.saldo), [3_691_500, -808_500]);
  assert.equal(r.closingBalance, 50_000 - 11_000_000);
});

test('laporan kas: beban & tagihan dari laci selama shift tidak terpotong dua kali', () => {
  // Shift: jual tunai 1.000.000; selama shift bayar beban 50.000 & tagihan 200.000 dari laci
  // -> uang di laci saat tutup = 750.000. Saldo kas harus = awal + 1.000.000 - 50.000 - 200.000.
  const r = buildKasBulanan({
    year: 2026, month: 10, openingBalance: 500_000,
    shifts: [{ id: 's', startTime: at('10-05', 7), endTime: at('10-05', 14), status: 'closed', startingCash: 0, actualCashEnding: 750_000 }],
    transactions: [], suppliers: [{ name: 'WINGS', code: '064' }], cashEntries: [],
    supplierPurchases: [{ supplierName: 'WINGS', createdAt: at('09-20', 9), finalTotal: 200_000, paymentTerms: 'Tempo 14 Hari', payments: [{ amount: 200_000, date: at('10-05', 10), source: 'cash_drawer' }] }],
    expenses: [{ date: at('10-05', 11), amount: 50_000, description: 'KRESEK', category: 'perlengkapan_toko', paymentSource: 'cash_drawer' }],
  });
  const d = r.days[0]!;
  assert.equal(d.rows.find((x) => x.jenis === 'penjualan')!.debet, 1_000_000, 'penjualan = setoran + yang dibayar dari laci');
  assert.equal(d.closing, 500_000 + 1_000_000 - 50_000 - 200_000);
});

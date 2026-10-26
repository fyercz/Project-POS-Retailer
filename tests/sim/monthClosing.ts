/**
 * Tutup buku bulanan: bandingkan laporan aplikasi (accountingLedger) dengan pembukuan bayangan.
 * Setiap baris: area, pos, angka aplikasi, angka bayangan, cocok?, penjelasan bila beda.
 */
import { computeIncomeStatement, computeBalanceSheet, generateJournalEntries } from '../../src/utils/accountingLedger.ts';
import { runMonthSimulation, shadowIncome } from './monthSimulation.ts';

export interface ClosingRow { area: string; item: string; app: number; shadow: number; ok: boolean; note?: string }

export function monthClosing(sim: ReturnType<typeof runMonthSimulation>) {
  const startDate = '2026-09-30T17:00:00.000Z', endDate = '2026-10-31T16:59:59.999Z';
  const rate = sim.settings.pointRedemptionRate;
  const pl = computeIncomeStatement({ transactions: sim.transactions, salesReturns: sim.salesReturns, shifts: sim.shifts, expenses: sim.expenses, startDate, endDate, pointRedemptionRate: rate, stockAdjustments: sim.stockAdjustments });
  const bs = computeBalanceSheet({ products: sim.products, transactions: sim.transactions, customers: sim.customers, supplierPurchases: sim.purchases, shifts: sim.shifts, expenses: sim.expenses, salesReturns: sim.salesReturns, purchaseReturns: sim.purchaseReturns, initialCapital: sim.INITIAL_CAPITAL, initialCashInDrawer: sim.INITIAL_CASH, initialBankBalance: sim.INITIAL_BANK, pointRedemptionRate: rate, stockAdjustments: sim.stockAdjustments } as any);
  const je = generateJournalEntries({ transactions: sim.transactions, salesReturns: sim.salesReturns, supplierPurchases: sim.purchases, shifts: sim.shifts, expenses: sim.expenses, purchaseReturns: sim.purchaseReturns, initialCapital: sim.INITIAL_CAPITAL, initialCashInDrawer: sim.INITIAL_CASH, initialBankBalance: sim.INITIAL_BANK, pointRedemptionRate: rate, stockAdjustments: sim.stockAdjustments } as any);
  const sh = shadowIncome(sim);
  const rows: ClosingRow[] = [];
  const add = (area: string, item: string, app: number, shadow: number, note?: string) => rows.push({ area, item, app: Math.round(app), shadow: Math.round(shadow), ok: Math.abs(app - shadow) < 1, note });

  // Laba rugi
  add('Laba Rugi', 'Penjualan kotor (sebelum diskon)', pl.grossSales, sh.gross);
  add('Laba Rugi', 'Diskon (voucher & member; penukaran poin bukan diskon)', pl.salesDiscounts, sh.discounts);
  add('Laba Rugi', 'Retur penjualan', pl.salesReturns, sh.returns);
  add('Laba Rugi', 'Penjualan bersih', pl.netSales, sh.netSales);
  add('Laba Rugi', 'HPP (dikurangi HPP retur kembali ke stok)', pl.costOfGoodsSold, sh.cogs);
  add('Laba Rugi', 'Laba kotor', pl.grossProfit, sh.grossProfit);
  add('Laba Rugi', 'Beban program poin member', pl.operatingExpenses.pointsExpense ?? 0, sh.pointsExpense);
  add('Laba Rugi', 'Beban selisih persediaan (opname)', pl.operatingExpenses.inventoryLoss ?? 0, sh.inventoryLoss);
  add('Laba Rugi', 'Pendapatan selisih persediaan (opname)', pl.inventoryGain ?? 0, sh.inventoryGain);
  add('Laba Rugi', 'Beban operasional (pengeluaran + poin + kekurangan kas + selisih stok)', pl.operatingExpenses.totalOperatingExpenses, sh.expenses + sh.shortage + sh.inventoryLoss);
  add('Laba Rugi', 'Laba bersih', pl.netOperatingProfit, sh.net, sh.overage ? 'Bayangan memasukkan kelebihan kas shift sebagai pendapatan lain' : undefined);

  // Neraca: aset & kewajiban dari arus kas bayangan
  const s = sim.shadow;
  add('Neraca', 'Dana awal lainnya (modal awal di luar laci/bank)', bs.assets.openingFunds ?? 0, sim.INITIAL_CAPITAL - sim.INITIAL_CASH - sim.INITIAL_BANK);
  add('Neraca', 'Piutang retur supplier', bs.assets.supplierReturnReceivable ?? 0, s.supplierReceivable);
  add('Neraca', 'Kas di laci', bs.assets.cashOnHand, s.cashDrawer, 'Bayangan: tunai masuk - retur tunai - void tunai - belanja tunai - pengeluaran laci - setoran konsinyasi +/- selisih hitung');
  add('Neraca', 'Bank & QRIS', bs.assets.bankAndQris, s.bank);
  add('Neraca', 'Piutang EDC (kartu)', bs.assets.edcCardReceivables, s.edc);
  add('Neraca', 'Persediaan (stok x harga modal terkini)', bs.assets.merchandiseInventory, sim.products.reduce((a, p) => a + p.stock * p.costPrice, 0));
  add('Neraca', 'Hutang dagang (tempo)', bs.liabilities.accountsPayable, s.payable);
  add('Neraca', 'Hutang konsinyasi', bs.liabilities.consignmentPayable ?? 0, s.consignmentPayable);
  add('Neraca', 'Saldo toko pelanggan', bs.liabilities.storeCreditLiability ?? 0, s.storeCredit);
  const pointsNow = sim.customers.reduce((a, c) => a + c.points, 0);
  add('Neraca', 'Kewajiban poin member', bs.liabilities.pointsLiability, pointsNow * sim.settings.pointRedemptionRate);
  add('Neraca', 'Laba (rugi) tercatat', bs.equity.currentPeriodNetIncome, pl.netOperatingProfit, 'Neraca memakai laba sepanjang waktu = bulan ini (data mulai 1 Okt)');

  // Selisih belum tercatat = jumlah komponen yang DIKETAHUI tidak dicatat aplikasi. Bila semua pos
  // lain benar, kedua angka harus sama persis.
  const components = {
    opname: 0, // kini dicatat sebagai penyesuaian persediaan (jurnal 6050/4040)
    pembulatanModalRataRata: Math.round(s.revaluationRounding),
    returKembaliKeStokSelisihModal: Math.round(s.returnRevaluation),
    poinAwalSebelumAplikasi: -Math.round(sim.openingPoints * rate),
  };
  const explainedTotal = components.opname + components.pembulatanModalRataRata + components.returKembaliKeStokSelisihModal + components.poinAwalSebelumAplikasi;
  add('Neraca', 'Selisih belum tercatat', bs.equity.unrecordedCapital ?? 0, explainedTotal,
    `Komponen: opname ${components.opname}, pembulatan modal rata-rata ${components.pembulatanModalRataRata}, retur kembali ke stok (selisih modal) ${components.returKembaliKeStokSelisihModal}, poin awal sebelum aplikasi ${components.poinAwalSebelumAplikasi}`);

  // Jurnal
  const unbalanced = je.filter((e: any) => Math.abs(e.totalDebit - e.totalCredit) > 0.5).length;
  add('Jurnal', 'Entri tidak seimbang', unbalanced, 0);
  const net = (code: string) => je.reduce((a: number, e: any) => a + e.lines.filter((l: any) => l.accountCode === code).reduce((x: number, l: any) => x + l.debit - l.credit, 0), 0);
  add('Jurnal', 'HPP bersih di jurnal (5010)', net('5010'), sh.cogs);
  add('Jurnal', 'Kas laci di jurnal (1010)', net('1010'), s.cashDrawer);
  add('Jurnal', 'Bank di jurnal (1020)', net('1020'), s.bank);
  add('Jurnal', 'Kewajiban poin di jurnal (2020) = poin diperoleh - ditukar', -net('2020'), (s.pointsEarned - s.pointsUsed) * rate);

  // Poin & shift
  add('Member', 'Saldo poin = awal + diperoleh - ditukar', pointsNow, sim.openingPoints + s.pointsEarned - s.pointsUsed);
  add('Shift', 'Jumlah shift ditutup', sim.shifts.filter((x) => x.status === 'closed').length, 31);
  return { rows, pl, bs, je, shadowIncome: sh, components };
}

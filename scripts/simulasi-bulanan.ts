/** Ekspor hasil simulasi 1 bulan + tutup buku ke JSON (untuk laporan). Pakai: npx tsx scripts/simulasi-bulanan.ts out.json */
import fs from 'node:fs';
import { runMonthSimulation } from '../tests/sim/monthSimulation.ts';
import { monthClosing } from '../tests/sim/monthClosing.ts';
import { lineCogs } from '../src/utils/cogs.ts';

const sim = runMonthSimulation();
const c = monthClosing(sim);
const out = {
  closing: c.rows, components: c.components, pl: c.pl, bs: c.bs, journalCount: c.je.length,
  daily: sim.daily,
  transactions: sim.transactions.map((t) => ({
    invoice: t.invoiceNumber, waktu: t.createdAt, kasir: t.cashierName, metode: t.payment.method, member: t.customer?.name || '', voucher: t.voucherCode || '',
    poinDitukar: t.pointsUsed || 0, poinDiperoleh: t.pointsEarned || 0, subtotal: t.subtotal, diskon: t.discountAmount, total: t.finalTotal, hpp: Math.round(t.items.reduce((a: number, l: any) => a + lineCogs(l), 0)),
    status: t.status, barang: t.items.map((l: any) => `${l.product.name} x${l.quantity}${l.selectedUnit ? ' ' + l.selectedUnit.name : ''}`).join('; '),
  })),
  purchases: sim.purchases.map((p) => ({ faktur: p.invoiceNumber, tanggal: p.createdAt, supplier: p.supplierName, termin: p.paymentTerms, total: p.finalTotal, dibayar: p.payments.reduce((a: number, x: any) => a + x.amount, 0), barang: p.items.map((i: any) => `${i.productName} x${i.quantity} @${i.costPrice}`).join('; ') })),
  payments: sim.purchases.flatMap((p) => p.payments.map((x: any) => ({ faktur: p.invoiceNumber, supplier: p.supplierName, tanggal: x.date, jumlah: x.amount, sumber: x.source }))),
  salesReturns: sim.salesReturns.map((r) => ({ nomor: r.returnNumber, tanggal: r.createdAt, invoice: r.invoiceNumber, barang: r.items[0].productName, jumlah: r.items[0].quantity * (r.items[0].unitMultiplier || 1), refund: r.totalRefundAmount, metode: r.refundMethod, kembaliKeStok: r.items[0].restockToInventory })),
  purchaseReturns: sim.purchaseReturns,
  expenses: sim.expenses,
  shifts: sim.shifts.map((s) => ({ kasir: s.employeeName, mulai: s.startTime, selesai: s.endTime, modalLaci: s.startingCash, penjualanTunai: s.cashSales, nonTunai: s.nonCashSales, kasKeluar: s.cashOut || 0, kasDihitung: s.actualCashEnding, selisih: s.difference || 0 })),
  stock: sim.products.map((p) => ({ produk: p.name, kategori: p.categoryId, hargaJual: p.price, hargaModal: p.costPrice, stok: p.stock })),
  opname: sim.opname, priceChanges: sim.priceChanges, customers: sim.customers.map((c) => ({ nama: c.name, tier: c.tier, poin: c.points, belanja: c.totalSpent, kunjungan: c.ordersCount })),
  log: sim.log,
};
fs.writeFileSync(process.argv[2] || 'simulasi.json', JSON.stringify(out));
console.log('ditulis', process.argv[2]);

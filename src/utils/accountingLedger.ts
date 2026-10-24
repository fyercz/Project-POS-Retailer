import {
  Transaction,
  SalesReturn,
  SupplierPurchase,
  ShiftSummary,
  OperationalExpense,
  Product,
  Customer,
  JournalEntry,
  ChartOfAccount,
  BalanceSheet,
  IncomeStatement,
  ExpenseCategory,
} from '../types';
import { lineCogs, returnedCogs } from './cogs';

export type { ExpenseCategory };

// ============================================================================
// STANDARD CHART OF ACCOUNTS (COA) FOR ULILMART POS
// ============================================================================

// ----------------------------------------------------------------------------
// Faktur pembelian: jenis pembayaran & sisa hutang
// ----------------------------------------------------------------------------
export function purchasePaymentKind(po: { paymentTerms?: string }): 'cash' | 'credit' | 'consignment' {
  const termsLower = (po.paymentTerms || '').toLowerCase();
  if (termsLower.includes('konsinyasi') || termsLower.includes('titip')) return 'consignment';
  if (termsLower.includes('tempo') || termsLower.includes('kredit') || termsLower.includes('hari')) return 'credit';
  return 'cash';
}

export function purchaseTotalOf(po: { finalTotal?: number; totalAmount?: number }): number {
  return Number(po.finalTotal ?? po.totalAmount) || 0;
}

export function purchasePaidOf(po: { payments?: Array<{ amount: number }> }): number {
  return (po.payments || []).reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
}

/** Sisa hutang faktur tempo/konsinyasi (0 untuk pembelian tunai atau yang sudah lunas). */
export function purchaseOutstandingOf(po: SupplierPurchase): number {
  if (purchasePaymentKind(po) === 'cash') return 0;
  return Math.max(0, purchaseTotalOf(po) - purchasePaidOf(po));
}

/**
 * Retur ke supplier: nilainya mengurangi hutang ke supplier itu (tempo dulu, lalu konsinyasi);
 * sisanya menjadi piutang retur supplier (uang/barang pengganti yang masih harus diterima, mis.
 * untuk pembelian tunai). Dipakai bersama oleh jurnal & neraca agar konsisten.
 * Dulu retur ke supplier hanya mengurangi stok tanpa pencatatan apa pun.
 */
export function allocateSupplierReturns(
  purchases: SupplierPurchase[],
  purchaseReturns: Array<{ id: string; supplierName: string; totalAmount: number; createdAt: string; status?: string }>
) {
  const pool = new Map<string, { credit: number; consignment: number }>();
  for (const po of purchases) {
    const kind = purchasePaymentKind(po);
    if (kind === 'cash') continue;
    const key = (po.supplierName || '').trim().toLowerCase();
    const p = pool.get(key) || { credit: 0, consignment: 0 };
    p[kind === 'credit' ? 'credit' : 'consignment'] += purchaseOutstandingOf(po);
    pool.set(key, p);
  }
  const byReturn = new Map<string, { toPayable: number; toConsignment: number; toReceivable: number }>();
  let payableReduction = 0, consignmentReduction = 0, receivable = 0;
  const sorted = [...purchaseReturns].filter((r) => r.status !== 'pending').sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));
  for (const r of sorted) {
    let left = Math.max(0, Number(r.totalAmount) || 0);
    const p = pool.get((r.supplierName || '').trim().toLowerCase()) || { credit: 0, consignment: 0 };
    const toPayable = Math.min(left, p.credit); p.credit -= toPayable; left -= toPayable;
    const toConsignment = Math.min(left, p.consignment); p.consignment -= toConsignment; left -= toConsignment;
    byReturn.set(r.id, { toPayable, toConsignment, toReceivable: left });
    payableReduction += toPayable; consignmentReduction += toConsignment; receivable += left;
  }
  return { byReturn, payableReduction, consignmentReduction, receivable };
}

export const STANDARD_CHART_OF_ACCOUNTS: ChartOfAccount[] = [
  // 1000 - ASET LANCAR
  { code: '1005', name: 'Dana Awal (Kas & Bank Saat Mulai)', category: 'asset', normalBalance: 'debit', description: 'Modal awal pemilik saat mulai memakai aplikasi (tidak dipecah ke kas/bank).' },
  { code: '1060', name: 'Piutang Retur Supplier', category: 'asset', normalBalance: 'debit', description: 'Nilai barang yang diretur ke supplier dan belum dikembalikan dalam bentuk uang/potongan hutang.' },
  { code: '1010', name: 'Kas di Laci Kasir', category: 'asset', normalBalance: 'debit', description: 'Uang fisik tunai di laci kasir' },
  { code: '1020', name: 'Bank & Saldo QRIS', category: 'asset', normalBalance: 'debit', description: 'Rekening penampung pembayaran QRIS & Transfer bank' },
  { code: '1030', name: 'EDC & Piutang Kartu Debit', category: 'asset', normalBalance: 'debit', description: 'Kliring settlement kartu debit/kredit mesin EDC' },
  { code: '1040', name: 'Piutang Usaha Pelanggan', category: 'asset', normalBalance: 'debit', description: 'Bon / kredit pelanggan toko' },
  { code: '1050', name: 'Persediaan Barang Dagang', category: 'asset', normalBalance: 'debit', description: 'Valuasi nilai modal stok barang fisik di toko/gudang' },

  // 2000 - KEWAJIBAN (LIABILITAS)
  { code: '2010', name: 'Utang Dagang Supplier', category: 'liability', normalBalance: 'credit', description: 'Tagihan tempo faktur pembelian barang distributor' },
  { code: '2020', name: 'Liabilitas Poin Loyalitas', category: 'liability', normalBalance: 'credit', description: 'Titipan saldo poin member yang belum ditukarkan' },
  { code: '2040', name: 'Saldo Toko Pelanggan (Retur)', category: 'liability', normalBalance: 'credit', description: 'Kewajiban kepada pelanggan dari retur yang dibayar dengan saldo toko (belum dibelanjakan).' },
  { code: '2030', name: 'Utang Titipan / Konsinyasi Supplier', category: 'liability', normalBalance: 'credit', description: 'Kewajiban titip jual konsinyasi supplier yang menunggu rekonsiliasi penjualan' },

  // 3000 - EKUITAS
  { code: '3010', name: 'Modal Awal Pemilik', category: 'equity', normalBalance: 'credit', description: 'Setoran modal investasi awal pendirian toko' },
  { code: '3020', name: 'Laba Ditahan / Akumulasi', category: 'equity', normalBalance: 'credit', description: 'Akumulasi laba bersih periode sebelumnya' },

  // 4000 - PENDAPATAN
  { code: '4010', name: 'Pendapatan Penjualan Ritel', category: 'revenue', normalBalance: 'credit', description: 'Total omzet kotor penjualan kasir' },
  { code: '4020', name: 'Diskon & Promo Penjualan', category: 'revenue', normalBalance: 'debit', description: 'Potongan harga voucher, diskon member, poin loyalitas (kontra pendapatan)' },
  { code: '4030', name: 'Pendapatan Lain-lain', category: 'revenue', normalBalance: 'credit', description: 'Pendapatan non-operasional toko (selisih lebih kas, dsb)' },

  // 5000 - HARGA POKOK PENJUALAN (HPP)
  { code: '5010', name: 'Beban Pokok Penjualan (HPP)', category: 'cogs', normalBalance: 'debit', description: 'Harga modal barang dagangan yang terjual' },

  // 6000 - BEBAN OPERASIONAL
  { code: '6010', name: 'Beban Operasional Toko', category: 'expense', normalBalance: 'debit', description: 'Biaya utilitas, token listrik, internet, air, operasional' },
  { code: '6020', name: 'Beban Selisih Kas Shift', category: 'expense', normalBalance: 'debit', description: 'Kerugian selisih minus fisik uang saat tutup shift kasir' },
  { code: '6040', name: 'Beban Program Poin Member', category: 'expense', normalBalance: 'debit', description: 'Nilai poin loyalitas yang diberikan kepada member (dicatat saat poin diperoleh).' },
  { code: '6030', name: 'Beban Retur Penjualan', category: 'expense', normalBalance: 'debit', description: 'Pengembalian dana akibat retur barang konsumen' },
];

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  listrik_air_internet: 'Listrik, Air & Internet',
  gaji_karyawan: 'Gaji & Bonus Karyawan',
  sewa_ruko: 'Sewa Tempat / Ruko',
  perlengkapan_kantor: 'Perlengkapan & Kantong Plastik',
  pemeliharaan_toko: 'Pemeliharaan & Kebersihan',
  konsumsi_operasional: 'Konsumsi & Logistik Staf',
  lainnya: 'Beban Operasional Lainnya',
};

// ============================================================================
// AUTOMATED JOURNAL GENERATOR (DOUBLE-ENTRY)
// ============================================================================

/** Rincian modal awal: [kode akun, nama, jumlah] untuk laci, bank, dan sisanya (dana awal lainnya). */
function openingSplit(total: number, cash: number, bank: number): Array<[string, string, number]> {
  const t = Math.max(0, Number(total) || 0);
  const c = Math.min(t, Math.max(0, Number(cash) || 0));
  const b = Math.min(t - c, Math.max(0, Number(bank) || 0));
  const rest = t - c - b;
  return ([['1010', 'Kas di Laci Kasir', c], ['1020', 'Bank & Saldo QRIS', b], ['1005', 'Dana Awal Lainnya (mis. stok awal)', rest]] as Array<[string, string, number]>).filter(([, , v]) => v > 0);
}

export function generateJournalEntries(options: {
  transactions: Transaction[];
  salesReturns?: SalesReturn[];
  supplierPurchases?: SupplierPurchase[];
  shifts?: ShiftSummary[];
  expenses?: OperationalExpense[];
  initialCapital?: number;
  /** Bagian modal awal berupa uang di laci / saldo bank (sisanya = dana awal lainnya, mis. stok awal) */
  initialCashInDrawer?: number;
  initialBankBalance?: number;
  purchaseReturns?: Array<{ id: string; returnNumber?: string; supplierName: string; totalAmount: number; createdAt: string; status?: string }>;
  pointRedemptionRate?: number;
}): JournalEntry[] {
  const {
    transactions = [],
    salesReturns = [],
    supplierPurchases = [],
    shifts = [],
    expenses = [],
    initialCapital = 0, // dulu bawaan Rp 50 juta karangan
    initialCashInDrawer = 0,
    initialBankBalance = 0,
    purchaseReturns = [],
    pointRedemptionRate = 100,
  } = options;

  const entries: JournalEntry[] = [];

  // 1. Initial Capital Entry
  if (initialCapital > 0) {
    // Tanggal: transaksi pertama yang tercatat (dulu tertanam 1 Januari 2026)
    const firstDate = transactions
      .map((t) => t.createdAt)
      .filter(Boolean)
      .sort()[0] || new Date().toISOString();
    entries.push({
      id: 'jrnl-init-capital',
      date: firstDate,
      referenceNumber: 'EQUITY-INIT',
      sourceType: 'initial_balance',
      description: 'Penyetoran Modal Awal Pemilik Toko',
      lines: [
        // Dirinci sesuai isian Owner (uang di laci / saldo bank); sisanya dana awal lainnya.
        // Tanpa isian: utuh ke Dana Awal (dulu dipecah 40% kas / 60% bank secara karangan)
        ...openingSplit(initialCapital, initialCashInDrawer, initialBankBalance).map(([code, name, amount]) => ({
          accountCode: code,
          accountName: name,
          debit: amount,
          credit: 0,
          memo: 'Modal awal saat mulai memakai aplikasi',
        })),
        {
          accountCode: '3010',
          accountName: 'Modal Awal Pemilik',
          debit: 0,
          credit: initialCapital,
          memo: 'Modal awal pemilik toko',
        },
      ],
      totalDebit: initialCapital,
      totalCredit: initialCapital,
      isBalanced: true,
    });
  }

  // 2. Journalize Retail Sales Transactions
  for (const tx of transactions) {
    if (tx.status === 'void') continue;

    const subtotal = Number(tx.subtotal) || 0;
    const finalTotal = Number(tx.finalTotal) || 0;
    const discount = Number(tx.discountAmount) || 0;
    const method = tx.payment?.method || 'cash';

    // Calculate actual cost of goods sold (HPP) for this transaction
    let totalCogs = 0;
    // HPP dari harga modal sebenarnya (satu aturan dengan laporan performa: src/utils/cogs.ts).
    // Dulu: bila harga modal kosong ditebak 75% harga jual, sehingga laba di dua laporan berbeda.
    for (const item of tx.items || []) totalCogs += lineCogs(item as any);
    totalCogs = Math.round(totalCogs);

    // Asset account based on payment method
    let assetCode = '1010';
    let assetName = 'Kas di Laci Kasir';
    if (method === 'qris' || method === 'transfer') {
      assetCode = '1020';
      assetName = 'Bank & Saldo QRIS';
    } else if (method === 'card') {
      assetCode = '1030';
      assetName = 'EDC & Piutang Kartu Debit';
    }

    const lines = [];

    // Debit payment asset
    lines.push({
      accountCode: assetCode,
      accountName: assetName,
      debit: finalTotal,
      credit: 0,
      memo: `Penerimaan bayar ${method.toUpperCase()} nota ${tx.invoiceNumber}`,
    });

    // Diskon promo/voucher/member = pengurang penjualan. Penukaran poin BUKAN diskon: poin sudah
    // dibebankan saat diperoleh, jadi penukaran mengurangi kewajiban poin (2020).
    const pointsPart = Math.min(discount, Math.max(0, Number(tx.pointsDiscount) || 0));
    const promoPart = discount - pointsPart;
    if (promoPart > 0) {
      lines.push({
        accountCode: '4020',
        accountName: 'Diskon & Promo Penjualan',
        debit: promoPart,
        credit: 0,
        memo: `Potongan promo/voucher/member nota ${tx.invoiceNumber}`,
      });
    }
    if (pointsPart > 0) {
      lines.push({ accountCode: '2020', accountName: 'Liabilitas Poin Loyalitas', debit: pointsPart, credit: 0, memo: `Penukaran poin nota ${tx.invoiceNumber}` });
    }
    // Poin yang diperoleh: beban program poin & kewajiban poin bertambah
    const earnedValue = Math.max(0, Number(tx.pointsEarned) || 0) * pointRedemptionRate;
    if (earnedValue > 0) {
      lines.push({ accountCode: '6040', accountName: 'Beban Program Poin Member', debit: earnedValue, credit: 0, memo: `Poin diperoleh nota ${tx.invoiceNumber}` });
      lines.push({ accountCode: '2020', accountName: 'Liabilitas Poin Loyalitas', debit: 0, credit: earnedValue, memo: 'Kewajiban poin member bertambah' });
    }

    // Credit Sales Revenue
    lines.push({
      accountCode: '4010',
      accountName: 'Pendapatan Penjualan Ritel',
      debit: 0,
      credit: subtotal,
      memo: `Penjualan ${tx.items?.length || 0} item barang`,
    });

    // COGS & Inventory (Perpetual Inventory System)
    if (totalCogs > 0) {
      lines.push({
        accountCode: '5010',
        accountName: 'Beban Pokok Penjualan (HPP)',
        debit: totalCogs,
        credit: 0,
        memo: `Pengakuan modal HPP transaksi ${tx.invoiceNumber}`,
      });
      lines.push({
        accountCode: '1050',
        accountName: 'Persediaan Barang Dagang',
        debit: 0,
        credit: totalCogs,
        memo: `Pengurangan stok fisik barang terjual`,
      });
    }

    const totalDebit = lines.reduce((s, l) => s + l.debit, 0);
    const totalCredit = lines.reduce((s, l) => s + l.credit, 0);

    entries.push({
      id: `jrnl-tx-${tx.id}`,
      date: tx.createdAt,
      referenceNumber: tx.invoiceNumber,
      sourceType: 'sale',
      description: `Penjualan Kasir ${tx.cashierName} (${method.toUpperCase()})`,
      lines,
      totalDebit,
      totalCredit,
      isBalanced: Math.abs(totalDebit - totalCredit) < 1,
    });
  }

  // 3. Journalize Sales Returns
  const returnTxById = new Map(transactions.map((t) => [t.id, t as any]));
  for (const ret of salesReturns) {
    const refund = Number(ret.totalRefundAmount) || 0;
    if (refund <= 0) continue;

    let refundAssetCode = '1010';
    let refundAssetName = 'Kas di Laci Kasir';
    if (ret.refundMethod === 'transfer') {
      refundAssetCode = '1020';
      refundAssetName = 'Bank & Saldo QRIS';
    } else if (ret.refundMethod === 'store_credit') {
      // Saldo toko: tidak ada uang keluar; toko berutang kepada pelanggan (dulu dicatat sebagai kas keluar)
      refundAssetCode = '2040';
      refundAssetName = 'Saldo Toko Pelanggan (Retur)';
    }
    // Barang yang kembali ke stok: HPP dibalik ke persediaan
    const retCogs = returnedCogs(ret as any, returnTxById);

    const lines = [
      {
        accountCode: '6030',
        accountName: 'Beban Retur Penjualan',
        debit: refund,
        credit: 0,
        memo: `Pengembalian dana retur nota ${ret.invoiceNumber}`,
      },
      {
        accountCode: refundAssetCode,
        accountName: refundAssetName,
        debit: 0,
        credit: refund,
        memo: ret.refundMethod === 'store_credit' ? 'Saldo toko untuk pelanggan' : `Kas keluar pengembalian retur ${ret.refundMethod.toUpperCase()}`,
      },
      ...(retCogs > 0
        ? [
            { accountCode: '1050', accountName: 'Persediaan Barang Dagang', debit: retCogs, credit: 0, memo: 'Barang retur kembali ke stok' },
            { accountCode: '5010', accountName: 'Beban Pokok Penjualan (HPP)', debit: 0, credit: retCogs, memo: 'Pembalikan HPP barang retur' },
          ]
        : []),
    ];

    const totalDebit = lines.reduce((s, l) => s + l.debit, 0);
    const totalCredit = lines.reduce((s, l) => s + l.credit, 0);

    entries.push({
      id: `jrnl-ret-${ret.id}`,
      date: ret.createdAt,
      referenceNumber: ret.returnNumber,
      sourceType: 'sales_return',
      description: `Retur Penjualan (${ret.items?.length || 1} item) oleh ${ret.cashierName}`,
      lines,
      totalDebit,
      totalCredit,
      isBalanced: totalDebit === totalCredit,
    });
  }

  // 4. Journalize Supplier Purchases (Penerimaan Stok PO)
  for (const po of supplierPurchases) {
    const totalPurchase = Number(po.finalTotal ?? po.totalAmount) || 0;
    if (totalPurchase <= 0) continue;

    const termsLower = (po.paymentTerms || '').toLowerCase();
    const isConsignment = termsLower.includes('konsinyasi') || termsLower.includes('titip');
    const isCredit = !isConsignment && (termsLower.includes('tempo') || termsLower.includes('kredit') || termsLower.includes('hari'));

    const paymentCreditCode = isConsignment ? '2030' : (isCredit ? '2010' : '1010');
    const paymentCreditName = isConsignment
      ? 'Utang Titipan / Konsinyasi Supplier'
      : (isCredit ? 'Utang Dagang Supplier' : 'Kas di Laci Kasir');

    const lines = [
      {
        accountCode: '1050',
        accountName: isConsignment ? 'Persediaan Barang Konsinyasi' : 'Persediaan Barang Dagang',
        debit: totalPurchase,
        credit: 0,
        memo: isConsignment
          ? `Penerimaan stok konsinyasi dari supplier ${po.supplierName}`
          : `Penerimaan stok masuk dari supplier ${po.supplierName}`,
      },
      {
        accountCode: paymentCreditCode,
        accountName: paymentCreditName,
        debit: 0,
        credit: totalPurchase,
        memo: isConsignment
          ? `Kewajiban titip jual konsinyasi PO ${po.invoiceNumber} (${po.supplierName})`
          : (isCredit
              ? `Kewajiban utang tempo PO ${po.invoiceNumber} (${po.paymentTerms})`
              : `Pembayaran tunai pembelian ${po.supplierName}`),
      },
    ];

    entries.push({
      id: `jrnl-po-${po.id}`,
      date: po.createdAt,
      referenceNumber: po.invoiceNumber,
      sourceType: 'purchase_order',
      description: isConsignment
        ? `Penerimaan Titip Jual (Konsinyasi): ${po.supplierName}`
        : `Penerimaan PO Supplier: ${po.supplierName}`,
      lines,
      totalDebit: totalPurchase,
      totalCredit: totalPurchase,
      isBalanced: true,
    });
  }

  // 5. Journalize Shift Cash Difference (Short / Over)
  for (const shift of shifts) {
    if (shift.status !== 'closed' || shift.difference === undefined || shift.difference === 0) continue;

    const diff = Number(shift.difference) || 0;
    const lines = [];

    if (diff < 0) {
      // Cash short (tekor): Expense debit, Cash credit
      const shortAmount = Math.abs(diff);
      lines.push(
        {
          accountCode: '6020',
          accountName: 'Beban Selisih Kas Shift',
          debit: shortAmount,
          credit: 0,
          memo: `Selisih kas kurang tutup shift ${shift.employeeName}`,
        },
        {
          accountCode: '1010',
          accountName: 'Kas di Laci Kasir',
          debit: 0,
          credit: shortAmount,
          memo: 'Penyesuaian saldo fisik kas laci',
        }
      );
    } else {
      // Cash over (lebih): Cash debit, Other revenue credit
      lines.push(
        {
          accountCode: '1010',
          accountName: 'Kas di Laci Kasir',
          debit: diff,
          credit: 0,
          memo: `Selisih kas lebih tutup shift ${shift.employeeName}`,
        },
        {
          accountCode: '4030',
          accountName: 'Pendapatan Lain-lain',
          debit: 0,
          credit: diff,
          memo: 'Pengakuan kelebihan fisik kas laci',
        }
      );
    }

    const totalDebit = lines.reduce((s, l) => s + l.debit, 0);
    const totalCredit = lines.reduce((s, l) => s + l.credit, 0);

    entries.push({
      id: `jrnl-shift-${shift.id}`,
      date: shift.endTime || shift.startTime,
      referenceNumber: `SHIFT-${shift.id.slice(-6).toUpperCase()}`,
      sourceType: 'shift_adjustment',
      description: `Penyesuaian Tutup Shift Kasir ${shift.employeeName} (${diff < 0 ? 'Tekor' : 'Lebih'})`,
      lines,
      totalDebit,
      totalCredit,
      isBalanced: totalDebit === totalCredit,
    });
  }

  // 5b. Jurnal pembayaran / pelunasan hutang supplier (tempo & konsinyasi)
  for (const po of supplierPurchases) {
    const kind = purchasePaymentKind(po);
    if (kind === 'cash') continue;
    for (const pay of po.payments || []) {
      const amount = Number(pay.amount) || 0;
      if (amount <= 0) continue;
      const liabilityCode = kind === 'consignment' ? '2030' : '2010';
      const liabilityName = kind === 'consignment' ? 'Utang Titipan / Konsinyasi Supplier' : 'Utang Dagang Supplier';
      const sourceCode = pay.source === 'bank_transfer' ? '1020' : '1010';
      const sourceName = pay.source === 'bank_transfer' ? 'Bank & Saldo QRIS' : 'Kas di Laci Kasir';
      entries.push({
        id: `jrnl-pay-${pay.id}`,
        date: pay.date,
        referenceNumber: po.invoiceNumber,
        sourceType: 'supplier_payment',
        description: `Pembayaran hutang ${po.supplierName} (${po.invoiceNumber})`,
        lines: [
          { accountCode: liabilityCode, accountName: liabilityName, debit: amount, credit: 0, memo: `Pelunasan ${po.invoiceNumber}` },
          { accountCode: sourceCode, accountName: sourceName, debit: 0, credit: amount, memo: `Dibayar oleh ${pay.recordedBy}` },
        ],
        totalDebit: amount,
        totalCredit: amount,
        isBalanced: true,
      });
    }
  }

  // 6. Journalize Operational Expenses
  for (const exp of expenses) {
    const amount = Number(exp.amount) || 0;
    if (amount <= 0) continue;

    const sourceCode = exp.paymentSource === 'bank_transfer' ? '1020' : '1010';
    const sourceName = exp.paymentSource === 'bank_transfer' ? 'Bank & Saldo QRIS' : 'Kas di Laci Kasir';

    const lines = [
      {
        accountCode: '6010',
        accountName: 'Beban Operasional Toko',
        debit: amount,
        credit: 0,
        memo: `${EXPENSE_CATEGORY_LABELS[exp.category] || exp.category}: ${exp.description}`,
      },
      {
        accountCode: sourceCode,
        accountName: sourceName,
        debit: 0,
        credit: amount,
        memo: `Pengeluaran kas operasional oleh ${exp.recordedBy}`,
      },
    ];

    entries.push({
      id: `jrnl-exp-${exp.id}`,
      date: exp.date,
      referenceNumber: exp.receiptNumber || `EXP-${exp.id.slice(-5).toUpperCase()}`,
      sourceType: 'expense',
      description: `Beban Operasional: ${exp.description}`,
      lines,
      totalDebit: amount,
      totalCredit: amount,
      isBalanced: true,
    });
  }

  // Sort chronologically descending
  // Retur ke supplier: persediaan keluar; mengurangi hutang (tempo/konsinyasi) atau menjadi piutang
  const supAlloc = allocateSupplierReturns(supplierPurchases, purchaseReturns);
  for (const r of purchaseReturns) {
    const a = supAlloc.byReturn.get(r.id);
    const total = Math.max(0, Number(r.totalAmount) || 0);
    if (!a || total <= 0) continue;
    const lines = [
      ...(a.toPayable > 0 ? [{ accountCode: '2010', accountName: 'Utang Dagang Supplier', debit: a.toPayable, credit: 0, memo: `Potong hutang ${r.supplierName}` }] : []),
      ...(a.toConsignment > 0 ? [{ accountCode: '2030', accountName: 'Utang Titipan / Konsinyasi Supplier', debit: a.toConsignment, credit: 0, memo: `Potong hutang konsinyasi ${r.supplierName}` }] : []),
      ...(a.toReceivable > 0 ? [{ accountCode: '1060', accountName: 'Piutang Retur Supplier', debit: a.toReceivable, credit: 0, memo: `Tagihan retur ke ${r.supplierName}` }] : []),
      { accountCode: '1050', accountName: 'Persediaan Barang Dagang', debit: 0, credit: total, memo: 'Barang dikembalikan ke supplier' },
    ];
    entries.push({
      id: `jrnl-pret-${r.id}`,
      date: r.createdAt,
      referenceNumber: r.returnNumber || r.id,
      sourceType: 'purchase_return',
      description: `Retur ke supplier ${r.supplierName}`,
      lines,
      totalDebit: total,
      totalCredit: total,
      isBalanced: true,
    });
  }

  return entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

// ============================================================================
// INCOME STATEMENT (LAPORAN LABA RUGI)
// ============================================================================

export function computeIncomeStatement(options: {
  transactions: Transaction[];
  salesReturns?: SalesReturn[];
  shifts?: ShiftSummary[];
  expenses?: OperationalExpense[];
  startDate?: string;
  endDate?: string;
  pointRedemptionRate?: number;
}): IncomeStatement {
  const {
    transactions = [],
    salesReturns = [],
    shifts = [],
    expenses = [],
    startDate,
    endDate,
    pointRedemptionRate = 100,
  } = options;

  let startMs = 0;
  let endMs = Number.MAX_SAFE_INTEGER;

  if (startDate && startDate.trim()) {
    const parsed = new Date(startDate).getTime();
    if (!isNaN(parsed)) {
      startMs = parsed;
    }
  }
  if (endDate && endDate.trim()) {
    const parsed = new Date(endDate).getTime();
    if (!isNaN(parsed)) {
      endMs = parsed;
    }
  }

  // Filter within date range
  const filteredTx = transactions.filter((t) => {
    if (t.status === 'void') return false;
    if (!t.createdAt) return true;
    const ms = new Date(t.createdAt).getTime();
    if (isNaN(ms)) return true;
    return ms >= startMs && ms <= endMs;
  });

  const filteredReturns = salesReturns.filter((r) => {
    if (!r.createdAt) return true;
    const ms = new Date(r.createdAt).getTime();
    if (isNaN(ms)) return true;
    return ms >= startMs && ms <= endMs;
  });

  const filteredExpenses = expenses.filter((e) => {
    if (!e.date) return true;
    const ms = new Date(e.date).getTime();
    if (isNaN(ms)) return true;
    return ms >= startMs && ms <= endMs;
  });

  const filteredShifts = shifts.filter((s) => {
    const dateStr = s.endTime || s.startTime;
    if (!dateStr) return true;
    const ms = new Date(dateStr).getTime();
    if (isNaN(ms)) return true;
    return ms >= startMs && ms <= endMs;
  });

  // 1. Gross Revenue & Discounts
  let grossSales = 0;
  let salesDiscounts = 0;
  let costOfGoodsSold = 0;
  let pointsExpense = 0;

  for (const tx of filteredTx) {
    grossSales += Number(tx.subtotal) || 0;
    // Penukaran poin bukan diskon (sudah dibebankan saat poin diperoleh; lihat beban poin di bawah)
    const disc = Number(tx.discountAmount) || 0;
    salesDiscounts += disc - Math.min(disc, Math.max(0, Number(tx.pointsDiscount) || 0));
    pointsExpense += Math.max(0, Number(tx.pointsEarned) || 0) * pointRedemptionRate;

    for (const item of tx.items || []) costOfGoodsSold += lineCogs(item as any);
  }

  // 2. Sales Returns
  const salesReturnsTotal = filteredReturns.reduce((sum, r) => sum + (Number(r.totalRefundAmount) || 0), 0);

  // 3. Net Sales (boleh negatif bila retur > penjualan periode itu; dulu dipotong 0 sehingga tersembunyi)
  const netSales = grossSales - salesDiscounts - salesReturnsTotal;
  // HPP barang retur yang kembali ke stok mengurangi HPP (dulu tetap dihitung biaya -> laba tampak lebih kecil)
  const txById = new Map(transactions.map((t) => [t.id, t as any]));
  const returnedCostOfGoods = filteredReturns.reduce((sum, r) => sum + returnedCogs(r as any, txById), 0);
  costOfGoodsSold = Math.round(costOfGoodsSold) - returnedCostOfGoods;

  // 4. Gross Profit
  const grossProfit = netSales - costOfGoodsSold;
  const grossProfitMarginPercent = netSales > 0 ? (grossProfit / netSales) * 100 : 0;

  // 5. Operating Expenses
  const byCategory: Record<ExpenseCategory, number> = {
    listrik_air_internet: 0,
    gaji_karyawan: 0,
    sewa_ruko: 0,
    perlengkapan_kantor: 0,
    pemeliharaan_toko: 0,
    konsumsi_operasional: 0,
    lainnya: 0,
  };

  for (const exp of filteredExpenses) {
    if (byCategory[exp.category] !== undefined) {
      byCategory[exp.category] += Number(exp.amount) || 0;
    } else {
      byCategory.lainnya += Number(exp.amount) || 0;
    }
  }

  // Selisih kas tutup shift: kekurangan = beban (6020), kelebihan = pendapatan lain-lain (4030).
  // Dulu kelebihan diabaikan di laba rugi padahal jurnal mencatatnya -> laba berbeda dengan jurnal.
  let cashShortExpense = 0;
  let cashOverIncome = 0;
  for (const sh of filteredShifts) {
    if (sh.difference && sh.difference < 0) cashShortExpense += Math.abs(sh.difference);
    else if (sh.difference && sh.difference > 0) cashOverIncome += sh.difference;
  }

  const expenseItemsSum = Object.values(byCategory).reduce((a, b) => a + b, 0);
  const totalOperatingExpenses = expenseItemsSum + cashShortExpense + pointsExpense;

  // 6. Net Operating Profit
  const netOperatingProfit = grossProfit - totalOperatingExpenses + cashOverIncome;
  const netProfitMarginPercent = netSales > 0 ? (netOperatingProfit / netSales) * 100 : 0;

  return {
    startDate: startDate ?? '',
    endDate: endDate ?? '',
    grossSales,
    salesDiscounts,
    salesReturns: salesReturnsTotal,
    netSales,
    costOfGoodsSold,
    grossProfit,
    grossProfitMarginPercent,
    operatingExpenses: {
      byCategory,
      cashShortExpense,
      pointsExpense,
      totalOperatingExpenses,
    },
    otherIncome: cashOverIncome,
    netOperatingProfit,
    netProfitMarginPercent,
  };
}

// ============================================================================
// BALANCE SHEET (NERACA KEUANGAN PERIODE RIIL)
// ============================================================================

export function computeBalanceSheet(options: {
  products: Product[];
  transactions: Transaction[];
  customers?: Customer[];
  supplierPurchases?: SupplierPurchase[];
  shifts?: ShiftSummary[];
  expenses?: OperationalExpense[];
  salesReturns?: SalesReturn[];
  purchaseReturns?: Array<{ id: string; supplierName: string; totalAmount: number; createdAt: string; status?: string }>;
  initialCapital?: number;
  initialCashInDrawer?: number;
  initialBankBalance?: number;
  pointRedemptionRate?: number;
}): BalanceSheet {
  const {
    products = [],
    transactions = [],
    customers = [],
    supplierPurchases = [],
    shifts = [],
    expenses = [],
    salesReturns = [],
    purchaseReturns = [],
    initialCapital = 0, // dulu bawaan Rp 50 juta karangan
    initialCashInDrawer = 0,
    initialBankBalance = 0,
    pointRedemptionRate = 100,
  } = options;

  // 1. Merchandise Inventory Valuation (Nilai Total Fisik Stok Toko)
  let merchandiseInventory = 0;
  for (const p of products) {
    const qty = Math.max(0, p.stock || 0);
    // Nilai persediaan dari harga modal sebenarnya (dulu ditebak 75% harga jual bila kosong)
    const cost = Number(p.costPrice) > 0 ? Number(p.costPrice) : 0;
    merchandiseInventory += qty * cost;
  }
  merchandiseInventory = Math.round(merchandiseInventory);

  // 2. Liquid Assets (Cash & Bank) calculation
  // Modal awal dicatat utuh sebagai "dana awal" (dulu dipecah 40% kas / 60% bank secara karangan).
  // Kas & bank di bawah hanya dari arus yang tercatat; boleh negatif bila ada pengeluaran sebelum
  // penjualan tercatat (dulu dipotong 0 sehingga kekurangan tersembunyi).
  // Bila Owner merinci modal awal (uang di laci / saldo bank), bagian itu langsung menjadi kas/bank;
  // sisanya tetap "dana awal lainnya" (mis. nilai stok awal). Dulu bank bisa tampil negatif.
  const split = openingSplit(initialCapital, initialCashInDrawer, initialBankBalance);
  const part = (code: string) => split.filter(([c]) => c === code).reduce((a, [, , v]) => a + v, 0);
  const openingFunds = part('1005');
  let cashOnHand = part('1010');
  let bankAndQris = part('1020');
  let edcCardReceivables = 0;

  for (const tx of transactions) {
    if (tx.status === 'void') continue;
    const finalTotal = Number(tx.finalTotal) || 0;
    const method = tx.payment?.method || 'cash';
    if (method === 'cash') {
      cashOnHand += finalTotal;
    } else if (method === 'qris' || method === 'transfer') {
      bankAndQris += finalTotal;
    } else if (method === 'card') {
      edcCardReceivables += finalTotal;
    }
  }

  // Deduct operational expenses
  for (const exp of expenses) {
    const amt = Number(exp.amount) || 0;
    if (exp.paymentSource === 'bank_transfer') {
      bankAndQris -= amt;
    } else {
      cashOnHand -= amt;
    }
  }

  // Pembayaran hutang supplier mengurangi kas laci / bank sesuai sumber dananya
  for (const po of supplierPurchases) {
    if (purchasePaymentKind(po) === 'cash') continue;
    for (const pay of po.payments || []) {
      const amt = Number(pay.amount) || 0;
      if (pay.source === 'bank_transfer') bankAndQris -= amt;
      else cashOnHand -= amt;
    }
  }

  // Deduct cash purchases of POs (Tunai murni yang mengurangi kas di laci kasir)
  for (const po of supplierPurchases) {
    const total = Number(po.finalTotal ?? po.totalAmount) || 0;
    const termsLower = (po.paymentTerms || '').toLowerCase();
    const isConsignment = termsLower.includes('konsinyasi') || termsLower.includes('titip');
    const isCredit = !isConsignment && (termsLower.includes('tempo') || termsLower.includes('kredit') || termsLower.includes('hari'));
    if (!isCredit && !isConsignment) {
      cashOnHand -= total;
    }
  }

  // Selisih hitung kas saat tutup shift: kas fisik mengikuti hasil hitungan (kekurangan mengurangi
  // kas, kelebihan menambah). Dulu diabaikan sehingga kas di neraca lebih besar dari uang di laci,
  // padahal laba rugi & jurnal sudah mencatat kekurangannya.
  for (const sh of shifts) {
    if (sh.status === 'closed' && typeof sh.difference === 'number') cashOnHand += sh.difference;
  }

  // Retur penjualan: tunai mengurangi kas, transfer mengurangi bank, saldo toko = kewajiban
  let storeCreditLiability = 0;
  for (const ret of salesReturns) {
    const refund = Number(ret.totalRefundAmount) || 0;
    if (ret.refundMethod === 'transfer') bankAndQris -= refund;
    else if (ret.refundMethod === 'store_credit') storeCreditLiability += refund;
    else cashOnHand -= refund;
  }

  const supAlloc = allocateSupplierReturns(supplierPurchases, purchaseReturns);
  const supplierReturnReceivable = supAlloc.receivable;
  const totalCurrentAssets = openingFunds + cashOnHand + bankAndQris + edcCardReceivables + merchandiseInventory + supplierReturnReceivable;
  const totalAssets = totalCurrentAssets;

  // 3. Liabilities
  // Accounts Payable: sum of supplier purchases on credit/tempo
  let accountsPayable = 0;
  let consignmentPayable = 0;
  for (const po of supplierPurchases) {
    const total = Number(po.finalTotal ?? po.totalAmount) || 0;
    const termsLower = (po.paymentTerms || '').toLowerCase();
    const isConsignment = termsLower.includes('konsinyasi') || termsLower.includes('titip');
    const isCredit = !isConsignment && (termsLower.includes('tempo') || termsLower.includes('kredit') || termsLower.includes('hari'));
    // Hanya sisa yang belum dibayar (dulu seluruh nilai faktur selamanya tercatat sebagai hutang)
    const outstanding = Math.max(0, total - purchasePaidOf(po));
    if (isCredit) {
      accountsPayable += outstanding;
    } else if (isConsignment) {
      consignmentPayable += outstanding;
    }
  }

  // Retur ke supplier mengurangi hutang (lihat allocateSupplierReturns)
  accountsPayable -= supAlloc.payableReduction;
  consignmentPayable -= supAlloc.consignmentReduction;

  // Points Liability: Outstanding points in circulation
  const totalMemberPoints = customers.reduce((sum, c) => sum + (c.points || 0), 0);
  const pointsLiability = totalMemberPoints * pointRedemptionRate;

  const totalCurrentLiabilities = accountsPayable + pointsLiability + consignmentPayable + storeCreditLiability;
  const totalLiabilities = totalCurrentLiabilities;

  // 4. Equity
  // Calculate Net Profit of current period from income statement
  const incomeStmt = computeIncomeStatement({
    transactions,
    salesReturns, // dulu tanpa retur -> laba di neraca berbeda dengan laporan Laba Rugi
    shifts,
    expenses,
    pointRedemptionRate,
  });
  const currentPeriodNetIncome = incomeStmt.netOperatingProfit;

  // Ekuitas dihitung dari bawah: modal awal + laba (rugi) tercatat dari laporan Laba Rugi.
  // Sisa yang tidak dijelaskan pencatatan (mis. stok awal/impor yang diinput tanpa faktur, hasil
  // opname, kas awal) DITAMPILKAN sebagai baris sendiri. Dulu seluruh sisa disembunyikan sebagai
  // "laba ditahan" sehingga neraca selalu tampak seimbang apa pun datanya.
  // Ekuitas = TOTAL modal awal (bagian laci/bank sudah masuk ke kas/bank, sisanya dana awal lainnya)
  const ownerInitialCapital = split.reduce((a, [, , v]) => a + v, 0);
  const retainedEarnings = 0;
  const unrecordedCapital = Math.round(totalAssets - totalLiabilities - ownerInitialCapital - currentPeriodNetIncome);
  const totalEquity = ownerInitialCapital + currentPeriodNetIncome + retainedEarnings + unrecordedCapital;

  const totalLiabilitiesAndEquity = totalLiabilities + totalEquity;
  const difference = totalAssets - totalLiabilitiesAndEquity;

  return {
    asOfDate: new Date().toISOString(),
    assets: {
      openingFunds,
      supplierReturnReceivable,
      cashOnHand,
      bankAndQris,
      edcCardReceivables,
      merchandiseInventory,
      totalCurrentAssets,
      totalAssets,
    },
    liabilities: {
      accountsPayable,
      consignmentPayable,
      pointsLiability,
      storeCreditLiability,
      totalCurrentLiabilities,
      totalLiabilities,
    },
    equity: {
      ownerInitialCapital,
      currentPeriodNetIncome,
      retainedEarnings,
      unrecordedCapital,
      totalEquity,
    },
    totalLiabilitiesAndEquity,
    isBalanced: Math.abs(difference) < 1,
    isReconciled: Math.abs(unrecordedCapital) < 1,
    difference,
  };
}

// ============================================================================
// CSV EXPORT GENERATOR (GENERAL JOURNAL & LEDGER)
// ============================================================================

export function exportJournalToCSV(entries: JournalEntry[]): string {
  const headers = [
    'Tanggal',
    'No. Referensi',
    'Tipe Sumber',
    'Keterangan Transaksi',
    'Kode Akun',
    'Nama Akun',
    'Debit (IDR)',
    'Kredit (IDR)',
    'Memo Baris',
    'Status Seimbang',
  ];

  const rows: string[] = [headers.join(',')];

  for (const entry of entries) {
    const formattedDate = new Date(entry.date).toLocaleString('id-ID');
    for (const line of entry.lines) {
      const row = [
        `"${formattedDate}"`,
        `"${entry.referenceNumber}"`,
        `"${entry.sourceType}"`,
        `"${entry.description.replace(/"/g, '""')}"`,
        `"${line.accountCode}"`,
        `"${line.accountName.replace(/"/g, '""')}"`,
        line.debit || 0,
        line.credit || 0,
        `"${(line.memo || '').replace(/"/g, '""')}"`,
        `"${entry.isBalanced ? 'BALANCED' : 'UNBALANCED'}"`,
      ];
      rows.push(row.join(','));
    }
  }

  return rows.join('\r\n');
}

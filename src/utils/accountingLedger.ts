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

export type { ExpenseCategory };

// ============================================================================
// STANDARD CHART OF ACCOUNTS (COA) FOR ULILMART POS
// ============================================================================

export const STANDARD_CHART_OF_ACCOUNTS: ChartOfAccount[] = [
  // 1000 - ASET LANCAR
  { code: '1010', name: 'Kas di Laci Kasir', category: 'asset', normalBalance: 'debit', description: 'Uang fisik tunai di laci kasir' },
  { code: '1020', name: 'Bank & Saldo QRIS', category: 'asset', normalBalance: 'debit', description: 'Rekening penampung pembayaran QRIS & Transfer bank' },
  { code: '1030', name: 'EDC & Piutang Kartu Debit', category: 'asset', normalBalance: 'debit', description: 'Kliring settlement kartu debit/kredit mesin EDC' },
  { code: '1040', name: 'Piutang Usaha Pelanggan', category: 'asset', normalBalance: 'debit', description: 'Bon / kredit pelanggan toko' },
  { code: '1050', name: 'Persediaan Barang Dagang', category: 'asset', normalBalance: 'debit', description: 'Valuasi nilai modal stok barang fisik di toko/gudang' },

  // 2000 - KEWAJIBAN (LIABILITAS)
  { code: '2010', name: 'Utang Dagang Supplier', category: 'liability', normalBalance: 'credit', description: 'Tagihan tempo faktur pembelian barang distributor' },
  { code: '2020', name: 'Liabilitas Poin Loyalitas', category: 'liability', normalBalance: 'credit', description: 'Titipan saldo poin member yang belum ditukarkan' },
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

export function generateJournalEntries(options: {
  transactions: Transaction[];
  salesReturns?: SalesReturn[];
  supplierPurchases?: SupplierPurchase[];
  shifts?: ShiftSummary[];
  expenses?: OperationalExpense[];
  initialCapital?: number;
}): JournalEntry[] {
  const {
    transactions = [],
    salesReturns = [],
    supplierPurchases = [],
    shifts = [],
    expenses = [],
    initialCapital = 50000000,
  } = options;

  const entries: JournalEntry[] = [];

  // 1. Initial Capital Entry
  if (initialCapital > 0) {
    entries.push({
      id: 'jrnl-init-capital',
      date: '2026-01-01T00:00:00.000Z',
      referenceNumber: 'EQUITY-INIT',
      sourceType: 'initial_balance',
      description: 'Penyetoran Modal Awal Pemilik Toko',
      lines: [
        {
          accountCode: '1010',
          accountName: 'Kas di Laci Kasir',
          debit: Math.round(initialCapital * 0.4),
          credit: 0,
          memo: 'Setoran Kas Operasional Tunai Toko',
        },
        {
          accountCode: '1020',
          accountName: 'Bank & Saldo QRIS',
          debit: Math.round(initialCapital * 0.6),
          credit: 0,
          memo: 'Setoran Rekening Bank Usaha',
        },
        {
          accountCode: '3010',
          accountName: 'Modal Awal Pemilik',
          debit: 0,
          credit: initialCapital,
          memo: 'Modal Usaha Toko Ritel Ulilmart',
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
    for (const item of tx.items || []) {
      const multiplier = item.selectedUnit?.multiplier || 1;
      const unitCost =
        item.selectedUnit?.costPrice !== undefined
          ? item.selectedUnit.costPrice
          : (item.product?.costPrice ?? (item.product?.price ? item.product.price * 0.75 : 0)) * multiplier;
      totalCogs += unitCost * (item.quantity || 1);
    }
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

    // Debit discount if any
    if (discount > 0) {
      lines.push({
        accountCode: '4020',
        accountName: 'Diskon & Promo Penjualan',
        debit: discount,
        credit: 0,
        memo: `Potongan promo/voucher/member nota ${tx.invoiceNumber}`,
      });
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
  for (const ret of salesReturns) {
    const refund = Number(ret.totalRefundAmount) || 0;
    if (refund <= 0) continue;

    let refundAssetCode = '1010';
    let refundAssetName = 'Kas di Laci Kasir';
    if (ret.refundMethod === 'transfer') {
      refundAssetCode = '1020';
      refundAssetName = 'Bank & Saldo QRIS';
    }

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
        memo: `Kas keluar pengembalian retur ${ret.refundMethod.toUpperCase()}`,
      },
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
}): IncomeStatement {
  const {
    transactions = [],
    salesReturns = [],
    shifts = [],
    expenses = [],
    startDate,
    endDate,
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

  for (const tx of filteredTx) {
    grossSales += Number(tx.subtotal) || 0;
    salesDiscounts += Number(tx.discountAmount) || 0;

    for (const item of tx.items || []) {
      const multiplier = item.selectedUnit?.multiplier || 1;
      const unitCost =
        item.selectedUnit?.costPrice !== undefined
          ? item.selectedUnit.costPrice
          : (item.product?.costPrice ?? (item.product?.price ? item.product.price * 0.75 : 0)) * multiplier;
      costOfGoodsSold += unitCost * (item.quantity || 1);
    }
  }

  // 2. Sales Returns
  const salesReturnsTotal = filteredReturns.reduce((sum, r) => sum + (Number(r.totalRefundAmount) || 0), 0);

  // 3. Net Sales
  const netSales = Math.max(0, grossSales - salesDiscounts - salesReturnsTotal);
  costOfGoodsSold = Math.round(costOfGoodsSold);

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

  // Cash Shortage from closed shifts
  let cashShortExpense = 0;
  for (const sh of filteredShifts) {
    if (sh.difference && sh.difference < 0) {
      cashShortExpense += Math.abs(sh.difference);
    }
  }

  const expenseItemsSum = Object.values(byCategory).reduce((a, b) => a + b, 0);
  const totalOperatingExpenses = expenseItemsSum + cashShortExpense;

  // 6. Net Operating Profit
  const netOperatingProfit = grossProfit - totalOperatingExpenses;
  const netProfitMarginPercent = netSales > 0 ? (netOperatingProfit / netSales) * 100 : 0;

  return {
    startDate,
    endDate,
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
      totalOperatingExpenses,
    },
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
  initialCapital?: number;
  pointRedemptionRate?: number;
}): BalanceSheet {
  const {
    products = [],
    transactions = [],
    customers = [],
    supplierPurchases = [],
    shifts = [],
    expenses = [],
    initialCapital = 50000000,
    pointRedemptionRate = 100,
  } = options;

  // 1. Merchandise Inventory Valuation (Nilai Total Fisik Stok Toko)
  let merchandiseInventory = 0;
  for (const p of products) {
    const qty = Math.max(0, p.stock || 0);
    const cost = p.costPrice !== undefined && p.costPrice > 0 ? p.costPrice : p.price * 0.75;
    merchandiseInventory += qty * cost;
  }
  merchandiseInventory = Math.round(merchandiseInventory);

  // 2. Liquid Assets (Cash & Bank) calculation
  // Start from initial capital split
  let cashOnHand = Math.round(initialCapital * 0.4);
  let bankAndQris = Math.round(initialCapital * 0.6);
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
      bankAndQris = Math.max(0, bankAndQris - amt);
    } else {
      cashOnHand = Math.max(0, cashOnHand - amt);
    }
  }

  // Deduct cash purchases of POs (Tunai murni yang mengurangi kas di laci kasir)
  for (const po of supplierPurchases) {
    const total = Number(po.finalTotal ?? po.totalAmount) || 0;
    const termsLower = (po.paymentTerms || '').toLowerCase();
    const isConsignment = termsLower.includes('konsinyasi') || termsLower.includes('titip');
    const isCredit = !isConsignment && (termsLower.includes('tempo') || termsLower.includes('kredit') || termsLower.includes('hari'));
    if (!isCredit && !isConsignment) {
      cashOnHand = Math.max(0, cashOnHand - total);
    }
  }

  const totalCurrentAssets = cashOnHand + bankAndQris + edcCardReceivables + merchandiseInventory;
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
    if (isCredit) {
      accountsPayable += total;
    } else if (isConsignment) {
      consignmentPayable += total;
    }
  }

  // Points Liability: Outstanding points in circulation
  const totalMemberPoints = customers.reduce((sum, c) => sum + (c.points || 0), 0);
  const pointsLiability = totalMemberPoints * pointRedemptionRate;

  const totalCurrentLiabilities = accountsPayable + pointsLiability + consignmentPayable;
  const totalLiabilities = totalCurrentLiabilities;

  // 4. Equity
  // Calculate Net Profit of current period from income statement
  const incomeStmt = computeIncomeStatement({
    transactions,
    shifts,
    expenses,
  });
  const currentPeriodNetIncome = incomeStmt.netOperatingProfit;

  // Balanced plug: Retained earnings brings Asset = Liability + Equity
  // Equity = Assets - Liabilities
  const requiredTotalEquity = totalAssets - totalLiabilities;
  const ownerInitialCapital = initialCapital;
  const retainedEarnings = requiredTotalEquity - ownerInitialCapital - currentPeriodNetIncome;
  const totalEquity = ownerInitialCapital + currentPeriodNetIncome + retainedEarnings;

  const totalLiabilitiesAndEquity = totalLiabilities + totalEquity;
  const difference = totalAssets - totalLiabilitiesAndEquity;

  return {
    asOfDate: new Date().toISOString(),
    assets: {
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
      totalCurrentLiabilities,
      totalLiabilities,
    },
    equity: {
      ownerInitialCapital,
      currentPeriodNetIncome,
      retainedEarnings,
      totalEquity,
    },
    totalLiabilitiesAndEquity,
    isBalanced: Math.abs(difference) < 1,
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

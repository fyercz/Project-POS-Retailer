import React, { useState, useMemo } from 'react';
import {
  BarChart3,
  DollarSign,
  TrendingUp,
  CreditCard,
  Banknote,
  QrCode,
  Building2,
  Printer,
  ShoppingBag,
  Percent,
  CheckCircle,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Zap,
  Clock,
  Award,
  ArrowUpRight,
  RotateCcw,
  PackageCheck,
  FileSpreadsheet,
  Database,
  Search,
  Receipt,
  Scale,
  Calendar,
  Check,
  ShieldCheck,
  ChevronRight,
  Calculator,
  BookOpen,
  Plus,
  Trash2,
  Download,
  Wallet,
  Landmark,
  Coins,
  ArrowDownRight,
  Filter,
  Layers,
  X,
  FileText,
} from 'lucide-react';
import { usePOSTransactions, usePOSUI } from '../../context/POSContext';
import { formatCurrency, formatNumber, formatDate } from '../../utils/formatters';
import { ReportPrintModal, ReportType } from '../ReportPrintModal';
import { DateFilterBar } from '../DateFilterBar';
import {
  DateFilterPreset,
  isDateWithinFilter,
  toLocalYMD,
  formatPeriodLabel,
} from '../../utils/dateFilters';
import { exportToCSV } from '../../utils/printHelper';
import { Transaction } from '../../types';
import {
  ExpenseCategory,
  EXPENSE_CATEGORY_LABELS,
  exportJournalToCSV,
  computeIncomeStatement,
} from '../../utils/accountingLedger';

export const ReportsView: React.FC = () => {
  const { transactions, salesReturns, setActiveReceipt } = usePOSTransactions();
  const {
    settings,
    openGeminiCopilot,
    setIsBackupRestoreOpen,
    expenses,
    addExpense,
    deleteExpense,
    journalEntries,
    balanceSheet,
    incomeStatement,
    chartOfAccounts,
  } = usePOSUI();

  // Tab State: payments, performance, accounting (Neraca & Laba Rugi), journal (Jurnal Umum)
  const [activeTab, setActiveTab] = useState<'payments' | 'performance' | 'accounting' | 'journal'>('payments');
  const [accountingSubTab, setAccountingSubTab] = useState<'balance_sheet' | 'income_statement'>('balance_sheet');
  const [journalSourceFilter, setJournalSourceFilter] = useState<string>('all');
  const [journalSearch, setJournalSearch] = useState<string>('');

  // Expense Modal State
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [newExpenseCategory, setNewExpenseCategory] = useState<ExpenseCategory>('listrik_air_internet');
  const [newExpenseDesc, setNewExpenseDesc] = useState('');
  const [newExpenseAmount, setNewExpenseAmount] = useState('');
  const [newExpenseSource, setNewExpenseSource] = useState<'cash_drawer' | 'bank_transfer'>('cash_drawer');
  const [newExpenseNotes, setNewExpenseNotes] = useState('');
  const [expenseFormError, setExpenseFormError] = useState('');

  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [selectedReportType, setSelectedReportType] = useState<ReportType>('payments');

  // Date Filter State: Defaults to 'all' so that overall business metrics are immediately populated
  const [datePreset, setDatePreset] = useState<DateFilterPreset>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Payment View Filters
  const [methodChannelFilter, setMethodChannelFilter] = useState<'all' | 'qris' | 'card' | 'cash'>('all');
  const [paymentSearch, setPaymentSearch] = useState<string>('');
  const [edcSlipTotalInput, setEdcSlipTotalInput] = useState<string>('');

  const openPrintWith = (type: ReportType = 'summary') => {
    setSelectedReportType(type);
    setIsPrintModalOpen(true);
  };

  const completedTransactions = useMemo(() => {
    return transactions.filter((t) => t.status === 'completed');
  }, [transactions]);

  // Filtered transactions for active date range
  const dateFilteredTransactions = useMemo(() => {
    return transactions.filter((t) => isDateWithinFilter(t.createdAt, startDate, endDate));
  }, [transactions, startDate, endDate]);

  const dateFilteredCompleted = useMemo(() => {
    return dateFilteredTransactions.filter((t) => t.status === 'completed');
  }, [dateFilteredTransactions]);

  // Dynamic Date-filtered Income Statement
  const dateFilteredIncome = useMemo(() => {
    let startIso: string | undefined = undefined;
    let endIso: string | undefined = undefined;

    if (startDate && startDate.trim()) {
      const parts = startDate.trim().split('-').map(Number);
      if (parts.length === 3 && !parts.some(isNaN)) {
        const [y, m, d] = parts;
        const dt = new Date(y, m - 1, d, 0, 0, 0, 0);
        if (!isNaN(dt.getTime())) {
          startIso = dt.toISOString();
        }
      } else {
        const dt = new Date(startDate);
        if (!isNaN(dt.getTime())) {
          startIso = dt.toISOString();
        }
      }
    }

    if (endDate && endDate.trim()) {
      const parts = endDate.trim().split('-').map(Number);
      if (parts.length === 3 && !parts.some(isNaN)) {
        const [y, m, d] = parts;
        const dt = new Date(y, m - 1, d, 23, 59, 59, 999);
        if (!isNaN(dt.getTime())) {
          endIso = dt.toISOString();
        }
      } else {
        const dt = new Date(endDate);
        if (!isNaN(dt.getTime())) {
          endIso = dt.toISOString();
        }
      }
    }

    return computeIncomeStatement({
      transactions,
      salesReturns,
      expenses,
      startDate: startIso,
      endDate: endIso,
    });
  }, [transactions, salesReturns, expenses, startDate, endDate]);

  // Dynamic Date-filtered & Search-filtered General Journal
  const dateFilteredJournal = useMemo(() => {
    return journalEntries.filter((j) => {
      const matchDate = isDateWithinFilter(j.date, startDate, endDate);
      if (!matchDate) return false;
      if (journalSourceFilter !== 'all' && j.sourceType !== journalSourceFilter) return false;
      if (journalSearch.trim()) {
        const q = journalSearch.toLowerCase();
        const inRef = j.referenceNumber.toLowerCase().includes(q);
        const inDesc = j.description.toLowerCase().includes(q);
        const inLine = j.lines.some(
          (l) => l.accountName.toLowerCase().includes(q) || l.accountCode.includes(q) || (l.memo && l.memo.toLowerCase().includes(q))
        );
        if (!inRef && !inDesc && !inLine) return false;
      }
      return true;
    });
  }, [journalEntries, startDate, endDate, journalSourceFilter, journalSearch]);

  const handleCreateExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const val = Number(newExpenseAmount);
    if (!newExpenseDesc.trim()) {
      setExpenseFormError('Keterangan pengeluaran wajib diisi.');
      return;
    }
    if (!val || val <= 0) {
      setExpenseFormError('Nominal pengeluaran harus lebih besar dari 0.');
      return;
    }
    addExpense({
      category: newExpenseCategory,
      description: newExpenseDesc.trim(),
      amount: Math.round(val),
      paymentSource: newExpenseSource,
      recordedBy: 'Owner / Supervisor',
      notes: newExpenseNotes.trim() || undefined,
    });
    setIsExpenseModalOpen(false);
    setNewExpenseDesc('');
    setNewExpenseAmount('');
    setNewExpenseNotes('');
    setExpenseFormError('');
  };

  const handleExportJournalCSV = () => {
    const csv = exportJournalToCSV(dateFilteredJournal);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `jurnal-umum-ulilmart-${startDate}-sd-${endDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Payment Breakdown & EDC BRI Reconciliation Metrics
  const paymentMetrics = useMemo(() => {
    let totalCash = 0;
    let totalQris = 0;
    let totalCard = 0;
    let totalTransfer = 0;
    let cashCount = 0;
    let qrisCount = 0;
    let cardCount = 0;
    let transferCount = 0;

    for (let i = 0; i < dateFilteredCompleted.length; i++) {
      const tx = dateFilteredCompleted[i];
      const m = tx.payment?.method || 'cash';
      const amount = tx.finalTotal || 0;

      if (m === 'cash') {
        totalCash += amount;
        cashCount++;
      } else if (m === 'qris') {
        totalQris += amount;
        qrisCount++;
      } else if (m === 'card') {
        totalCard += amount;
        cardCount++;
      } else if (m === 'transfer') {
        totalTransfer += amount;
        transferCount++;
      }
    }

    const totalGross = totalCash + totalQris + totalCard + totalTransfer;
    const totalEdcSettlement = totalQris + totalCard;
    const totalEdcTxCount = qrisCount + cardCount;

    return {
      totalCash,
      totalQris,
      totalCard,
      totalTransfer,
      totalGross,
      totalEdcSettlement,
      cashCount,
      qrisCount,
      cardCount,
      transferCount,
      totalEdcTxCount,
      totalTxCount: dateFilteredCompleted.length,
    };
  }, [dateFilteredCompleted]);

  // Filtered table list for payments
  const displayedPaymentTransactions = useMemo(() => {
    const q = paymentSearch.trim().toLowerCase();
    return dateFilteredTransactions.filter((tx) => {
      // Method filter
      if (methodChannelFilter !== 'all' && tx.payment?.method !== methodChannelFilter) {
        return false;
      }
      // Search filter
      if (q) {
        const invMatch = tx.invoiceNumber?.toLowerCase().includes(q);
        const refMatch = tx.payment?.referenceCode?.toLowerCase().includes(q);
        const cashierMatch = tx.cashierName?.toLowerCase().includes(q);
        const custMatch = tx.customer?.name?.toLowerCase().includes(q);
        if (!invMatch && !refMatch && !cashierMatch && !custMatch) {
          return false;
        }
      }
      return true;
    }).sort((a, b) => {
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      return (isNaN(timeB) ? 0 : timeB) - (isNaN(timeA) ? 0 : timeA);
    });
  }, [dateFilteredTransactions, methodChannelFilter, paymentSearch]);

  // Overall Store Performance Metrics
  const reportMetrics = useMemo(() => {
    let grossSales = 0;
    let totalSubtotal = 0;
    let totalDiscounts = 0;
    let totalCOGS = 0;
    let totalUnitsSold = 0;

    const productCountMap: Record<string, { name: string; quantity: number; revenue: number; profit: number }> = {};

    for (let i = 0; i < completedTransactions.length; i++) {
      const tx = completedTransactions[i];
      grossSales += tx.finalTotal;
      totalSubtotal += tx.subtotal;
      totalDiscounts += tx.discountAmount;

      for (let j = 0; j < tx.items.length; j++) {
        const item = tx.items[j];
        totalUnitsSold += item.quantity;
        const itemCost = item.product.costPrice || 0;
        totalCOGS += itemCost * item.quantity;

        const pId = item.product.id;
        if (!productCountMap[pId]) {
          productCountMap[pId] = {
            name: item.product.name,
            quantity: 0,
            revenue: 0,
            profit: 0,
          };
        }
        productCountMap[pId].quantity += item.quantity;
        productCountMap[pId].revenue += item.totalPrice;
        productCountMap[pId].profit += (item.unitPrice - itemCost) * item.quantity;
      }
    }

    const totalSalesReturnAmount = salesReturns.reduce((sum, r) => sum + r.totalRefundAmount, 0);
    const netSales = Math.max(0, grossSales - totalSalesReturnAmount);
    const averageTicket = completedTransactions.length > 0 ? grossSales / completedTransactions.length : 0;
    const grossProfit = Math.max(0, grossSales - totalCOGS);
    const profitMargin = grossSales > 0 ? ((grossProfit / grossSales) * 100).toFixed(1) : '0';

    const topProducts = Object.values(productCountMap)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 6);

    return {
      grossSales,
      totalSubtotal,
      totalDiscounts,
      totalSalesReturnAmount,
      netSales,
      averageTicket,
      totalCOGS,
      totalUnitsSold,
      grossProfit,
      profitMargin,
      topProducts,
    };
  }, [completedTransactions, salesReturns]);

  // Settlement reconciliation calculation
  const physicalEdcAmount = parseFloat(edcSlipTotalInput.replace(/[^0-9.]/g, '')) || 0;
  const settlementDifference = physicalEdcAmount > 0 ? physicalEdcAmount - paymentMetrics.totalEdcSettlement : null;

  const handleExportPaymentsCSV = () => {
    const filename = `Laporan_Pembayaran_EDC_${toLocalYMD(new Date())}`;
    const headers = [
      'No Faktur',
      'Waktu',
      'Metode Bayar',
      'Kanal / Bank',
      'No Ref / RRN EDC BRI',
      'Kasir',
      'Pelanggan',
      'Nominal Tagihan (Rp)',
      'Status',
    ];
    const rows = displayedPaymentTransactions.map((tx) => [
      tx.invoiceNumber,
      formatDate(tx.createdAt),
      tx.payment?.method === 'qris'
        ? 'QRIS EDC BRI'
        : tx.payment?.method === 'card'
        ? (tx.payment?.bankName || 'KARTU EDC BRI')
        : tx.payment?.method === 'cash'
        ? 'TUNAI'
        : 'TRANSFER',
      tx.payment?.bankName || (tx.payment?.method === 'cash' ? 'Laci Fisik Kasir' : 'Mesin EDC BRI'),
      tx.payment?.referenceCode || '-',
      tx.cashierName,
      tx.customer?.name || 'Umum',
      Math.round(tx.finalTotal),
      tx.status.toUpperCase(),
    ]);
    exportToCSV(filename, headers, rows);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-100 dark:bg-slate-950 overflow-y-auto select-none p-4 space-y-4">
      {/* Top Header */}
      <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
              EDC BRI Settlement &amp; Kasir
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
              {settings.storeName} ({settings.branchName})
            </span>
          </div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 mt-0.5">
            <CreditCard className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <span>Laporan Pembayaran &amp; Rekonsiliasi EDC BRI</span>
          </h2>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Contextual Action Buttons */}
          {activeTab === 'journal' && (
            <>
              <button
                type="button"
                onClick={() => setIsExpenseModalOpen(true)}
                className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-sm shadow-indigo-600/20 transition-all active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>+ Catat Beban Kas Keluar</span>
              </button>
              <button
                type="button"
                onClick={handleExportJournalCSV}
                className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
              >
                <Download className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>Ekspor Jurnal CSV</span>
              </button>
            </>
          )}

          {activeTab === 'payments' && (
            <>
              <button
                onClick={() => openPrintWith('payments')}
                className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
              >
                <Printer className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>Cetak Rekap Pembayaran</span>
              </button>
              <button
                onClick={handleExportPaymentsCSV}
                className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Ekspor CSV</span>
              </button>
            </>
          )}

          {activeTab === 'performance' && (
            <button
              onClick={() => openPrintWith('summary')}
              className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
            >
              <Printer className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>Cetak Ikhtisar Omzet</span>
            </button>
          )}

          {activeTab === 'accounting' && (
            <button
              onClick={() => window.print()}
              className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
            >
              <Printer className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Cetak Laporan Keuangan</span>
            </button>
          )}

          {/* AI Executive Insights Trigger */}
          <button
            onClick={() => openGeminiCopilot('insights')}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-md shadow-blue-600/20 transition-all active:scale-95"
          >
            <Sparkles className="w-4 h-4 fill-current animate-pulse" />
            <span className="hidden sm:inline">Analisis AI</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>

          <button
            id="btn-reports-backup-restore"
            onClick={() => setIsBackupRestoreOpen(true)}
            className="hidden lg:flex px-3 py-2 rounded-xl border border-emerald-300 dark:border-emerald-700 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 font-bold text-xs items-center gap-1.5 cursor-pointer shadow-xs transition-colors active:scale-95"
            title="Cadangkan Data Toko & Titik Pemulihan (Backup & Restore - F9)"
          >
            <Database className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Backup</span>
          </button>
        </div>
      </div>

      {/* Primary Sub-Tab Switcher (4 Tabs) */}
      <div className="grid grid-cols-2 md:grid-cols-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl p-1.5 shadow-2xs gap-1.5">
        <button
          type="button"
          onClick={() => setActiveTab('payments')}
          className={`py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            activeTab === 'payments'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <CreditCard className="w-4 h-4 shrink-0" />
          <span className="truncate">Pembayaran &amp; EDC</span>
          <span
            className={`px-1.5 py-0.2 rounded-full text-[10px] font-black shrink-0 ${
              activeTab === 'payments'
                ? 'bg-white/20 text-white'
                : 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300'
            }`}
          >
            {dateFilteredCompleted.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('performance')}
          className={`py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            activeTab === 'performance'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <BarChart3 className="w-4 h-4 shrink-0" />
          <span className="truncate">Omzet &amp; Produk</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('accounting')}
          className={`py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            activeTab === 'accounting'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:text-emerald-700'
          }`}
        >
          <Scale className="w-4 h-4 shrink-0 text-emerald-500" />
          <span className="truncate">Neraca &amp; Laba Rugi</span>
          <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 shrink-0">
            Owner
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('journal')}
          className={`py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            activeTab === 'journal'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 hover:text-indigo-700'
          }`}
        >
          <BookOpen className="w-4 h-4 shrink-0 text-indigo-500" />
          <span className="truncate">Buku Jurnal Umum</span>
          <span
            className={`px-1.5 py-0.2 rounded-full text-[10px] font-black shrink-0 ${
              activeTab === 'journal'
                ? 'bg-white/20 text-white'
                : 'bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300'
            }`}
          >
            {dateFilteredJournal.length}
          </span>
        </button>
      </div>

      {/* ============================================================== */}
      {/* TAB 1: LAPORAN PEMBAYARAN & REKONSILIASI EDC BRI               */}
      {/* ============================================================== */}
      {activeTab === 'payments' && (
        <div className="space-y-4">
          {/* Date Filter Bar */}
          <DateFilterBar
            idPrefix="payments-date-filter"
            label="Filter Periode Pembayaran"
            preset={datePreset}
            startDate={startDate}
            endDate={endDate}
            onPresetChange={(newPreset, sDate, eDate) => {
              setDatePreset(newPreset);
              setStartDate(sDate);
              setEndDate(eDate);
            }}
            onDateChange={(sDate, eDate) => {
              setStartDate(sDate);
              setEndDate(eDate);
              setDatePreset('custom');
            }}
            totalFilteredCount={dateFilteredCompleted.length}
            totalAllCount={transactions.length}
            summaryBadge={
              <div className="flex items-center gap-2">
                <span className="text-slate-500 dark:text-slate-400 text-[11px]">
                  Total Masuk Periode Ini:
                </span>
                <span className="font-mono font-bold text-blue-600 dark:text-blue-400 text-xs">
                  {formatCurrency(paymentMetrics.totalGross, settings.currency)}
                </span>
              </div>
            }
          />

          {/* 4 Summary Cards: Cash, QRIS EDC BRI, Card EDC, and GRAND TOTAL EDC SETTLEMENT */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* 1. Uang Tunai (Cash) */}
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                  Uang Tunai (Cash)
                </span>
                <span className="p-1 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
                  <Banknote className="w-4 h-4" />
                </span>
              </div>
              <div className="text-lg font-black font-mono text-emerald-600 dark:text-emerald-400 mt-1">
                {formatCurrency(paymentMetrics.totalCash, settings.currency)}
              </div>
              <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 mt-1 font-mono">
                <span>{paymentMetrics.cashCount} Transaksi</span>
                <span>Laci Kasir Fisik</span>
              </div>
            </div>

            {/* 2. QRIS Mesin EDC BRI */}
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-blue-700 dark:text-blue-400 flex items-center gap-1.5">
                  <span>QRIS EDC BRI</span>
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-300">
                    EDC BRI
                  </span>
                </span>
                <span className="p-1 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400">
                  <QrCode className="w-4 h-4" />
                </span>
              </div>
              <div className="text-lg font-black font-mono text-blue-600 dark:text-blue-400 mt-1">
                {formatCurrency(paymentMetrics.totalQris, settings.currency)}
              </div>
              <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 mt-1 font-mono">
                <span>{paymentMetrics.qrisCount} Transaksi</span>
                <span>Scan Mesin EDC</span>
              </div>
            </div>

            {/* 3. Kartu EDC (Debit / Kredit) */}
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                  Kartu EDC (Debit/Kredit)
                </span>
                <span className="p-1 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
                  <CreditCard className="w-4 h-4" />
                </span>
              </div>
              <div className="text-lg font-black font-mono text-indigo-600 dark:text-indigo-400 mt-1">
                {formatCurrency(paymentMetrics.totalCard, settings.currency)}
              </div>
              <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 mt-1 font-mono">
                <span>{paymentMetrics.cardCount} Transaksi</span>
                <span>Gesek / Dip EDC</span>
              </div>
            </div>

            {/* 4. TOTAL SETTLEMENT EDC BRI (HIGHLIGHT) */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-800 text-white shadow-md border border-blue-500">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-blue-100 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-200" />
                  <span>TOTAL SETTLEMENT EDC BRI</span>
                </span>
                <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-white/20 text-white uppercase">
                  Closing Kasir
                </span>
              </div>
              <div className="text-xl font-black font-mono text-white mt-1">
                {formatCurrency(paymentMetrics.totalEdcSettlement, settings.currency)}
              </div>
              <div className="flex items-center justify-between text-[10px] text-blue-100 mt-1 font-mono">
                <span>{paymentMetrics.totalEdcTxCount} Struk (QRIS + Kartu)</span>
                <span className="font-semibold underline">Struk Mesin EDC</span>
              </div>
            </div>
          </div>

          {/* Interactive Settlement Reconciliation Tool */}
          <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50/50 dark:from-blue-950/40 dark:to-indigo-950/30 rounded-2xl border border-blue-200 dark:border-blue-900/60 shadow-2xs">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Calculator className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <h3 className="font-bold text-xs text-blue-950 dark:text-blue-100 uppercase tracking-wider">
                    Alat Rekonsiliasi Struk Settlement EDC BRI
                  </h3>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  Ketikkan total nominal dari struk settlement fisik mesin EDC BRI untuk mencocokkan dengan rekaman sistem POS.
                </p>
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">Rp</span>
                  <input
                    type="number"
                    value={edcSlipTotalInput}
                    onChange={(e) => setEdcSlipTotalInput(e.target.value)}
                    placeholder="Total di struk EDC..."
                    className="w-48 pl-9 pr-3 py-2 text-xs font-mono font-bold rounded-xl border border-blue-300 dark:border-blue-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {edcSlipTotalInput && settlementDifference !== null && (
                  <div
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 ${
                      settlementDifference === 0
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                        : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
                    }`}
                  >
                    {settlementDifference === 0 ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>Seimbang (Selisih: Rp 0)</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-4 h-4 text-rose-600" />
                        <span>
                          Selisih: {settlementDifference > 0 ? '+' : ''}
                          {formatCurrency(settlementDifference, settings.currency)}
                        </span>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Payment Method Filter Pills & Search */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-3">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              {/* Channel Tabs */}
              <div className="flex flex-wrap gap-1.5">
                {[
                  { id: 'all' as const, label: 'Semua Metode', count: dateFilteredCompleted.length },
                  { id: 'qris' as const, label: 'QRIS EDC BRI', count: paymentMetrics.qrisCount },
                  { id: 'card' as const, label: 'Kartu EDC BRI', count: paymentMetrics.cardCount },
                  { id: 'cash' as const, label: 'Uang Tunai', count: paymentMetrics.cashCount },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setMethodChannelFilter(item.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                      methodChannelFilter === item.id
                        ? 'bg-blue-600 text-white font-bold shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-750'
                    }`}
                  >
                    <span>{item.label}</span>
                    <span
                      className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                        methodChannelFilter === item.id
                          ? 'bg-white/20 text-white'
                          : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {item.count}
                    </span>
                  </button>
                ))}
              </div>

              {/* Search Box */}
              <div className="relative min-w-[240px]">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={paymentSearch}
                  onChange={(e) => setPaymentSearch(e.target.value)}
                  placeholder="Cari No. Faktur / Ref EDC / Kasir..."
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Payment Transactions Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-2.5 px-3">No. Faktur / Waktu</th>
                    <th className="py-2.5 px-3">Kanal Pembayaran</th>
                    <th className="py-2.5 px-3">No. Ref / RRN EDC BRI</th>
                    <th className="py-2.5 px-3">Kasir &amp; Pelanggan</th>
                    <th className="py-2.5 px-3 text-right">Nominal Tagihan</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                    <th className="py-2.5 px-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {displayedPaymentTransactions.length > 0 ? (
                    displayedPaymentTransactions.map((tx) => {
                      const isEdc = tx.payment?.method === 'qris' || tx.payment?.method === 'card';
                      return (
                        <tr
                          key={tx.id}
                          className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors ${
                            isEdc ? 'bg-blue-50/15 dark:bg-blue-950/10' : ''
                          }`}
                        >
                          {/* Invoice & Time */}
                          <td className="py-2.5 px-3">
                            <span className="font-mono font-bold text-slate-900 dark:text-white block">
                              {tx.invoiceNumber}
                            </span>
                            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                              {formatDate(tx.createdAt)}
                            </span>
                          </td>

                          {/* Channel Badge */}
                          <td className="py-2.5 px-3">
                            {tx.payment?.method === 'qris' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-200 border border-blue-200 dark:border-blue-800">
                                <QrCode className="w-3 h-3" />
                                <span>QRIS EDC BRI</span>
                              </span>
                            )}
                            {tx.payment?.method === 'card' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-100 dark:bg-indigo-900/60 text-indigo-800 dark:text-indigo-200 border border-indigo-200 dark:border-indigo-800">
                                <CreditCard className="w-3 h-3" />
                                <span>{tx.payment?.bankName || 'Kartu EDC BRI'}</span>
                              </span>
                            )}
                            {tx.payment?.method === 'cash' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800">
                                <Banknote className="w-3 h-3" />
                                <span>Tunai (Cash)</span>
                              </span>
                            )}
                            {tx.payment?.method === 'transfer' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-800">
                                <Building2 className="w-3 h-3" />
                                <span>Transfer Bank</span>
                              </span>
                            )}
                          </td>

                          {/* Reference / RRN EDC Code */}
                          <td className="py-2.5 px-3 font-mono">
                            {tx.payment?.referenceCode ? (
                              <span className="font-semibold text-slate-800 dark:text-slate-200 text-[11px]">
                                {tx.payment.referenceCode}
                              </span>
                            ) : (
                              <span className="text-slate-400 italic text-[11px]">-</span>
                            )}
                          </td>

                          {/* Cashier & Customer */}
                          <td className="py-2.5 px-3">
                            <span className="font-semibold text-slate-800 dark:text-slate-200 block">
                              {tx.cashierName}
                            </span>
                            <span className="text-[10px] text-slate-500 dark:text-slate-400">
                              {tx.customer?.name ? `Pelanggan: ${tx.customer.name}` : 'Pelanggan Umum'}
                            </span>
                          </td>

                          {/* Amount */}
                          <td className="py-2.5 px-3 text-right">
                            <span className="font-mono font-bold text-slate-900 dark:text-white text-xs block">
                              {formatCurrency(tx.finalTotal, settings.currency)}
                            </span>
                          </td>

                          {/* Status */}
                          <td className="py-2.5 px-3 text-center">
                            {tx.status === 'completed' ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                Selesai
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                                {tx.status}
                              </span>
                            )}
                          </td>

                          {/* Action */}
                          <td className="py-2.5 px-3 text-right">
                            <button
                              type="button"
                              onClick={() => setActiveReceipt(tx)}
                              className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
                            >
                              Nota
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400 dark:text-slate-500">
                        <Receipt className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="font-semibold text-xs">Belum ada transaksi pembayaran pada filter ini.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 2: IKHTISAR OMZET & PERFORMA PRODUK                         */}
      {/* ============================================================== */}
      {activeTab === 'performance' && (
        <div className="space-y-4">
          {/* Primary KPI Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Gross Revenue */}
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 tracking-tight">
                Total Omzet Kotor
              </span>
              <div className="text-xl font-black font-mono text-emerald-600 dark:text-emerald-400 mt-1">
                {formatCurrency(reportMetrics.grossSales, settings.currency)}
              </div>
              <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 mt-1 font-mono">
                <span>Bersih: {formatCurrency(reportMetrics.netSales, settings.currency)}</span>
                <span>{reportMetrics.totalUnitsSold} Pcs Terjual</span>
              </div>
            </div>

            {/* Total Orders & Ticket */}
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 tracking-tight">
                Total Transaksi Selesai
              </span>
              <div className="text-xl font-black font-mono text-slate-900 dark:text-white mt-1">
                {completedTransactions.length} Struk Nota
              </div>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 block font-mono">
                Rata-rata Nota: {formatCurrency(reportMetrics.averageTicket, settings.currency)}
              </span>
            </div>

            {/* Gross Profit & Margin */}
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 tracking-tight">
                Estimasi Laba Kotor (Cuan)
              </span>
              <div className="text-xl font-black font-mono text-teal-600 dark:text-teal-400 mt-1">
                {formatCurrency(reportMetrics.grossProfit, settings.currency)}
              </div>
              <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 mt-1 font-mono">
                <span>Margin: {reportMetrics.profitMargin}%</span>
                <span>Modal: {formatCurrency(reportMetrics.totalCOGS, settings.currency)}</span>
              </div>
            </div>

            {/* Retur Penjualan & Diskon */}
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 tracking-tight">
                Retur &amp; Promo Diskon
              </span>
              <div className="text-xl font-black font-mono text-amber-600 dark:text-amber-400 mt-1">
                {formatCurrency(reportMetrics.totalDiscounts + reportMetrics.totalSalesReturnAmount, settings.currency)}
              </div>
              <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 mt-1 font-mono">
                <span>Retur: {formatCurrency(reportMetrics.totalSalesReturnAmount, settings.currency)}</span>
                <span>Diskon: {formatCurrency(reportMetrics.totalDiscounts, settings.currency)}</span>
              </div>
            </div>
          </div>

          {/* Grid: Payment Method Breakdown & Top Sellers */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Top 6 Products Leaderboard */}
            <div className="lg:col-span-7 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
              <h3 className="font-bold text-xs text-slate-800 dark:text-slate-100 uppercase tracking-wider">
                Produk Ritel Terlaris (Fast-Moving)
              </h3>

              <div className="space-y-2 pt-1">
                {reportMetrics.topProducts.length > 0 ? (
                  reportMetrics.topProducts.map((p, idx) => (
                    <div
                      key={p.name}
                      className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-black text-[10px] flex items-center justify-center font-mono shrink-0">
                          #{idx + 1}
                        </span>
                        <span className="font-semibold text-slate-800 dark:text-slate-100 truncate">{p.name}</span>
                      </div>
                      <div className="text-right font-mono shrink-0">
                        <span className="font-bold text-blue-600 dark:text-blue-400 block">
                          {p.quantity} terjual
                        </span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-300">
                          {formatCurrency(p.revenue, settings.currency)}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-500 dark:text-slate-400 py-6 text-center">
                    Belum ada data penjualan tercatat hari ini.
                  </p>
                )}
              </div>
            </div>

            {/* Quick Actions & Settlement Guide */}
            <div className="lg:col-span-5 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
              <h3 className="font-bold text-xs text-slate-800 dark:text-slate-100 uppercase tracking-wider">
                SOP Rekonsiliasi EDC BRI Toko
              </h3>

              <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 space-y-2 text-xs text-slate-700 dark:text-slate-300">
                <div className="flex items-start gap-2">
                  <span className="w-4 h-4 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                    1
                  </span>
                  <span>
                    Di akhir shift / hari, cetak <strong>Struk Settlement</strong> pada mesin EDC BRI toko.
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-4 h-4 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                    2
                  </span>
                  <span>
                    Buka tab <strong>Laporan Pembayaran &amp; Settlement EDC BRI</strong> pada sistem POS.
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-4 h-4 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                    3
                  </span>
                  <span>
                    Cocokkan total <strong>QRIS EDC BRI</strong> dan <strong>Kartu EDC</strong> antara struk mesin EDC dengan POS.
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActiveTab('payments')}
                className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <span>Buka Laporan Pembayaran &amp; Settlement EDC BRI</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 3: NERACA KEUANGAN & LAPORAN LABA RUGI (ACCOUNTING)         */}
      {/* ============================================================== */}
      {activeTab === 'accounting' && (
        <div className="space-y-4">
          {/* Sub-Switch: Balance Sheet vs Income Statement */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-2 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl gap-1">
              <button
                type="button"
                onClick={() => setAccountingSubTab('balance_sheet')}
                className={`py-2 px-3.5 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                  accountingSubTab === 'balance_sheet'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-700'
                }`}
              >
                <Scale className="w-4 h-4" />
                <span>Neraca Keuangan (Balance Sheet)</span>
              </button>

              <button
                type="button"
                onClick={() => setAccountingSubTab('income_statement')}
                className={`py-2 px-3.5 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                  accountingSubTab === 'income_statement'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-700'
                }`}
              >
                <TrendingUp className="w-4 h-4" />
                <span>Laba Rugi (Income Statement)</span>
              </button>
            </div>

            {/* Balance Status Badge */}
            <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 rounded-xl text-xs text-emerald-800 dark:text-emerald-300 font-semibold self-start sm:self-auto">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>Status Pembukuan: <strong>Neraca Seimbang (Aktiva = Pasiva)</strong></span>
            </div>
          </div>

          {/* Date Filter Bar */}
          <DateFilterBar
            idPrefix="accounting-date-filter"
            label="Filter Periode Keuangan"
            preset={datePreset}
            startDate={startDate}
            endDate={endDate}
            onPresetChange={(newPreset, sDate, eDate) => {
              setDatePreset(newPreset);
              setStartDate(sDate);
              setEndDate(eDate);
            }}
            onDateChange={(sDate, eDate) => {
              setStartDate(sDate);
              setEndDate(eDate);
              setDatePreset('custom');
            }}
            totalFilteredCount={dateFilteredCompleted.length}
            totalAllCount={transactions.length}
          />

          {/* 3A: NERACA KEUANGAN (BALANCE SHEET) */}
          {accountingSubTab === 'balance_sheet' && (
            <div className="space-y-4">
              {/* Top KPI Cards for Balance Sheet */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-teal-500/5 dark:from-emerald-950/40 dark:to-slate-900 border border-emerald-200 dark:border-emerald-800 shadow-2xs">
                  <div className="flex items-center justify-between text-emerald-700 dark:text-emerald-400 text-xs font-bold">
                    <span className="flex items-center gap-1.5">
                      <Building2 className="w-4 h-4" />
                      <span>Total Aset (Aktiva)</span>
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200">
                      Riil Toko
                    </span>
                  </div>
                  <div className="text-2xl font-black font-mono text-slate-900 dark:text-white mt-1.5">
                    {formatCurrency(balanceSheet.assets.totalAssets, settings.currency)}
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                    Kas + Bank + EDC + Valuasi Stok Fisik Toko
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
                  <div className="flex items-center justify-between text-slate-600 dark:text-slate-400 text-xs font-bold">
                    <span className="flex items-center gap-1.5">
                      <Coins className="w-4 h-4 text-rose-500" />
                      <span>Total Kewajiban (Utang)</span>
                    </span>
                  </div>
                  <div className="text-2xl font-black font-mono text-rose-600 dark:text-rose-400 mt-1.5">
                    {formatCurrency(balanceSheet.liabilities.totalLiabilities, settings.currency)}
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                    Utang Supplier Tempo ({formatCurrency(balanceSheet.liabilities.accountsPayable)}) + Poin Member
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
                  <div className="flex items-center justify-between text-slate-600 dark:text-slate-400 text-xs font-bold">
                    <span className="flex items-center gap-1.5">
                      <Wallet className="w-4 h-4 text-blue-500" />
                      <span>Total Ekuitas Bersih</span>
                    </span>
                  </div>
                  <div className="text-2xl font-black font-mono text-blue-600 dark:text-blue-400 mt-1.5">
                    {formatCurrency(balanceSheet.equity.totalEquity, settings.currency)}
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                    Modal Pemilik + Laba Berjalan + Laba Ditahan
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
                  <div className="flex items-center justify-between text-slate-600 dark:text-slate-400 text-xs font-bold">
                    <span className="flex items-center gap-1.5">
                      <ShoppingBag className="w-4 h-4 text-indigo-500" />
                      <span>Valuasi Stok Fisik</span>
                    </span>
                  </div>
                  <div className="text-2xl font-black font-mono text-indigo-600 dark:text-indigo-400 mt-1.5">
                    {formatCurrency(balanceSheet.assets.merchandiseInventory, settings.currency)}
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                    Nilai modal modal HPP persediaan barang
                  </p>
                </div>
              </div>

              {/* Dual-Column Balance Sheet Statement Table */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* AKTIVA (ASSETS) */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xs">
                  <div className="p-3.5 bg-slate-100/80 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="p-1 rounded-lg bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                        <Building2 className="w-4 h-4" />
                      </span>
                      <h3 className="font-bold text-sm text-slate-900 dark:text-white">ASET / AKTIVA</h3>
                    </div>
                    <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(balanceSheet.assets.totalAssets, settings.currency)}
                    </span>
                  </div>

                  <div className="p-4 space-y-3 text-xs">
                    <div className="border-b border-slate-100 dark:border-slate-800 pb-2">
                      <span className="font-bold text-slate-700 dark:text-slate-300 tracking-wide text-[11px] uppercase">
                        Aset Lancar (Current Assets)
                      </span>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between items-center py-1 border-b border-slate-100 dark:border-slate-800/60">
                        <div>
                          <span className="font-medium text-slate-800 dark:text-slate-200">1010 • Kas di Laci Kasir (Cash on Hand)</span>
                          <p className="text-[10px] text-slate-400">Uang tunai fisik siap edar di laci</p>
                        </div>
                        <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                          {formatCurrency(balanceSheet.assets.cashOnHand, settings.currency)}
                        </span>
                      </div>

                      <div className="flex justify-between items-center py-1 border-b border-slate-100 dark:border-slate-800/60">
                        <div>
                          <span className="font-medium text-slate-800 dark:text-slate-200">1020 • Bank &amp; Rekening QRIS</span>
                          <p className="text-[10px] text-slate-400">Saldo dana kliring QRIS &amp; transfer bank</p>
                        </div>
                        <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                          {formatCurrency(balanceSheet.assets.bankAndQris, settings.currency)}
                        </span>
                      </div>

                      <div className="flex justify-between items-center py-1 border-b border-slate-100 dark:border-slate-800/60">
                        <div>
                          <span className="font-medium text-slate-800 dark:text-slate-200">1030 • Piutang Kliring EDC Kartu</span>
                          <p className="text-[10px] text-slate-400">Settlement kartu debit/kredit mesin EDC</p>
                        </div>
                        <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                          {formatCurrency(balanceSheet.assets.edcCardReceivables, settings.currency)}
                        </span>
                      </div>

                      <div className="flex justify-between items-center py-1 border-b border-slate-100 dark:border-slate-800/60">
                        <div>
                          <span className="font-medium text-slate-800 dark:text-slate-200">1050 • Persediaan Barang Dagang</span>
                          <p className="text-[10px] text-slate-400">Total nilai modal stok barang di rak &amp; gudang</p>
                        </div>
                        <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                          {formatCurrency(balanceSheet.assets.merchandiseInventory, settings.currency)}
                        </span>
                      </div>
                    </div>

                    <div className="p-3 bg-emerald-50/70 dark:bg-emerald-950/30 rounded-xl border border-emerald-200/80 dark:border-emerald-800/60 flex justify-between items-center mt-4">
                      <span className="font-bold text-emerald-900 dark:text-emerald-200">TOTAL AKTIVA (ASET)</span>
                      <span className="font-black font-mono text-emerald-700 dark:text-emerald-300 text-sm">
                        {formatCurrency(balanceSheet.assets.totalAssets, settings.currency)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* PASIVA & EKUITAS (LIABILITIES & EQUITY) */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xs">
                  <div className="p-3.5 bg-slate-100/80 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="p-1 rounded-lg bg-blue-500/20 text-blue-600 dark:text-blue-400">
                        <Scale className="w-4 h-4" />
                      </span>
                      <h3 className="font-bold text-sm text-slate-900 dark:text-white">KEWAJIBAN &amp; EKUITAS (PASIVA)</h3>
                    </div>
                    <span className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400">
                      {formatCurrency(balanceSheet.totalLiabilitiesAndEquity, settings.currency)}
                    </span>
                  </div>

                  <div className="p-4 space-y-4 text-xs">
                    {/* Liabilities Section */}
                    <div>
                      <div className="border-b border-slate-100 dark:border-slate-800 pb-1 mb-2">
                        <span className="font-bold text-rose-600 dark:text-rose-400 tracking-wide text-[11px] uppercase">
                          Kewajiban Jangka Pendek (Liabilitas)
                        </span>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between items-center py-1 border-b border-slate-100 dark:border-slate-800/60">
                          <div>
                            <span className="font-medium text-slate-800 dark:text-slate-200">2010 • Utang Dagang Supplier</span>
                            <p className="text-[10px] text-slate-400">Faktur pembelian PO tempo distributor belum lunas</p>
                          </div>
                          <span className="font-mono font-bold text-rose-600 dark:text-rose-400">
                            {formatCurrency(balanceSheet.liabilities.accountsPayable, settings.currency)}
                          </span>
                        </div>

                        <div className="flex justify-between items-center py-1 border-b border-slate-100 dark:border-slate-800/60">
                          <div>
                            <span className="font-medium text-slate-800 dark:text-slate-200">2020 • Liabilitas Poin Member</span>
                            <p className="text-[10px] text-slate-400">Titipan nilai poin beredar pelanggan</p>
                          </div>
                          <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                            {formatCurrency(balanceSheet.liabilities.pointsLiability, settings.currency)}
                          </span>
                        </div>

                        <div className="flex justify-between text-[11px] font-bold text-rose-700 dark:text-rose-300 pt-1">
                          <span>Total Kewajiban</span>
                          <span className="font-mono">{formatCurrency(balanceSheet.liabilities.totalLiabilities, settings.currency)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Equity Section */}
                    <div>
                      <div className="border-b border-slate-100 dark:border-slate-800 pb-1 mb-2">
                        <span className="font-bold text-blue-600 dark:text-blue-400 tracking-wide text-[11px] uppercase">
                          Ekuitas Pemilik Toko (Modal)
                        </span>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between items-center py-1 border-b border-slate-100 dark:border-slate-800/60">
                          <div>
                            <span className="font-medium text-slate-800 dark:text-slate-200">3010 • Modal Awal Pemilik Toko</span>
                            <p className="text-[10px] text-slate-400">Investasi awal usaha ritel Ulilmart</p>
                          </div>
                          <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                            {formatCurrency(balanceSheet.equity.ownerInitialCapital, settings.currency)}
                          </span>
                        </div>

                        <div className="flex justify-between items-center py-1 border-b border-slate-100 dark:border-slate-800/60">
                          <div>
                            <span className="font-medium text-slate-800 dark:text-slate-200">Laba Bersih Periode Berjalan</span>
                            <p className="text-[10px] text-slate-400">Hasil laba bersih dari Laporan Laba Rugi</p>
                          </div>
                          <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                            {formatCurrency(balanceSheet.equity.currentPeriodNetIncome, settings.currency)}
                          </span>
                        </div>

                        <div className="flex justify-between items-center py-1 border-b border-slate-100 dark:border-slate-800/60">
                          <div>
                            <span className="font-medium text-slate-800 dark:text-slate-200">3020 • Akumulasi Laba Ditahan</span>
                            <p className="text-[10px] text-slate-400">Laba ditahan dari akumulasi aset &amp; persediaan</p>
                          </div>
                          <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                            {formatCurrency(balanceSheet.equity.retainedEarnings, settings.currency)}
                          </span>
                        </div>

                        <div className="flex justify-between text-[11px] font-bold text-blue-700 dark:text-blue-300 pt-1">
                          <span>Total Ekuitas</span>
                          <span className="font-mono">{formatCurrency(balanceSheet.equity.totalEquity, settings.currency)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="p-3 bg-blue-50/70 dark:bg-blue-950/30 rounded-xl border border-blue-200/80 dark:border-blue-800/60 flex justify-between items-center mt-4">
                      <span className="font-bold text-blue-900 dark:text-blue-200">TOTAL PASIVA (KEWAJIBAN + EKUITAS)</span>
                      <span className="font-black font-mono text-blue-700 dark:text-blue-300 text-sm">
                        {formatCurrency(balanceSheet.totalLiabilitiesAndEquity, settings.currency)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Accounting Equation Summary Bar */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-50 via-teal-50 to-blue-50 dark:from-slate-900 dark:via-emerald-950/20 dark:to-slate-900 border border-emerald-300 dark:border-emerald-800 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2.5">
                  <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-white">
                      Persamaan Dasar Akuntansi: Aktiva = Pasiva + Ekuitas
                    </h4>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400">
                      Total Aset ({formatCurrency(balanceSheet.assets.totalAssets)}) = Kewajiban ({formatCurrency(balanceSheet.liabilities.totalLiabilities)}) + Ekuitas ({formatCurrency(balanceSheet.equity.totalEquity)}).
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 self-start md:self-auto font-mono text-xs">
                  <span className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-bold">
                    SEIMBANG (Diff: {formatCurrency(balanceSheet.difference)})
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* 3B: LAPORAN LABA RUGI (INCOME STATEMENT) */}
          {accountingSubTab === 'income_statement' && (
            <div className="space-y-4">
              {/* Income Statement 4-KPIs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                    Penjualan Bersih (Net Sales)
                  </span>
                  <div className="text-xl font-black font-mono text-slate-900 dark:text-white mt-1">
                    {formatCurrency(dateFilteredIncome.netSales, settings.currency)}
                  </div>
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    Omzet Kotor {formatCurrency(dateFilteredIncome.grossSales)} - Diskon {formatCurrency(dateFilteredIncome.salesDiscounts)}
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                    Harga Pokok Penjualan (HPP)
                  </span>
                  <div className="text-xl font-black font-mono text-amber-600 dark:text-amber-400 mt-1">
                    {formatCurrency(dateFilteredIncome.costOfGoodsSold, settings.currency)}
                  </div>
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    Modal barang yang terjual pada periode ini
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                      Laba Kotor (Gross Profit)
                    </span>
                    <span className="px-1.5 py-0.2 rounded bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300 font-mono text-[10px] font-bold">
                      {dateFilteredIncome.grossProfitMarginPercent.toFixed(1)}% Margin
                    </span>
                  </div>
                  <div className="text-xl font-black font-mono text-teal-600 dark:text-teal-400 mt-1">
                    {formatCurrency(dateFilteredIncome.grossProfit, settings.currency)}
                  </div>
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    Penjualan Bersih dikurangi HPP Barang
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300">
                      Laba Bersih Operasional
                    </span>
                    <span className="px-1.5 py-0.2 rounded bg-emerald-200/80 dark:bg-emerald-900 text-emerald-900 dark:text-emerald-100 font-mono text-[10px] font-bold">
                      {dateFilteredIncome.netProfitMarginPercent.toFixed(1)}% Net
                    </span>
                  </div>
                  <div className="text-2xl font-black font-mono text-emerald-700 dark:text-emerald-400 mt-1">
                    {formatCurrency(dateFilteredIncome.netOperatingProfit, settings.currency)}
                  </div>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-1 block">
                    Setelah dikurangi seluruh beban operasional
                  </span>
                </div>
              </div>

              {/* Comprehensive Financial Statement Table */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xs">
                <div className="p-4 bg-slate-100/70 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                      Rincian Laporan Laba Rugi Komprehensif
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Periode: {formatPeriodLabel(datePreset, startDate, endDate)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsExpenseModalOpen(true)}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Catat Biaya Toko</span>
                  </button>
                </div>

                <div className="p-4 space-y-4 text-xs font-mono">
                  {/* I. PENDAPATAN */}
                  <div>
                    <div className="font-bold text-slate-800 dark:text-slate-200 text-xs font-sans border-b border-slate-200 dark:border-slate-800 pb-1 mb-2">
                      I. PENDAPATAN PENJUALAN RITEL (REVENUE)
                    </div>
                    <div className="space-y-1 pl-3">
                      <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800/40">
                        <span className="font-sans text-slate-700 dark:text-slate-300">4010 • Penjualan Kotor (Gross Sales)</span>
                        <span>{formatCurrency(dateFilteredIncome.grossSales, settings.currency)}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800/40 text-rose-600 dark:text-rose-400">
                        <span className="font-sans">4020 • Potongan Diskon, Voucher &amp; Member (-)</span>
                        <span>-{formatCurrency(dateFilteredIncome.salesDiscounts, settings.currency)}</span>
                      </div>
                      {dateFilteredIncome.salesReturns > 0 && (
                        <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800/40 text-rose-600 dark:text-rose-400">
                          <span className="font-sans">6030 • Retur Penjualan Konsumen (-)</span>
                          <span>-{formatCurrency(dateFilteredIncome.salesReturns, settings.currency)}</span>
                        </div>
                      )}
                      <div className="flex justify-between py-1.5 font-bold text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-800/50 px-2 rounded-lg">
                        <span className="font-sans">TOTAL PENJUALAN BERSIH (NET SALES)</span>
                        <span>{formatCurrency(dateFilteredIncome.netSales, settings.currency)}</span>
                      </div>
                    </div>
                  </div>

                  {/* II. HPP */}
                  <div>
                    <div className="font-bold text-slate-800 dark:text-slate-200 text-xs font-sans border-b border-slate-200 dark:border-slate-800 pb-1 mb-2">
                      II. HARGA POKOK PENJUALAN (HPP / COGS)
                    </div>
                    <div className="space-y-1 pl-3">
                      <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800/40 text-amber-600 dark:text-amber-400">
                        <span className="font-sans">5010 • Beban Pokok Penjualan (Modal Barang Terjual) (-)</span>
                        <span>-{formatCurrency(dateFilteredIncome.costOfGoodsSold, settings.currency)}</span>
                      </div>
                      <div className="flex justify-between py-1.5 font-bold text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/40 px-2 rounded-lg">
                        <span className="font-sans">LABA KOTOR TOKO (GROSS PROFIT)</span>
                        <span>{formatCurrency(dateFilteredIncome.grossProfit, settings.currency)} ({dateFilteredIncome.grossProfitMarginPercent.toFixed(1)}%)</span>
                      </div>
                    </div>
                  </div>

                  {/* III. BEBAN OPERASIONAL */}
                  <div>
                    <div className="font-bold text-slate-800 dark:text-slate-200 text-xs font-sans border-b border-slate-200 dark:border-slate-800 pb-1 mb-2">
                      III. BEBAN OPERASIONAL TOKO (OPEX)
                    </div>
                    <div className="space-y-1 pl-3">
                      {Object.entries(dateFilteredIncome.operatingExpenses.byCategory).map(([catKey, amount]) => {
                        if (amount <= 0) return null;
                        const label = EXPENSE_CATEGORY_LABELS[catKey as ExpenseCategory] || catKey;
                        return (
                          <div key={catKey} className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800/40 text-slate-700 dark:text-slate-300">
                            <span className="font-sans">6010 • Beban {label}</span>
                            <span>-{formatCurrency(amount, settings.currency)}</span>
                          </div>
                        );
                      })}

                      {dateFilteredIncome.operatingExpenses.cashShortExpense > 0 && (
                        <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800/40 text-rose-600 dark:text-rose-400">
                          <span className="font-sans">6020 • Beban Selisih Kurang Kas Tutup Shift Kasir</span>
                          <span>-{formatCurrency(dateFilteredIncome.operatingExpenses.cashShortExpense, settings.currency)}</span>
                        </div>
                      )}

                      <div className="flex justify-between py-1.5 font-bold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 px-2 rounded-lg">
                        <span className="font-sans">TOTAL BEBAN OPERASIONAL TOKO</span>
                        <span>-{formatCurrency(dateFilteredIncome.operatingExpenses.totalOperatingExpenses, settings.currency)}</span>
                      </div>
                    </div>
                  </div>

                  {/* IV. LABA BERSIH OPERASIONAL */}
                  <div className="pt-2">
                    <div className="flex justify-between py-3 px-4 font-black text-sm text-emerald-950 dark:text-emerald-100 bg-gradient-to-r from-emerald-100 via-teal-100 to-emerald-100 dark:from-emerald-900/60 dark:via-teal-900/40 dark:to-emerald-900/60 rounded-xl border border-emerald-300 dark:border-emerald-700">
                      <span className="font-sans">LABA BERSIH OPERASIONAL BERJALAN (NET PROFIT)</span>
                      <span className="text-base">{formatCurrency(dateFilteredIncome.netOperatingProfit, settings.currency)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 4: BUKU JURNAL UMUM (DOUBLE-ENTRY GENERAL LEDGER)          */}
      {/* ============================================================== */}
      {activeTab === 'journal' && (
        <div className="space-y-4">
          {/* Top Controls & Search Bar */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={journalSearch}
                onChange={(e) => setJournalSearch(e.target.value)}
                placeholder="Cari no. faktur / nota / memo jurnal..."
                className="w-full pl-9 pr-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            {/* Source Type Filter */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-bold shrink-0">Sumber:</span>
              <select
                value={journalSourceFilter}
                onChange={(e) => setJournalSourceFilter(e.target.value)}
                className="py-2 px-3 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-medium cursor-pointer"
              >
                <option value="all">Semua Entri Jurnal</option>
                <option value="sale">Penjualan Kasir</option>
                <option value="sales_return">Retur Penjualan</option>
                <option value="purchase_order">PO Supplier Masuk</option>
                <option value="shift_adjustment">Penyesuaian Tutup Shift</option>
                <option value="expense">Beban Operasional Kas</option>
                <option value="initial_balance">Modal Awal Toko</option>
              </select>
            </div>
          </div>

          {/* Date Filter Bar */}
          <DateFilterBar
            idPrefix="journal-date-filter"
            label="Filter Tanggal Buku Jurnal"
            preset={datePreset}
            startDate={startDate}
            endDate={endDate}
            onPresetChange={(newPreset, sDate, eDate) => {
              setDatePreset(newPreset);
              setStartDate(sDate);
              setEndDate(eDate);
            }}
            onDateChange={(sDate, eDate) => {
              setStartDate(sDate);
              setEndDate(eDate);
              setDatePreset('custom');
            }}
            totalFilteredCount={dateFilteredJournal.length}
            totalAllCount={journalEntries.length}
          />

          {/* Summary Mutasi Debit vs Kredit */}
          {(() => {
            const sumDebit = dateFilteredJournal.reduce((s, j) => s + j.totalDebit, 0);
            const sumCredit = dateFilteredJournal.reduce((s, j) => s + j.totalCredit, 0);
            const isAllBalanced = Math.abs(sumDebit - sumCredit) < 1;

            return (
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
                  <span className="text-[11px] font-bold text-slate-400">Total Transaksi Jurnal</span>
                  <div className="text-xl font-black font-mono text-indigo-600 dark:text-indigo-400 mt-1">
                    {dateFilteredJournal.length} Entri
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
                  <span className="text-[11px] font-bold text-slate-400">Total Mutasi Debit</span>
                  <div className="text-xl font-black font-mono text-slate-900 dark:text-white mt-1">
                    {formatCurrency(sumDebit, settings.currency)}
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
                  <span className="text-[11px] font-bold text-slate-400">Total Mutasi Kredit</span>
                  <div className="text-xl font-black font-mono text-slate-900 dark:text-white mt-1">
                    {formatCurrency(sumCredit, settings.currency)}
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 shadow-2xs flex flex-col justify-center">
                  <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300">Status Pembukuan</span>
                  <div className="flex items-center gap-1.5 font-bold text-emerald-700 dark:text-emerald-400 mt-1 text-xs">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span>{isAllBalanced ? 'SEIMBANG (Debit = Kredit)' : 'PERIKSA SELISIH'}</span>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Journal Entries List Table */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xs">
            <div className="p-3.5 bg-slate-100/70 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  Buku Jurnal Umum Berpasangan (Double-Entry Ledger)
                </h3>
              </div>
              <span className="text-xs text-slate-500 font-mono">
                {dateFilteredJournal.length} Transaksi Tercatat
              </span>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {dateFilteredJournal.length > 0 ? (
                dateFilteredJournal.map((entry) => {
                  const sourceBadge =
                    entry.sourceType === 'sale'
                      ? 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950 dark:text-blue-300'
                      : entry.sourceType === 'purchase_order'
                      ? 'bg-teal-100 text-teal-800 border-teal-200 dark:bg-teal-950 dark:text-teal-300'
                      : entry.sourceType === 'sales_return'
                      ? 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950 dark:text-amber-300'
                      : entry.sourceType === 'expense'
                      ? 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-950 dark:text-purple-300'
                      : 'bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-800 dark:text-slate-300';

                  return (
                    <div key={entry.id} className="p-3.5 hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors">
                      {/* Entry Header */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 pb-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border uppercase tracking-wider ${sourceBadge}`}>
                            {entry.sourceType.replace('_', ' ')}
                          </span>
                          <span className="font-bold text-xs font-mono text-slate-900 dark:text-white">
                            {entry.referenceNumber}
                          </span>
                          <span className="text-xs text-slate-600 dark:text-slate-400">
                            • {entry.description}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono shrink-0">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{formatDate(entry.date)}</span>
                          <span className="px-1.5 py-0.2 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold">
                            Balanced
                          </span>
                        </div>
                      </div>

                      {/* Entry Lines */}
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs font-mono">
                          <thead>
                            <tr className="text-slate-400 text-[10px] border-b border-slate-100 dark:border-slate-800">
                              <th className="text-left py-1 w-20">Kode</th>
                              <th className="text-left py-1">Nama Akun &amp; Keterangan</th>
                              <th className="text-right py-1 w-32">Debit</th>
                              <th className="text-right py-1 w-32">Kredit</th>
                            </tr>
                          </thead>
                          <tbody>
                            {entry.lines.map((line, idx) => (
                              <tr key={idx} className="border-b border-slate-100/50 dark:border-slate-800/30">
                                <td className="py-1 text-slate-500 font-semibold">{line.accountCode}</td>
                                <td className={`py-1 ${line.credit > 0 ? 'pl-6 text-slate-600 dark:text-slate-400' : 'text-slate-900 dark:text-slate-100 font-semibold'}`}>
                                  {line.accountName}
                                  {line.memo && <span className="text-[10px] text-slate-400 ml-2 font-normal italic font-sans">({line.memo})</span>}
                                </td>
                                <td className="text-right py-1 font-bold text-slate-900 dark:text-white">
                                  {line.debit > 0 ? formatCurrency(line.debit, settings.currency) : '-'}
                                </td>
                                <td className="text-right py-1 font-bold text-slate-900 dark:text-white">
                                  {line.credit > 0 ? formatCurrency(line.credit, settings.currency) : '-'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-8 text-center text-slate-400 text-xs italic">
                  Tidak ada data transaksi jurnal yang sesuai dengan filter tanggal atau kata kunci ini.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: INPUT BEBAN OPERASIONAL KAS KELUAR                     */}
      {/* ============================================================== */}
      {isExpenseModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Plus className="w-5 h-5" />
                <h3 className="font-bold text-sm">Catat Beban Kas Keluar (OpEx)</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsExpenseModalOpen(false)}
                className="p-1 rounded-lg hover:bg-white/20 text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateExpense} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                  Kategori Beban Operasional:
                </label>
                <select
                  value={newExpenseCategory}
                  onChange={(e) => setNewExpenseCategory(e.target.value as ExpenseCategory)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                >
                  <option value="listrik_air_internet">Listrik, Air &amp; Internet</option>
                  <option value="gaji_karyawan">Gaji &amp; Bonus Karyawan</option>
                  <option value="sewa_ruko">Sewa Tempat / Ruko</option>
                  <option value="perlengkapan_kantor">Perlengkapan &amp; Kantong Plastik</option>
                  <option value="pemeliharaan_toko">Pemeliharaan &amp; Kebersihan</option>
                  <option value="konsumsi_operasional">Konsumsi &amp; Logistik Staf</option>
                  <option value="lainnya">Beban Operasional Lainnya</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                  Keterangan Pengeluaran:
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Beli token listrik toko 6600VA..."
                  value={newExpenseDesc}
                  onChange={(e) => setNewExpenseDesc(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                  Nominal Pengeluaran (Rp):
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  placeholder="Contoh: 150000"
                  value={newExpenseAmount}
                  onChange={(e) => setNewExpenseAmount(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                  Sumber Dana Pembayaran:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <label className="flex items-center gap-2 p-2 rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800">
                    <input
                      type="radio"
                      name="source"
                      checked={newExpenseSource === 'cash_drawer'}
                      onChange={() => setNewExpenseSource('cash_drawer')}
                      className="text-indigo-600"
                    />
                    <span className="font-semibold text-slate-800 dark:text-slate-200">Kas di Laci Kasir</span>
                  </label>

                  <label className="flex items-center gap-2 p-2 rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800">
                    <input
                      type="radio"
                      name="source"
                      checked={newExpenseSource === 'bank_transfer'}
                      onChange={() => setNewExpenseSource('bank_transfer')}
                      className="text-indigo-600"
                    />
                    <span className="font-semibold text-slate-800 dark:text-slate-200">Transfer Bank</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                  Catatan Tambahan / No. Bukti Nota (Opsional):
                </label>
                <input
                  type="text"
                  placeholder="No. struk / faktur pembelian..."
                  value={newExpenseNotes}
                  onChange={(e) => setNewExpenseNotes(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              {expenseFormError && (
                <p className="text-rose-500 text-xs font-semibold">{expenseFormError}</p>
              )}

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsExpenseModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold cursor-pointer shadow-md shadow-indigo-600/20 active:scale-95"
                >
                  Simpan Beban &amp; Jurnal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Printable Report Modal */}
      <ReportPrintModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        defaultType={selectedReportType}
      />
    </div>
  );
};

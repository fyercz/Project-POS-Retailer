import React, { useState, useMemo, useDeferredValue, useEffect } from 'react';
import {
  Receipt,
  Search,
  Filter,
  Eye,
  RotateCcw,
  Ban,
  Calendar,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  Banknote,
  QrCode,
  Building2,
  PackageCheck,
  Undo2,
  FileText,
  UserCheck,
  Plus,
  Minus,
  Check,
  Cloud,
  CloudOff,
  RefreshCw,
  Database,
  ChevronLeft,
  ChevronRight,
  Server,
  Zap,
  ArrowRight,
} from 'lucide-react';
import { usePOSTransactions, usePOSUI } from '../../context/POSContext';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { Transaction, SalesReturn, SalesReturnItem } from '../../types';
import { ReportPrintModal } from '../ReportPrintModal';
import { DateFilterBar } from '../DateFilterBar';
import {
  DateFilterPreset,
  isDateWithinFilter,
  toLocalYMD,
  formatPeriodLabel,
} from '../../utils/dateFilters';

export const TransactionsView: React.FC = () => {
  const {
    transactions,
    setActiveReceipt,
    voidTransaction,
    salesReturns,
    processSalesReturn,
  } = usePOSTransactions();

  const {
    settings,
    pendingSyncCount,
    setIsSyncModalOpen,
    isOnline,
    setIsBackupRestoreOpen,
  } = usePOSUI();
  const [activeTab, setActiveTab] = useState<'sales' | 'returns'>('sales');
  const [search, setSearch] = useState('');
  const [methodFilter, setMethodFilter] = useState<string>('all');
  const [syncFilter, setSyncFilter] = useState<'all' | 'synced' | 'pending_sync'>('all');
  const [selectedTxForVoid, setSelectedTxForVoid] = useState<Transaction | null>(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // Date Filter State: Defaults to 'all' so that all transactions are immediately visible
  const [datePreset, setDatePreset] = useState<DateFilterPreset>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Return Modal State
  const [selectedTxForReturn, setSelectedTxForReturn] = useState<Transaction | null>(null);
  const [returnItemsState, setReturnItemsState] = useState<
    Array<{
      productId: string;
      productName: string;
      maxQty: number;
      returnQty: number;
      unitPrice: number;
      reason: string;
      restockToInventory: boolean;
    }>
  >([]);
  const [refundMethod, setRefundMethod] = useState<'cash' | 'transfer' | 'store_credit'>('cash');
  const [returnNote, setReturnNote] = useState('');

  const openReturnModal = (tx: Transaction) => {
    setSelectedTxForReturn(tx);
    setReturnItemsState(
      (tx.items || []).map((i) => ({
        productId: i.product?.id || (i as any).productId || '',
        productName: i.product?.name || (i as any).productName || 'Produk',
        maxQty: i.quantity || 1,
        returnQty: 0,
        unitPrice: i.unitPrice ?? i.product?.price ?? (i as any).price ?? 0,
        reason: 'Barang Cacat / Rusak Fisik',
        restockToInventory: false,
      }))
    );
    setRefundMethod('cash');
    setReturnNote('');
  };

  const handleUpdateItemReturnQty = (productId: string, delta: number) => {
    setReturnItemsState((prev) =>
      prev.map((item) => {
        if (item.productId === productId) {
          const newQty = Math.max(0, Math.min(item.maxQty, item.returnQty + delta));
          return { ...item, returnQty: newQty };
        }
        return item;
      })
    );
  };

  const handleUpdateItemReason = (productId: string, reason: string) => {
    setReturnItemsState((prev) =>
      prev.map((item) => (item.productId === productId ? { ...item, reason } : item))
    );
  };

  const handleToggleRestock = (productId: string) => {
    setReturnItemsState((prev) =>
      prev.map((item) =>
        item.productId === productId ? { ...item, restockToInventory: !item.restockToInventory } : item
      )
    );
  };

  const totalRefundCalculated = returnItemsState.reduce(
    (sum, item) => sum + item.returnQty * item.unitPrice,
    0
  );

  const handleConfirmSalesReturn = () => {
    if (!selectedTxForReturn) return;
    const activeReturnItems: SalesReturnItem[] = returnItemsState
      .filter((i) => i.returnQty > 0)
      .map((i) => ({
        productId: i.productId,
        productName: i.productName,
        quantity: i.returnQty,
        unitPrice: i.unitPrice,
        totalRefund: i.returnQty * i.unitPrice,
        reason: i.reason,
        restockToInventory: i.restockToInventory,
      }));

    if (activeReturnItems.length === 0) return;

    processSalesReturn({
      returnNumber: `RET-SLS-${Date.now().toString().slice(-6)}`,
      transactionId: selectedTxForReturn.id,
      invoiceNumber: selectedTxForReturn.invoiceNumber,
      customerName: selectedTxForReturn.customer?.name,
      items: activeReturnItems,
      totalRefundAmount: totalRefundCalculated,
      refundMethod,
      note: returnNote || 'Retur penjualan kasir',
      cashierName: selectedTxForReturn.cashierName || 'Kasir Aktif',
    });

    setSelectedTxForReturn(null);
  };

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const deferredSearch = useDeferredValue(search);

  // Server-side pagination & query state
  const [serverTransactions, setServerTransactions] = useState<Transaction[]>([]);
  const [serverTotalCount, setServerTotalCount] = useState<number>(0);
  const [serverTotalSales, setServerTotalSales] = useState<number>(0);
  const [serverTotalPages, setServerTotalPages] = useState<number>(1);
  const [serverHasNextPage, setServerHasNextPage] = useState<boolean>(false);
  const [serverHasPrevPage, setServerHasPrevPage] = useState<boolean>(false);
  const [serverNextCursor, setServerNextCursor] = useState<string | null>(null);
  const [activeCursor, setActiveCursor] = useState<string | undefined>(undefined);
  const [cursorStack, setCursorStack] = useState<string[]>([]);
  const [isServerLoading, setIsServerLoading] = useState<boolean>(false);
  const [paginationMode, setPaginationMode] = useState<'page' | 'cursor'>('page');
  const [isServerModeActive, setIsServerModeActive] = useState<boolean>(false);
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);

  // Reset page & cursor whenever search or filter changes
  useEffect(() => {
    setCurrentPage(1);
    setActiveCursor(undefined);
    setCursorStack([]);
  }, [deferredSearch, methodFilter, syncFilter, activeTab, startDate, endDate, pageSize]);

  // Fetch paginated transactions from server SQLite WAL endpoint
  useEffect(() => {
    if (activeTab !== 'sales') return;

    let isMounted = true;
    const fetchTransactions = async () => {
      setIsServerLoading(true);
      try {
        const params = new URLSearchParams();
        if (paginationMode === 'cursor' && activeCursor) {
          params.set('cursor', activeCursor);
        } else {
          params.set('page', currentPage.toString());
        }
        params.set('pageSize', pageSize.toString());

        if (startDate) params.set('startDate', startDate);
        if (endDate) params.set('endDate', endDate);
        if (methodFilter && methodFilter !== 'all') params.set('paymentMethod', methodFilter);
        if (syncFilter && syncFilter !== 'all') params.set('syncStatus', syncFilter);
        if (deferredSearch.trim()) params.set('search', deferredSearch.trim());

        const res = await fetch(`/api/pos/transactions?${params.toString()}`);
        if (!res.ok) throw new Error('Server returned non-200');

        const data = await res.json();
        if (!isMounted) return;

        if (data.success && Array.isArray(data.transactions) && data.transactions.length > 0) {
          setServerTransactions(data.transactions);
          setServerTotalCount(data.totalCount ?? data.transactions.length);
          setServerTotalSales(data.totalSalesAmount ?? 0);
          setServerTotalPages(data.totalPages ?? 1);
          setServerHasNextPage(Boolean(data.hasNextPage));
          setServerHasPrevPage(Boolean(data.hasPrevPage));
          setServerNextCursor(data.nextCursor ?? null);
          setIsServerModeActive(true);
        } else {
          setIsServerModeActive(false);
          // If server database is empty but client has local transactions, sync them to server SQLite
          if (data.success && Array.isArray(data.transactions) && data.transactions.length === 0 && transactions.length > 0) {
            fetch('/api/pos/transactions/sync', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ transactions }),
            }).catch(() => {});
          }
        }
      } catch {
        if (!isMounted) return;
        // Seamless fallback to client-side data when offline or network unavailable
        setIsServerModeActive(false);
      } finally {
        if (isMounted) setIsServerLoading(false);
      }
    };

    fetchTransactions();

    return () => {
      isMounted = false;
    };
  }, [
    activeTab,
    currentPage,
    pageSize,
    paginationMode,
    activeCursor,
    startDate,
    endDate,
    methodFilter,
    syncFilter,
    deferredSearch,
    refreshTrigger,
  ]);

  const filteredTransactions = useMemo(() => {
    const query = deferredSearch.trim().toLowerCase();
    return transactions.filter((tx) => {
      const invoiceMatch = !query || (tx.invoiceNumber && tx.invoiceNumber.toLowerCase().includes(query));
      const customerMatch = !query || (tx.customer?.name && tx.customer.name.toLowerCase().includes(query));
      const itemMatch =
        !query ||
        (tx.items || []).some((i) => {
          const name = i?.product?.name || (i as any)?.productName || '';
          return name.toLowerCase().includes(query);
        });
      const searchMatch = !query || invoiceMatch || customerMatch || itemMatch;

      const methodMatch = methodFilter === 'all' || tx.payment?.method === methodFilter;

      const syncMatch =
        syncFilter === 'all' ||
        (syncFilter === 'synced' && (tx.syncStatus === 'synced' || !tx.syncStatus)) ||
        (syncFilter === 'pending_sync' && tx.syncStatus === 'pending_sync');

      const dateMatch = isDateWithinFilter(tx.createdAt, startDate, endDate);

      return searchMatch && methodMatch && syncMatch && dateMatch;
    });
  }, [transactions, deferredSearch, methodFilter, syncFilter, startDate, endDate]);

  const filteredReturns = useMemo(() => {
    const query = deferredSearch.trim().toLowerCase();
    return salesReturns.filter((r) => {
      const queryMatch =
        !query ||
        (r.returnNumber && r.returnNumber.toLowerCase().includes(query)) ||
        (r.invoiceNumber && r.invoiceNumber.toLowerCase().includes(query)) ||
        (r.customerName && r.customerName.toLowerCase().includes(query)) ||
        (r.items || []).some((i) => i.productName && i.productName.toLowerCase().includes(query));

      const dateMatch = isDateWithinFilter(r.createdAt, startDate, endDate);

      return queryMatch && dateMatch;
    });
  }, [salesReturns, deferredSearch, startDate, endDate]);

  // Active items and financial metrics based on Server vs Local fallback
  const activeTotalItems = activeTab === 'sales'
    ? (isServerModeActive && serverTotalCount > 0 ? serverTotalCount : filteredTransactions.length)
    : filteredReturns.length;

  const totalPeriodRevenue = activeTab === 'sales'
    ? (isServerModeActive && serverTotalCount > 0
        ? serverTotalSales
        : filteredTransactions.reduce(
            (sum, tx) => (tx.status !== 'void' ? sum + (Number(tx.finalTotal ?? (tx as any).total) || 0) : sum),
            0
          ))
    : 0;

  const totalPeriodRefund = useMemo(() => {
    return filteredReturns.reduce(
      (sum, ret) => sum + (Number(ret.totalRefundAmount) || 0),
      0
    );
  }, [filteredReturns]);

  const totalPages = activeTab === 'sales'
    ? (isServerModeActive && serverTotalCount > 0 ? serverTotalPages : Math.max(1, Math.ceil(activeTotalItems / pageSize)))
    : Math.max(1, Math.ceil(filteredReturns.length / pageSize));

  // Displayed Sales: directly uses serverTransactions in server mode when non-empty, or slices local array in fallback
  const displayedSales = useMemo(() => {
    if (activeTab !== 'sales') return [];
    if (isServerModeActive && serverTransactions.length > 0) {
      return serverTransactions;
    }
    const start = (currentPage - 1) * pageSize;
    return filteredTransactions.slice(start, start + pageSize);
  }, [activeTab, isServerModeActive, serverTransactions, filteredTransactions, currentPage, pageSize]);

  const paginatedReturns = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredReturns.slice(start, start + pageSize);
  }, [filteredReturns, currentPage, pageSize]);

  // Cursor navigation handlers
  const handleNextCursor = () => {
    if (!serverNextCursor) return;
    setCursorStack((prev) => [...prev, activeCursor || '']);
    setActiveCursor(serverNextCursor);
  };

  const handlePrevCursor = () => {
    if (cursorStack.length === 0) return;
    const prevCursor = cursorStack[cursorStack.length - 1];
    setCursorStack((prev) => prev.slice(0, -1));
    setActiveCursor(prevCursor || undefined);
  };

  const handleResetCursor = () => {
    setActiveCursor(undefined);
    setCursorStack([]);
    setCurrentPage(1);
  };

  const getMethodIcon = (method: string) => {
    switch (method) {
      case 'cash':
        return <Banknote className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />;
      case 'qris':
        return <QrCode className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" />;
      case 'card':
        return <CreditCard className="w-3.5 h-3.5 text-purple-500 dark:text-purple-400" />;
      default:
        return <Building2 className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />;
    }
  };

  const handleConfirmVoid = async () => {
    if (selectedTxForVoid) {
      voidTransaction(selectedTxForVoid.id);
      try {
        await fetch('/api/pos/transactions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...selectedTxForVoid, status: 'void' }),
        });
      } catch {}
      setSelectedTxForVoid(null);
      setRefreshTrigger((prev) => prev + 1);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-100 dark:bg-slate-950 overflow-hidden select-none">
      {/* Top Filter Bar */}
      <div className="p-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-center gap-4 flex-wrap">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Receipt className="w-5 h-5 text-emerald-500 dark:text-emerald-400" />
              <span>Riwayat Nota & Retur Kasir</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {transactions.length} transaksi selesai • {salesReturns.length} retur tercatat
            </p>
          </div>

          {/* Ergonomic View Toggle Tabs */}
          <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs gap-0.5">
            <button
              onClick={() => setActiveTab('sales')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'sales'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Receipt className="w-3.5 h-3.5 text-emerald-500" />
              <span>Semua Nota</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                {transactions.length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('returns')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'returns'
                  ? 'bg-rose-500 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-rose-500 dark:hover:text-rose-400'
              }`}
            >
              <RotateCcw className="w-3.5 h-3.5 text-rose-300" />
              <span>Retur & Refund</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                activeTab === 'returns' ? 'bg-rose-700 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
              }`}>
                {salesReturns.length}
              </span>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Search */}
          <div className="relative w-full sm:w-auto flex-1 sm:flex-initial">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari no. nota, pelanggan, barang..."
              className="w-full sm:w-64 pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Payment Method Filter */}
          {activeTab === 'sales' && (
            <>
              <select
                value={methodFilter}
                onChange={(e) => setMethodFilter(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none cursor-pointer"
              >
                <option value="all">Semua Cara Bayar</option>
                <option value="cash">💵 Tunai (Cash)</option>
                <option value="qris">📱 QRIS EDC BRI</option>
                <option value="card">💳 Kartu EDC BRI</option>
              </select>

              {/* Cloud Sync Filter - Desktop only */}
              <select
                id="filter-sync-status"
                value={syncFilter}
                onChange={(e) => setSyncFilter(e.target.value as any)}
                className="hidden md:inline-block px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none cursor-pointer"
              >
                <option value="all">Semua Status Cloud</option>
                <option value="synced">☁️ Tersinkron Cloud</option>
                <option value="pending_sync">⏳ Menunggu Sinkron ({pendingSyncCount})</option>
              </select>

              {/* Quick Sync Button if pending items */}
              {pendingSyncCount > 0 && (
                <button
                  id="btn-quick-sync-header"
                  onClick={() => setIsSyncModalOpen(true)}
                  className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors animate-pulse"
                  title="Ada transaksi offline di antrean lokal! Klik untuk sinkronkan."
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Sync ({pendingSyncCount})</span>
                </button>
              )}
            </>
          )}

          <button
            onClick={() => setIsPrintModalOpen(true)}
            className="hidden sm:flex px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 font-bold text-xs items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
          >
            <FileText className="w-3.5 h-3.5 text-emerald-500" />
            <span>Cetak / Ekspor</span>
          </button>

          <button
            id="btn-transactions-backup-restore"
            onClick={() => setIsBackupRestoreOpen(true)}
            className="hidden md:flex px-3 py-1.5 rounded-xl border border-emerald-300 dark:border-emerald-700 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 font-bold text-xs items-center gap-1.5 cursor-pointer shadow-xs transition-colors active:scale-95"
            title="Cadangkan Seluruh Riwayat Transaksi & Database Toko (Backup & Restore - F9)"
          >
            <Database className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Backup &amp; Restore</span>
          </button>
        </div>
      </div>

      {/* Date Filter Bar */}
      <DateFilterBar
        idPrefix="transactions-date-filter"
        label={activeTab === 'sales' ? 'Filter Tanggal Nota' : 'Filter Tanggal Retur'}
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
        totalFilteredCount={activeTotalItems}
        totalAllCount={activeTab === 'sales' ? transactions.length : salesReturns.length}
        summaryBadge={
          activeTab === 'sales' ? (
            <div className="flex items-center gap-2">
              <span className="text-slate-500 dark:text-slate-400 text-[11px]">
                Total Omzet Periode:
              </span>
              <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-xs">
                {formatCurrency(totalPeriodRevenue, settings.currency)}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-slate-500 dark:text-slate-400 text-[11px]">
                Total Refund Periode:
              </span>
              <span className="font-mono font-bold text-rose-600 dark:text-rose-400 text-xs">
                {formatCurrency(totalPeriodRefund, settings.currency)}
              </span>
            </div>
          )
        }
      />

      {/* Transactions Table / List */}
      <div className="flex-1 p-4 overflow-y-auto">
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
          {activeTab === 'sales' ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-200 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-4">No. Invoice / Waktu</th>
                    <th className="py-3 px-4">Detail Belanja</th>
                    <th className="py-3 px-4">Pelanggan / Member</th>
                    <th className="py-3 px-4">Metode Bayar</th>
                    <th className="py-3 px-4 text-right">Total Transaksi</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Aksi & Retur</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {isServerLoading ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <RefreshCw className="w-6 h-6 text-emerald-500 animate-spin" />
                          <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                            Memuat data transaksi dari server SQLite (WAL Mode)...
                          </span>
                        </div>
                      </td>
                    </tr>
                  ) : displayedSales.length > 0 ? (
                    displayedSales.map((tx) => {
                      const isVoid = tx.status === 'void';
                      const isRefunded = tx.status === 'refunded' || (tx.returnedAmount && tx.returnedAmount > 0);
                      return (
                        <tr
                          key={tx.id}
                          className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors ${
                            isVoid ? 'opacity-60 bg-rose-50/20 dark:bg-rose-950/10' : ''
                          }`}
                        >
                          {/* Invoice & Time */}
                          <td className="py-3 px-4">
                            <div className="font-bold font-mono text-slate-900 dark:text-white">
                              {tx.invoiceNumber}
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                              <Calendar className="w-3 h-3 text-slate-400" />
                              {formatDate(tx.createdAt)}
                            </div>
                          </td>

                          {/* Items */}
                          <td className="py-3 px-4">
                            <div className="font-semibold text-slate-800 dark:text-slate-200">
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 mr-1.5">
                                Penjualan
                              </span>
                              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                                ({(tx.items || []).length} item)
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-600 dark:text-slate-300 truncate max-w-xs mt-0.5">
                              {(tx.items || []).map((i) => `${i.quantity || 1}x ${i.product?.name || (i as any).productName || 'Produk'}`).join(', ')}
                            </p>
                          </td>

                          {/* Customer */}
                          <td className="py-3 px-4">
                            {tx.customer ? (
                              <div>
                                <p className="font-semibold text-slate-900 dark:text-slate-100">
                                  {tx.customer.name}
                                </p>
                                <span className="text-[10px] text-amber-600 dark:text-amber-400 font-mono">
                                  Tier: {tx.customer.tier}
                                </span>
                              </div>
                            ) : (
                              <span className="text-slate-400 dark:text-slate-400 italic">Pelanggan Umum</span>
                            )}
                          </td>

                          {/* Payment */}
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-1.5 font-medium text-slate-800 dark:text-slate-200">
                              {getMethodIcon(tx.payment?.method || 'cash')}
                              <span className="uppercase font-semibold">{tx.payment?.method || 'cash'}</span>
                            </div>
                            {tx.payment?.referenceCode && (
                              <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono truncate max-w-[110px]">
                                {tx.payment.referenceCode}
                              </div>
                            )}
                          </td>

                          {/* Total Amount */}
                          <td className="py-3 px-4 text-right">
                            <div className="font-bold font-mono text-slate-900 dark:text-emerald-400 text-sm">
                              {formatCurrency(Number(tx.finalTotal ?? (tx as any).total) || 0, settings.currency)}
                            </div>
                            {(tx.discountAmount || 0) > 0 && (
                              <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono">
                                Diskon: -{formatCurrency(tx.discountAmount, settings.currency)}
                                {tx.customerDiscount ? ` • ${tx.customerDiscount.badge}` : ''}
                              </div>
                            )}
                            {tx.returnedAmount && tx.returnedAmount > 0 ? (
                              <div className="text-[10px] text-rose-600 dark:text-rose-400 font-mono font-bold">
                                Retur: -{formatCurrency(tx.returnedAmount, settings.currency)}
                              </div>
                            ) : null}
                          </td>

                          {/* Status */}
                          <td className="py-3 px-4 text-center">
                            {isVoid ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
                                BATAL / VOID
                              </span>
                            ) : isRefunded ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                                ADA RETUR
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                                SELESAI
                              </span>
                            )}

                            {/* Cloud Sync Status Indicator */}
                            {tx.syncStatus === 'pending_sync' ? (
                              <div
                                onClick={() => setIsSyncModalOpen(true)}
                                className="mt-1 flex items-center justify-center gap-1 text-[10px] font-bold text-amber-600 dark:text-amber-400 cursor-pointer hover:underline"
                                title="Transaksi disimpan lokal, menunggu koneksi cloud untuk diunggah"
                              >
                                <CloudOff className="w-3 h-3" />
                                <span>Antrean Lokal</span>
                              </div>
                            ) : (
                              <div className="mt-1 flex items-center justify-center gap-1 text-[10px] text-slate-400 dark:text-slate-500">
                                <Cloud className="w-3 h-3 text-emerald-500" />
                                <span>Cloud Synced</span>
                              </div>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Struk Kasir */}
                              <button
                                onClick={() => setActiveReceipt(tx)}
                                className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-emerald-500 hover:text-slate-950 dark:hover:bg-emerald-500 dark:hover:text-slate-950 text-slate-700 dark:text-slate-200 flex items-center gap-1 cursor-pointer transition-colors font-semibold"
                                title="Lihat & Cetak Struk"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>Struk</span>
                              </button>

                              {/* Retur Penjualan Button */}
                              {!isVoid && (
                                <button
                                  onClick={() => openReturnModal(tx)}
                                  className="px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-500 hover:text-slate-950 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 flex items-center gap-1 cursor-pointer transition-colors font-semibold"
                                  title="Retur Item Penjualan"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" />
                                  <span>Retur</span>
                                </button>
                              )}

                              {/* Void Button */}
                              {!isVoid && (
                                <button
                                  onClick={() => setSelectedTxForVoid(tx)}
                                  className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer transition-colors"
                                  title="Batalkan / Void Transaksi"
                                >
                                  <Ban className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400 dark:text-slate-400">
                        {transactions.length > 0 ? (
                          <div className="max-w-md mx-auto space-y-2">
                            <Receipt className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600 mb-1" />
                            <p className="font-semibold text-slate-700 dark:text-slate-200">
                              Tidak ada transaksi nota pada periode ini ({formatPeriodLabel(datePreset, startDate, endDate)}).
                            </p>
                            <p className="text-xs text-slate-500">
                              Terdapat {transactions.length} transaksi nota di database toko pada tanggal lainnya.
                            </p>
                            <button
                              type="button"
                              onClick={() => {
                                setDatePreset('all');
                                setStartDate('');
                                setEndDate('');
                              }}
                              className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs cursor-pointer inline-flex items-center gap-1.5 shadow-xs transition"
                            >
                              <span>Tampilkan Seluruh Nota ({transactions.length})</span>
                            </button>
                          </div>
                        ) : (
                          <div>Tidak ada transaksi yang cocok dengan filter pencarian.</div>
                        )}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            /* Sales Returns Table */
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-200 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-4">No. Retur / Waktu</th>
                    <th className="py-3 px-4">Referensi Invoice</th>
                    <th className="py-3 px-4">Produk Yang Diretur</th>
                    <th className="py-3 px-4">Metode Pengembalian Dana</th>
                    <th className="py-3 px-4 text-right">Total Refund</th>
                    <th className="py-3 px-4">Alasan & Catatan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {paginatedReturns.length > 0 ? (
                    paginatedReturns.map((ret) => (
                      <tr key={ret.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-bold font-mono text-rose-600 dark:text-rose-400">
                            {ret.returnNumber}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            {formatDate(ret.createdAt)}
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                            {ret.invoiceNumber}
                          </span>
                          {ret.customerName && (
                            <div className="text-[11px] text-slate-500 dark:text-slate-300">
                              Cust: {ret.customerName}
                            </div>
                          )}
                        </td>

                        <td className="py-3 px-4">
                          <div className="space-y-1">
                            {(ret.items || []).map((i, idx) => (
                              <div key={idx} className="flex items-center gap-2">
                                <span className="font-bold text-slate-800 dark:text-slate-100">
                                  {i.quantity}x {i.productName}
                                </span>
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono">
                                  @{formatCurrency(i.unitPrice, settings.currency)}
                                </span>
                                {i.restockToInventory ? (
                                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                                    (Restock)
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-rose-500 dark:text-rose-400 font-semibold">
                                    (Bad Stock)
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-semibold uppercase text-[11px]">
                            {ret.refundMethod === 'cash' && <Banknote className="w-3.5 h-3.5 text-emerald-500" />}
                            {ret.refundMethod === 'transfer' && <Building2 className="w-3.5 h-3.5 text-blue-500" />}
                            {ret.refundMethod === 'store_credit' && <CheckCircle2 className="w-3.5 h-3.5 text-purple-500" />}
                            <span>
                              {ret.refundMethod === 'cash'
                                ? 'Uang Tunai'
                                : ret.refundMethod === 'transfer'
                                ? 'Transfer Bank'
                                : 'Saldo Toko'}
                            </span>
                          </span>
                        </td>

                        <td className="py-3 px-4 text-right">
                          <span className="font-mono font-black text-rose-600 dark:text-rose-400 text-sm">
                            {formatCurrency(Number(ret.totalRefundAmount) || 0, settings.currency)}
                          </span>
                        </td>

                        <td className="py-3 px-4">
                          <p className="text-xs text-slate-700 dark:text-slate-200 font-medium">
                            {ret.note || (ret.items || []).map((i) => i.reason).join(', ')}
                          </p>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400">
                            Kasir: {ret.cashierName}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400 dark:text-slate-400">
                        {salesReturns.length > 0 ? (
                          <div className="max-w-md mx-auto space-y-2">
                            <RotateCcw className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600 mb-1" />
                            <p className="font-semibold text-slate-700 dark:text-slate-200">
                              Tidak ada data retur kasir pada periode ini ({formatPeriodLabel(datePreset, startDate, endDate)}).
                            </p>
                            <p className="text-xs text-slate-500">
                              Terdapat {salesReturns.length} retur kasir di database toko pada tanggal lainnya.
                            </p>
                            <button
                              type="button"
                              onClick={() => {
                                setDatePreset('all');
                                setStartDate('');
                                setEndDate('');
                              }}
                              className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs cursor-pointer inline-flex items-center gap-1.5 shadow-xs transition"
                            >
                              <span>Tampilkan Seluruh Retur ({salesReturns.length})</span>
                            </button>
                          </div>
                        ) : (
                          <div>Belum ada riwayat retur penjualan tercatat.</div>
                        )}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Toolbar */}
          {activeTotalItems > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-slate-50 dark:bg-slate-850 border-t border-slate-200 dark:border-slate-800 text-xs">
              <div className="flex items-center gap-2.5 flex-wrap text-slate-500 dark:text-slate-400">
                {activeTab === 'sales' && (
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      isServerModeActive
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                        : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                    }`}
                  >
                    <Server className="w-3 h-3 text-blue-500" />
                    <span>{isServerModeActive ? 'Server-Side SQLite WAL' : 'Offline Cache (IndexedDB)'}</span>
                  </span>
                )}

                {/* Mode Selector for Sales */}
                {activeTab === 'sales' && isServerModeActive && (
                  <div className="hidden sm:inline-flex p-0.5 rounded-lg bg-slate-200/80 dark:bg-slate-750 text-[10px] font-bold">
                    <button
                      type="button"
                      onClick={() => {
                        setPaginationMode('page');
                        handleResetCursor();
                      }}
                      className={`px-2 py-0.5 rounded-md transition cursor-pointer ${
                        paginationMode === 'page'
                          ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      Mode Halaman
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPaginationMode('cursor');
                        handleResetCursor();
                      }}
                      className={`px-2 py-0.5 rounded-md transition cursor-pointer ${
                        paginationMode === 'cursor'
                          ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-2xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      Mode Cursor
                    </button>
                  </div>
                )}

                <span>
                  Menampilkan{' '}
                  <strong className="text-slate-800 dark:text-slate-200 font-mono">
                    {paginationMode === 'cursor' && activeTab === 'sales'
                      ? displayedSales.length
                      : `${Math.min((currentPage - 1) * pageSize + 1, activeTotalItems)} - ${Math.min(currentPage * pageSize, activeTotalItems)}`}
                  </strong>{' '}
                  dari <strong className="text-slate-800 dark:text-slate-200 font-mono">{activeTotalItems}</strong> data
                </span>

                <span className="text-slate-300 dark:text-slate-700">|</span>
                <label className="flex items-center gap-1.5">
                  <span className="text-[11px]">Baris:</span>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setCurrentPage(1);
                      handleResetCursor();
                    }}
                    className="px-2 py-0.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-xs focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                  >
                    <option value={15}>15</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </label>
              </div>

              {/* Navigation Controls */}
              {activeTab === 'sales' && paginationMode === 'cursor' && isServerModeActive ? (
                /* Cursor-Based Navigation Toolbar */
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={handleResetCursor}
                    disabled={!activeCursor && cursorStack.length === 0}
                    className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-750 disabled:opacity-40 disabled:cursor-not-allowed text-[11px] font-semibold transition cursor-pointer shadow-2xs"
                    title="Kembali ke urutan data teratas"
                  >
                    Awal
                  </button>

                  <button
                    onClick={handlePrevCursor}
                    disabled={cursorStack.length === 0}
                    className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-750 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 font-medium transition cursor-pointer shadow-2xs"
                    title="Cursor Sebelumnya"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    <span>Sebelumnya</span>
                  </button>

                  <span className="px-2 font-mono font-bold text-[11px] text-slate-700 dark:text-slate-300 bg-slate-200/60 dark:bg-slate-800 py-1 rounded-lg">
                    {activeCursor ? 'Cursor Berjalan' : 'Halaman Awal'}
                  </span>

                  <button
                    onClick={handleNextCursor}
                    disabled={!serverNextCursor}
                    className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-750 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 font-medium transition cursor-pointer shadow-2xs"
                    title="Muat data lebih banyak dengan cursor"
                  >
                    <span>Berikutnya</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                /* Offset Page-Based Navigation Toolbar */
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage <= 1}
                    className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-750 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 font-medium transition cursor-pointer shadow-2xs"
                    title="Halaman Sebelumnya"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Prev</span>
                  </button>
                  <span className="px-2 font-mono font-bold text-slate-800 dark:text-slate-200 text-xs">
                    {currentPage} / {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage >= totalPages}
                    className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-750 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 font-medium transition cursor-pointer shadow-2xs"
                    title="Halaman Berikutnya"
                  >
                    <span className="hidden sm:inline">Next</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Interactive Sales Return Modal */}
      {selectedTxForReturn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="w-full max-w-2xl rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-5 max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                  <RotateCcw className="w-5 h-5 text-amber-500" />
                  <span>Proses Retur Penjualan (Customer Return)</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-300">
                  Invoice Ref: <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{selectedTxForReturn.invoiceNumber}</span> • Customer: {selectedTxForReturn.customer?.name || 'Pelanggan Umum'}
                </p>
              </div>
              <button
                onClick={() => setSelectedTxForReturn(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Return Items Selector List */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider block">
                Pilih Item & Jumlah Yang Diretur:
              </span>

              {returnItemsState.map((item) => (
                <div
                  key={item.productId}
                  className={`p-3 rounded-xl border transition-colors space-y-2.5 ${
                    item.returnQty > 0
                      ? 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800'
                      : 'bg-slate-50 dark:bg-slate-850 border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <h4 className="font-bold text-xs text-slate-900 dark:text-white">
                        {item.productName}
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                        Beli: {item.maxQty} • Harga: {formatCurrency(item.unitPrice, settings.currency)}
                      </p>
                    </div>

                    {/* Qty Stepper */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleUpdateItemReturnQty(item.productId, -1)}
                        disabled={item.returnQty <= 0}
                        className="w-7 h-7 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-100 flex items-center justify-center font-bold disabled:opacity-30 cursor-pointer"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="w-8 text-center font-mono font-bold text-sm text-slate-900 dark:text-white">
                        {item.returnQty}
                      </span>
                      <button
                        onClick={() => handleUpdateItemReturnQty(item.productId, 1)}
                        disabled={item.returnQty >= item.maxQty}
                        className="w-7 h-7 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center font-bold disabled:opacity-30 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {item.returnQty > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-amber-200/60 dark:border-amber-900/60 text-xs">
                      {/* Reason */}
                      <div>
                        <label className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold block mb-1">
                          Alasan Retur:
                        </label>
                        <select
                          value={item.reason}
                          onChange={(e) => handleUpdateItemReason(item.productId, e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs focus:outline-none"
                        >
                          <option value="Barang Cacat / Rusak Fisik">Barang Cacat / Rusak Fisik</option>
                          <option value="Kadaluarsa / Near Expired">Kadaluarsa / Near Expired</option>
                          <option value="Salah Varian / Salah Beli">Salah Varian / Salah Beli</option>
                          <option value="Kemasan Terbuka / Bocor">Kemasan Terbuka / Bocor</option>
                          <option value="Pelanggan Berubah Pikiran">Pelanggan Berubah Pikiran</option>
                        </select>
                      </div>

                      {/* Restock Toggle */}
                      <div className="flex items-center gap-2 pt-4">
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={item.restockToInventory}
                            onChange={() => handleToggleRestock(item.productId)}
                            className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 cursor-pointer"
                          />
                          <span className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                            Kembalikan ke stok etalase (Restock)
                          </span>
                        </label>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Refund Options & Total Summary */}
            <div className="p-3.5 bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {/* Refund Method */}
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-200 block mb-1">
                    Metode Pengembalian Dana:
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { id: 'cash', label: 'Tunai' },
                      { id: 'transfer', label: 'Transfer' },
                      { id: 'store_credit', label: 'Saldo Toko' },
                    ].map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setRefundMethod(m.id as any)}
                        className={`py-1.5 px-2 rounded-lg text-xs font-semibold cursor-pointer border transition-colors text-center ${
                          refundMethod === m.id
                            ? 'bg-amber-500 text-slate-950 border-amber-600 font-bold'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Note */}
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-200 block mb-1">
                    Catatan Kasir:
                  </label>
                  <input
                    type="text"
                    value={returnNote}
                    onChange={(e) => setReturnNote(e.target.value)}
                    placeholder="Contoh: Barang diganti uang cash oleh SPV..."
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs focus:outline-none"
                  />
                </div>
              </div>

              {/* Total Refund Indicator */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800 font-mono">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Total Nilai Refund Yang Diberikan:
                </span>
                <span className="text-base font-black text-rose-600 dark:text-rose-400">
                  {formatCurrency(totalRefundCalculated, settings.currency)}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setSelectedTxForReturn(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleConfirmSalesReturn}
                disabled={totalRefundCalculated <= 0}
                className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 font-bold text-xs cursor-pointer shadow-md transition-all active:scale-95"
              >
                Konfirmasi & Proses Retur
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Void Confirmation Modal */}
      {selectedTxForVoid && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 shadow-2xl space-y-4">
            <div className="w-10 h-10 rounded-full bg-rose-100 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div className="text-center">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">Batalkan / Void Transaksi?</h3>
              <p className="text-xs text-slate-500 dark:text-slate-300 mt-1">
                Apakah Anda yakin ingin membatalkan transaksi{' '}
                <span className="font-mono font-bold text-slate-800 dark:text-slate-100">
                  {selectedTxForVoid.invoiceNumber}
                </span>{' '}
                ({formatCurrency(selectedTxForVoid.finalTotal, settings.currency)})?
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setSelectedTxForVoid(null)}
                className="flex-1 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={handleConfirmVoid}
                className="flex-1 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold cursor-pointer"
              >
                Konfirmasi Void
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Printable Report Modal */}
      <ReportPrintModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        defaultType="transactions"
      />
    </div>
  );
};

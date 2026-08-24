import React, { useState } from 'react';
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
} from 'lucide-react';
import { usePOS } from '../../context/POSContext';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { Transaction, SalesReturn, SalesReturnItem } from '../../types';
import { ReportPrintModal } from '../ReportPrintModal';

export const TransactionsView: React.FC = () => {
  const { transactions, setActiveReceipt, voidTransaction, settings, salesReturns, processSalesReturn } = usePOS();
  const [activeTab, setActiveTab] = useState<'sales' | 'returns'>('sales');
  const [search, setSearch] = useState('');
  const [methodFilter, setMethodFilter] = useState<string>('all');
  const [selectedTxForVoid, setSelectedTxForVoid] = useState<Transaction | null>(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

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
      tx.items.map((i) => ({
        productId: i.product.id,
        productName: i.product.name,
        maxQty: i.quantity,
        returnQty: 0,
        unitPrice: i.unitPrice,
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

  const filteredTransactions = transactions.filter((tx) => {
    const query = search.toLowerCase();
    const invoiceMatch = tx.invoiceNumber.toLowerCase().includes(query);
    const customerMatch = tx.customer?.name.toLowerCase().includes(query);
    const itemMatch = tx.items.some((i) => i.product.name.toLowerCase().includes(query));
    const searchMatch = !query || invoiceMatch || customerMatch || itemMatch;

    const methodMatch = methodFilter === 'all' || tx.payment.method === methodFilter;

    return searchMatch && methodMatch;
  });

  const filteredReturns = salesReturns.filter((r) => {
    const query = search.toLowerCase();
    return (
      r.returnNumber.toLowerCase().includes(query) ||
      r.invoiceNumber.toLowerCase().includes(query) ||
      (r.customerName && r.customerName.toLowerCase().includes(query)) ||
      r.items.some((i) => i.productName.toLowerCase().includes(query))
    );
  });

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

  const handleConfirmVoid = () => {
    if (selectedTxForVoid) {
      voidTransaction(selectedTxForVoid.id);
      setSelectedTxForVoid(null);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-100 dark:bg-slate-950 overflow-hidden select-none">
      {/* Top Filter Bar */}
      <div className="p-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Receipt className="w-5 h-5 text-emerald-500 dark:text-emerald-400" />
              <span>Riwayat Transaksi & Retur Penjualan</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-300">
              {transactions.length} transaksi ritel • {salesReturns.length} retur tercatat
            </p>
          </div>

          {/* View Toggle Tabs */}
          <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setActiveTab('sales')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                activeTab === 'sales'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Semua Penjualan ({transactions.length})
            </button>
            <button
              onClick={() => setActiveTab('returns')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'returns'
                  ? 'bg-rose-500 text-white shadow-xs'
                  : 'text-slate-500 dark:text-slate-300 hover:text-rose-400'
              }`}
            >
              <RotateCcw className="w-3 h-3" />
              <span>Retur Penjualan ({salesReturns.length})</span>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari no. struk, customer, produk..."
              className="pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 w-64"
            />
          </div>

          {/* Payment Method Filter */}
          {activeTab === 'sales' && (
            <select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
              className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none cursor-pointer"
            >
              <option value="all">Semua Metode Pembayaran</option>
              <option value="cash">Tunai (Cash)</option>
              <option value="qris">QRIS</option>
              <option value="card">Mesin EDC / Kartu</option>
              <option value="transfer">Transfer Bank</option>
            </select>
          )}

          <button
            onClick={() => setIsPrintModalOpen(true)}
            className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
          >
            <FileText className="w-3.5 h-3.5 text-emerald-500" />
            <span>Cetak / Ekspor Laporan</span>
          </button>
        </div>
      </div>

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
                  {filteredTransactions.length > 0 ? (
                    filteredTransactions.map((tx) => {
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
                                ({tx.items.length} item)
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-600 dark:text-slate-300 truncate max-w-xs mt-0.5">
                              {tx.items.map((i) => `${i.quantity}x ${i.product.name}`).join(', ')}
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
                              {getMethodIcon(tx.payment.method)}
                              <span className="uppercase font-semibold">{tx.payment.method}</span>
                            </div>
                            {tx.payment.referenceCode && (
                              <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono truncate max-w-[110px]">
                                {tx.payment.referenceCode}
                              </div>
                            )}
                          </td>

                          {/* Total Amount */}
                          <td className="py-3 px-4 text-right">
                            <div className="font-bold font-mono text-slate-900 dark:text-emerald-400 text-sm">
                              {formatCurrency(tx.finalTotal, settings.currency)}
                            </div>
                            {tx.discountAmount > 0 && (
                              <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono">
                                Diskon: -{formatCurrency(tx.discountAmount, settings.currency)}
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
                        Tidak ada transaksi yang cocok dengan filter pencarian.
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
                  {filteredReturns.length > 0 ? (
                    filteredReturns.map((ret) => (
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
                            {ret.items.map((i, idx) => (
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
                            {formatCurrency(ret.totalRefundAmount, settings.currency)}
                          </span>
                        </td>

                        <td className="py-3 px-4">
                          <p className="text-xs text-slate-700 dark:text-slate-200 font-medium">
                            {ret.note || ret.items.map((i) => i.reason).join(', ')}
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
                        Belum ada riwayat retur penjualan tercatat.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
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
                        Beli: {item.maxQty} pcs • Harga: {formatCurrency(item.unitPrice, settings.currency)}
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

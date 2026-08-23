import React from 'react';
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
  Sparkles,
  Zap,
  Clock,
  Award,
  ArrowUpRight,
  RotateCcw,
  PackageCheck,
} from 'lucide-react';
import { usePOS } from '../../context/POSContext';
import { formatCurrency, formatNumber } from '../../utils/formatters';

export const ReportsView: React.FC = () => {
  const { transactions, settings, openGeminiCopilot, salesReturns } = usePOS();

  const completedTransactions = transactions.filter((t) => t.status === 'completed');

  // Calculations (PPN removed as requested)
  const grossSales = completedTransactions.reduce((sum, t) => sum + t.finalTotal, 0);
  const totalSubtotal = completedTransactions.reduce((sum, t) => sum + t.subtotal, 0);
  const totalDiscounts = completedTransactions.reduce((sum, t) => sum + t.discountAmount, 0);
  const totalSalesReturnAmount = salesReturns.reduce((sum, r) => sum + r.totalRefundAmount, 0);
  const netSales = Math.max(0, grossSales - totalSalesReturnAmount);
  const averageTicket = completedTransactions.length > 0 ? grossSales / completedTransactions.length : 0;

  // Calculate Cost of Goods Sold (HPP) & Gross Profit
  let totalCOGS = 0;
  let totalUnitsSold = 0;
  completedTransactions.forEach((tx) => {
    tx.items.forEach((item) => {
      totalUnitsSold += item.quantity;
      totalCOGS += (item.product.costPrice || 0) * item.quantity;
    });
  });
  const grossProfit = Math.max(0, grossSales - totalCOGS);
  const profitMargin = grossSales > 0 ? ((grossProfit / grossSales) * 100).toFixed(1) : '0';

  // Breakdown by payment method
  const methodStats = {
    cash: completedTransactions.filter((t) => t.payment.method === 'cash').reduce((s, t) => s + t.finalTotal, 0),
    qris: completedTransactions.filter((t) => t.payment.method === 'qris').reduce((s, t) => s + t.finalTotal, 0),
    card: completedTransactions.filter((t) => t.payment.method === 'card').reduce((s, t) => s + t.finalTotal, 0),
    transfer: completedTransactions.filter((t) => t.payment.method === 'transfer').reduce((s, t) => s + t.finalTotal, 0),
  };

  // Product sales leaderboard
  const productCountMap: Record<string, { name: string; quantity: number; revenue: number; profit: number }> = {};
  completedTransactions.forEach((tx) => {
    tx.items.forEach((item) => {
      if (!productCountMap[item.product.id]) {
        productCountMap[item.product.id] = {
          name: item.product.name,
          quantity: 0,
          revenue: 0,
          profit: 0,
        };
      }
      productCountMap[item.product.id].quantity += item.quantity;
      productCountMap[item.product.id].revenue += item.totalPrice;
      productCountMap[item.product.id].profit += (item.unitPrice - (item.product.costPrice || 0)) * item.quantity;
    });
  });

  const topProducts = Object.values(productCountMap)
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 6);

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-100 dark:bg-slate-950 overflow-y-auto select-none p-4 space-y-4">
      {/* Top Header */}
      <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 shadow-xs">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-emerald-500 dark:text-emerald-400" />
            <span>Laporan Penjualan & Rekapitulasi Kasir Harian</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-300">
            {settings.branchName} • Rekapitulasi Real-Time Transaksi Penjualan Bersih
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* AI Executive Insights Trigger */}
          <button
            onClick={() => openGeminiCopilot('insights')}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-md shadow-emerald-500/20 transition-all active:scale-95"
          >
            <Sparkles className="w-4 h-4 fill-current animate-pulse" />
            <span>Analisis Eksekutif AI</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => window.print()}
            className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak Laporan</span>
          </button>
        </div>
      </div>

      {/* Primary KPI Metric Cards (No PPN) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Gross Revenue */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-300 uppercase tracking-wider">
            Total Omzet Penjualan
          </span>
          <div className="text-xl font-black font-mono text-emerald-600 dark:text-emerald-400 mt-1">
            {formatCurrency(grossSales, settings.currency)}
          </div>
          <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 mt-1 font-mono">
            <span>Net: {formatCurrency(netSales, settings.currency)}</span>
            <span>{totalUnitsSold} Pcs Terjual</span>
          </div>
        </div>

        {/* Total Orders & Ticket */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-300 uppercase tracking-wider">
            Total Transaksi Selesai
          </span>
          <div className="text-xl font-black font-mono text-slate-900 dark:text-white mt-1">
            {completedTransactions.length} Struk Kasir
          </div>
          <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 block font-mono">
            Rata-rata Basket: {formatCurrency(averageTicket, settings.currency)}
          </span>
        </div>

        {/* Gross Profit & Margin */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-300 uppercase tracking-wider">
            Estimasi Laba Kotor (Margin)
          </span>
          <div className="text-xl font-black font-mono text-teal-600 dark:text-teal-400 mt-1">
            {formatCurrency(grossProfit, settings.currency)}
          </div>
          <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 mt-1 font-mono">
            <span>Margin: {profitMargin}%</span>
            <span>HPP: {formatCurrency(totalCOGS, settings.currency)}</span>
          </div>
        </div>

        {/* Retur Penjualan & Diskon */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-300 uppercase tracking-wider">
            Retur & Potongan Promo
          </span>
          <div className="text-xl font-black font-mono text-amber-600 dark:text-amber-400 mt-1">
            {formatCurrency(totalDiscounts + totalSalesReturnAmount, settings.currency)}
          </div>
          <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 mt-1 font-mono">
            <span>Retur: {formatCurrency(totalSalesReturnAmount, settings.currency)}</span>
            <span>Diskon: {formatCurrency(totalDiscounts, settings.currency)}</span>
          </div>
        </div>
      </div>

      {/* Grid: Payment Method Breakdown & Top Sellers */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Payment Methods Breakdown */}
        <div className="lg:col-span-6 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
          <h3 className="font-bold text-xs text-slate-800 dark:text-slate-100 uppercase tracking-wider">
            Distribusi Metode Pembayaran
          </h3>

          <div className="space-y-3 pt-1">
            {[
              { label: 'Uang Tunai (Cash)', amount: methodStats.cash, icon: Banknote, color: 'bg-emerald-500' },
              { label: 'QRIS & E-Wallet (GoPay, OVO, ShopeePay)', amount: methodStats.qris, icon: QrCode, color: 'bg-blue-500' },
              { label: 'Mesin EDC (Debit / Kredit)', amount: methodStats.card, icon: CreditCard, color: 'bg-purple-500' },
              { label: 'Transfer Bank / Virtual Account', amount: methodStats.transfer, icon: Building2, color: 'bg-amber-500' },
            ].map((m) => {
              const Icon = m.icon;
              const percent = grossSales > 0 ? Math.round((m.amount / grossSales) * 100) : 0;
              return (
                <div key={m.label} className="space-y-1 text-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                      <span className="font-semibold text-slate-800 dark:text-slate-200">{m.label}</span>
                    </div>
                    <div className="font-mono font-bold text-slate-900 dark:text-slate-100">
                      {formatCurrency(m.amount, settings.currency)} ({percent}%)
                    </div>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div className={`h-full ${m.color}`} style={{ width: `${percent}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top 6 Products Leaderboard */}
        <div className="lg:col-span-6 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
          <h3 className="font-bold text-xs text-slate-800 dark:text-slate-100 uppercase tracking-wider">
            Produk Ritel Terlaris (Fast-Moving)
          </h3>

          <div className="space-y-2 pt-1">
            {topProducts.length > 0 ? (
              topProducts.map((p, idx) => (
                <div
                  key={p.name}
                  className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-5 h-5 rounded-full bg-emerald-500 text-slate-950 font-black text-[10px] flex items-center justify-center font-mono shrink-0">
                      #{idx + 1}
                    </span>
                    <span className="font-semibold text-slate-800 dark:text-slate-100 truncate">{p.name}</span>
                  </div>
                  <div className="text-right font-mono shrink-0">
                    <span className="font-bold text-emerald-600 dark:text-emerald-400 block">
                      {p.quantity} terjual
                    </span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-300">
                      {formatCurrency(p.revenue, settings.currency)}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-500 dark:text-slate-400 py-6 text-center">Belum ada data penjualan tercatat hari ini.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

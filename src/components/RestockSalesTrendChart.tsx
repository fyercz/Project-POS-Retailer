import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  ComposedChart,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  RotateCcw,
  Ban,
  Scissors,
  CheckCircle2,
  Calendar,
  CalendarDays,
  Package,
  ArrowRight,
  ShieldCheck,
  X,
  Sparkles,
} from 'lucide-react';
import { AIForecastItem, Product, Transaction, SalesReturn } from '../types';
import { formatCurrency } from '../utils/formatters';

interface RestockSalesTrendChartProps {
  item: AIForecastItem;
  product?: Product;
  currency?: string;
  targetDate?: string;
  projectionDays?: number;
  currentOrderQty: number;
  onUpdateOrderQty: (newQty: number) => void;
  onEliminate: () => void;
  onReduce: () => void;
  onRestore: () => void;
  onClose?: () => void;
  isModal?: boolean;
}

export const RestockSalesTrendChart: React.FC<RestockSalesTrendChartProps> = ({
  item,
  product,
  currency = 'IDR',
  targetDate,
  projectionDays = 14,
  currentOrderQty,
  onUpdateOrderQty,
  onEliminate,
  onReduce,
  onRestore,
  onClose,
  isModal = false,
}) => {
  // Compute chart history from item or fallback
  const chartData = useMemo(() => {
    if (item.salesHistoryByDate && item.salesHistoryByDate.length > 0) {
      return item.salesHistoryByDate.map((entry) => ({
        date: entry.date,
        penjualan: entry.soldQty,
        retur: entry.returnQty,
      }));
    }

    // Fallback: generate 14 day dummy-proof zero timeline
    const fallback = [];
    const now = new Date();
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 86400000);
      const dt = d.toISOString().slice(5, 10);
      fallback.push({
        date: dt,
        penjualan: 0,
        retur: 0,
      });
    }
    return fallback;
  }, [item.salesHistoryByDate]);

  // Aggregate stats
  const totalSold = item.totalSoldPeriod ?? chartData.reduce((acc, d) => acc + d.penjualan, 0);
  const totalReturned = item.returnCount ?? chartData.reduce((acc, d) => acc + d.retur, 0);
  const returnPercentage = totalSold > 0 ? Math.round((totalReturned / totalSold) * 100) : totalReturned > 0 ? 100 : 0;
  const velocity = item.dailySalesVelocity ?? (totalSold / 14);
  const isDeadstock = item.isDeadstock || (totalSold === 0 && (product?.stock ?? item.currentStock) > 0);
  const hasReturn = totalReturned > 0;
  const originalQty = item.originalOrderQty ?? Math.max(12, item.recommendedOrderQty || 12);

  // Projected runout and target date demand
  const currentStock = product?.stock ?? item.currentStock;
  const projectedDemandUntilTarget = Math.ceil(velocity * projectionDays);

  const containerContent = (
    <div className="space-y-4">
      {/* Header Info */}
      <div className="flex items-start justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
              {item.productName}
            </h4>
            {isDeadstock && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                Deadstock (0 Terjual)
              </span>
            )}
            {hasReturn && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 flex items-center gap-1">
                <RotateCcw className="w-3 h-3" />
                Riwayat Retur: {totalReturned} Unit
              </span>
            )}
            {currentOrderQty === 0 ? (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-600 text-white flex items-center gap-1">
                <Ban className="w-3 h-3" />
                Kuota Dieliminasi (0)
              </span>
            ) : currentOrderQty < originalQty ? (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500 text-slate-950 flex items-center gap-1">
                <Scissors className="w-3 h-3" />
                Kuota Dipangkas ({currentOrderQty})
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                Kuota Normal ({currentOrderQty})
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2 flex-wrap">
            <span>Kategori: {item.category || 'General'}</span>
            <span>•</span>
            <span>SKU: {item.sku || '-'}</span>
            <span>•</span>
            <span>Harga Modal: {formatCurrency(item.costPrice || 0, currency)}</span>
          </p>
        </div>

        {isModal && onClose && (
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-white transition cursor-pointer"
            title="Tutup Pratinjau Grafik"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <span className="block text-[10px] font-semibold text-slate-500 uppercase">
            Total Terjual (14 Hari)
          </span>
          <span className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-1 mt-0.5">
            {totalSold}
            {velocity > 1 ? (
              <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
            ) : isDeadstock ? (
              <TrendingDown className="w-3.5 h-3.5 text-rose-500" />
            ) : null}
          </span>
          <span className="text-[10px] text-slate-400">
            Laju: {velocity.toFixed(1)}/hari
          </span>
        </div>

        <div className={`p-2.5 rounded-xl border ${
          hasReturn
            ? 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/50'
            : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800'
        }`}>
          <span className="block text-[10px] font-semibold text-slate-500 uppercase">
            Total Retur Produk
          </span>
          <span className={`text-sm font-black flex items-center gap-1 mt-0.5 ${
            hasReturn ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-white'
          }`}>
            {totalReturned}
            {hasReturn && <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />}
          </span>
          <span className="text-[10px] text-slate-400">
            {returnPercentage > 0 ? `Rasio Retur: ${returnPercentage}%` : 'Nihil komplain'}
          </span>
        </div>

        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <span className="block text-[10px] font-semibold text-slate-500 uppercase">
            Sisa Stok / Batas Aman
          </span>
          <span className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-1 mt-0.5">
            {currentStock} <span className="text-[10px] font-normal text-slate-400">/ Min {item.minStock || 10}</span>
          </span>
          <span className="text-[10px] text-slate-400">
            Habis: ~{item.estimatedDaysLeft || (velocity > 0 ? Math.floor(currentStock / velocity) : 30)} hari lagi
          </span>
        </div>

        <div className="p-2.5 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60">
          <span className="block text-[10px] font-semibold text-emerald-800 dark:text-emerald-300 uppercase flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            Target Horizon
          </span>
          <span className="text-sm font-black text-emerald-700 dark:text-emerald-300 flex items-center gap-1 mt-0.5">
            +{projectionDays} Hari
          </span>
          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 truncate block">
            {targetDate ? `Target: ${targetDate}` : 'Kebutuhan 2 Pekan'}
          </span>
        </div>
      </div>

      {/* RECHARTS VISUALIZATION */}
      <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
              Grafik Fluktuasi Penjualan Harian vs Retur (14 Hari Terakhir)
            </span>
          </div>
          <div className="flex items-center gap-3 text-[11px]">
            <span className="flex items-center gap-1 text-slate-600 dark:text-slate-400">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
              Penjualan (Pcs)
            </span>
            <span className="flex items-center gap-1 text-slate-600 dark:text-slate-400">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
              Retur (Pcs)
            </span>
          </div>
        </div>

        <div className="w-full h-48 sm:h-56 pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={chartData}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <defs>
                <linearGradient id="colorPenjualan" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.5} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: '#64748b' }}
                tickLine={false}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 10, fill: '#64748b' }}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  border: '1px solid #334155',
                  borderRadius: '12px',
                  color: '#fff',
                  fontSize: '12px',
                }}
                formatter={(val: number, name: string) => [
                  `${val} ${item.unit || 'pcs'}`,
                  name === 'penjualan' ? 'Terjual' : 'Diretur',
                ]}
                labelFormatter={(label) => `Tanggal: ${label}`}
              />
              <Area
                type="monotone"
                dataKey="penjualan"
                name="penjualan"
                stroke="#10b981"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorPenjualan)"
              />
              <Bar
                dataKey="retur"
                name="retur"
                fill="#f43f5e"
                radius={[4, 4, 0, 0]}
                barSize={12}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Behavior Interpretation */}
        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs leading-relaxed flex items-start gap-2">
          {isDeadstock ? (
            <>
              <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              <p className="text-slate-700 dark:text-slate-300">
                <strong className="text-rose-600 dark:text-rose-400">Analisis Perilaku: Deadstock Terdeteksi.</strong> Tidak ada transaksi penjualan tercatat selama 14 hari terakhir. Pembelian baru berisiko tinggi membekukan modal operasional toko ritel.
              </p>
            </>
          ) : hasReturn ? (
            <>
              <RotateCcw className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <p className="text-slate-700 dark:text-slate-300">
                <strong className="text-amber-600 dark:text-amber-400">Analisis Perilaku: Waspada Retur.</strong> Terdapat {totalReturned} unit barang diretur pelanggan (rasio retur {returnPercentage}%). Disarankan memangkas kuota restock hingga vendor/kualitas produk diverifikasi.
              </p>
            </>
          ) : velocity >= 2 ? (
            <>
              <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <p className="text-slate-700 dark:text-slate-300">
                <strong className="text-emerald-600 dark:text-emerald-400">Analisis Perilaku: Fast Moving FMCG.</strong> Penjualan konsisten stabil dengan rata-rata {velocity.toFixed(1)} pcs/hari tanpa catatan retur. Prioritaskan pemenuhan stok penuh untuk mengamankan omzet.
              </p>
            </>
          ) : (
            <>
              <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
              <p className="text-slate-700 dark:text-slate-300">
                <strong className="text-blue-600 dark:text-blue-400">Analisis Perilaku: Perputaran Normal.</strong> Barang bergerak perlahan tapi teratur ({velocity.toFixed(1)} pcs/hari). Kuota restock disesuaikan dengan horizon hari yang dipilih.
              </p>
            </>
          )}
        </div>
      </div>

      {/* QUICK QUOTA POLICY ACTIONS */}
      <div className="p-3.5 rounded-2xl bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
            Keputusan Aturan Kuota Pemesanan (PO)
          </span>
          <span className="text-xs text-slate-500">
            Rekomendasi Awal: <strong>{originalQty}</strong>
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {/* Action 1: Eliminate */}
          <button
            type="button"
            onClick={onEliminate}
            className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between cursor-pointer ${
              currentOrderQty === 0
                ? 'bg-rose-100 dark:bg-rose-950/80 border-rose-400 dark:border-rose-700 ring-2 ring-rose-500/20'
                : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 hover:border-rose-300 dark:hover:border-rose-800'
            }`}
          >
            <div className="flex items-center justify-between gap-1 text-xs font-bold text-rose-700 dark:text-rose-400">
              <span className="flex items-center gap-1.5">
                <Ban className="w-3.5 h-3.5" />
                Eliminasi Kuota
              </span>
              <span className="text-[11px] font-black">0</span>
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
              Batalkan order barang ini karena retur/deadstock
            </p>
          </button>

          {/* Action 2: Reduce 50% */}
          <button
            type="button"
            onClick={onReduce}
            className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between cursor-pointer ${
              currentOrderQty > 0 && currentOrderQty < originalQty
                ? 'bg-amber-100 dark:bg-amber-950/80 border-amber-400 dark:border-amber-700 ring-2 ring-amber-500/20'
                : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 hover:border-amber-300 dark:hover:border-amber-800'
            }`}
          >
            <div className="flex items-center justify-between gap-1 text-xs font-bold text-amber-700 dark:text-amber-400">
              <span className="flex items-center gap-1.5">
                <Scissors className="w-3.5 h-3.5" />
                Pangkas Kuota (-50%)
              </span>
              <span className="text-[11px] font-black">{Math.max(1, Math.floor(originalQty * 0.5))}</span>
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
              Kurangi 50% kuota untuk mitigasi modal tertahan
            </p>
          </button>

          {/* Action 3: Restore full */}
          <button
            type="button"
            onClick={onRestore}
            className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between cursor-pointer ${
              currentOrderQty >= originalQty
                ? 'bg-emerald-100 dark:bg-emerald-950/80 border-emerald-400 dark:border-emerald-700 ring-2 ring-emerald-500/20'
                : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 hover:border-emerald-300 dark:hover:border-emerald-800'
            }`}
          >
            <div className="flex items-center justify-between gap-1 text-xs font-bold text-emerald-700 dark:text-emerald-400">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Pulihkan Normal
              </span>
              <span className="text-[11px] font-black">{originalQty}</span>
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
              Pesan penuh sesuai kebutuhan aman standar
            </p>
          </button>
        </div>

        {/* Custom Stepper slider / manual adjustment */}
        <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-200 dark:border-slate-800 flex-wrap">
          <span className="text-xs text-slate-600 dark:text-slate-400">
            Penyesuaian Manual Kuantitas PO:
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onUpdateOrderQty(Math.max(0, currentOrderQty - 6))}
              className="px-2 py-1 rounded-lg bg-slate-200 dark:bg-slate-800 text-xs font-bold hover:bg-slate-300 dark:hover:bg-slate-700 cursor-pointer"
            >
              -6
            </button>
            <input
              type="number"
              min={0}
              value={currentOrderQty}
              onChange={(e) => onUpdateOrderQty(Math.max(0, parseInt(e.target.value) || 0))}
              className="w-16 px-2 py-1 text-center font-bold text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
            />
            <button
              type="button"
              onClick={() => onUpdateOrderQty(currentOrderQty + 6)}
              className="px-2 py-1 rounded-lg bg-slate-200 dark:bg-slate-800 text-xs font-bold hover:bg-slate-300 dark:hover:bg-slate-700 cursor-pointer"
            >
              +6
            </button>
            <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 ml-2">
              Subtotal: {formatCurrency(currentOrderQty * (item.costPrice || 0), currency)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  if (isModal) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
        <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-5 max-h-[90vh] overflow-y-auto">
          {containerContent}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800">
      {containerContent}
    </div>
  );
};

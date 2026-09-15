import React, { useState, useMemo } from 'react';
import {
  AlertTriangle,
  AlertCircle,
  Calendar,
  Clock,
  Package,
  ArrowRight,
  Truck,
  RotateCcw,
  SlidersHorizontal,
  Filter,
  ChevronDown,
  ChevronUp,
  Bell,
  Sparkles,
  Tag,
  CheckCircle2,
  X,
  TrendingDown,
  ShieldAlert,
} from 'lucide-react';
import { Product } from '../types';
import { formatCurrency } from '../utils/formatters';

export type InventoryAlertFilterType =
  | 'all'
  | 'low-stock'
  | 'out-of-stock'
  | 'critical-exp'
  | 'approaching-exp'
  | 'all-exp';

export interface InventoryAlertBannerProps {
  products: Product[];
  currentAlertFilter: InventoryAlertFilterType;
  onSelectAlertFilter: (filter: InventoryAlertFilterType) => void;
  onOpenReceiving: (product?: Product) => void;
  onOpenReturn: (product?: Product) => void;
  onOpenBulkAdjust: (productIds: string[]) => void;
  onOpenPriceTagPromo?: (product?: Product) => void;
  onGenerateRestockPlan?: () => void;
  currency?: string;
}

export const getProductExpiryDiffDays = (dateStr?: string): number | null => {
  if (!dateStr) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const exp = new Date(dateStr);
  exp.setHours(0, 0, 0, 0);
  return Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
};

export const InventoryAlertBanner: React.FC<InventoryAlertBannerProps> = ({
  products,
  currentAlertFilter,
  onSelectAlertFilter,
  onOpenReceiving,
  onOpenReturn,
  onOpenBulkAdjust,
  onOpenPriceTagPromo,
  onGenerateRestockPlan,
  currency = 'IDR',
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  // Categorize low-stock and expiration products
  const {
    outOfStockItems,
    lowStockItems,
    allLowStockItems,
    expiredItems,
    criticalExpItems,
    approachingExpItems,
    allExpItems,
    totalUniqueAlertCount,
  } = useMemo(() => {
    const outOfStock: Product[] = [];
    const lowStock: Product[] = [];
    const allLow: Product[] = [];

    const expired: { product: Product; daysLeft: number }[] = [];
    const criticalExp: { product: Product; daysLeft: number }[] = [];
    const approachingExp: { product: Product; daysLeft: number }[] = [];
    const allExp: { product: Product; daysLeft: number }[] = [];

    const alertIdSet = new Set<string>();

    products.forEach((p) => {
      // Stock checks
      if (p.stock === 0) {
        outOfStock.push(p);
        allLow.push(p);
        alertIdSet.add(p.id);
      } else if (p.stock <= p.minStock) {
        lowStock.push(p);
        allLow.push(p);
        alertIdSet.add(p.id);
      }

      // Expiry checks
      if (p.expiryDate) {
        const diff = getProductExpiryDiffDays(p.expiryDate);
        if (diff !== null) {
          if (diff < 0) {
            expired.push({ product: p, daysLeft: diff });
            allExp.push({ product: p, daysLeft: diff });
            alertIdSet.add(p.id);
          } else if (diff <= 30) {
            criticalExp.push({ product: p, daysLeft: diff });
            allExp.push({ product: p, daysLeft: diff });
            alertIdSet.add(p.id);
          } else if (diff <= 90) {
            approachingExp.push({ product: p, daysLeft: diff });
            allExp.push({ product: p, daysLeft: diff });
            alertIdSet.add(p.id);
          }
        }
      }
    });

    // Sort expiry items by closest to expire first
    expired.sort((a, b) => a.daysLeft - b.daysLeft);
    criticalExp.sort((a, b) => a.daysLeft - b.daysLeft);
    approachingExp.sort((a, b) => a.daysLeft - b.daysLeft);
    allExp.sort((a, b) => a.daysLeft - b.daysLeft);

    return {
      outOfStockItems: outOfStock,
      lowStockItems: lowStock,
      allLowStockItems: allLow,
      expiredItems: expired,
      criticalExpItems: criticalExp,
      approachingExpItems: approachingExp,
      allExpItems: allExp,
      totalUniqueAlertCount: alertIdSet.size,
    };
  }, [products]);

  const hasAnyAlert = allLowStockItems.length > 0 || allExpItems.length > 0;

  if (!hasAnyAlert) {
    return (
      <div className="px-4 py-3 bg-emerald-50/70 dark:bg-emerald-950/20 border-b border-emerald-200 dark:border-emerald-900/60 flex items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>
            <strong>Status Inventaris Sehat:</strong> Seluruh {products.length} produk memiliki kuantitas stok di atas batas minimum dan tidak ada tanggal kadaluarsa kritis dalam 90 hari ke depan.
          </span>
        </div>
        <button
          onClick={() => onOpenBulkAdjust(products.slice(0, 10).map((p) => p.id))}
          className="px-2.5 py-1 rounded-lg bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-900/50 dark:hover:bg-emerald-800 text-emerald-900 dark:text-emerald-200 font-semibold text-[11px] flex items-center gap-1 transition-colors cursor-pointer"
        >
          <SlidersHorizontal className="w-3 h-3" />
          <span>Audit Stok Opname</span>
        </button>
      </div>
    );
  }

  const isLowStockActive =
    currentAlertFilter === 'low-stock' || currentAlertFilter === 'out-of-stock';
  const isExpActive =
    currentAlertFilter === 'critical-exp' ||
    currentAlertFilter === 'approaching-exp' ||
    currentAlertFilter === 'all-exp';

  return (
    <div className="border-b border-slate-200 dark:border-slate-800 bg-gradient-to-b from-amber-50/40 via-white to-slate-50/60 dark:from-slate-900 dark:via-slate-900 dark:to-slate-950 transition-all">
      {/* Alert Header Summary Strip */}
      <div className="px-4 py-2.5 flex items-center justify-between gap-3 flex-wrap bg-amber-100/60 dark:bg-amber-950/40 border-b border-amber-200/80 dark:border-amber-900/50">
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 font-black text-[11px] shadow-xs">
            <Bell className="w-3.5 h-3.5 animate-bounce" />
            <span>{totalUniqueAlertCount} PERINGATAN INVENTARIS</span>
          </div>

          <span className="text-xs text-slate-700 dark:text-slate-300 font-medium">
            Terdeteksi {allLowStockItems.length} produk stok menipis/habis dan {allExpItems.length} produk berpotensi kadaluarsa.
          </span>

          {currentAlertFilter !== 'all' && (
            <button
              onClick={() => onSelectAlertFilter('all')}
              className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-900 text-[10px] font-bold border border-slate-300 dark:border-slate-600 flex items-center gap-1 cursor-pointer transition shadow-2xs"
            >
              <span>Filter Aktif: {currentAlertFilter.replace('-', ' ').toUpperCase()}</span>
              <X className="w-3 h-3 text-rose-500" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Quick Filter Buttons */}
          <div className="flex items-center gap-1 bg-white/80 dark:bg-slate-800/80 p-0.5 rounded-xl border border-amber-200 dark:border-slate-700 text-xs shadow-2xs">
            <button
              type="button"
              onClick={() => onSelectAlertFilter('all')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                currentAlertFilter === 'all'
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Tampilkan Semua ({products.length})
            </button>
            <button
              type="button"
              onClick={() =>
                onSelectAlertFilter(currentAlertFilter === 'low-stock' ? 'all' : 'low-stock')
              }
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition flex items-center gap-1 cursor-pointer ${
                currentAlertFilter === 'low-stock'
                  ? 'bg-amber-500 text-slate-950 shadow-xs font-black'
                  : 'text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-950/60'
              }`}
            >
              <AlertTriangle className="w-3 h-3 text-amber-600 dark:text-amber-400" />
              <span>Stok Menipis ({allLowStockItems.length})</span>
            </button>
            <button
              type="button"
              onClick={() =>
                onSelectAlertFilter(currentAlertFilter === 'all-exp' ? 'all' : 'all-exp')
              }
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition flex items-center gap-1 cursor-pointer ${
                currentAlertFilter === 'all-exp'
                  ? 'bg-rose-500 text-white shadow-xs font-black'
                  : 'text-rose-800 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-950/60'
              }`}
            >
              <Calendar className="w-3 h-3 text-rose-600 dark:text-rose-400" />
              <span>Kadaluarsa ({allExpItems.length})</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-amber-200/50 dark:hover:bg-slate-800 transition cursor-pointer"
            title={isExpanded ? 'Sembunyikan detail peringatan' : 'Buka detail peringatan'}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Expanded Interactive Detail Cards */}
      {isExpanded && (
        <div className="p-4 grid grid-cols-1 lg:grid-cols-2 gap-4 text-xs">
          {/* CARD 1: LOW STOCK ALERT */}
          <div
            className={`rounded-2xl p-3.5 border transition-all ${
              isLowStockActive
                ? 'bg-amber-50/90 dark:bg-amber-950/30 border-amber-400 dark:border-amber-600 shadow-md'
                : 'bg-white dark:bg-slate-900 border-amber-200/90 dark:border-slate-800 shadow-xs'
            }`}
          >
            <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-amber-200/60 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold shadow-xs">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <span>Peringatan Kuantitas Stok</span>
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold bg-amber-200 text-amber-900 dark:bg-amber-900/80 dark:text-amber-200">
                      {allLowStockItems.length} Produk
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Stok fisik berada pada atau di bawah batas minimum pemesanan toko
                  </p>
                </div>
              </div>

              {/* Status Badges */}
              <div className="flex items-center gap-1.5">
                {outOfStockItems.length > 0 && (
                  <button
                    onClick={() => onSelectAlertFilter('out-of-stock')}
                    className="px-2 py-0.5 rounded-lg bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 font-bold text-[10px] border border-rose-300 dark:border-rose-800 cursor-pointer hover:scale-105 transition"
                    title="Klik untuk menyaring produk habis"
                  >
                    {outOfStockItems.length} Habis (0)
                  </button>
                )}
                {lowStockItems.length > 0 && (
                  <button
                    onClick={() => onSelectAlertFilter('low-stock')}
                    className="px-2 py-0.5 rounded-lg bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200 font-bold text-[10px] border border-amber-300 dark:border-amber-800 cursor-pointer hover:scale-105 transition"
                    title="Klik untuk menyaring produk menipis"
                  >
                    {lowStockItems.length} Menipis
                  </button>
                )}
              </div>
            </div>

            {/* List preview of top critical low-stock products */}
            <div className="py-2 space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {allLowStockItems.length === 0 ? (
                <div className="py-4 text-center text-slate-400 text-xs">
                  Semua stok produk saat ini mencukupi.
                </div>
              ) : (
                allLowStockItems.slice(0, 5).map((p) => {
                  const isZero = p.stock === 0;
                  return (
                    <div
                      key={p.id}
                      className="p-2 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-2 hover:border-amber-300 transition"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`w-2 h-2 rounded-full shrink-0 ${
                              isZero ? 'bg-rose-500 animate-ping' : 'bg-amber-500'
                            }`}
                          />
                          <p className="font-bold text-slate-900 dark:text-slate-100 truncate text-xs">
                            {p.name}
                          </p>
                        </div>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                          SKU: {p.sku} • Min: {p.minStock} {p.unit}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <div className="text-right">
                          <span
                            className={`font-mono font-black text-xs block ${
                              isZero
                                ? 'text-rose-600 dark:text-rose-400'
                                : 'text-amber-600 dark:text-amber-400'
                            }`}
                          >
                            {isZero ? '0 (HABIS)' : `${p.stock} ${p.unit}`}
                          </span>
                          <span className="text-[9px] text-slate-400">
                            Modal: {formatCurrency(p.costPrice, currency)}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => onOpenReceiving(p)}
                          className="px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] flex items-center gap-1 cursor-pointer transition shadow-2xs"
                          title="Buat pesanan terima barang untuk produk ini"
                        >
                          <Truck className="w-3 h-3" />
                          <span>Pesan</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
              {allLowStockItems.length > 5 && (
                <div className="text-center pt-1 text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                  + {allLowStockItems.length - 5} produk lainnya membutuhkan restock
                </div>
              )}
            </div>

            {/* Actions for Low-Stock Card */}
            <div className="pt-2 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-2 flex-wrap">
              <button
                type="button"
                onClick={() =>
                  onSelectAlertFilter(currentAlertFilter === 'low-stock' ? 'all' : 'low-stock')
                }
                className="px-2.5 py-1.5 rounded-xl bg-amber-100 hover:bg-amber-200 dark:bg-amber-950 dark:hover:bg-amber-900 text-amber-900 dark:text-amber-200 font-bold text-[11px] flex items-center gap-1 transition cursor-pointer"
              >
                <Filter className="w-3 h-3" />
                <span>
                  {currentAlertFilter === 'low-stock'
                    ? 'Lepas Saring Tabel'
                    : `Saring Tabel (${allLowStockItems.length} Item)`}
                </span>
              </button>

              <div className="flex items-center gap-1.5 flex-wrap">
                {onGenerateRestockPlan && (
                  <button
                    type="button"
                    onClick={onGenerateRestockPlan}
                    className="px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-emerald-500 hover:from-amber-400 hover:to-emerald-400 text-slate-950 font-black text-[11px] flex items-center gap-1 transition cursor-pointer shadow-xs active:scale-95"
                    title="Analisis tingkat stok menipis dengan Gemini AI dan buat rencana Purchase Order (PO)"
                  >
                    <Sparkles className="w-3.5 h-3.5 fill-current" />
                    <span>Generate Restock Plan (AI)</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onOpenBulkAdjust(allLowStockItems.map((p) => p.id))}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-[11px] flex items-center gap-1 transition cursor-pointer"
                  title="Buka penyesuaian stok massal untuk produk stok menipis"
                >
                  <SlidersHorizontal className="w-3 h-3 text-emerald-400" />
                  <span>Sesuaikan Massal</span>
                </button>
                <button
                  type="button"
                  onClick={() => onOpenReceiving()}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] flex items-center gap-1 transition cursor-pointer shadow-xs"
                >
                  <Truck className="w-3 h-3" />
                  <span>+ Terima Barang Masuk</span>
                </button>
              </div>
            </div>
          </div>

          {/* CARD 2: APPROACHING EXPIRATION ALERT (FEFO) */}
          <div
            className={`rounded-2xl p-3.5 border transition-all ${
              isExpActive
                ? 'bg-rose-50/90 dark:bg-rose-950/30 border-rose-400 dark:border-rose-600 shadow-md'
                : 'bg-white dark:bg-slate-900 border-rose-200/80 dark:border-slate-800 shadow-xs'
            }`}
          >
            <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-rose-200/60 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-rose-500 text-white flex items-center justify-center font-bold shadow-xs">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <span>Notifikasi Kadaluarsa (FEFO)</span>
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold bg-rose-200 text-rose-900 dark:bg-rose-900/80 dark:text-rose-200">
                      {allExpItems.length} Produk
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Produk yang telah lewat atau mendekati batas konsumsi (FEFO) dalam 90 hari
                  </p>
                </div>
              </div>

              {/* Status breakdown pills */}
              <div className="flex items-center gap-1 flex-wrap">
                {expiredItems.length > 0 && (
                  <button
                    onClick={() => onSelectAlertFilter('critical-exp')}
                    className="px-2 py-0.5 rounded-lg bg-rose-100 text-rose-900 dark:bg-rose-950 dark:text-rose-200 font-bold text-[10px] border border-rose-300 dark:border-rose-800 cursor-pointer hover:scale-105 transition"
                    title="Sudah lewat tanggal kadaluarsa"
                  >
                    {expiredItems.length} Expired
                  </button>
                )}
                {criticalExpItems.length > 0 && (
                  <button
                    onClick={() => onSelectAlertFilter('critical-exp')}
                    className="px-2 py-0.5 rounded-lg bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-200 font-bold text-[10px] border border-red-300 dark:border-red-800 cursor-pointer hover:scale-105 transition"
                    title="Kadaluarsa dalam ≤ 30 hari"
                  >
                    {criticalExpItems.length} ≤30 Hari
                  </button>
                )}
                {approachingExpItems.length > 0 && (
                  <button
                    onClick={() => onSelectAlertFilter('approaching-exp')}
                    className="px-2 py-0.5 rounded-lg bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200 font-bold text-[10px] border border-amber-300 dark:border-amber-800 cursor-pointer hover:scale-105 transition"
                    title="Kadaluarsa dalam 31-90 hari"
                  >
                    {approachingExpItems.length} ≤90 Hari
                  </button>
                )}
              </div>
            </div>

            {/* List preview of approaching expiry items */}
            <div className="py-2 space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {allExpItems.length === 0 ? (
                <div className="py-4 text-center text-slate-400 text-xs">
                  Tidak ada produk yang mendekati tanggal kadaluarsa.
                </div>
              ) : (
                allExpItems.slice(0, 5).map(({ product: p, daysLeft }) => {
                  const isPast = daysLeft < 0;
                  const isCritical = daysLeft >= 0 && daysLeft <= 30;

                  return (
                    <div
                      key={p.id}
                      className="p-2 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-2 hover:border-rose-300 transition"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`w-2 h-2 rounded-full shrink-0 ${
                              isPast
                                ? 'bg-rose-600'
                                : isCritical
                                ? 'bg-red-500 animate-pulse'
                                : 'bg-amber-500'
                            }`}
                          />
                          <p className="font-bold text-slate-900 dark:text-slate-100 truncate text-xs">
                            {p.name}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                          <span>Stok: {p.stock} {p.unit}</span>
                          <span>• Batch: {p.batchNumber || '-'}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <div className="text-right">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold font-mono inline-block border ${
                              isPast
                                ? 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950 dark:text-rose-300'
                                : isCritical
                                ? 'bg-red-100 text-red-800 border-red-300 dark:bg-red-950 dark:text-red-300'
                                : 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300'
                            }`}
                          >
                            {isPast
                              ? `Lewat ${Math.abs(daysLeft)} hr`
                              : daysLeft === 0
                              ? 'Hari Ini!'
                              : `${daysLeft} hari lagi`}
                          </span>
                          <span className="text-[9px] text-slate-400 block mt-0.5 font-mono">
                            Exp: {p.expiryDate}
                          </span>
                        </div>

                        {/* Quick action: Return if past, or promo if approaching */}
                        {isPast ? (
                          <button
                            type="button"
                            onClick={() => onOpenReturn(p)}
                            className="px-2 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-[10px] flex items-center gap-1 cursor-pointer transition shadow-2xs"
                            title="Buat formulir retur supplier untuk barang kadaluarsa ini"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>Retur</span>
                          </button>
                        ) : onOpenPriceTagPromo ? (
                          <button
                            type="button"
                            onClick={() => onOpenPriceTagPromo(p)}
                            className="px-2 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[10px] flex items-center gap-1 cursor-pointer transition shadow-2xs"
                            title="Cetak label promo diskon obral cuci gudang"
                          >
                            <Tag className="w-3 h-3" />
                            <span>Obral</span>
                          </button>
                        ) : null}
                      </div>
                    </div>
                  );
                })
              )}
              {allExpItems.length > 5 && (
                <div className="text-center pt-1 text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                  + {allExpItems.length - 5} produk lainnya dalam pantauan kadaluarsa
                </div>
              )}
            </div>

            {/* Actions for Expiry Card */}
            <div className="pt-2 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-2 flex-wrap">
              <button
                type="button"
                onClick={() =>
                  onSelectAlertFilter(currentAlertFilter === 'all-exp' ? 'all' : 'all-exp')
                }
                className="px-2.5 py-1.5 rounded-xl bg-rose-100 hover:bg-rose-200 dark:bg-rose-950 dark:hover:bg-rose-900 text-rose-900 dark:text-rose-200 font-bold text-[11px] flex items-center gap-1 transition cursor-pointer"
              >
                <Filter className="w-3 h-3" />
                <span>
                  {currentAlertFilter === 'all-exp'
                    ? 'Lepas Saring Tabel'
                    : `Saring Tabel (${allExpItems.length} Item)`}
                </span>
              </button>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => onOpenBulkAdjust(allExpItems.map((i) => i.product.id))}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-[11px] flex items-center gap-1 transition cursor-pointer"
                  title="Buka penyesuaian batch / kadaluarsa massal"
                >
                  <SlidersHorizontal className="w-3 h-3 text-emerald-400" />
                  <span>Update Batch/FEFO</span>
                </button>
                <button
                  type="button"
                  onClick={() => onOpenReturn()}
                  className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-[11px] flex items-center gap-1 transition cursor-pointer shadow-xs"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>+ Form Retur Supplier</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

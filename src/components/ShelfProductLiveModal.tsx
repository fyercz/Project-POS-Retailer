import React, { useState, useEffect } from 'react';
import {
  X,
  QrCode,
  RefreshCw,
  Clock,
  Package,
  MapPin,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Share2,
  Printer,
  ShoppingCart,
  SlidersHorizontal,
  ChevronRight,
  ExternalLink,
  Calendar,
  Sparkles,
  Barcode,
  Layers,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { Product } from '../types';
import { usePOS } from '../context/POSContext';
import { formatCurrency, formatDate } from '../utils/formatters';
import { getLastPriceUpdateInfo, getDynamicShelfUrl } from '../utils/qrLabelGenerator';

export interface ShelfProductLiveModalProps {
  productId: string;
  isOpen: boolean;
  onClose: () => void;
  onOpenPrintLabel?: (product: Product) => void;
}

export const ShelfProductLiveModal: React.FC<ShelfProductLiveModalProps> = ({
  productId,
  isOpen,
  onClose,
  onOpenPrintLabel,
}) => {
  const { products, updateProductStock, addToCart, settings } = usePOS();

  // Find product from local context
  const product = products.find((p) => p.id === productId || p.barcode === productId);

  // Live fetch state from server API /api/shelf/:productId
  const [liveServerData, setLiveServerData] = useState<any | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date>(new Date());
  const [isCopied, setIsCopied] = useState(false);

  // Quick Stock Adjustment state for store staff
  const [isAdjustingStock, setIsAdjustingStock] = useState(false);
  const [customStockInput, setCustomStockInput] = useState<number>(product?.stock || 0);

  // Sync customStockInput when product changes
  useEffect(() => {
    if (product) {
      setCustomStockInput(product.stock);
    }
  }, [product?.stock]);

  // Fetch live server data
  const fetchLiveProductData = async () => {
    if (!productId) return;
    setIsRefreshing(true);
    try {
      const res = await fetch(`/api/shelf/${encodeURIComponent(productId)}`);
      if (res.ok) {
        const data = await res.json();
        setLiveServerData(data);
      }
    } catch (err) {
      console.warn('Could not fetch server endpoint, using client context:', err);
    } finally {
      setIsRefreshing(false);
      setLastRefreshedAt(new Date());
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchLiveProductData();
    }
  }, [isOpen, productId]);

  if (!isOpen) return null;

  // Determine current active product details
  const activeProduct = product || (liveServerData?.product as Product);

  if (!activeProduct) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-sm w-full text-center shadow-xl border border-slate-200 dark:border-slate-800">
          <div className="w-14 h-14 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto mb-4">
            <XCircle className="w-8 h-8" />
          </div>
          <h3 className="text-base font-black text-slate-900 dark:text-white mb-2">
            Produk Tidak Ditemukan
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
            Label rak atau kode produk <code className="font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-md">{productId}</code> belum terdaftar dalam sistem katalog toko.
          </p>
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs cursor-pointer transition-all"
          >
            Tutup
          </button>
        </div>
      </div>
    );
  }

  const priceUpdateInfo = getLastPriceUpdateInfo(activeProduct);
  const currentStock = liveServerData?.currentStock !== undefined ? liveServerData.currentStock : activeProduct.stock;
  const isOutOfStock = currentStock <= 0;
  const isLowStock = currentStock > 0 && currentStock <= activeProduct.minStock;

  const dynamicUrl = getDynamicShelfUrl(activeProduct.id);

  const handleCopyLink = () => {
    navigator.clipboard?.writeText(dynamicUrl);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleQuickStockSave = () => {
    if (product && updateProductStock) {
      updateProductStock(product.id, customStockInput);
      setIsAdjustingStock(false);
    }
  };

  const handleAddToCart = () => {
    if (product && addToCart) {
      addToCart(product);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs overflow-y-auto animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden my-auto flex flex-col max-h-[92vh]">
        {/* Top Header Bar */}
        <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 text-white px-5 py-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-400">
              <QrCode className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] uppercase font-black tracking-wider text-indigo-300">
                  Verifikasi Label Rak Dinamis
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              </div>
              <h2 className="text-sm font-black text-white">
                {settings.storeName || 'Toko'}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button aria-label="Refresh status stok real-time"
              onClick={fetchLiveProductData}
              disabled={isRefreshing}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
              title="Refresh status stok real-time"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-indigo-400' : ''}`} />
            </button>
            <button aria-label="Tutup"
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Modal Content */}
        <div className="p-5 overflow-y-auto space-y-4">
          {/* Main Product Card */}
          <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-4 border border-slate-200 dark:border-slate-750">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  {activeProduct.brand && (
                    <span className="px-2 py-0.5 rounded-md text-[11px] font-black uppercase tracking-wider bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                      {activeProduct.brand}
                    </span>
                  )}
                  <span className="px-2 py-0.5 rounded-md text-[11px] font-mono font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                    SKU: {activeProduct.sku}
                  </span>
                  {activeProduct.aisle && (
                    <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      <span>{activeProduct.aisle}</span>
                    </span>
                  )}
                </div>
                <h3 className="text-base font-black text-slate-900 dark:text-white leading-tight">
                  {activeProduct.name}
                </h3>
                <div className="flex items-center gap-2 mt-1.5 text-xs text-slate-500 dark:text-slate-400 font-mono">
                  <Barcode className="w-3.5 h-3.5" />
                  <span>{activeProduct.barcode || activeProduct.sku}</span>
                </div>
              </div>

              {/* Price Banner */}
              <div className="text-right shrink-0">
                <span className="text-[11px] uppercase font-bold text-slate-500 block">
                  Harga Jual Retail
                </span>
                <div className="text-xl sm:text-2xl font-black font-mono text-emerald-700 dark:text-emerald-400 tracking-tight">
                  {formatCurrency(activeProduct.price, settings.currency)}
                </div>
                <span className="text-[11px] font-medium text-slate-500">
                  per {activeProduct.unit || 'pcs'}
                </span>
              </div>
            </div>
          </div>

          {/* REAL-TIME INVENTORY LEVEL (Core Requirement 1) */}
          <div className="rounded-2xl p-4 bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-850 border-2 border-emerald-500/30 dark:border-emerald-500/20 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 flex items-center justify-center">
                  <Package className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                    <span>Status Stok Real-Time (Fisik &amp; Sistem)</span>
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  </h4>
                  <span className="text-[11px] text-slate-500">
                    Live sinkronisasi &bull; Diperbarui {lastRefreshedAt.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })} WIB
                  </span>
                </div>
              </div>

              {/* In Stock Badge */}
              {isOutOfStock ? (
                <span className="px-2.5 py-1 rounded-full text-[11px] font-black bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800 flex items-center gap-1">
                  <XCircle className="w-3.5 h-3.5" />
                  <span>Stok Habis</span>
                </span>
              ) : isLowStock ? (
                <span className="px-2.5 py-1 rounded-full text-[11px] font-black bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Stok Kritis</span>
                </span>
              ) : (
                <span className="px-2.5 py-1 rounded-full text-[11px] font-black bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Tersedia di Rak</span>
                </span>
              )}
            </div>

            {/* Large Real-Time Stock Count */}
            <div className="flex items-baseline justify-between bg-white dark:bg-slate-900/90 rounded-xl p-3 border border-slate-200 dark:border-slate-700">
              <div>
                <span className="text-3xl font-black font-mono text-slate-900 dark:text-white">
                  {currentStock}
                </span>
                <span className="ml-2 text-sm font-bold text-slate-500 dark:text-slate-400">
                  {activeProduct.unit || 'pcs'} tersedia
                </span>
              </div>
              <div className="text-right text-[11px] text-slate-500 dark:text-slate-400">
                <div>Ambang Batas Min: <strong className="text-slate-700 dark:text-slate-300">{activeProduct.minStock} {activeProduct.unit || 'pcs'}</strong></div>
                {activeProduct.aisle && (
                  <div>Lokasi Rak: <strong className="text-blue-600 dark:text-blue-400">{activeProduct.aisle}</strong></div>
                )}
              </div>
            </div>

            {/* Quick Staff Stock Adjustment (Toggle) */}
            <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700/60 flex items-center justify-between">
              {!isAdjustingStock ? (
                <button
                  type="button"
                  onClick={() => setIsAdjustingStock(true)}
                  className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <SlidersHorizontal className="w-3 h-3" />
                  <span>Koreksi Fisik Stok Rak (Staf Gudang)</span>
                </button>
              ) : (
                <div className="w-full space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 shrink-0">
                      Stok Fisik Saat Ini:
                    </span>
                    <input aria-label="Stok fisik saat ini"
                      type="number"
                      value={customStockInput}
                      onChange={(e) => setCustomStockInput(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-24 px-2.5 py-1 text-sm font-mono font-bold rounded-xl border border-slate-500 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                      min={0}
                    />
                    <button
                      type="button"
                      onClick={handleQuickStockSave}
                      className="px-3 py-1 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs cursor-pointer shadow-sm"
                    >
                      Simpan
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsAdjustingStock(false)}
                      className="px-2.5 py-1 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs cursor-pointer"
                    >
                      Batal
                    </button>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Perubahan stok akan langsung disinkronkan ke master inventaris kasir.
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* LAST PRICE UPDATE DATE & DETAILS (Core Requirement 2) */}
          <div className="rounded-2xl p-4 bg-gradient-to-br from-indigo-50/60 to-blue-50/60 dark:from-indigo-950/30 dark:to-blue-950/30 border border-indigo-200 dark:border-indigo-800/60 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-900 dark:text-white">
                    Pembaruan Harga Terakhir
                  </h4>
                  <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold">
                    {priceUpdateInfo.isRecent ? '⚡ Baru saja diperbarui (Dalam 7 hari)' : 'Terverifikasi aktif'}
                  </span>
                </div>
              </div>

              {priceUpdateInfo.priceDiff !== undefined && priceUpdateInfo.priceDiff !== 0 && (
                <div
                  className={`px-2 py-0.5 rounded-xl text-xs font-black flex items-center gap-1 ${
                    priceUpdateInfo.priceDiff > 0
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300'
                      : 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300'
                  }`}
                >
                  {priceUpdateInfo.priceDiff > 0 ? (
                    <TrendingUp className="w-3.5 h-3.5" />
                  ) : (
                    <TrendingDown className="w-3.5 h-3.5" />
                  )}
                  <span>
                    {priceUpdateInfo.priceDiff > 0 ? '+' : ''}
                    {priceUpdateInfo.priceDiffPercent}%
                  </span>
                </div>
              )}
            </div>

            {/* Date Details Box */}
            <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xs rounded-xl p-3 border border-indigo-100 dark:border-indigo-900/50 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 dark:text-slate-400 font-medium">
                  Tanggal &amp; Waktu Update:
                </span>
                <span className="font-bold text-slate-900 dark:text-white font-mono">
                  {priceUpdateInfo.formattedDateTime}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 dark:text-slate-400 font-medium">
                  Jenis Perubahan:
                </span>
                <span className="px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 font-semibold text-[11px]">
                  {priceUpdateInfo.changeTypeLabel}
                </span>
              </div>

              {priceUpdateInfo.previousPrice && (
                <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500 dark:text-slate-400">Harga Sebelumnya:</span>
                  <span className="font-mono text-slate-500 line-through">
                    {formatCurrency(priceUpdateInfo.previousPrice, settings.currency)}
                  </span>
                </div>
              )}

              {priceUpdateInfo.notes && (
                <div className="text-[11px] text-slate-500 dark:text-slate-400 italic pt-1">
                  Catatan: &ldquo;{priceUpdateInfo.notes}&rdquo;
                </div>
              )}
            </div>
          </div>

          {/* Wholesale Units (If configured) */}
          {activeProduct.wholesaleUnits && activeProduct.wholesaleUnits.length > 0 && (
            <div className="rounded-2xl p-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
              <div className="text-[11px] font-black uppercase text-slate-600 dark:text-slate-300 mb-2 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-blue-500" />
                <span>Tier Harga Grosir / Satuan Bertingkat</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {activeProduct.wholesaleUnits.map((u) => (
                  <div
                    key={u.id}
                    className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-750"
                  >
                    <div className="font-bold text-slate-900 dark:text-white">{u.name} ({u.multiplier} {activeProduct.unit || 'pcs'})</div>
                    <div className="text-emerald-700 dark:text-emerald-400 font-mono font-bold text-xs mt-0.5">
                      {formatCurrency(u.price, settings.currency)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Dynamic Link URL Information Box */}
          <div className="rounded-2xl p-3 bg-slate-100 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 flex items-center justify-between gap-2 text-xs">
            <div className="truncate flex-1">
              <span className="text-[11px] text-slate-500 block font-bold uppercase">
                Tautan QR Dinamis Produk:
              </span>
              <span className="font-mono text-[11px] text-slate-700 dark:text-slate-300 truncate block">
                {dynamicUrl}
              </span>
            </div>
            <button
              onClick={handleCopyLink}
              className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 text-slate-800 dark:text-white font-bold text-xs shrink-0 flex items-center gap-1.5 border border-slate-200 dark:border-slate-600 transition cursor-pointer shadow-sm"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>{isCopied ? 'Tersalin!' : 'Salin URL'}</span>
            </button>
          </div>
        </div>

        {/* Action Buttons Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-850 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 flex-wrap">
          <button
            onClick={() => {
              if (onOpenPrintLabel && product) {
                onOpenPrintLabel(product);
                onClose();
              }
            }}
            className="px-3.5 py-2 rounded-xl bg-slate-200 dark:bg-slate-750 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
          >
            <Printer className="w-4 h-4 text-slate-600 dark:text-slate-300" />
            <span>Cetak Ulang Label Rak</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={handleAddToCart}
              className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition cursor-pointer active:scale-95"
            >
              <ShoppingCart className="w-4 h-4" />
              <span>Beli di Kasir POS</span>
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs cursor-pointer transition"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

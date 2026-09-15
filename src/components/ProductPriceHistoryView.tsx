import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Calendar,
  DollarSign,
  FileSpreadsheet,
  Printer,
  Plus,
  ArrowRight,
  Sparkles,
  Info,
  CheckCircle2,
  AlertTriangle,
  History,
  ShieldCheck,
  Search,
  Package,
  Layers,
  ArrowUpDown,
  Tag,
  Filter,
  X,
  ChevronRight,
  Truck,
  RotateCcw,
  Percent,
} from 'lucide-react';
import { Product, PriceHistoryRecord, StoreSettings } from '../types';
import { formatCurrency, formatDate } from '../utils/formatters';
import {
  getProductPriceHistory,
  computePriceAnalytics,
  exportPriceHistoryCSV,
} from '../utils/priceHistory';
import { ProductPriceChart } from './ProductPriceChart';
import { printViaIframe } from '../utils/printHelper';

interface ProductPriceHistoryViewProps {
  products: Product[];
  initialProductId?: string;
  settings: StoreSettings;
  onUpdateProductPrice?: (
    productId: string,
    newCostPrice: number,
    newSellingPrice: number,
    historyRecord: PriceHistoryRecord
  ) => void;
  onClose?: () => void;
  isModal?: boolean;
}

export const ProductPriceHistoryView: React.FC<ProductPriceHistoryViewProps> = ({
  products,
  initialProductId,
  settings,
  onUpdateProductPrice,
  onClose,
  isModal = false,
}) => {
  // Active selected product
  const [selectedProductId, setSelectedProductId] = useState<string>(() => {
    if (initialProductId && products.some((p) => p.id === initialProductId)) {
      return initialProductId;
    }
    return products[0]?.id || '';
  });

  // Product search filter in picker dropdown
  const [productSearch, setProductSearch] = useState('');
  const [isProductPickerOpen, setIsProductPickerOpen] = useState(false);

  // Timeframe filter (days)
  const [timeframeFilter, setTimeframeFilter] = useState<'30' | '90' | '180' | '365' | 'all'>('180');

  // Change type filter in table
  const [typeFilter, setTypeFilter] = useState<string>('all');

  // Modal to add new price record
  const [isAddPriceModalOpen, setIsAddPriceModalOpen] = useState(false);
  const [newCostPriceInput, setNewCostPriceInput] = useState<number>(0);
  const [newSellingPriceInput, setNewSellingPriceInput] = useState<number>(0);
  const [changeTypeInput, setChangeTypeInput] = useState<PriceHistoryRecord['changeType']>('manual_update');
  const [sourceRefInput, setSourceRefInput] = useState('');
  const [supplierNameInput, setSupplierNameInput] = useState('');
  const [notesInput, setNotesInput] = useState('');
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Find currently selected product
  const currentProduct = useMemo(() => {
    return products.find((p) => p.id === selectedProductId) || products[0];
  }, [products, selectedProductId]);

  // Compute full price history for this product
  const fullHistory = useMemo(() => {
    if (!currentProduct) return [];
    return getProductPriceHistory(currentProduct);
  }, [currentProduct]);

  // Filter history by timeframe
  const filteredHistory = useMemo(() => {
    if (timeframeFilter === 'all') return fullHistory;
    const days = parseInt(timeframeFilter, 10);
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    const res = fullHistory.filter((item) => new Date(item.date).getTime() >= cutoff);
    // If timeframe filter produces less than 2 items, ensure at least the last 2 are shown for context
    if (res.length < 2 && fullHistory.length >= 2) {
      return fullHistory.slice(-2);
    }
    return res;
  }, [fullHistory, timeframeFilter]);

  // Filter table records by change type
  const tableRecords = useMemo(() => {
    const list = [...filteredHistory].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    if (typeFilter === 'all') return list;
    return list.filter((r) => r.changeType === typeFilter);
  }, [filteredHistory, typeFilter]);

  // Price analytics
  const analytics = useMemo(() => {
    if (!currentProduct) return null;
    return computePriceAnalytics(currentProduct, filteredHistory);
  }, [currentProduct, filteredHistory]);

  // Open add price modal with current product values
  const handleOpenAddPrice = () => {
    if (!currentProduct) return;
    setNewCostPriceInput(currentProduct.costPrice);
    setNewSellingPriceInput(currentProduct.price);
    setChangeTypeInput('manual_update');
    setSourceRefInput('');
    setSupplierNameInput(currentProduct.brand ? `Distributor ${currentProduct.brand}` : '');
    setNotesInput('');
    setIsAddPriceModalOpen(true);
  };

  // Submit new price adjustment
  const handleSaveNewPrice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentProduct) return;

    if (newSellingPriceInput <= 0) {
      alert('Harga jual harus lebih dari 0');
      return;
    }
    if (newCostPriceInput < 0) {
      alert('Harga modal tidak boleh negatif');
      return;
    }

    const newRecord: PriceHistoryRecord = {
      id: `ph-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      productId: currentProduct.id,
      date: new Date().toISOString(),
      costPrice: Number(newCostPriceInput),
      sellingPrice: Number(newSellingPriceInput),
      previousCostPrice: currentProduct.costPrice,
      previousSellingPrice: currentProduct.price,
      changeType: changeTypeInput,
      sourceReference: sourceRefInput.trim() || undefined,
      supplierName: supplierNameInput.trim() || undefined,
      notes: notesInput.trim() || undefined,
      recordedBy: 'Admin Kasir',
    };

    if (onUpdateProductPrice) {
      onUpdateProductPrice(
        currentProduct.id,
        Number(newCostPriceInput),
        Number(newSellingPriceInput),
        newRecord
      );
    }

    setIsAddPriceModalOpen(false);
    setSuccessToast(
      `Perubahan harga untuk ${currentProduct.name} berhasil disimpan dan dicatat ke riwayat!`
    );
    setTimeout(() => setSuccessToast(null), 5000);
  };

  // Print price history sheet
  const handlePrint = () => {
    if (!currentProduct) return;
    const title = `Laporan Riwayat Harga - ${currentProduct.name} (${currentProduct.sku})`;

    const rowsHtml = tableRecords
      .map((rec, i) => {
        const gross = rec.sellingPrice - rec.costPrice;
        const marginPct = rec.sellingPrice > 0 ? ((gross / rec.sellingPrice) * 100).toFixed(1) : '0';
        return `
        <tr>
          <td style="padding: 6px 8px; border-bottom: 1px solid #e2e8f0; font-size: 11px;">${i + 1}</td>
          <td style="padding: 6px 8px; border-bottom: 1px solid #e2e8f0; font-size: 11px;">${formatDate(rec.date)}</td>
          <td style="padding: 6px 8px; border-bottom: 1px solid #e2e8f0; font-size: 11px;">${rec.changeType}</td>
          <td style="padding: 6px 8px; border-bottom: 1px solid #e2e8f0; font-size: 11px; text-align: right; font-weight: bold;">${formatCurrency(rec.costPrice, settings.currency)}</td>
          <td style="padding: 6px 8px; border-bottom: 1px solid #e2e8f0; font-size: 11px; text-align: right; font-weight: bold;">${formatCurrency(rec.sellingPrice, settings.currency)}</td>
          <td style="padding: 6px 8px; border-bottom: 1px solid #e2e8f0; font-size: 11px; text-align: right;">${formatCurrency(gross, settings.currency)} (${marginPct}%)</td>
          <td style="padding: 6px 8px; border-bottom: 1px solid #e2e8f0; font-size: 11px;">${rec.sourceReference || '-'}</td>
          <td style="padding: 6px 8px; border-bottom: 1px solid #e2e8f0; font-size: 11px;">${rec.notes || '-'}</td>
        </tr>
      `;
      })
      .join('');

    const html = `
      <div style="font-family: Arial, sans-serif; color: #1e293b; padding: 20px;">
        <div style="text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 16px;">
          <h2 style="margin: 0; font-size: 18px; text-transform: uppercase;">${settings.storeName}</h2>
          <p style="margin: 4px 0 0; font-size: 12px; color: #64748b;">Laporan Riwayat Fluktuasi Harga Modal (HPP) & Harga Jual Retail</p>
          <p style="margin: 2px 0 0; font-size: 11px; color: #94a3b8;">Dicetak pada: ${formatDate(new Date().toISOString())}</p>
        </div>

        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; margin-bottom: 16px; font-size: 12px;">
          <strong>Produk:</strong> ${currentProduct.name}<br/>
          <strong>SKU / Barcode:</strong> ${currentProduct.sku} / ${currentProduct.barcode}<br/>
          <strong>Harga Jual Terkini:</strong> ${formatCurrency(currentProduct.price, settings.currency)} | <strong>Harga Modal Terkini:</strong> ${formatCurrency(currentProduct.costPrice, settings.currency)}<br/>
          <strong>Margin Laba Saat Ini:</strong> ${(((currentProduct.price - currentProduct.costPrice) / (currentProduct.price || 1)) * 100).toFixed(1)}% (${formatCurrency(currentProduct.price - currentProduct.costPrice, settings.currency)} / ${currentProduct.unit})
        </div>

        <table style="width: 100%; border-collapse: collapse; text-align: left;">
          <thead>
            <tr style="background: #0f172a; color: #ffffff;">
              <th style="padding: 8px; font-size: 11px;">No</th>
              <th style="padding: 8px; font-size: 11px;">Tanggal</th>
              <th style="padding: 8px; font-size: 11px;">Tipe Perubahan</th>
              <th style="padding: 8px; font-size: 11px; text-align: right;">Modal (HPP)</th>
              <th style="padding: 8px; font-size: 11px; text-align: right;">Harga Jual</th>
              <th style="padding: 8px; font-size: 11px; text-align: right;">Laba Kotor / Margin</th>
              <th style="padding: 8px; font-size: 11px;">Referensi</th>
              <th style="padding: 8px; font-size: 11px;">Catatan</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
      </div>
    `;

    printViaIframe(html, title);
  };

  // Filtered products for dropdown picker
  const filteredProductOptions = useMemo(() => {
    if (!productSearch.trim()) return products;
    const q = productSearch.toLowerCase();
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.barcode.toLowerCase().includes(q) ||
        (p.brand && p.brand.toLowerCase().includes(q))
    );
  }, [products, productSearch]);

  if (!currentProduct) {
    return (
      <div className="p-8 text-center text-slate-400">
        <Package className="w-12 h-12 mx-auto mb-2 text-slate-300" />
        <p>Tidak ada produk dalam database inventaris.</p>
      </div>
    );
  }

  const changeTypeBadge = (type: PriceHistoryRecord['changeType']) => {
    switch (type) {
      case 'purchase_receiving':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
            <Truck className="w-3 h-3 text-blue-600" />
            Faktur Supplier
          </span>
        );
      case 'manual_update':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-950/80 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
            <Tag className="w-3 h-3 text-purple-600" />
            Penyesuaian Manual
          </span>
        );
      case 'bulk_adjust':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800 dark:bg-indigo-950/80 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
            <Layers className="w-3 h-3 text-indigo-600" />
            Koreksi Massal
          </span>
        );
      case 'promotion':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
            <Sparkles className="w-3 h-3 text-amber-600" />
            Harga Promo
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
            <History className="w-3 h-3 text-slate-500" />
            Registrasi Awal
          </span>
        );
    }
  };

  return (
    <div className={`space-y-6 ${isModal ? 'p-1' : ''}`}>
      {/* Toast Notification */}
      {successToast && (
        <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs flex items-center justify-between gap-2 shadow-xs animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold">{successToast}</span>
          </div>
          <button
            onClick={() => setSuccessToast(null)}
            className="p-1 rounded-md hover:bg-emerald-200/50 text-emerald-700 dark:text-emerald-300"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* TOP HEADER: Product Selector + Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
        {/* Left: Product Picker Dropdown */}
        <div className="relative flex-1 min-w-0">
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">
            Produk yang Dipantau:
          </label>
          <div className="flex items-center gap-3">
            <button
              id="btn-open-price-history-picker"
              type="button"
              onClick={() => setIsProductPickerOpen((prev) => !prev)}
              className="flex-1 flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-400 text-left transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3 min-w-0">
                {currentProduct.image ? (
                  <img
                    src={currentProduct.image}
                    alt={currentProduct.name}
                    className="w-9 h-9 rounded-lg object-cover shrink-0 border border-slate-200 dark:border-slate-700 bg-white"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-lg bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs shrink-0">
                    <Package className="w-5 h-5" />
                  </div>
                )}
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100 truncate">
                      {currentProduct.name}
                    </span>
                    {currentProduct.brand && (
                      <span className="px-1.5 py-0.2 rounded-md text-[9px] font-bold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 shrink-0">
                        {currentProduct.brand}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                    <span>SKU: {currentProduct.sku}</span>
                    <span>•</span>
                    <span>Barcode: {currentProduct.barcode}</span>
                    <span>•</span>
                    <span>Satuan: {currentProduct.unit}</span>
                  </div>
                </div>
              </div>
              <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform ${isProductPickerOpen ? 'rotate-90' : ''}`} />
            </button>
          </div>

          {/* Dropdown Menu for Picking Product */}
          {isProductPickerOpen && (
            <div className="absolute top-full left-0 right-0 mt-2 z-40 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-2xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150 max-h-80 flex flex-col">
              <div className="p-2.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    placeholder="Ketik nama produk, SKU, barcode, atau brand..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                    autoFocus
                  />
                </div>
              </div>

              <div className="overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60 p-1 flex-1">
                {filteredProductOptions.length > 0 ? (
                  filteredProductOptions.map((prod) => (
                    <button
                      key={prod.id}
                      type="button"
                      onClick={() => {
                        setSelectedProductId(prod.id);
                        setIsProductPickerOpen(false);
                        setProductSearch('');
                      }}
                      className={`w-full p-2.5 text-left rounded-xl flex items-center justify-between gap-3 hover:bg-indigo-50/70 dark:hover:bg-indigo-950/40 transition-colors cursor-pointer ${
                        prod.id === selectedProductId
                          ? 'bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800'
                          : ''
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 font-bold text-[10px] text-slate-600 dark:text-slate-300">
                          {prod.brand ? prod.brand.slice(0, 2).toUpperCase() : 'BR'}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                            {prod.name}
                          </p>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                            {prod.sku} • {prod.barcode}
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="text-xs font-bold text-slate-900 dark:text-white font-mono">
                          {formatCurrency(prod.price, settings.currency)}
                        </div>
                        <div className="text-[10px] text-amber-600 dark:text-amber-400 font-mono">
                          HPP: {formatCurrency(prod.costPrice, settings.currency)}
                        </div>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="p-4 text-center text-xs text-slate-400">
                    Tidak ada produk cocok dengan pencarian &ldquo;{productSearch}&rdquo;
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 flex-wrap shrink-0">
          <button
            id="btn-add-price-change"
            onClick={handleOpenAddPrice}
            className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer transition-all active:scale-95"
            title="Catat pembaruan harga modal / harga jual baru ke riwayat"
          >
            <Plus className="w-4 h-4" />
            <span>Catat Perubahan Harga</span>
          </button>

          <button
            id="btn-export-price-history-csv"
            onClick={() => exportPriceHistoryCSV(currentProduct, filteredHistory)}
            className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
            title="Ekspor riwayat harga ke file spreadsheet CSV"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span className="hidden sm:inline">Ekspor CSV</span>
          </button>

          <button
            id="btn-print-price-history"
            onClick={handlePrint}
            className="p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center justify-center cursor-pointer transition-colors shadow-2xs"
            title="Cetak lembar laporan riwayat harga"
          >
            <Printer className="w-4 h-4" />
          </button>

          {isModal && onClose && (
            <button
              onClick={onClose}
              className="p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
              title="Tutup riwayat harga"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* METRIC CARDS */}
      {analytics && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Card 1: Harga Jual Retail Terkini */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center justify-between">
              <span>Harga Jual Retail</span>
              <Tag className="w-3.5 h-3.5 text-emerald-500" />
            </span>
            <div className="text-base sm:text-lg font-black font-mono text-emerald-600 dark:text-emerald-400">
              {formatCurrency(analytics.currentPrice, settings.currency)}
            </div>
            <div className="flex items-center gap-1 text-[11px] font-medium">
              {analytics.priceChangeNominal !== 0 ? (
                <span
                  className={`flex items-center gap-0.5 font-bold ${
                    analytics.priceChangeNominal > 0 ? 'text-emerald-600' : 'text-rose-600'
                  }`}
                >
                  {analytics.priceChangeNominal > 0 ? (
                    <TrendingUp className="w-3 h-3" />
                  ) : (
                    <TrendingDown className="w-3 h-3" />
                  )}
                  {analytics.priceChangeNominal > 0 ? '+' : ''}
                  {formatCurrency(analytics.priceChangeNominal, settings.currency)} (
                  {analytics.priceChangePercent.toFixed(1)}%)
                </span>
              ) : (
                <span className="text-slate-400">Tetap stabil dari periode lalu</span>
              )}
            </div>
          </div>

          {/* Card 2: Harga Modal (HPP Kulakan) */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center justify-between">
              <span>Harga Modal (HPP)</span>
              <DollarSign className="w-3.5 h-3.5 text-amber-500" />
            </span>
            <div className="text-base sm:text-lg font-black font-mono text-amber-600 dark:text-amber-400">
              {formatCurrency(analytics.currentCost, settings.currency)}
            </div>
            <div className="flex items-center gap-1 text-[11px] font-medium">
              {analytics.costChangeNominal !== 0 ? (
                <span
                  className={`flex items-center gap-0.5 font-bold ${
                    analytics.costChangeNominal > 0 ? 'text-rose-600' : 'text-emerald-600'
                  }`}
                >
                  {analytics.costChangeNominal > 0 ? (
                    <TrendingUp className="w-3 h-3" />
                  ) : (
                    <TrendingDown className="w-3 h-3" />
                  )}
                  {analytics.costChangeNominal > 0 ? '+' : ''}
                  {formatCurrency(analytics.costChangeNominal, settings.currency)} (
                  {analytics.costChangePercent.toFixed(1)}%)
                </span>
              ) : (
                <span className="text-slate-400">Modal belum mengalami kenaikan</span>
              )}
            </div>
          </div>

          {/* Card 3: Gross Profit Margin */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center justify-between">
              <span>Margin Laba Kotor</span>
              <Percent className="w-3.5 h-3.5 text-indigo-500" />
            </span>
            <div className="text-base sm:text-lg font-black font-mono text-indigo-600 dark:text-indigo-400">
              {analytics.currentMarginPercent.toFixed(1)}%
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
              Laba: {formatCurrency(analytics.currentMarginNominal, settings.currency)} / {currentProduct.unit}
            </div>
          </div>

          {/* Card 4: Rentang Fluktuasi HPP */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center justify-between">
              <span>Rentang Fluktuasi Modal</span>
              <ArrowUpDown className="w-3.5 h-3.5 text-blue-500" />
            </span>
            <div className="text-xs sm:text-sm font-bold font-mono text-slate-800 dark:text-slate-200">
              {formatCurrency(analytics.lowestCost, settings.currency)} s/d{' '}
              {formatCurrency(analytics.highestCost, settings.currency)}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
              Deviasi: {analytics.volatilityPercentage.toFixed(1)}% ({formatCurrency(analytics.highestCost - analytics.lowestCost, settings.currency)})
            </div>
          </div>

          {/* Card 5: Stabilitas & Rating Volatilitas */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-1 col-span-2 lg:col-span-1">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center justify-between">
              <span>Stabilitas Harga</span>
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            </span>
            <div>
              <span
                className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold ${
                  analytics.volatilityRating === 'Stabil'
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300'
                    : analytics.volatilityRating === 'Moderat'
                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300'
                    : 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300'
                }`}
              >
                {analytics.volatilityRating}
              </span>
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400">
              {analytics.totalRecords} titik riwayat harga tercatat
            </div>
          </div>
        </div>
      )}

      {/* VISUAL CHART SECTION WITH TIMEFRAME TOGGLE */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Grafik Fluktuasi Modal (HPP) & Harga Jual Retail Seiring Waktu</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Garis hijau menunjukkan harga jual retail, garis oranye menunjukkan harga modal kulakan supplier
            </p>
          </div>

          {/* Timeframe Switcher Buttons */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl shrink-0">
            {[
              { label: '1 Bln', val: '30' },
              { label: '3 Bln', val: '90' },
              { label: '6 Bln', val: '180' },
              { label: '1 Thn', val: '365' },
              { label: 'Semua', val: 'all' },
            ].map((tf) => (
              <button
                key={tf.val}
                type="button"
                onClick={() => setTimeframeFilter(tf.val as any)}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                  timeframeFilter === tf.val
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                {tf.label}
              </button>
            ))}
          </div>
        </div>

        {/* Dual Line SVG Chart */}
        <ProductPriceChart
          history={filteredHistory}
          currency={settings.currency}
          unitName={currentProduct.unit}
        />
      </div>

      {/* DETAILED HISTORICAL LOG TABLE */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        {/* Table Header Controls */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
              Log Detail Perubahan Harga ({tableRecords.length} Catatan)
            </h4>
          </div>

          {/* Change Type Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-2.5 py-1 text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 cursor-pointer font-medium"
            >
              <option value="all">Semua Tipe Perubahan</option>
              <option value="purchase_receiving">Faktur Supplier / Kulakan</option>
              <option value="manual_update">Penyesuaian Manual</option>
              <option value="bulk_adjust">Koreksi Massal</option>
              <option value="promotion">Harga Promo</option>
              <option value="initial_record">Registrasi Awal</option>
            </select>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 font-semibold text-slate-600 dark:text-slate-400">
                <th className="py-3 px-4">Tanggal & Waktu</th>
                <th className="py-3 px-4">Tipe Perubahan</th>
                <th className="py-3 px-4 text-right">Harga Modal (HPP)</th>
                <th className="py-3 px-4 text-right">Harga Jual Retail</th>
                <th className="py-3 px-4 text-right">Laba Kotor Unit</th>
                <th className="py-3 px-4 text-right">Margin (%)</th>
                <th className="py-3 px-4">Referensi / Supplier</th>
                <th className="py-3 px-4">Keterangan / Alasan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {tableRecords.length > 0 ? (
                tableRecords.map((rec) => {
                  const grossProfit = rec.sellingPrice - rec.costPrice;
                  const marginPct = rec.sellingPrice > 0
                    ? ((grossProfit / rec.sellingPrice) * 100).toFixed(1)
                    : '0';

                  const costDiff = rec.previousCostPrice !== undefined
                    ? rec.costPrice - rec.previousCostPrice
                    : 0;

                  const priceDiff = rec.previousSellingPrice !== undefined
                    ? rec.sellingPrice - rec.previousSellingPrice
                    : 0;

                  return (
                    <tr
                      key={rec.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      {/* Date */}
                      <td className="py-3 px-4 font-mono text-slate-800 dark:text-slate-200 whitespace-nowrap">
                        <div className="font-bold">{formatDate(rec.date)}</div>
                        <div className="text-[10px] text-slate-400">
                          {new Date(rec.date).toLocaleTimeString('id-ID', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}{' '}
                          WIB
                        </div>
                      </td>

                      {/* Type Badge */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {changeTypeBadge(rec.changeType)}
                      </td>

                      {/* Cost Price */}
                      <td className="py-3 px-4 text-right font-mono whitespace-nowrap">
                        <div className="font-bold text-amber-700 dark:text-amber-300">
                          {formatCurrency(rec.costPrice, settings.currency)}
                        </div>
                        {costDiff !== 0 && (
                          <div
                            className={`text-[10px] font-bold flex items-center justify-end gap-0.5 ${
                              costDiff > 0 ? 'text-rose-600' : 'text-emerald-600'
                            }`}
                          >
                            {costDiff > 0 ? '+' : ''}
                            {formatCurrency(costDiff, settings.currency)}
                          </div>
                        )}
                      </td>

                      {/* Selling Price */}
                      <td className="py-3 px-4 text-right font-mono whitespace-nowrap">
                        <div className="font-bold text-emerald-700 dark:text-emerald-300">
                          {formatCurrency(rec.sellingPrice, settings.currency)}
                        </div>
                        {priceDiff !== 0 && (
                          <div
                            className={`text-[10px] font-bold flex items-center justify-end gap-0.5 ${
                              priceDiff > 0 ? 'text-emerald-600' : 'text-rose-600'
                            }`}
                          >
                            {priceDiff > 0 ? '+' : ''}
                            {formatCurrency(priceDiff, settings.currency)}
                          </div>
                        )}
                      </td>

                      {/* Gross Profit */}
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                        {formatCurrency(grossProfit, settings.currency)}
                      </td>

                      {/* Margin % */}
                      <td className="py-3 px-4 text-right font-mono whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            Number(marginPct) >= 20
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300'
                              : Number(marginPct) >= 10
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300'
                              : 'bg-rose-100 text-rose-800 dark:bg-rose-950/70 dark:text-rose-300'
                          }`}
                        >
                          {marginPct}%
                        </span>
                      </td>

                      {/* Reference & Supplier */}
                      <td className="py-3 px-4 text-slate-700 dark:text-slate-300">
                        <div className="font-semibold text-xs font-mono">
                          {rec.sourceReference || '-'}
                        </div>
                        {rec.supplierName && (
                          <div className="text-[10px] text-slate-500 dark:text-slate-400">
                            {rec.supplierName}
                          </div>
                        )}
                      </td>

                      {/* Notes & Recorded By */}
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-400 max-w-xs">
                        <div className="truncate" title={rec.notes}>
                          {rec.notes || '-'}
                        </div>
                        {rec.recordedBy && (
                          <div className="text-[10px] text-slate-400">Oleh: {rec.recordedBy}</div>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    Tidak ada catatan perubahan harga untuk filter ini.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: ADD / RECORD NEW PRICE ADJUSTMENT */}
      {isAddPriceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/50">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    Catat Perubahan Harga Baru
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-xs">
                    {currentProduct.name} ({currentProduct.sku})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddPriceModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveNewPrice} className="p-4 space-y-4 overflow-y-auto flex-1 text-xs">
              {/* Previous vs New Comparison */}
              <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800">
                <div>
                  <span className="text-[10px] text-slate-400 block">Harga Saat Ini:</span>
                  <div className="font-mono text-emerald-600 font-bold">
                    Jual: {formatCurrency(currentProduct.price, settings.currency)}
                  </div>
                  <div className="font-mono text-amber-600 font-bold">
                    Modal: {formatCurrency(currentProduct.costPrice, settings.currency)}
                  </div>
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 block">Margin Saat Ini:</span>
                  <div className="font-mono font-black text-indigo-600">
                    {(((currentProduct.price - currentProduct.costPrice) / (currentProduct.price || 1)) * 100).toFixed(1)}%
                  </div>
                  <div className="text-[10px] text-slate-500">
                    Rp {currentProduct.price - currentProduct.costPrice} / {currentProduct.unit}
                  </div>
                </div>
              </div>

              {/* Price inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                    <span>Harga Jual Retail Baru (Rp)*</span>
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={100}
                    value={newSellingPriceInput}
                    onChange={(e) => setNewSellingPriceInput(Number(e.target.value))}
                    required
                    className="w-full px-3 py-2 font-mono font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                    <span>Harga Modal / HPP Baru (Rp)*</span>
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={100}
                    value={newCostPriceInput}
                    onChange={(e) => setNewCostPriceInput(Number(e.target.value))}
                    required
                    className="w-full px-3 py-2 font-mono font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Calculated preview */}
              <div className="p-3 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900 flex items-center justify-between text-[11px]">
                <span className="font-bold text-indigo-950 dark:text-indigo-200">
                  Estimasi Margin Baru:
                </span>
                <span className="font-mono font-black text-indigo-700 dark:text-indigo-300">
                  {newSellingPriceInput > 0
                    ? (((newSellingPriceInput - newCostPriceInput) / newSellingPriceInput) * 100).toFixed(1)
                    : 0}
                  % ({formatCurrency(newSellingPriceInput - newCostPriceInput, settings.currency)} /{' '}
                  {currentProduct.unit})
                </span>
              </div>

              {/* Change Type & Source */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-800 dark:text-slate-200">
                    Tipe Perubahan*
                  </label>
                  <select
                    value={changeTypeInput}
                    onChange={(e) => setChangeTypeInput(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 font-medium"
                  >
                    <option value="manual_update">Penyesuaian Manual Toko</option>
                    <option value="purchase_receiving">Penerimaan Faktur Supplier</option>
                    <option value="promotion">Penetapan Harga Promo</option>
                    <option value="bulk_adjust">Koreksi Massal</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-800 dark:text-slate-200">
                    No. Faktur / Referensi
                  </label>
                  <input
                    type="text"
                    value={sourceRefInput}
                    onChange={(e) => setSourceRefInput(e.target.value)}
                    placeholder="Contoh: INV-SUP-2026-04"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-800 dark:text-slate-200">
                  Nama Supplier / Pemasok (Opsional)
                </label>
                <input
                  type="text"
                  value={supplierNameInput}
                  onChange={(e) => setSupplierNameInput(e.target.value)}
                  placeholder="Contoh: PT Indomarco, Wings Surya, dll."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-800 dark:text-slate-200">
                  Keterangan / Alasan Fluktuasi
                </label>
                <textarea
                  value={notesInput}
                  onChange={(e) => setNotesInput(e.target.value)}
                  placeholder="Contoh: Kenaikan harga pabrik distributor per 1 September, penyesuaian margin target 20%..."
                  rows={2}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddPriceModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold text-slate-700 dark:text-slate-300 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold cursor-pointer transition-all shadow-xs"
                >
                  Simpan &amp; Terapkan Harga
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

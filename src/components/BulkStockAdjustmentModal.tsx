import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  SlidersHorizontal,
  Package,
  Calendar,
  Check,
  AlertTriangle,
  Plus,
  Minus,
  Trash2,
  RotateCcw,
  Search,
  Sparkles,
  Info,
  Layers,
  ChevronDown,
  CheckCircle2,
  AlertCircle,
  Tag,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Clock,
  UserCheck,
} from 'lucide-react';
import { Product } from '../types';
import { usePOS } from '../context/POSContext';
import { formatCurrency } from '../utils/formatters';

export interface BulkStockAdjustmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialSelectedProductIds?: string[];
  onSuccess?: (count: number, notes: string) => void;
}

interface BulkAdjustItem {
  product: Product;
  originalStock: number;
  newStock: number;
  originalExpiry: string;
  newExpiry: string;
  isSelected: boolean;
}

const ADJUSTMENT_REASONS = [
  'Stock Opname Rutin / Berkala',
  'Audit Selisih Fisik Rak Toko',
  'Pembaruan Batch & Tanggal Kadaluarsa Distributor',
  'Pembersihan Barang Rusak / Kadaluarsa (Ditarik)',
  'Penerimaan Barang Bonus / Non-Faktur',
  'Penyesuaian Koreksi Manual Lainnya',
];

export const BulkStockAdjustmentModal: React.FC<BulkStockAdjustmentModalProps> = ({
  isOpen,
  onClose,
  initialSelectedProductIds = [],
  onSuccess,
}) => {
  const { products, bulkAdjustProducts, activeEmployee, settings } = usePOS();

  // Internal items state
  const [items, setItems] = useState<BulkAdjustItem[]>([]);
  const [searchFilter, setSearchFilter] = useState('');
  const [catalogSearch, setCatalogSearch] = useState('');
  const [isAddProductDropdownOpen, setIsAddProductDropdownOpen] = useState(false);

  // Batch action presets
  const [uniformExpiryDate, setUniformExpiryDate] = useState('');
  const [uniformQtyMode, setUniformQtyMode] = useState<'add' | 'subtract' | 'set'>('add');
  const [uniformQtyValue, setUniformQtyValue] = useState<number>(10);

  // Audit notes & reason
  const [selectedReason, setSelectedReason] = useState(ADJUSTMENT_REASONS[0]);
  const [customNotes, setCustomNotes] = useState('');

  // Confirmation state
  const [isConfirming, setIsConfirming] = useState(false);

  // Populate items when modal opens or initial IDs change
  useEffect(() => {
    if (!isOpen) {
      setItems([]);
      setIsConfirming(false);
      return;
    }

    let targetProducts: Product[] = [];
    if (initialSelectedProductIds && initialSelectedProductIds.length > 0) {
      const idSet = new Set(initialSelectedProductIds);
      targetProducts = products.filter((p) => idSet.has(p.id));
    }

    // If no initial IDs specified or found, fallback to first 10 products or empty
    if (targetProducts.length === 0) {
      targetProducts = products.slice(0, 10);
    }

    setItems(
      targetProducts.map((p) => ({
        product: p,
        originalStock: p.stock,
        newStock: p.stock,
        originalExpiry: p.expiryDate || '',
        newExpiry: p.expiryDate || '',
        isSelected: true,
      }))
    );
    setSearchFilter('');
    setCatalogSearch('');
    setIsConfirming(false);
  }, [isOpen, initialSelectedProductIds, products]);

  if (!isOpen) return null;

  // Filtered rows inside modal
  const filteredItems = items.filter((item) => {
    const q = searchFilter.toLowerCase().trim();
    if (!q) return true;
    return (
      item.product.name.toLowerCase().includes(q) ||
      item.product.sku.toLowerCase().includes(q) ||
      item.product.barcode.toLowerCase().includes(q) ||
      (item.product.brand && item.product.brand.toLowerCase().includes(q))
    );
  });

  // Candidate products from catalog not yet in items
  const itemProductIds = new Set(items.map((i) => i.product.id));
  const candidateProducts = products
    .filter((p) => !itemProductIds.has(p.id))
    .filter((p) => {
      if (!catalogSearch.trim()) return true;
      const q = catalogSearch.toLowerCase().trim();
      return (
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.barcode.toLowerCase().includes(q) ||
        (p.brand && p.brand.toLowerCase().includes(q))
      );
    })
    .slice(0, 15);

  const handleAddProductToItems = (prod: Product) => {
    setItems((prev) => [
      ...prev,
      {
        product: prod,
        originalStock: prod.stock,
        newStock: prod.stock,
        originalExpiry: prod.expiryDate || '',
        newExpiry: prod.expiryDate || '',
        isSelected: true,
      },
    ]);
    setCatalogSearch('');
    setIsAddProductDropdownOpen(false);
  };

  const handleRemoveItem = (productId: string) => {
    setItems((prev) => prev.filter((i) => i.product.id !== productId));
  };

  const handleToggleSelectAll = () => {
    const allSelected = filteredItems.every((i) => i.isSelected);
    const targetIds = new Set(filteredItems.map((i) => i.product.id));
    setItems((prev) =>
      prev.map((i) => (targetIds.has(i.product.id) ? { ...i, isSelected: !allSelected } : i))
    );
  };

  const handleToggleSelectItem = (productId: string) => {
    setItems((prev) =>
      prev.map((i) => (i.product.id === productId ? { ...i, isSelected: !i.isSelected } : i))
    );
  };

  const handleStockChange = (productId: string, val: number) => {
    const clamped = Math.max(0, val);
    setItems((prev) =>
      prev.map((i) => (i.product.id === productId ? { ...i, newStock: clamped } : i))
    );
  };

  const handleStockDelta = (productId: string, delta: number) => {
    setItems((prev) =>
      prev.map((i) => {
        if (i.product.id === productId) {
          return { ...i, newStock: Math.max(0, i.newStock + delta) };
        }
        return i;
      })
    );
  };

  const handleExpiryChange = (productId: string, val: string) => {
    setItems((prev) =>
      prev.map((i) => (i.product.id === productId ? { ...i, newExpiry: val } : i))
    );
  };

  // Helper date generators
  const getPresetDate = (months: number): string => {
    const d = new Date();
    d.setMonth(d.getMonth() + months);
    return d.toISOString().split('T')[0];
  };

  const getEndOfYearDate = (): string => {
    const d = new Date();
    return `${d.getFullYear()}-12-31`;
  };

  // Apply uniform expiry date to selected items
  const handleApplyUniformExpiry = (targetDate: string) => {
    setItems((prev) =>
      prev.map((item) => (item.isSelected ? { ...item, newExpiry: targetDate } : item))
    );
  };

  // Apply uniform quantity adjustment to selected items
  const handleApplyUniformQuantity = () => {
    if (uniformQtyValue < 0) return;
    setItems((prev) =>
      prev.map((item) => {
        if (!item.isSelected) return item;
        let updated = item.newStock;
        if (uniformQtyMode === 'add') {
          updated = item.newStock + uniformQtyValue;
        } else if (uniformQtyMode === 'subtract') {
          updated = Math.max(0, item.newStock - uniformQtyValue);
        } else {
          updated = uniformQtyValue;
        }
        return { ...item, newStock: updated };
      })
    );
  };

  // Reset all items to original stock and expiry
  const handleResetToOriginal = () => {
    setItems((prev) =>
      prev.map((item) => ({
        ...item,
        newStock: item.originalStock,
        newExpiry: item.originalExpiry,
      }))
    );
  };

  // Expiry date status helper
  const getExpiryStatus = (dateStr?: string) => {
    if (!dateStr) {
      return {
        label: 'Belum Diatur',
        badge: 'text-slate-500 bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700',
      };
    }
    const target = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return {
        label: `Kadaluarsa (${Math.abs(diffDays)} hari lalu)`,
        badge: 'text-rose-700 bg-rose-50 border-rose-200 dark:bg-rose-950/80 dark:text-rose-300 dark:border-rose-800',
      };
    }
    if (diffDays <= 30) {
      return {
        label: `Kritis (${diffDays} hari lagi)`,
        badge: 'text-red-700 bg-red-50 border-red-200 dark:bg-red-950/80 dark:text-red-300 dark:border-red-800',
      };
    }
    if (diffDays <= 90) {
      return {
        label: `Mendekati (${diffDays} hari lagi)`,
        badge: 'text-amber-700 bg-amber-50 border-amber-200 dark:bg-amber-950/80 dark:text-amber-300 dark:border-amber-800',
      };
    }
    return {
      label: `Aman (${diffDays} hari lagi)`,
      badge: 'text-emerald-700 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-800',
    };
  };

  // Metrics summary
  const totalLoaded = items.length;
  const stockChangedItems = items.filter((i) => i.newStock !== i.originalStock);
  const expiryChangedItems = items.filter((i) => i.newExpiry !== i.originalExpiry);
  const changedItemsCount = items.filter(
    (i) => i.newStock !== i.originalStock || i.newExpiry !== i.originalExpiry
  ).length;

  const totalStockDelta = items.reduce((sum, i) => sum + (i.newStock - i.originalStock), 0);
  const totalValuationDelta = items.reduce(
    (sum, i) => sum + (i.newStock - i.originalStock) * i.product.costPrice,
    0
  );

  const selectedCount = items.filter((i) => i.isSelected).length;

  // Submit Bulk Adjustments
  const handleConfirmSave = () => {
    if (items.length === 0) return;

    const adjustments = items.map((i) => ({
      id: i.product.id,
      stock: i.newStock,
      expiryDate: i.newExpiry ? i.newExpiry : undefined,
    }));

    const auditRemark = `${selectedReason}${customNotes.trim() ? ` - ${customNotes.trim()}` : ''}`;
    bulkAdjustProducts(adjustments, auditRemark);

    if (onSuccess) {
      onSuccess(items.length, auditRemark);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/85 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-5xl rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-slate-950 flex items-center justify-center shadow-md shadow-emerald-500/20">
              <SlidersHorizontal className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                  Penyesuaian Stok & Kadaluarsa Massal
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  Bulk Stock & FEFO
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Perbarui kuantitas stok fisik dan tanggal kadaluarsa beberapa barang secara serentak dalam satu operasi.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700 text-xs">
              <UserCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span className="text-slate-500 dark:text-slate-400">Operator:</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">
                {activeEmployee?.name || 'Store Manager'}
              </span>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 transition cursor-pointer"
              title="Tutup (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Global Toolbar & Presets */}
        <div className="p-4 bg-slate-50/70 dark:bg-slate-850/60 border-b border-slate-200 dark:border-slate-800 space-y-3">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 text-xs">
            {/* Tool 1: Expiry Date Presets */}
            <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-blue-500" />
                  <span>Set Kadaluarsa Serentak ({selectedCount} Terpilih)</span>
                </span>
                <span className="text-[10px] text-slate-400">FEFO Expiry</span>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <input
                  type="date"
                  value={uniformExpiryDate}
                  onChange={(e) => setUniformExpiryDate(e.target.value)}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />

                <div className="flex items-center gap-1 flex-wrap">
                  <button
                    type="button"
                    onClick={() => {
                      const d = getPresetDate(3);
                      setUniformExpiryDate(d);
                      handleApplyUniformExpiry(d);
                    }}
                    className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-medium transition cursor-pointer"
                  >
                    +3 Bulan
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const d = getPresetDate(6);
                      setUniformExpiryDate(d);
                      handleApplyUniformExpiry(d);
                    }}
                    className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-medium transition cursor-pointer"
                  >
                    +6 Bulan
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const d = getPresetDate(12);
                      setUniformExpiryDate(d);
                      handleApplyUniformExpiry(d);
                    }}
                    className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-medium transition cursor-pointer"
                  >
                    +1 Tahun
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const d = getEndOfYearDate();
                      setUniformExpiryDate(d);
                      handleApplyUniformExpiry(d);
                    }}
                    className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-medium transition cursor-pointer"
                  >
                    Akhir Tahun
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setUniformExpiryDate('');
                      handleApplyUniformExpiry('');
                    }}
                    className="px-2 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 text-[11px] font-medium border border-rose-200 dark:border-rose-900 transition cursor-pointer"
                    title="Kosongkan tanggal kadaluarsa item terpilih"
                  >
                    Kosongkan
                  </button>
                </div>
              </div>

              {uniformExpiryDate && (
                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={() => handleApplyUniformExpiry(uniformExpiryDate)}
                    className="px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-[11px] transition cursor-pointer"
                  >
                    Terapkan Tanggal ke {selectedCount} Baris
                  </button>
                </div>
              )}
            </div>

            {/* Tool 2: Quantity Adjustment Presets */}
            <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Penyesuaian Stok Serentak ({selectedCount} Terpilih)</span>
                </span>
                <span className="text-[10px] text-slate-400">Batch Qty</span>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center rounded-xl bg-slate-100 dark:bg-slate-800 p-0.5 border border-slate-200 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={() => setUniformQtyMode('add')}
                    className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition cursor-pointer ${
                      uniformQtyMode === 'add'
                        ? 'bg-emerald-500 text-slate-950 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    + Tambah
                  </button>
                  <button
                    type="button"
                    onClick={() => setUniformQtyMode('subtract')}
                    className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition cursor-pointer ${
                      uniformQtyMode === 'subtract'
                        ? 'bg-amber-500 text-slate-950 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    - Kurang
                  </button>
                  <button
                    type="button"
                    onClick={() => setUniformQtyMode('set')}
                    className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition cursor-pointer ${
                      uniformQtyMode === 'set'
                        ? 'bg-blue-500 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    = Set Tetap
                  </button>
                </div>

                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min={0}
                    value={uniformQtyValue}
                    onChange={(e) => setUniformQtyValue(Number(e.target.value))}
                    className="w-20 px-2.5 py-1 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono font-bold text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    placeholder="10"
                  />
                  <span className="text-[11px] text-slate-500">Unit</span>
                </div>

                <button
                  type="button"
                  onClick={handleApplyUniformQuantity}
                  className="ml-auto px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-[11px] transition cursor-pointer"
                >
                  Terapkan Qty ke {selectedCount} Baris
                </button>
              </div>
            </div>
          </div>

          {/* Search Table & Add Products Toolbar */}
          <div className="flex items-center justify-between gap-3 flex-wrap pt-1">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Saring nama barang di tabel ini..."
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            {/* Combobox to add more products */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsAddProductDropdownOpen(!isAddProductDropdownOpen)}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold flex items-center gap-1.5 border border-slate-700 cursor-pointer shadow-xs"
              >
                <Plus className="w-3.5 h-3.5 text-emerald-400" />
                <span>+ Tambah Produk Lain ({candidateProducts.length} Tersedia)</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {isAddProductDropdownOpen && (
                <div className="absolute right-0 mt-1.5 w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl z-30 p-2 text-xs">
                  <div className="p-1 mb-1">
                    <input
                      type="text"
                      autoFocus
                      value={catalogSearch}
                      onChange={(e) => setCatalogSearch(e.target.value)}
                      placeholder="Cari produk dari katalog..."
                      className="w-full px-2.5 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                    />
                  </div>
                  <div className="max-h-56 overflow-y-auto space-y-1">
                    {candidateProducts.length === 0 ? (
                      <div className="p-3 text-center text-slate-400 text-xs">
                        Tidak ada produk tambahan yang cocok.
                      </div>
                    ) : (
                      candidateProducts.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => handleAddProductToItems(p)}
                          className="w-full text-left p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-between gap-2 transition cursor-pointer"
                        >
                          <div className="min-w-0">
                            <p className="font-bold text-slate-900 dark:text-slate-100 truncate">
                              {p.name}
                            </p>
                            <span className="text-[10px] text-slate-400 font-mono">
                              Stok: {p.stock} • SKU: {p.sku}
                            </span>
                          </div>
                          <span className="px-2 py-0.5 rounded-lg bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[10px] font-bold shrink-0">
                            + Masukkan
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={handleResetToOriginal}
              className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-semibold flex items-center gap-1 cursor-pointer transition"
              title="Kembalikan semua nilai ke kondisi awal sistem"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Nilai Awal</span>
            </button>
          </div>
        </div>

        {/* Table List of Items */}
        <div className="flex-1 overflow-auto">
          {filteredItems.length === 0 ? (
            <div className="py-16 text-center text-slate-400 text-xs">
              <Package className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
              <p>Tidak ada produk yang dimuat untuk penyesuaian massal.</p>
              <p className="text-[11px] text-slate-500 mt-1">
                Gunakan tombol "+ Tambah Produk Lain" di atas untuk memasukkan item.
              </p>
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100 dark:bg-slate-800/90 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold uppercase tracking-wider text-[10px] sticky top-0 z-10 backdrop-blur-xs">
                <tr>
                  <th className="py-3 px-3 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={filteredItems.length > 0 && filteredItems.every((i) => i.isSelected)}
                      onChange={handleToggleSelectAll}
                      className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer accent-emerald-600"
                      title="Pilih semua baris yang tampil"
                    />
                  </th>
                  <th className="py-3 px-4">Nama Produk & Barcode</th>
                  <th className="py-3 px-3 text-center w-28">Stok Sistem</th>
                  <th className="py-3 px-4 text-center w-52">Stok Baru (Aktual)</th>
                  <th className="py-3 px-4 w-60">Tanggal Kadaluarsa (FEFO)</th>
                  <th className="py-3 px-3 text-center w-14">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {filteredItems.map((item) => {
                  const p = item.product;
                  const delta = item.newStock - item.originalStock;
                  const expiryInfo = getExpiryStatus(item.newExpiry);
                  const isExpiryChanged = item.newExpiry !== item.originalExpiry;
                  const isStockChanged = item.newStock !== item.originalStock;

                  return (
                    <tr
                      key={p.id}
                      className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${
                        item.isSelected ? 'bg-slate-50/60 dark:bg-slate-850/40' : ''
                      }`}
                    >
                      {/* Select Checkbox */}
                      <td className="py-3 px-3 text-center">
                        <input
                          type="checkbox"
                          checked={item.isSelected}
                          onChange={() => handleToggleSelectItem(p.id)}
                          className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer accent-emerald-600"
                        />
                      </td>

                      {/* Product details */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          {p.image ? (
                            <img
                              src={p.image}
                              alt={p.name}
                              className="w-9 h-9 rounded-lg object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center shrink-0">
                              <Package className="w-4 h-4" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <h4 className="font-bold text-slate-900 dark:text-white truncate">
                                {p.name}
                              </h4>
                              {p.brand && (
                                <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500">
                                  ({p.brand})
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono mt-0.5">
                              <span>SKU: {p.sku}</span>
                              {p.barcode && <span>• Barcode: {p.barcode}</span>}
                              <span>• Satuan: {p.unit}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Original Stock */}
                      <td className="py-3 px-3 text-center">
                        <span className="font-mono font-bold text-sm text-slate-700 dark:text-slate-300">
                          {item.originalStock}
                        </span>
                        <span className="text-[10px] text-slate-400 block font-mono">
                          {p.unit}
                        </span>
                      </td>

                      {/* New Stock & Stepper */}
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleStockDelta(p.id, -5)}
                            className="w-6 h-6 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-[10px] font-bold transition"
                            title="-5 Unit"
                          >
                            -5
                          </button>
                          <button
                            type="button"
                            onClick={() => handleStockDelta(p.id, -1)}
                            className="w-6 h-6 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold transition"
                            title="-1 Unit"
                          >
                            <Minus className="w-3 h-3 mx-auto" />
                          </button>

                          <input
                            type="number"
                            min={0}
                            value={item.newStock}
                            onChange={(e) => handleStockChange(p.id, Number(e.target.value))}
                            className={`w-16 py-1 px-1.5 text-center font-mono font-bold text-xs rounded-lg border transition ${
                              isStockChanged
                                ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-400 text-emerald-900 dark:text-emerald-200'
                                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white'
                            }`}
                          />

                          <button
                            type="button"
                            onClick={() => handleStockDelta(p.id, 1)}
                            className="w-6 h-6 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold transition"
                            title="+1 Unit"
                          >
                            <Plus className="w-3 h-3 mx-auto" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleStockDelta(p.id, 5)}
                            className="w-6 h-6 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-[10px] font-bold transition"
                            title="+5 Unit"
                          >
                            +5
                          </button>
                        </div>

                        {/* Delta indicator */}
                        <div className="mt-1">
                          {delta > 0 ? (
                            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                              +{delta} {p.unit}
                            </span>
                          ) : delta < 0 ? (
                            <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 font-mono">
                              {delta} {p.unit}
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400 font-mono">
                              = Tetap
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Expiry Date Control */}
                      <td className="py-3 px-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5">
                            <input
                              type="date"
                              value={item.newExpiry}
                              onChange={(e) => handleExpiryChange(p.id, e.target.value)}
                              className={`w-full px-2 py-1 text-xs rounded-lg border font-mono transition ${
                                isExpiryChanged
                                  ? 'bg-blue-50 dark:bg-blue-950/50 border-blue-400 text-blue-900 dark:text-blue-200'
                                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white'
                              }`}
                            />

                            <button
                              type="button"
                              onClick={() => handleExpiryChange(p.id, getPresetDate(6))}
                              className="px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-[10px] font-medium shrink-0"
                              title="Set +6 Bulan dari sekarang"
                            >
                              +6 Bln
                            </button>

                            {item.newExpiry && (
                              <button
                                type="button"
                                onClick={() => handleExpiryChange(p.id, '')}
                                className="p-1 rounded-md hover:bg-rose-100 dark:hover:bg-rose-950 text-slate-400 hover:text-rose-600 transition shrink-0"
                                title="Hapus tanggal kadaluarsa"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>

                          <div className="flex items-center justify-between">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${expiryInfo.badge}`}>
                              {expiryInfo.label}
                            </span>

                            {isExpiryChanged && (
                              <span className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold">
                                *Diperbarui
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Action */}
                      <td className="py-3 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(p.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition cursor-pointer"
                          title="Hapus dari antrean penyesuaian massal"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Audit Reason & Remarks */}
        <div className="p-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Alasan Penyesuaian Massal / Audit
              </label>
              <select
                value={selectedReason}
                onChange={(e) => setSelectedReason(e.target.value)}
                className="w-full p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-medium"
              >
                {ADJUSTMENT_REASONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Catatan Tambahan / No. Dokumen Referensi (Opsional)
              </label>
              <input
                type="text"
                value={customNotes}
                onChange={(e) => setCustomNotes(e.target.value)}
                placeholder="Contoh: Berita Acara Stock Opname Rak Makanan Ringan #2026-09"
                className="w-full p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {/* Real-time Impact Summary & Confirmation Card */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-slate-100 via-emerald-50/50 to-slate-100 dark:from-slate-850 dark:via-emerald-950/20 dark:to-slate-850 border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-4 flex-wrap">
              <div>
                <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">
                  Total Item Dimuat
                </span>
                <span className="font-bold font-mono text-sm text-slate-800 dark:text-slate-200">
                  {totalLoaded} Produk
                </span>
              </div>

              <div className="h-6 w-px bg-slate-300 dark:bg-slate-700" />

              <div>
                <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">
                  Perubahan Stok
                </span>
                <span className="font-bold font-mono text-sm text-slate-900 dark:text-white">
                  {stockChangedItems.length} Produk (
                  <span
                    className={
                      totalStockDelta > 0
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : totalStockDelta < 0
                        ? 'text-rose-600 dark:text-rose-400'
                        : 'text-slate-400'
                    }
                  >
                    {totalStockDelta > 0 ? `+${totalStockDelta}` : totalStockDelta} Unit
                  </span>
                  )
                </span>
              </div>

              <div className="h-6 w-px bg-slate-300 dark:bg-slate-700" />

              <div>
                <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">
                  Perubahan Kadaluarsa
                </span>
                <span className="font-bold font-mono text-sm text-blue-600 dark:text-blue-400">
                  {expiryChangedItems.length} Produk
                </span>
              </div>

              <div className="h-6 w-px bg-slate-300 dark:bg-slate-700" />

              <div>
                <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">
                  Estimasi Nilai Dampak HPP
                </span>
                <span
                  className={`font-bold font-mono text-sm ${
                    totalValuationDelta >= 0
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-rose-600 dark:text-rose-400'
                  }`}
                >
                  {totalValuationDelta >= 0 ? '+' : ''}
                  {formatCurrency(totalValuationDelta, settings.currency)}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold transition cursor-pointer text-xs"
              >
                Batal
              </button>

              <button
                type="button"
                disabled={items.length === 0}
                onClick={handleConfirmSave}
                className={`px-5 py-2 rounded-xl font-bold text-xs flex items-center gap-2 transition cursor-pointer shadow-md ${
                  items.length === 0
                    ? 'bg-slate-300 dark:bg-slate-800 text-slate-500 cursor-not-allowed'
                    : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20 active:scale-95'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>
                  Terapkan Penyesuaian ({changedItemsCount > 0 ? `${changedItemsCount} Item Berubah` : `${items.length} Item`})
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

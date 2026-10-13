import React, { useState, useEffect, useMemo, useDeferredValue } from 'react';
import {
  Sparkles,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Check,
  CheckCheck,
  Sliders,
  DollarSign,
  AlertTriangle,
  Clock,
  Layers,
  ArrowRight,
  Search,
  Filter,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  LayoutGrid,
  List,
  Info,
  Building2,
  Percent,
  CheckCircle2,
  Package,
  Store,
  Flame,
  Zap,
  ShieldCheck,
  Edit2,
  SlidersHorizontal,
  X,
  SlidersVertical,
  HelpCircle,
} from 'lucide-react';
import {
  Product,
  Transaction,
  DynamicPricingSuggestion,
  DynamicPricingStrategy,
  CompetitorPrice,
  PriceHistoryRecord,
} from '../types';
import { formatCurrency } from '../utils/formatters';
import {
  fetchAIDynamicPricing,
  generateDynamicPricingSuggestions,
  roundToIndonesianRetailPrice,
  getEffectiveCompetitors,
} from '../utils/dynamicPricingEngine';

interface DynamicPricingModuleProps {
  products: Product[];
  transactions: Transaction[];
  categories: { id: string; name: string }[];
  currency?: string;
  onApplyPriceUpdate: (
    productId: string,
    newPrice: number,
    historyRecord: PriceHistoryRecord
  ) => void;
  onApplyBatchPriceUpdates?: (
    updates: { productId: string; newPrice: number; historyRecord: PriceHistoryRecord }[]
  ) => void;
  onUpdateProductCompetitors?: (productId: string, competitors: CompetitorPrice[]) => void;
  className?: string;
}

export const DynamicPricingModule: React.FC<DynamicPricingModuleProps> = ({
  products,
  transactions,
  categories,
  currency = 'IDR',
  onApplyPriceUpdate,
  onApplyBatchPriceUpdates,
  onUpdateProductCompetitors,
  className = '',
}) => {
  // Strategy state
  const [strategy, setStrategy] = useState<DynamicPricingStrategy>('balanced');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [filterAction, setFilterAction] = useState<'all' | 'increase' | 'decrease' | 'clearance' | 'maintain'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const deferredSearchQuery = useDeferredValue(searchQuery);

  // Performance View & Pagination states (prevents UI freeze on large datasets)
  const [viewMode, setViewMode] = useState<'compact' | 'cards'>('compact');
  const [pageSize, setPageSize] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Suggestions state
  const [suggestions, setSuggestions] = useState<DynamicPricingSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isAiGenerated, setIsAiGenerated] = useState<boolean>(false);
  const [modelUsed, setModelUsed] = useState<string>('gemini-3.8-flash');
  const [appliedProductIds, setAppliedProductIds] = useState<Set<string>>(new Set());
  const [lastAnalyzedAt, setLastAnalyzedAt] = useState<Date>(new Date());

  // Interactive modal states
  const [simulatorItem, setSimulatorItem] = useState<DynamicPricingSuggestion | null>(null);
  const [simulatedPrice, setSimulatedPrice] = useState<number>(0);

  const [competitorModalItem, setCompetitorModalItem] = useState<DynamicPricingSuggestion | null>(null);
  const [editableCompetitors, setEditableCompetitors] = useState<CompetitorPrice[]>([]);

  const [customEditItem, setCustomEditItem] = useState<DynamicPricingSuggestion | null>(null);
  const [customInputPrice, setCustomInputPrice] = useState<string>('');

  // Success toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const categoriesMap = useMemo(() => {
    const map = new Map<string, string>();
    categories.forEach((c) => map.set(c.id, c.name));
    return map;
  }, [categories]);

  // Load recommendations
  const loadRecommendations = async (strat: DynamicPricingStrategy, cat: string) => {
    setIsLoading(true);
    try {
      const res = await fetchAIDynamicPricing(products, transactions, categoriesMap, strat, cat);
      setSuggestions(res.suggestions);
      setIsAiGenerated(res.isAiGenerated);
      if (res.modelUsed) setModelUsed(res.modelUsed);
      setLastAnalyzedAt(new Date());
    } catch (err) {
      console.error('Failed to load dynamic pricing:', err);
      // Fallback locally
      const local = generateDynamicPricingSuggestions(products, transactions, categoriesMap, strat, cat);
      setSuggestions(local);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRecommendations(strategy, selectedCategory);
  }, [strategy, selectedCategory, products.length]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Filtered list with deferred search to prevent render blocking
  const filteredSuggestions = useMemo(() => {
    return suggestions.filter((item) => {
      // Search
      if (deferredSearchQuery.trim()) {
        const q = deferredSearchQuery.toLowerCase();
        const matchName = item.productName.toLowerCase().includes(q);
        const matchBrand = (item.brand || '').toLowerCase().includes(q);
        if (!matchName && !matchBrand) return false;
      }
      // Action filter
      if (filterAction === 'increase') return item.actionType === 'increase';
      if (filterAction === 'decrease') return item.actionType === 'decrease';
      if (filterAction === 'clearance') return item.strategyTag === 'Cuci Gudang' || item.turnoverSpeed === 'dead_stock';
      if (filterAction === 'maintain') return item.actionType === 'maintain';
      return true;
    });
  }, [suggestions, deferredSearchQuery, filterAction]);

  // Reset to page 1 on filter or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [deferredSearchQuery, filterAction, selectedCategory, strategy, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filteredSuggestions.length / pageSize));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const paginatedSuggestions = useMemo(() => {
    const start = (safeCurrentPage - 1) * pageSize;
    return filteredSuggestions.slice(start, start + pageSize);
  }, [filteredSuggestions, safeCurrentPage, pageSize]);

  // KPI Calculations
  const kpis = useMemo(() => {
    const totalAnalyzed = suggestions.length;
    const markupItems = suggestions.filter((s) => s.actionType === 'increase');
    const markdownItems = suggestions.filter((s) => s.actionType === 'decrease');
    const clearanceItems = suggestions.filter((s) => s.strategyTag === 'Cuci Gudang');
    const totalPotentialProfit = suggestions.reduce((sum, s) => sum + Math.max(0, s.projectedProfitImpact), 0);

    const priceGaps = suggestions.map((s) => s.priceVsMarketPercent);
    const avgMarketDiff = priceGaps.length > 0 ? (priceGaps.reduce((a, b) => a + b, 0) / priceGaps.length).toFixed(1) : '0';

    return {
      totalAnalyzed,
      markupCount: markupItems.length,
      markdownCount: markdownItems.length,
      clearanceCount: clearanceItems.length,
      totalPotentialProfit,
      avgMarketDiff: Number(avgMarketDiff),
    };
  }, [suggestions]);

  // Apply single recommendation
  const handleApplySingle = (item: DynamicPricingSuggestion, customPrice?: number) => {
    const targetPrice = customPrice !== undefined ? customPrice : item.suggestedPrice;
    if (targetPrice <= 0) return;

    const historyRecord: PriceHistoryRecord = {
      id: `price-hist-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      productId: item.productId,
      date: new Date().toISOString(),
      costPrice: item.costPrice,
      sellingPrice: targetPrice,
      previousCostPrice: item.costPrice,
      previousSellingPrice: item.currentPrice,
      changeType: 'bulk_adjust',
      sourceReference: `AI Dynamic Pricing (${item.strategyTag})`,
      notes: item.aiReasoning || `Penyesuaian harga dinamis via strategi ${strategy}. Selisih: ${targetPrice - item.currentPrice > 0 ? '+' : ''}${targetPrice - item.currentPrice}`,
      recordedBy: 'AI Pricing Optimizer',
    };

    onApplyPriceUpdate(item.productId, targetPrice, historyRecord);
    setAppliedProductIds((prev) => new Set(prev).add(item.productId));
    showToast(`Berhasil memperbarui harga ${item.productName} menjadi ${formatCurrency(targetPrice, currency)}`);
  };

  // Apply all pending recommendations
  const handleApplyAllPending = () => {
    const pendingItems = filteredSuggestions.filter(
      (s) => s.actionType !== 'maintain' && !appliedProductIds.has(s.productId)
    );

    if (pendingItems.length === 0) {
      showToast('Tidak ada penyesuaian harga pending untuk diterapkan');
      return;
    }

    const updates = pendingItems.map((item) => {
      const historyRecord: PriceHistoryRecord = {
        id: `price-hist-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        productId: item.productId,
        date: new Date().toISOString(),
        costPrice: item.costPrice,
        sellingPrice: item.suggestedPrice,
        previousCostPrice: item.costPrice,
        previousSellingPrice: item.currentPrice,
        changeType: 'bulk_adjust',
        sourceReference: `AI Dynamic Pricing Batch (${strategy})`,
        notes: item.aiReasoning,
        recordedBy: 'AI Pricing Optimizer',
      };

      return {
        productId: item.productId,
        newPrice: item.suggestedPrice,
        historyRecord,
      };
    });

    if (onApplyBatchPriceUpdates) {
      onApplyBatchPriceUpdates(updates);
    } else {
      updates.forEach((u) => onApplyPriceUpdate(u.productId, u.newPrice, u.historyRecord));
    }

    setAppliedProductIds((prev) => {
      const next = new Set(prev);
      pendingItems.forEach((i) => next.add(i.productId));
      return next;
    });

    showToast(`Berhasil menerapkan ${updates.length} penyesuaian harga produk secara massal!`);
  };

  // Apply pending recommendations on current page only
  const handleApplyCurrentPagePending = () => {
    const pendingItems = paginatedSuggestions.filter(
      (s) => s.actionType !== 'maintain' && !appliedProductIds.has(s.productId)
    );

    if (pendingItems.length === 0) {
      showToast('Tidak ada penyesuaian harga pending pada halaman ini');
      return;
    }

    const updates = pendingItems.map((item) => {
      const historyRecord: PriceHistoryRecord = {
        id: `price-hist-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        productId: item.productId,
        date: new Date().toISOString(),
        costPrice: item.costPrice,
        sellingPrice: item.suggestedPrice,
        previousCostPrice: item.costPrice,
        previousSellingPrice: item.currentPrice,
        changeType: 'bulk_adjust',
        sourceReference: `AI Dynamic Pricing Hal ${safeCurrentPage} (${strategy})`,
        notes: item.aiReasoning,
        recordedBy: 'AI Pricing Optimizer',
      };

      return {
        productId: item.productId,
        newPrice: item.suggestedPrice,
        historyRecord,
      };
    });

    if (onApplyBatchPriceUpdates) {
      onApplyBatchPriceUpdates(updates);
    } else {
      updates.forEach((u) => onApplyPriceUpdate(u.productId, u.newPrice, u.historyRecord));
    }

    setAppliedProductIds((prev) => {
      const next = new Set(prev);
      pendingItems.forEach((i) => next.add(i.productId));
      return next;
    });

    showToast(`Berhasil menerapkan ${updates.length} harga produk pada halaman ini!`);
  };

  // Open Simulator
  const handleOpenSimulator = (item: DynamicPricingSuggestion) => {
    setSimulatorItem(item);
    setSimulatedPrice(item.suggestedPrice);
  };

  // Open Competitor Manager
  const handleOpenCompetitors = (item: DynamicPricingSuggestion) => {
    setCompetitorModalItem(item);
    setEditableCompetitors(item.competitors ? JSON.parse(JSON.stringify(item.competitors)) : []);
  };

  // Save competitor changes
  const handleSaveCompetitors = () => {
    if (!competitorModalItem) return;
    if (onUpdateProductCompetitors) {
      onUpdateProductCompetitors(competitorModalItem.productId, editableCompetitors);
    }
    // Update local state item
    setSuggestions((prev) =>
      prev.map((s) => {
        if (s.productId !== competitorModalItem.productId) return s;
        const compPrices = editableCompetitors.map((c) => c.price).filter((p) => p > 0);
        const avg = compPrices.length > 0 ? Math.round(compPrices.reduce((a, b) => a + b, 0) / compPrices.length) : s.currentPrice;
        return {
          ...s,
          competitors: editableCompetitors,
          competitorAvgPrice: avg,
          competitorMinPrice: compPrices.length > 0 ? Math.min(...compPrices) : s.currentPrice,
          competitorMaxPrice: compPrices.length > 0 ? Math.max(...compPrices) : s.currentPrice,
          priceVsMarketPercent: avg > 0 ? Number((((s.currentPrice - avg) / avg) * 100).toFixed(1)) : 0,
        };
      })
    );
    setCompetitorModalItem(null);
    showToast(`Data harga kompetitor untuk ${competitorModalItem.productName} berhasil disimpan.`);
  };

  // Open Custom Price Editor
  const handleOpenCustomEdit = (item: DynamicPricingSuggestion) => {
    setCustomEditItem(item);
    setCustomInputPrice(String(item.suggestedPrice));
  };

  const handleSaveCustomPrice = () => {
    if (!customEditItem) return;
    const priceNum = parseFloat(customInputPrice);
    if (isNaN(priceNum) || priceNum <= 0) {
      alert('Masukkan harga yang valid');
      return;
    }
    handleApplySingle(customEditItem, priceNum);
    setCustomEditItem(null);
  };

  return (
    <div
      id="ai-dynamic-pricing-module"
      data-testid="ai-dynamic-pricing-module"
      className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm overflow-hidden flex flex-col ${className}`}
    >
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-emerald-600 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4">
          <CheckCircle2 className="w-5 h-5 text-white shrink-0" />
          <span className="text-sm font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* HEADER SECTION */}
      <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-indigo-50/70 via-white to-blue-50/50 dark:from-slate-900 dark:via-indigo-950/20 dark:to-slate-900">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-blue-500 text-white flex items-center justify-center shadow-md shadow-indigo-500/20 shrink-0">
              <Sparkles className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                  AI Dynamic Pricing & Margin Optimizer
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 flex items-center gap-1">
                  <Zap className="w-3 h-3 text-amber-500" />
                  {isAiGenerated ? `Gemini AI (${modelUsed})` : 'AI Pricing Engine'}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                  Analisis Kompetitor & Turnover Aktif
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                Penyesuaian harga jual eceran otomatis berdasarkan riset harga kompetitor (Indomaret, Alfamart, Pasar) & kecepatan perputaran stok toko.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 self-start lg:self-auto flex-wrap">
            <button
              onClick={() => loadRecommendations(strategy, selectedCategory)}
              disabled={isLoading}
              className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-2 shadow-xs transition-all disabled:opacity-60 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 ${isLoading ? 'animate-spin' : ''}`} />
              {isLoading ? 'Menganalisis...' : 'Analisis Ulang'}
            </button>

            <button
              onClick={handleApplyAllPending}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white text-xs font-bold flex items-center gap-2 shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
            >
              <CheckCheck className="w-4 h-4" />
              Terapkan Semua Saran ({filteredSuggestions.filter((s) => s.actionType !== 'maintain' && !appliedProductIds.has(s.productId)).length})
            </button>
          </div>
        </div>

        {/* STRATEGY SELECTOR PILLS */}
        <div className="mt-5 pt-4 border-t border-slate-200/60 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 mr-1 flex items-center gap-1">
              <Sliders className="w-3.5 h-3.5" />
              Strategi AI:
            </span>

            {[
              { id: 'balanced', label: '⚖️ Seimbang Otomatis (Rekomendasi AI)', desc: 'Optimalisasi laba dan perputaran' },
              { id: 'maximize_profit', label: '💰 Maksimalkan Laba', desc: 'Tangkap peluang margin pada fast mover' },
              { id: 'accelerate_turnover', label: '⚡ Percepat Perputaran Stok', desc: 'Diskon cairkan stok lambat & kas' },
              { id: 'competitive_match', label: '🎯 Penyelarasan Pasar', desc: 'Samakan harga dengan minimarket sekitar' },
            ].map((strat) => (
              <button
                key={strat.id}
                onClick={() => setStrategy(strat.id as DynamicPricingStrategy)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  strategy === strat.id
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-white/80 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                }`}
                title={strat.desc}
              >
                {strat.label}
              </button>
            ))}
          </div>

          <div className="text-[11px] text-slate-400 dark:text-slate-500 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Diperbarui: {lastAnalyzedAt.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      </div>

      {/* KPI METRICS OVERVIEW */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 sm:p-6 bg-slate-50/50 dark:bg-slate-900/40 border-b border-slate-100 dark:border-slate-800">
        <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-750 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs">
            <span>Potensi Tambahan Laba</span>
            <div className="w-6 h-6 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-lg sm:text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1.5">
            +{formatCurrency(kpis.totalPotentialProfit, currency)}
          </div>
          <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
            Estimasi proyeksi / bulan
          </div>
        </div>

        <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-750 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs">
            <span>Peluang Naikkan Margin</span>
            <div className="w-6 h-6 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 flex items-center justify-center">
              <Flame className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-lg sm:text-xl font-black text-indigo-600 dark:text-indigo-400 mt-1.5">
            {kpis.markupCount} <span className="text-xs font-semibold text-slate-400">Produk</span>
          </div>
          <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
            Fast-moving & di bawah kompetitor
          </div>
        </div>

        <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-750 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs">
            <span>Perlu Pangkas / Diskon</span>
            <div className="w-6 h-6 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center">
              <TrendingDown className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-lg sm:text-xl font-black text-amber-600 dark:text-amber-400 mt-1.5">
            {kpis.markdownCount} <span className="text-xs font-semibold text-slate-400">Produk</span>
          </div>
          <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
            Stok lambat & di atas kompetitor
          </div>
        </div>

        <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-750 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs">
            <span>Rata-Rata Selisih Pasar</span>
            <div className="w-6 h-6 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center">
              <Building2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className={`text-lg sm:text-xl font-black mt-1.5 ${kpis.avgMarketDiff <= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-slate-700 dark:text-slate-300'}`}>
            {kpis.avgMarketDiff > 0 ? `+${kpis.avgMarketDiff}%` : `${kpis.avgMarketDiff}%`}
          </div>
          <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
            vs Indomaret, Alfamart & Pasar
          </div>
        </div>
      </div>

      {/* FILTER & SEARCH CONTROLS */}
      <div className="p-4 sm:p-6 pb-2 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative min-w-[200px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari produk / barcode..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-300 font-medium focus:outline-hidden"
          >
            <option value="all">Semua Kategori</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Action Filter Pills */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            {[
              { id: 'all', label: 'Semua' },
              { id: 'increase', label: '🔥 Peluang Naik' },
              { id: 'decrease', label: '📉 Perlu Turun' },
              { id: 'clearance', label: '⚠️ Cuci Gudang' },
              { id: 'maintain', label: 'Optimal' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setFilterAction(f.id as any)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  filterAction === f.id
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-semibold'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            <button
              onClick={() => setViewMode('compact')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'compact'
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
              title="Tabel Ringkas (Cepat & Ringan)"
            >
              <List className="w-3.5 h-3.5" />
              <span>Tabel Ringkas</span>
            </button>
            <button
              onClick={() => setViewMode('cards')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'cards'
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
              title="Kartu Analisis Mendalam"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Kartu Detail</span>
            </button>
          </div>

          {/* Page Size Selector */}
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <span>Baris:</span>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-hidden"
            >
              <option value={8}>8</option>
              <option value={15}>15</option>
              <option value={30}>30</option>
              <option value={50}>50</option>
            </select>
          </div>

          <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            Hal <span className="font-bold text-slate-800 dark:text-white">{safeCurrentPage}</span>/{totalPages} ({filteredSuggestions.length} produk)
          </div>
        </div>
      </div>

      {/* PRODUCT PRICING MATRIX TABLE / CARDS */}
      <div className="p-4 sm:p-6 overflow-x-auto">
        {isLoading ? (
          <div className="py-20 text-center flex flex-col items-center justify-center">
            <RefreshCw className="w-10 h-10 text-indigo-600 animate-spin mb-3" />
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
              Menganalisis Harga Kompetitor & Perputaran Stok...
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-md">
              Gemini AI sedang menghitung elastisitas harga, membandingkan indeks ritel Indomaret/Alfamart, dan Days Sales of Inventory (DSI).
            </p>
          </div>
        ) : filteredSuggestions.length === 0 ? (
          <div className="py-16 text-center text-slate-400 flex flex-col items-center justify-center">
            <Package className="w-12 h-12 text-slate-300 dark:text-slate-600 mb-2" />
            <p className="text-sm font-semibold">Tidak ada produk yang cocok dengan filter yang dipilih</p>
            <p className="text-xs text-slate-400 mt-0.5">Ubah kata kunci pencarian atau ganti filter kategori.</p>
          </div>
        ) : viewMode === 'compact' ? (
          /* FAST COMPACT TABLE MODE (Zero-lag, ultra lightweight) */
          <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-750 bg-white dark:bg-slate-900 shadow-xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-750 bg-slate-50/80 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-bold uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-3.5">Produk</th>
                  <th className="py-3 px-3">Kecepatan Stok (DSI)</th>
                  <th className="py-3 px-3">Harga Toko Saat Ini</th>
                  <th className="py-3 px-3">Rata-Rata Pasar</th>
                  <th className="py-3 px-3">Saran Harga AI</th>
                  <th className="py-3 px-3">Delta & Margin Baru</th>
                  <th className="py-3 px-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {paginatedSuggestions.map((item) => {
                  const isApplied = appliedProductIds.has(item.productId);
                  const isIncrease = item.actionType === 'increase';
                  const isDecrease = item.actionType === 'decrease';

                  return (
                    <tr
                      key={item.productId}
                      className={`hover:bg-slate-50/60 dark:hover:bg-slate-800/50 transition-colors ${
                        isApplied
                          ? 'bg-emerald-50/30 dark:bg-emerald-950/10'
                          : isIncrease
                          ? 'bg-indigo-50/20 dark:bg-indigo-950/10'
                          : isDecrease
                          ? 'bg-amber-50/20 dark:bg-amber-950/10'
                          : ''
                      }`}
                    >
                      {/* PRODUCT */}
                      <td className="py-3 px-3.5">
                        <div className="font-bold text-slate-900 dark:text-white max-w-[220px] truncate" title={item.productName}>
                          {item.productName}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-slate-400">
                          <span>{item.categoryName}</span>
                          <span>•</span>
                          <span>Stok: <strong className="text-slate-600 dark:text-slate-300">{item.stock}</strong></span>
                        </div>
                      </td>

                      {/* VELOCITY */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            item.turnoverSpeed === 'fast'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                              : item.turnoverSpeed === 'moderate'
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
                              : item.turnoverSpeed === 'slow'
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                              : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                          }`}
                        >
                          {item.turnoverSpeed === 'fast' && '🔥 Cepat'}
                          {item.turnoverSpeed === 'moderate' && '⚡ Normal'}
                          {item.turnoverSpeed === 'slow' && '🐢 Lambat'}
                          {item.turnoverSpeed === 'dead_stock' && '⚠️ Macet'}
                        </span>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          DSI: {item.daysOfInventory > 100 ? '>90' : item.daysOfInventory} hari ({item.unitsSold30d} terjual)
                        </div>
                      </td>

                      {/* CURRENT PRICE */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="font-extrabold text-slate-900 dark:text-white">
                          {formatCurrency(item.currentPrice, currency)}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          HPP: {formatCurrency(item.costPrice, currency)} (Margin {item.currentMarginPercent}%)
                        </div>
                      </td>

                      {/* COMPETITOR MARKET */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="font-bold text-slate-800 dark:text-slate-200">
                          {formatCurrency(item.competitorAvgPrice, currency)}
                        </div>
                        <div className="text-[10px] flex items-center gap-1 mt-0.5">
                          <span
                            className={`font-bold px-1 rounded ${
                              item.priceVsMarketPercent > 0
                                ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                                : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                            }`}
                          >
                            {item.priceVsMarketPercent > 0 ? `+${item.priceVsMarketPercent}% mahal` : `${item.priceVsMarketPercent}% murah`}
                          </span>
                          <button
                            onClick={() => handleOpenCompetitors(item)}
                            className="text-indigo-600 dark:text-indigo-400 hover:underline text-[10px] cursor-pointer"
                          >
                            Riset
                          </button>
                        </div>
                      </td>

                      {/* AI SUGGESTION */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="font-black text-indigo-600 dark:text-indigo-400 text-sm">
                          {formatCurrency(item.suggestedPrice, currency)}
                        </div>
                        <span
                          className={`inline-block px-1.5 py-0.2 rounded text-[10px] font-bold mt-0.5 ${
                            item.strategyTag === 'Peluang Margin'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300'
                              : item.strategyTag === 'Percepat Stok'
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300'
                              : item.strategyTag === 'Cuci Gudang'
                              ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-300'
                              : 'bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300'
                          }`}
                        >
                          {item.strategyTag}
                        </span>
                      </td>

                      {/* DELTA & MARGIN */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div
                          className={`font-bold ${
                            item.priceDelta > 0
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : item.priceDelta < 0
                              ? 'text-amber-600 dark:text-amber-400'
                              : 'text-slate-400'
                          }`}
                        >
                          {item.priceDelta > 0 ? `+${formatCurrency(item.priceDelta, currency)}` : item.priceDelta < 0 ? formatCurrency(item.priceDelta, currency) : 'Sama'}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          Margin: <strong className="text-indigo-600 font-bold">{item.suggestedMarginPercent}%</strong>
                        </div>
                      </td>

                      {/* ACTIONS */}
                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {isApplied ? (
                            <span className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-bold text-[11px] flex items-center gap-1">
                              <Check className="w-3 h-3" />
                              Diterapkan
                            </span>
                          ) : (
                            <button
                              onClick={() => handleApplySingle(item)}
                              className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[11px] flex items-center gap-1 shadow-xs cursor-pointer"
                            >
                              <Check className="w-3 h-3" />
                              Terapkan
                            </button>
                          )}
                          <button
                            onClick={() => handleOpenSimulator(item)}
                            title="Simulasi Elastisitas"
                            className="p-1 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 cursor-pointer"
                          >
                            <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-500" />
                          </button>
                          <button
                            onClick={() => handleOpenCustomEdit(item)}
                            title="Edit Harga Manual"
                            className="p-1 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5 text-slate-500" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          /* CARD MODE (Only renders paginated items to eliminate DOM freeze) */
          <div className="space-y-3.5">
            {paginatedSuggestions.map((item) => {
              const isApplied = appliedProductIds.has(item.productId);
              const isIncrease = item.actionType === 'increase';
              const isDecrease = item.actionType === 'decrease';

              return (
                <div
                  key={item.productId}
                  className={`border rounded-2xl p-4 sm:p-5 transition-all ${
                    isApplied
                      ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/60'
                      : item.strategyTag === 'Cuci Gudang'
                      ? 'bg-rose-50/40 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/60'
                      : isIncrease
                      ? 'bg-indigo-50/30 dark:bg-indigo-950/15 border-indigo-200/80 dark:border-indigo-900/50 hover:border-indigo-300'
                      : isDecrease
                      ? 'bg-amber-50/30 dark:bg-amber-950/15 border-amber-200/80 dark:border-amber-900/50 hover:border-amber-300'
                      : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-750 hover:border-slate-300'
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                    {/* PRODUCT BASIC & VELOCITY */}
                    <div className="flex items-start gap-3.5 min-w-[280px] lg:max-w-[340px]">
                      <div className="w-11 h-11 rounded-xl bg-slate-100 dark:bg-slate-700/80 border border-slate-200 dark:border-slate-600 flex items-center justify-center text-slate-600 dark:text-slate-300 font-bold shrink-0">
                        {item.brand ? item.brand[0] : item.productName[0]}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-snug">
                            {item.productName}
                          </h4>
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                          <span className="bg-slate-100 dark:bg-slate-750 px-2 py-0.5 rounded-md font-medium text-slate-600 dark:text-slate-300">
                            {item.categoryName}
                          </span>
                          <span>Stok: <strong className="text-slate-700 dark:text-slate-200">{item.stock} unit</strong></span>
                        </div>

                        {/* TURNOVER METRIC BADGE */}
                        <div className="mt-2.5 flex items-center gap-1.5 flex-wrap">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[11px] font-bold ${
                              item.turnoverSpeed === 'fast'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                : item.turnoverSpeed === 'moderate'
                                ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
                                : item.turnoverSpeed === 'slow'
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                                : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 animate-pulse'
                            }`}
                          >
                            {item.turnoverSpeed === 'fast' && '🔥 Fast Moving'}
                            {item.turnoverSpeed === 'moderate' && '⚡ Steady / Normal'}
                            {item.turnoverSpeed === 'slow' && '🐢 Slow Moving'}
                            {item.turnoverSpeed === 'dead_stock' && '⚠️ Dead Stock'}
                          </span>

                          <span className="text-[11px] text-slate-500 dark:text-slate-400">
                            DSI: <strong>{item.daysOfInventory > 100 ? '>90' : item.daysOfInventory} hari</strong> ({item.unitsSold30d} terjual / 30hr)
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* CURRENT FINANCIALS */}
                    <div className="bg-white/70 dark:bg-slate-900/60 rounded-xl p-3 border border-slate-200/60 dark:border-slate-800 min-w-[150px]">
                      <div className="text-[11px] text-slate-400 font-medium">Harga Saat Ini</div>
                      <div className="text-base font-extrabold text-slate-900 dark:text-white mt-0.5">
                        {formatCurrency(item.currentPrice, currency)}
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1 pt-1 border-t border-slate-100 dark:border-slate-800">
                        <span>HPP: {formatCurrency(item.costPrice, currency)}</span>
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          Margin {item.currentMarginPercent}%
                        </span>
                      </div>
                    </div>

                    {/* COMPETITOR BENCHMARKS */}
                    <div className="bg-white/70 dark:bg-slate-900/60 rounded-xl p-3 border border-slate-200/60 dark:border-slate-800 flex-1 min-w-[220px]">
                      <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium mb-1.5">
                        <span className="flex items-center gap-1">
                          <Store className="w-3 h-3 text-indigo-500" />
                          Harga Pasar & Kompetitor
                        </span>
                        <button
                          onClick={() => handleOpenCompetitors(item)}
                          className="text-indigo-600 dark:text-indigo-400 hover:underline font-semibold flex items-center gap-0.5 cursor-pointer text-[11px]"
                        >
                          <Edit2 className="w-2.5 h-2.5" />
                          Ubah
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                        {item.competitors.slice(0, 4).map((comp, idx) => (
                          <div key={idx} className="flex items-center justify-between bg-slate-50 dark:bg-slate-800 px-2 py-1 rounded-md">
                            <span className="text-slate-600 dark:text-slate-400 truncate max-w-[85px]">{comp.competitorName}:</span>
                            <span className="font-bold text-slate-800 dark:text-slate-200">
                              {formatCurrency(comp.price, currency)}
                            </span>
                          </div>
                        ))}
                      </div>

                      <div className="mt-2 pt-1.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px]">
                        <span className="text-slate-500">Rata-rata Pasar:</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {formatCurrency(item.competitorAvgPrice, currency)}
                        </span>
                        <span
                          className={`font-extrabold px-1.5 py-0.2 rounded text-[10px] ${
                            item.priceVsMarketPercent > 0
                              ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                              : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                          }`}
                        >
                          {item.priceVsMarketPercent > 0 ? `+${item.priceVsMarketPercent}% mahal` : `${item.priceVsMarketPercent}% murah`}
                        </span>
                      </div>
                    </div>

                    {/* AI SUGGESTED PRICE & ACTION */}
                    <div className="bg-gradient-to-br from-indigo-50/80 to-blue-50/60 dark:from-indigo-950/40 dark:to-slate-900/60 rounded-xl p-3 border border-indigo-200/80 dark:border-indigo-800/80 min-w-[200px]">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-indigo-700 dark:text-indigo-300 uppercase tracking-wider flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-amber-500" />
                          Saran AI
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                            item.strategyTag === 'Peluang Margin'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300'
                              : item.strategyTag === 'Percepat Stok'
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300'
                              : item.strategyTag === 'Cuci Gudang'
                              ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-300'
                              : 'bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300'
                          }`}
                        >
                          {item.strategyTag}
                        </span>
                      </div>

                      <div className="flex items-baseline gap-2 mt-1">
                        <div className="text-xl font-black text-slate-900 dark:text-white">
                          {formatCurrency(item.suggestedPrice, currency)}
                        </div>
                        <div
                          className={`text-xs font-bold ${
                            item.priceDelta > 0
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : item.priceDelta < 0
                              ? 'text-amber-600 dark:text-amber-400'
                              : 'text-slate-400'
                          }`}
                        >
                          {item.priceDelta > 0 ? `+${formatCurrency(item.priceDelta, currency)}` : item.priceDelta < 0 ? formatCurrency(item.priceDelta, currency) : 'Sama'}
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1 pt-1 border-t border-indigo-100 dark:border-indigo-900/40">
                        <span>Margin Baru: <strong className="text-indigo-600 dark:text-indigo-400 font-bold">{item.suggestedMarginPercent}%</strong></span>
                        {item.projectedProfitImpact !== 0 && (
                          <span className={`font-semibold ${item.projectedProfitImpact > 0 ? 'text-emerald-600' : 'text-slate-400'}`}>
                            {item.projectedProfitImpact > 0 ? `+${formatCurrency(item.projectedProfitImpact, currency)}/bln` : ''}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* ACTION BUTTONS */}
                    <div className="flex lg:flex-col items-center gap-2 self-center shrink-0">
                      {isApplied ? (
                        <div className="px-3.5 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs">
                          <Check className="w-4 h-4" />
                          Diterapkan
                        </div>
                      ) : (
                        <button
                          onClick={() => handleApplySingle(item)}
                          className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm shadow-indigo-600/30 transition-all cursor-pointer w-full justify-center"
                        >
                          <Check className="w-3.5 h-3.5" />
                          Terapkan
                        </button>
                      )}

                      <div className="flex items-center gap-1 w-full">
                        <button
                          onClick={() => handleOpenSimulator(item)}
                          title="Simulasi Elastisitas Harga"
                          className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center justify-center gap-1 flex-1 cursor-pointer"
                        >
                          <SlidersHorizontal className="w-3 h-3 text-indigo-500" />
                          Simulasi
                        </button>

                        <button
                          onClick={() => handleOpenCustomEdit(item)}
                          title="Edit Harga Manual"
                          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center justify-center cursor-pointer"
                        >
                          <Edit2 className="w-3 h-3 text-slate-500" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* AI STRATEGIC REASONING FOOTNOTE */}
                  <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-start gap-2 text-xs text-slate-600 dark:text-slate-300 bg-white/50 dark:bg-slate-900/40 p-2.5 rounded-xl">
                    <Info className="w-3.5 h-3.5 text-indigo-500 shrink-0 mt-0.5" />
                    <div className="leading-relaxed">
                      <span className="font-bold text-slate-800 dark:text-slate-200">Analisis Strategis AI: </span>
                      {item.aiReasoning}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* BOTTOM PAGINATION & BATCH BAR */}
        {filteredSuggestions.length > 0 && !isLoading && (
          <div className="mt-5 pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Menampilkan <strong className="text-slate-700 dark:text-slate-200">{(safeCurrentPage - 1) * pageSize + 1}</strong> - <strong className="text-slate-700 dark:text-slate-200">{Math.min(safeCurrentPage * pageSize, filteredSuggestions.length)}</strong> dari <strong className="text-slate-700 dark:text-slate-200">{filteredSuggestions.length}</strong> produk
              </span>

              {/* Page action: apply current page */}
              <button
                onClick={handleApplyCurrentPagePending}
                className="px-3 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 text-xs font-semibold border border-indigo-200 dark:border-indigo-800 transition cursor-pointer flex items-center gap-1"
              >
                <Check className="w-3 h-3" />
                Terapkan Hal Ini ({paginatedSuggestions.filter((s) => s.actionType !== 'maintain' && !appliedProductIds.has(s.productId)).length})
              </button>
            </div>

            {/* Pagination controls */}
            <div className="flex items-center gap-1 self-center sm:self-auto">
              <button
                onClick={() => setCurrentPage(1)}
                disabled={safeCurrentPage <= 1}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                title="Halaman Pertama"
              >
                <ChevronsLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={safeCurrentPage <= 1}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                title="Halaman Sebelumnya"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {/* Page numbers around current */}
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === totalPages || Math.abs(p - safeCurrentPage) <= 2)
                .map((p, idx, arr) => {
                  const prev = arr[idx - 1];
                  const showEllipsis = prev && p - prev > 1;
                  return (
                    <React.Fragment key={p}>
                      {showEllipsis && <span className="px-1 text-slate-400 text-xs">...</span>}
                      <button
                        onClick={() => setCurrentPage(p)}
                        className={`w-7 h-7 rounded-lg text-xs font-bold transition cursor-pointer ${
                          safeCurrentPage === p
                            ? 'bg-indigo-600 text-white shadow-xs'
                            : 'border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        {p}
                      </button>
                    </React.Fragment>
                  );
                })}

              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={safeCurrentPage >= totalPages}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                title="Halaman Berikutnya"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={safeCurrentPage >= totalPages}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                title="Halaman Terakhir"
              >
                <ChevronsRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* MODAL 1: WHAT-IF PRICE ELASTICITY SIMULATOR */}
      {simulatorItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setSimulatorItem(null)}
              className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <SlidersVertical className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Simulasi Dampak Elastisitas Harga
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {simulatorItem.productName}
                </p>
              </div>
            </div>

            {/* Slider Controls */}
            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-750">
              <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                <span>HPP: {formatCurrency(simulatorItem.costPrice, currency)}</span>
                <span className="font-bold text-indigo-600 dark:text-indigo-400">
                  Harga Simulasi: {formatCurrency(simulatedPrice, currency)}
                </span>
                <span>Pasar: {formatCurrency(simulatorItem.competitorAvgPrice, currency)}</span>
              </div>

              <input
                type="range"
                min={simulatorItem.costPrice}
                max={Math.round(simulatorItem.costPrice * 2.2)}
                step={100}
                value={simulatedPrice}
                onChange={(e) => setSimulatedPrice(Number(e.target.value))}
                className="w-full accent-indigo-600 h-2 bg-slate-200 dark:bg-slate-700 rounded-lg cursor-pointer"
              />

              <div className="flex justify-between text-[11px] text-slate-400 mt-1">
                <span>Batas Minimum (HPP)</span>
                <span>Rekomendasi AI ({formatCurrency(simulatorItem.suggestedPrice, currency)})</span>
                <span>Maksimum</span>
              </div>
            </div>

            {/* Simulated Outcomes */}
            {(() => {
              const simMargin = Number((((simulatedPrice - simulatorItem.costPrice) / simulatedPrice) * 100).toFixed(1));
              const unitProfit = simulatedPrice - simulatorItem.costPrice;
              const deltaPct = ((simulatedPrice - simulatorItem.currentPrice) / simulatorItem.currentPrice) * 100;
              const expectedVolMultiplier = deltaPct < 0 ? 1 + Math.abs(deltaPct) * 0.015 : Math.max(0.7, 1 - deltaPct * 0.008);
              const expectedUnitsSold = Math.round(simulatorItem.unitsSold30d * expectedVolMultiplier);
              const expectedTotalProfit = Math.round(unitProfit * expectedUnitsSold);
              const currentTotalProfit = (simulatorItem.currentPrice - simulatorItem.costPrice) * simulatorItem.unitsSold30d;
              const profitDelta = expectedTotalProfit - currentTotalProfit;
              const estDsi = expectedUnitsSold > 0 ? Math.round(simulatorItem.stock / (expectedUnitsSold / 30)) : 120;

              return (
                <div className="grid grid-cols-2 gap-3 my-5">
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                    <div className="text-[11px] text-slate-400">Margin Kotor Baru</div>
                    <div className="text-lg font-black text-slate-800 dark:text-slate-100 mt-0.5">
                      {simMargin}%
                    </div>
                    <div className="text-[10px] text-slate-500">
                      Laba per unit: {formatCurrency(unitProfit, currency)}
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                    <div className="text-[11px] text-slate-400">Proyeksi Laba Bulanan</div>
                    <div className={`text-lg font-black mt-0.5 ${profitDelta >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {profitDelta >= 0 ? `+${formatCurrency(profitDelta, currency)}` : formatCurrency(profitDelta, currency)}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      Est. Volume: {expectedUnitsSold} unit/bln
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 col-span-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">Proyeksi Perputaran (DSI):</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {estDsi} hari ({estDsi < simulatorItem.daysOfInventory ? `Lebih cepat ${simulatorItem.daysOfInventory - estDsi} hari` : 'Stabil'})
                      </span>
                    </div>
                  </div>
                </div>
              );
            })()}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setSimulatorItem(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={() => {
                  handleApplySingle(simulatorItem, simulatedPrice);
                  setSimulatorItem(null);
                }}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/30 cursor-pointer"
              >
                Terapkan Harga Hasil Simulasi ({formatCurrency(simulatedPrice, currency)})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: EDIT COMPETITOR BENCHMARKS */}
      {competitorModalItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setCompetitorModalItem(null)}
              className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <Store className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Kelola Data Harga Kompetitor
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[280px]">
                  {competitorModalItem.productName}
                </p>
              </div>
            </div>

            <div className="space-y-3 my-4">
              {editableCompetitors.map((comp, idx) => (
                <div key={idx} className="flex items-center justify-between gap-3 bg-slate-50 dark:bg-slate-800/80 p-2.5 rounded-xl">
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 min-w-[130px]">
                    {comp.competitorName}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-slate-400">Rp</span>
                    <input
                      type="number"
                      value={comp.price}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        setEditableCompetitors((prev) =>
                          prev.map((c, i) => (i === idx ? { ...c, price: val } : c))
                        );
                      }}
                      className="w-28 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-right"
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setCompetitorModalItem(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={handleSaveCompetitors}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-600/30 cursor-pointer"
              >
                Simpan & Perbarui Analisis
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: CUSTOM PRICE OVERRIDE */}
      {customEditItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-sm w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setCustomEditItem(null)}
              className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                <Edit2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Ubah Harga Manual
                </h3>
                <p className="text-xs text-slate-500 truncate max-w-[220px]">
                  {customEditItem.productName}
                </p>
              </div>
            </div>

            <div className="space-y-3 my-4">
              <div>
                <label className="text-xs text-slate-500 block mb-1">Harga Jual Baru (Rp)</label>
                <input
                  type="number"
                  value={customInputPrice}
                  onChange={(e) => setCustomInputPrice(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-bold"
                />
              </div>

              <div className="text-[11px] text-slate-400 bg-slate-50 dark:bg-slate-800 p-2.5 rounded-xl space-y-1">
                <div>HPP: <strong>{formatCurrency(customEditItem.costPrice, currency)}</strong></div>
                <div>Harga Sekarang: <strong>{formatCurrency(customEditItem.currentPrice, currency)}</strong></div>
                <div>Saran AI: <strong>{formatCurrency(customEditItem.suggestedPrice, currency)}</strong></div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setCustomEditItem(null)}
                className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={handleSaveCustomPrice}
                className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold cursor-pointer"
              >
                Terapkan Harga Ini
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

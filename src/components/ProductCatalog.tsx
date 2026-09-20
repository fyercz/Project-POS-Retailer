import React, { useRef, useEffect, useMemo, useState } from 'react';
import {
  Search,
  ScanBarcode,
  Camera,
  LayoutGrid,
  Coffee,
  Utensils,
  Croissant,
  Cookie,
  Package,
  AlertTriangle,
  Flame,
  X,
  ChevronDown,
  Database,
  Apple,
  Sparkles,
  Home,
  Briefcase,
} from 'lucide-react';
import {
  usePOSCatalog,
  usePOSCart,
  usePOSCartActions,
  usePOSUI,
} from '../context/POSContext';
import { ProductCard } from './ProductCard';
import { searchProductsFuzzy, ScoredProduct } from '../utils/fuzzySearch';

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  LayoutGrid,
  Coffee,
  Utensils,
  Croissant,
  Cookie,
  Package,
  Apple,
  Sparkles,
  Home,
  Briefcase,
  Flame,
};

export const ProductCatalog: React.FC = () => {
  const {
    products,
    categories,
    selectedCategory,
    setSelectedCategory,
    searchQuery,
    setSearchQuery,
    filterLowStock,
    setFilterLowStock,
  } = usePOSCatalog();

  const { cart } = usePOSCart();
  const { addToCart } = usePOSCartActions();
  const {
    setActiveView,
    settings,
    setIsBarcodeScannerOpen,
    setIsBackupRestoreOpen,
  } = usePOSUI();

  const searchInputRef = useRef<HTMLInputElement>(null);
  const categoryScrollRef = useRef<HTMLDivElement>(null);
  const [displayLimit, setDisplayLimit] = useState(48);

  // Global Keyboard Shortcuts (Ctrl+F / Cmd+F / F2 / Slash) to focus search bar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if user pressed Ctrl+F or Cmd+F (Mac)
      const isCtrlF = (e.ctrlKey || e.metaKey) && (e.key === 'f' || e.key === 'F');
      const isF2 = e.key === 'F2';

      // Quick slash ('/') trigger when not typing inside an existing input or textarea
      const target = e.target as HTMLElement | null;
      const isTyping =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable);
      const isSlash = e.key === '/' && !isTyping;

      if (isCtrlF || isF2 || isSlash) {
        e.preventDefault();
        if (searchInputRef.current) {
          searchInputRef.current.focus();
          searchInputRef.current.select();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Reset display limit on filter/search change
  useEffect(() => {
    setDisplayLimit(48);
  }, [selectedCategory, searchQuery, filterLowStock]);

  // Auto-scroll selected category chip into view smoothly on change
  useEffect(() => {
    if (categoryScrollRef.current) {
      const activeChip = categoryScrollRef.current.querySelector(
        `[data-category-id="${selectedCategory}"]`
      ) as HTMLElement | null;
      if (activeChip) {
        activeChip.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'center',
        });
      }
    }
  }, [selectedCategory]);

  // Horizontal mouse-wheel scroll helper on desktop
  const handleCategoryWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (categoryScrollRef.current && Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
      categoryScrollRef.current.scrollLeft += e.deltaY;
    }
  };

  // Memoized Cart quantities map so ProductCards don't need to filter cart array independently
  const cartQuantityMap = useMemo(() => {
    const map: Record<string, number> = {};
    for (let i = 0; i < cart.length; i++) {
      const item = cart[i];
      map[item.product.id] = (map[item.product.id] || 0) + item.quantity;
    }
    return map;
  }, [cart]);

  // Memoized Category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: products.length };
    for (let i = 0; i < products.length; i++) {
      const catId = products[i].categoryId;
      counts[catId] = (counts[catId] || 0) + 1;
    }
    return counts;
  }, [products]);

  // Count of products that have low stock
  const lowStockCount = useMemo(() => {
    return products.filter((p) => p.stock <= p.minStock).length;
  }, [products]);

  // Scored typo-tolerant fuzzy search results
  const scoredProducts: ScoredProduct[] = useMemo(() => {
    return searchProductsFuzzy(products, searchQuery, selectedCategory, filterLowStock);
  }, [products, selectedCategory, searchQuery, filterLowStock]);

  const filteredProducts = useMemo(() => {
    return scoredProducts.map((sp) => sp.product);
  }, [scoredProducts]);

  const hasFuzzyMatch = useMemo(() => {
    return Boolean(searchQuery.trim()) && scoredProducts.some((sp) => sp.matchType === 'fuzzy');
  }, [searchQuery, scoredProducts]);

  // Handle keyboard interaction inside search input (Enter to quick-add, Esc to clear/blur)
  const handleSearchInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      if (searchQuery) {
        setSearchQuery('');
      } else {
        searchInputRef.current?.blur();
      }
    } else if (e.key === 'Enter') {
      // If user presses Enter and there is an exact SKU/barcode match or exactly 1 filtered product, add to cart
      const trimmed = searchQuery.trim().toLowerCase();
      if (!trimmed) return;

      const cleanCode = trimmed.replace(/[^a-z0-9]/gi, '');

      // Check for exact SKU or Barcode match first
      const exactMatch = products.find(
        (p) =>
          p.sku.toLowerCase() === trimmed ||
          p.sku.replace(/[^a-z0-9]/gi, '').toLowerCase() === cleanCode ||
          p.barcode.toLowerCase() === trimmed ||
          p.barcode.replace(/[^a-z0-9]/gi, '').toLowerCase() === cleanCode
      );

      if (exactMatch && exactMatch.stock > 0) {
        e.preventDefault();
        addToCart(exactMatch);
        setSearchQuery('');
      } else if (filteredProducts.length === 1 && filteredProducts[0].stock > 0) {
        e.preventDefault();
        addToCart(filteredProducts[0]);
        setSearchQuery('');
      }
    }
  };

  const visibleProducts = useMemo(() => {
    return filteredProducts.slice(0, displayLimit);
  }, [filteredProducts, displayLimit]);

  const hasMore = filteredProducts.length > displayLimit;

  return (
    <div id="pos-product-catalog" className="flex flex-col h-full overflow-hidden bg-white dark:bg-slate-950">
      {/* 1. TOP HORIZONTAL SCROLLABLE QUICK-CATEGORY FILTER CHIPS ROW */}
      <div className="relative bg-slate-50/90 dark:bg-slate-900/90 border-b border-slate-200 dark:border-slate-800 shrink-0 z-10">
        <div
          ref={categoryScrollRef}
          onWheel={handleCategoryWheel}
          id="quick-category-chips-row"
          className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto py-2.5 px-3 no-scrollbar scroll-smooth overscroll-x-contain touch-pan-x"
        >
          {categories.map((cat) => {
            const Icon = CATEGORY_ICONS[cat.iconName] || LayoutGrid;
            const isSelected = selectedCategory === cat.id && !filterLowStock;
            const count = categoryCounts[cat.id] || 0;

            return (
              <button
                key={cat.id}
                id={`quick-chip-category-${cat.id}`}
                data-category-id={cat.id}
                type="button"
                onClick={() => {
                  setSelectedCategory(cat.id);
                  if (filterLowStock) setFilterLowStock(false);
                }}
                className={`group px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap transition-all cursor-pointer shrink-0 min-h-[36px] active:scale-95 select-none ${
                  isSelected
                    ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/30 border border-emerald-600 dark:bg-emerald-500 dark:text-slate-950 dark:border-emerald-500 font-bold ring-2 ring-emerald-500/20'
                    : 'bg-white text-slate-700 hover:bg-slate-100/90 border border-slate-200/80 dark:bg-slate-950 dark:text-slate-300 dark:border-slate-800 dark:hover:bg-slate-800'
                }`}
              >
                <Icon
                  className={`w-3.5 h-3.5 shrink-0 transition-transform group-hover:scale-110 ${
                    isSelected
                      ? 'text-white dark:text-slate-950'
                      : 'text-emerald-600 dark:text-emerald-400'
                  }`}
                />
                <span className="tracking-tight">{cat.name}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold leading-none shrink-0 ${
                    isSelected
                      ? 'bg-white/25 text-white dark:bg-slate-950/20 dark:text-slate-950'
                      : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}

          {/* Quick-chip: Stok Menipis (Alert filter) */}
          <button
            type="button"
            id="quick-chip-low-stock"
            data-category-id="low-stock"
            onClick={() => setFilterLowStock(!filterLowStock)}
            className={`group px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap transition-all cursor-pointer shrink-0 min-h-[36px] active:scale-95 select-none ${
              filterLowStock
                ? 'bg-rose-600 text-white shadow-sm shadow-rose-600/30 border border-rose-600 font-bold ring-2 ring-rose-500/20'
                : 'bg-rose-50/80 text-rose-700 hover:bg-rose-100/80 border border-rose-200/70 dark:bg-rose-950/30 dark:text-rose-300 dark:border-rose-900/60 dark:hover:bg-rose-900/40'
            }`}
            title="Filter produk dengan stok menipis"
          >
            <AlertTriangle
              className={`w-3.5 h-3.5 shrink-0 transition-transform group-hover:scale-110 ${
                filterLowStock ? 'text-white' : 'text-rose-500'
              }`}
            />
            <span className="tracking-tight">Stok Menipis</span>
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold leading-none shrink-0 ${
                filterLowStock
                  ? 'bg-white/25 text-white'
                  : 'bg-rose-200/70 text-rose-800 dark:bg-rose-900/80 dark:text-rose-200'
              }`}
            >
              {lowStockCount}
            </span>
          </button>
        </div>
      </div>

      {/* 2. SEARCH BAR & QUICK SCANNER ROW */}
      <div className="p-2.5 sm:p-3 bg-white/70 dark:bg-slate-950/70 border-b border-slate-200/80 dark:border-slate-800/80 shrink-0">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500 pointer-events-none" />
            <input
              ref={searchInputRef}
              id="pos-product-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearchInputKeyDown}
              placeholder="Cari nama barang, SKU, barcode (Tekan Ctrl+F / F2)..."
              className="w-full pl-9 pr-24 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all shadow-2xs"
            />
            {searchQuery ? (
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                {hasFuzzyMatch && (
                  <span
                    title="Pencarian toleran salah ketik aktif (Fuzzy Typo-Tolerant Match)"
                    className="hidden sm:inline-flex items-center gap-0.5 text-[9px] font-bold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/80 border border-amber-300 dark:border-amber-800 px-1.5 py-0.5 rounded"
                  >
                    <Sparkles className="w-2.5 h-2.5 text-amber-500" />
                    Typo-Tolerant
                  </span>
                )}
                <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800/80 px-1.5 py-0.5 rounded">
                  {filteredProducts.length} hasil
                </span>
                <button
                  type="button"
                  id="btn-clear-product-search"
                  onClick={() => {
                    setSearchQuery('');
                    searchInputRef.current?.focus();
                  }}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 rounded cursor-pointer transition-colors"
                  title="Hapus pencarian (Esc)"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                <span
                  title="Tekan Ctrl+F atau Cmd+F untuk mencari nama / SKU"
                  className="hidden sm:inline-flex items-center text-[10px] font-mono text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 px-1.5 py-0.5 rounded"
                >
                  Ctrl+F
                </span>
                <span
                  title="Tekan F2 untuk mencari produk"
                  className="hidden sm:inline-flex items-center gap-0.5 text-[10px] font-mono text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 px-1.5 py-0.5 rounded"
                >
                  <ScanBarcode className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                  <span>F2</span>
                </span>
              </div>
            )}
          </div>

          {/* Camera Barcode Scanner Trigger Button */}
          <button
            type="button"
            id="btn-open-barcode-scanner"
            onClick={() => setIsBarcodeScannerOpen(true)}
            className="px-2.5 sm:px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 border border-emerald-500/40 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:border-emerald-700/60 dark:text-emerald-300 dark:hover:bg-emerald-900/60 transition-all cursor-pointer shadow-2xs shrink-0 active:scale-95"
            title="Buka Kamera Barcode Scanner (Tekan F3)"
          >
            <Camera className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span className="hidden md:inline">Scan Barcode</span>
            <span className="hidden sm:inline text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-200/60 dark:bg-emerald-900/80 text-emerald-900 dark:text-emerald-300">
              F3
            </span>
          </button>

          {/* Backup & Restore Fast Action - Desktop only (hidden on mobile) */}
          <button
            type="button"
            id="btn-catalog-backup-restore"
            onClick={() => setIsBackupRestoreOpen(true)}
            className="hidden md:flex px-3 py-2 rounded-xl text-xs font-bold items-center gap-1.5 border border-emerald-300/80 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:border-emerald-700/60 dark:text-emerald-300 dark:hover:bg-emerald-900/60 transition-all cursor-pointer shadow-2xs shrink-0 active:scale-95"
            title="Pusat Cadangan & Titik Pemulihan (Backup & Restore - Tekan F9)"
          >
            <Database className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Backup &amp; Restore</span>
          </button>
        </div>
      </div>

      {/* Product Grid Area */}
      <div className="flex-1 p-3 overflow-y-auto bg-slate-100/60 dark:bg-slate-950">
        {filteredProducts.length > 0 ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3">
              {visibleProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  cartQuantity={cartQuantityMap[product.id] || 0}
                  currency={settings.currency}
                />
              ))}
            </div>

            {hasMore && (
              <div className="text-center pt-2 pb-4">
                <button
                  type="button"
                  onClick={() => setDisplayLimit((prev) => prev + 48)}
                  className="px-4 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-2xs transition-colors cursor-pointer inline-flex items-center gap-1.5"
                >
                  <ChevronDown className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Tampilkan Lebih Banyak ({visibleProducts.length} dari {filteredProducts.length} barang)</span>
                </button>
              </div>
            )}
          </div>
        ) : products.length === 0 ? (
          <div className="h-72 flex flex-col items-center justify-center text-center p-6 text-slate-400 dark:text-slate-500 bg-white/50 dark:bg-slate-900/50 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 my-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-3">
              <Package className="w-7 h-7" />
            </div>
            <p className="text-base font-bold text-slate-800 dark:text-slate-200">Katalog Produk Masih Kosong</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mt-1 mb-4 leading-relaxed">
              Belum ada produk dalam master data. Tambahkan produk satuan atau impor master data CSV Anda dengan mudah.
            </p>
            <button
              onClick={() => setActiveView('inventory')}
              className="px-4 py-2 text-xs rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold transition-all shadow-md shadow-emerald-500/20 cursor-pointer flex items-center gap-2"
            >
              <Package className="w-3.5 h-3.5" />
              <span>Kelola & Impor Produk</span>
            </button>
          </div>
        ) : (
          <div className="h-64 flex flex-col items-center justify-center text-center p-6 text-slate-400 dark:text-slate-500">
            <Package className="w-12 h-12 stroke-[1.5] mb-2 opacity-50" />
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Tidak ada produk yang cocok</p>
            <p className="text-xs text-slate-400 max-w-xs mt-1">
              Coba sesuaikan kata kunci pencarian atau ganti filter kategori produk.
            </p>
            {(searchQuery || selectedCategory !== 'all' || filterLowStock) && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('all');
                  setFilterLowStock(false);
                }}
                className="mt-3 px-3 py-1.5 text-xs rounded-lg bg-emerald-500 text-slate-950 font-bold cursor-pointer"
              >
                Reset Filter Pencarian
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

import React, { useRef, useEffect } from 'react';
import {
  Search,
  ScanBarcode,
  LayoutGrid,
  Coffee,
  Utensils,
  Croissant,
  Cookie,
  Package,
  AlertTriangle,
  Flame,
  X,
} from 'lucide-react';
import { usePOS } from '../context/POSContext';
import { ProductCard } from './ProductCard';

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  LayoutGrid,
  Coffee,
  Utensils,
  Croissant,
  Cookie,
  Package,
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
    setActiveView,
  } = usePOS();

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Global F2 shortcut to focus search input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Filter products
  const filteredProducts = products.filter((product) => {
    // Category match
    const categoryMatch = selectedCategory === 'all' || product.categoryId === selectedCategory;

    // Search or barcode match
    const query = searchQuery.trim().toLowerCase();
    const searchMatch =
      !query ||
      product.name.toLowerCase().includes(query) ||
      product.sku.toLowerCase().includes(query) ||
      product.barcode.toLowerCase().includes(query);

    // Low stock filter
    const stockMatch = !filterLowStock || product.stock <= product.minStock;

    return categoryMatch && searchMatch && stockMatch;
  });

  return (
    <div id="pos-product-catalog" className="flex flex-col h-full overflow-hidden bg-white dark:bg-slate-950">
      {/* Category Pills and Search Bar */}
      <div className="p-3 pb-2 space-y-2.5 bg-slate-50/80 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800">
        {/* Search Bar with Barcode Scanner Icon & Shortcuts */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
            <input
              ref={searchInputRef}
              id="pos-product-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama barang, merk, atau scan barcode (Tekan F2)..."
              className="w-full pl-9 pr-14 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all shadow-2xs"
            />
            {searchQuery ? (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            ) : (
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1 text-[10px] font-mono text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                <ScanBarcode className="w-3 h-3" />
                <span>F2</span>
              </div>
            )}
          </div>

          {/* Quick Filter: Low Stock */}
          <button
            type="button"
            id="filter-low-stock-btn"
            onClick={() => setFilterLowStock(!filterLowStock)}
            className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-all cursor-pointer ${
              filterLowStock
                ? 'bg-rose-50 border-rose-400 text-rose-800 dark:bg-rose-950/50 dark:border-rose-700 dark:text-rose-300 ring-1 ring-rose-500'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-850'
            }`}
            title="Filter barang stok menipis"
          >
            <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
            <span className="hidden sm:inline">Stok Menipis</span>
          </button>
        </div>

        {/* Categories Horizontal Carousel */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {categories.map((cat) => {
            const Icon = CATEGORY_ICONS[cat.iconName] || LayoutGrid;
            const isSelected = selectedCategory === cat.id;
            const count =
              cat.id === 'all'
                ? products.length
                : products.filter((p) => p.categoryId === cat.id).length;

            return (
              <button
                key={cat.id}
                id={`cat-btn-${cat.id}`}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer shrink-0 ${
                  isSelected
                    ? 'bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/10'
                    : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200 dark:bg-slate-950 dark:text-slate-300 dark:border-slate-800 dark:hover:bg-slate-850'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-slate-950' : 'text-emerald-500'}`} />
                <span>{cat.name}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-semibold ${
                    isSelected
                      ? 'bg-slate-950/20 text-slate-950'
                      : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Product Grid Area */}
      <div className="flex-1 p-3 overflow-y-auto bg-slate-100/60 dark:bg-slate-950">
        {filteredProducts.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3">
            {filteredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
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

import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Printer,
  QrCode,
  Tag,
  Grid,
  Check,
  CheckSquare,
  Square,
  Search,
  Sliders,
  Sparkles,
  Layers,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Plus,
  Minus,
  RotateCcw,
  Percent,
  MapPin,
  Barcode as BarcodeIcon,
  Store,
  Calendar,
  AlertCircle,
  Truck,
  Package,
  Eye,
  SlidersHorizontal,
  Share2,
  Clock,
  HelpCircle,
  CheckCircle2,
} from 'lucide-react';
import { usePOS } from '../context/POSContext';
import { Product } from '../types';
import { formatCurrency, formatDate } from '../utils/formatters';
import {
  QRShelfTagPreset,
  QRShelfTagOptions,
  generateQrSvgString,
  getDynamicShelfUrl,
  getLastPriceUpdateInfo,
  generateSingleQrShelfLabelHtml,
  buildFullQRShelfPrintDocument,
} from '../utils/qrLabelGenerator';
import { printViaIframe, openPrintWindow } from '../utils/printHelper';
import { ShelfProductLiveModal } from './ShelfProductLiveModal';

export interface QRShelfLabelModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialSelectedProduct?: Product | null;
  initialSelectedProductIds?: string[];
}

export const QRShelfLabelModal: React.FC<QRShelfLabelModalProps> = ({
  isOpen,
  onClose,
  initialSelectedProduct,
  initialSelectedProductIds,
}) => {
  const { products, categories, settings } = usePOS();

  // Active Preset & Options
  const [preset, setPreset] = useState<QRShelfTagPreset>('gondola_standard_60x40');
  const [showStoreHeader, setShowStoreHeader] = useState(true);
  const [showQrCode, setShowQrCode] = useState(true);
  const [showBarcode, setShowBarcode] = useState(true);
  const [showLastPriceUpdate, setShowLastPriceUpdate] = useState(true);
  const [showStockLevel, setShowStockLevel] = useState(true);
  const [showAisleLocation, setShowAisleLocation] = useState(true);
  const [showUnit, setShowUnit] = useState(true);
  const [showCutLines, setShowCutLines] = useState(true);
  const [qrSize, setQrSize] = useState<'compact' | 'standard' | 'prominent'>('standard');
  const [customPromoBadge, setCustomPromoBadge] = useState<string>('HARGA PAS');

  // Product Selection (Map product ID to copies count)
  const [selectedCopies, setSelectedCopies] = useState<Record<string, number>>(() => {
    if (initialSelectedProduct) {
      return { [initialSelectedProduct.id]: 1 };
    }
    if (initialSelectedProductIds && initialSelectedProductIds.length > 0) {
      const map: Record<string, number> = {};
      initialSelectedProductIds.forEach((id) => {
        map[id] = 1;
      });
      return map;
    }
    // Default: first 6 products
    const initialMap: Record<string, number> = {};
    products.slice(0, 6).forEach((p) => {
      initialMap[p.id] = 1;
    });
    return initialMap;
  });

  // Filters
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [quickFilter, setQuickFilter] = useState<'all' | 'recent_price' | 'low_stock' | 'has_promo'>('all');
  const [activeTab, setActiveTab] = useState<'preview' | 'select'>('preview');

  // Preview Pagination
  const [previewPage, setPreviewPage] = useState(1);

  // QR SVG Cache (Map productId to generated SVG string)
  const [qrSvgMap, setQrSvgMap] = useState<Record<string, string>>({});
  const [isLoadingQrs, setIsLoadingQrs] = useState(false);

  // Interactive Live Shelf Modal (for testing QR scan)
  const [testScanProductId, setTestScanProductId] = useState<string | null>(null);

  // Sync initialSelectedProduct when modal re-opens
  useEffect(() => {
    if (initialSelectedProduct) {
      setSelectedCopies({ [initialSelectedProduct.id]: 1 });
      setActiveTab('preview');
    } else if (initialSelectedProductIds && initialSelectedProductIds.length > 0) {
      const map: Record<string, number> = {};
      initialSelectedProductIds.forEach((id) => {
        map[id] = 1;
      });
      setSelectedCopies(map);
      setActiveTab('preview');
    }
  }, [initialSelectedProduct, initialSelectedProductIds]);

  // Pre-generate QR SVGs for selected products
  useEffect(() => {
    if (!isOpen) return;
    const selectedIds = Object.keys(selectedCopies).filter((id) => selectedCopies[id] > 0);
    const missingIds = selectedIds.filter((id) => !qrSvgMap[id]);

    if (missingIds.length === 0) return;

    let isMounted = true;
    setIsLoadingQrs(true);

    const generateMissing = async () => {
      const newSvgs: Record<string, string> = {};
      for (const id of missingIds) {
        const prod = products.find((p) => p.id === id);
        if (prod) {
          const url = getDynamicShelfUrl(prod.id);
          const svg = await generateQrSvgString(url, { margin: 1 });
          newSvgs[id] = svg;
        }
      }
      if (isMounted) {
        setQrSvgMap((prev) => ({ ...prev, ...newSvgs }));
        setIsLoadingQrs(false);
      }
    };

    generateMissing();

    return () => {
      isMounted = false;
    };
  }, [selectedCopies, products, isOpen, qrSvgMap]);

  // Filtered products list for product selector
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchSearch =
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.sku.toLowerCase().includes(search.toLowerCase()) ||
        p.barcode.toLowerCase().includes(search.toLowerCase()) ||
        (p.brand && p.brand.toLowerCase().includes(search.toLowerCase()));

      const matchCat = selectedCategory === 'all' || p.categoryId === selectedCategory;

      let matchQuick = true;
      if (quickFilter === 'recent_price') {
        const info = getLastPriceUpdateInfo(p);
        matchQuick = info.isRecent;
      } else if (quickFilter === 'low_stock') {
        matchQuick = p.stock <= p.minStock;
      } else if (quickFilter === 'has_promo') {
        matchQuick = Boolean(p.promoBadge);
      }

      return matchSearch && matchCat && matchQuick;
    });
  }, [products, search, selectedCategory, quickFilter]);

  // Flattened selected items by copies
  const selectedProductList = useMemo(() => {
    const list: { product: Product; copies: number }[] = [];
    products.forEach((p) => {
      const count = selectedCopies[p.id] || 0;
      if (count > 0) {
        list.push({ product: p, copies: count });
      }
    });
    return list;
  }, [products, selectedCopies]);

  const totalSelectedProducts = selectedProductList.length;
  const totalLabelTagsCount = selectedProductList.reduce((acc, item) => acc + item.copies, 0);

  // Pagination config based on preset
  const itemsPerPage = useMemo(() => {
    if (preset === 'compact_strip_50x30') return 8;
    if (preset === 'thermal_roll_58mm' || preset === 'thermal_roll_80mm') return 4;
    return 6; // Standard 60x40 talkers
  }, [preset]);

  const totalPages = Math.max(1, Math.ceil(totalSelectedProducts / itemsPerPage));
  const currentPageItems = useMemo(() => {
    const start = (previewPage - 1) * itemsPerPage;
    return selectedProductList.slice(start, start + itemsPerPage);
  }, [selectedProductList, previewPage, itemsPerPage]);

  const tagOptions: QRShelfTagOptions = useMemo(
    () => ({
      preset,
      showStoreHeader,
      showQrCode,
      showBarcode,
      showLastPriceUpdate,
      showStockLevel,
      showAisleLocation,
      showUnit,
      showCutLines,
      qrSize,
      storeName: settings.storeName || 'ULILMART MAGETAN',
      branchName: settings.branchName || 'CABANG UTAMA',
      customPromoBadge,
    }),
    [
      preset,
      showStoreHeader,
      showQrCode,
      showBarcode,
      showLastPriceUpdate,
      showStockLevel,
      showAisleLocation,
      showUnit,
      showCutLines,
      qrSize,
      settings,
      customPromoBadge,
    ]
  );

  // Toggle selection
  const handleToggleProduct = (id: string) => {
    setSelectedCopies((prev) => {
      const next = { ...prev };
      if (next[id]) {
        delete next[id];
      } else {
        next[id] = 1;
      }
      return next;
    });
  };

  const handleUpdateCopies = (id: string, delta: number) => {
    setSelectedCopies((prev) => {
      const curr = prev[id] || 0;
      const nextVal = Math.max(0, curr + delta);
      const next = { ...prev };
      if (nextVal === 0) {
        delete next[id];
      } else {
        next[id] = nextVal;
      }
      return next;
    });
  };

  const handleSelectAllFiltered = () => {
    setSelectedCopies((prev) => {
      const next = { ...prev };
      filteredProducts.forEach((p) => {
        next[p.id] = next[p.id] || 1;
      });
      return next;
    });
  };

  const handleDeselectAll = () => {
    setSelectedCopies({});
  };

  const handleSetAllCopies = (copies: number) => {
    setSelectedCopies((prev) => {
      const next: Record<string, number> = {};
      Object.keys(prev).forEach((id) => {
        next[id] = copies;
      });
      return next;
    });
  };

  // Execute Print
  const handlePrint = async () => {
    if (selectedProductList.length === 0) return;

    // Ensure all SVGs are loaded
    const missingItems = selectedProductList.filter((item) => !qrSvgMap[item.product.id]);
    let localSvgMap = { ...qrSvgMap };

    if (missingItems.length > 0) {
      for (const item of missingItems) {
        const url = getDynamicShelfUrl(item.product.id);
        localSvgMap[item.product.id] = await generateQrSvgString(url, { margin: 1 });
      }
      setQrSvgMap(localSvgMap);
    }

    const printItems = selectedProductList.map((item) => ({
      product: item.product,
      qrSvg: localSvgMap[item.product.id] || '',
      copies: item.copies,
    }));

    const printHtml = buildFullQRShelfPrintDocument(
      printItems,
      tagOptions,
      settings.currency || 'IDR'
    );

    try {
      printViaIframe(printHtml, 'Cetak Label Rak QR');
    } catch {
      openPrintWindow(printHtml, 'Cetak Label Rak QR');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-xs overflow-hidden animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-6xl w-full h-[94vh] shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden">
        {/* Top Header */}
        <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-blue-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-black text-white">
                  Cetak Label Rak QR Dinamis (Shelf Talker)
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
                  Real-Time Live Link
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Label rak pintar dengan QR link menuju stok fisik &amp; riwayat pembaruan harga terkini toko.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              disabled={totalLabelTagsCount === 0}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-indigo-600/30 cursor-pointer transition active:scale-95"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak {totalLabelTagsCount} Label</span>
            </button>
            <button aria-label="Tutup"
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Main Work Area: Split Grid */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          {/* LEFT PANEL: Options & Formats Configuration (320px) */}
          <div className="w-full lg:w-80 bg-slate-50 dark:bg-slate-850 border-r border-slate-200 dark:border-slate-800 overflow-y-auto p-4 space-y-4 shrink-0 text-xs">
            {/* Navigation Tabs (Preview vs Item Selector) */}
            <div className="grid grid-cols-2 gap-1 bg-slate-200 dark:bg-slate-800 p-1 rounded-xl">
              <button aria-pressed={activeTab === 'preview'}
                type="button"
                onClick={() => setActiveTab('preview')}
                className={`py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeTab === 'preview'
                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Pratinjau ({totalLabelTagsCount})</span>
              </button>
              <button aria-pressed={activeTab === 'select'}
                type="button"
                onClick={() => setActiveTab('select')}
                className={`py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeTab === 'select'
                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <CheckSquare className="w-3.5 h-3.5" />
                <span>Pilih Produk ({totalSelectedProducts})</span>
              </button>
            </div>

            {/* PRESET SIZES */}
            <div>
              <label className="font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider text-[10px] block mb-2 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-indigo-500" />
                <span>Ukuran &amp; Format Label Rak</span>
              </label>
              <div className="space-y-1.5">
                {[
                  {
                    id: 'gondola_standard_60x40',
                    name: 'Label Gondola Standar (60×40mm)',
                    desc: 'Ukuran populer selot rak mika (QR besar + Update Harga + Stok)',
                  },
                  {
                    id: 'compact_strip_50x30',
                    name: 'Label Strip Kompak (50×30mm)',
                    desc: 'Hemat tempat untuk rak sempit / produk padat',
                  },
                  {
                    id: 'thermal_roll_58mm',
                    name: 'Stiker Thermal Roll 58mm',
                    desc: 'Khusus printer thermal stiker roll continuous (Xprinter/Zebra)',
                  },
                  {
                    id: 'thermal_roll_80mm',
                    name: 'Stiker Thermal Roll 80mm',
                    desc: 'Lebar lega untuk label etalase besar continuous roll',
                  },
                  {
                    id: 'sheet_a4_3x8',
                    name: 'Lembar Stiker A4 Grid (24 Label)',
                    desc: 'Format 3 kolom × 8 baris untuk kertas stiker lembaran A4',
                  },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setPreset(item.id as any)}
                    className={`w-full text-left p-2.5 rounded-xl border transition-all cursor-pointer ${
                      preset === item.id
                        ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-500 dark:border-indigo-500 text-indigo-950 dark:text-indigo-200 shadow-2xs font-semibold'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                    }`}
                  >
                    <div className="font-bold">{item.name}</div>
                    <div className="text-[10px] text-slate-500 font-normal leading-tight mt-0.5">
                      {item.desc}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* CUSTOMIZATION TOGGLES */}
            <div className="pt-3 border-t border-slate-200 dark:border-slate-750">
              <label className="font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider text-[10px] block mb-2 flex items-center gap-1.5">
                <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-500" />
                <span>Komponen Label Rak</span>
              </label>

              <div className="space-y-2 bg-white dark:bg-slate-800 p-3 rounded-2xl border border-slate-200 dark:border-slate-700">
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="font-medium text-slate-700 dark:text-slate-300">
                    QR Code Pintar (Link Dinamis)
                  </span>
                  <input
                    type="checkbox"
                    checked={showQrCode}
                    onChange={(e) => setShowQrCode(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer">
                  <span className="font-medium text-slate-700 dark:text-slate-300">
                    Tanggal Update Harga Terakhir
                  </span>
                  <input
                    type="checkbox"
                    checked={showLastPriceUpdate}
                    onChange={(e) => setShowLastPriceUpdate(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer">
                  <span className="font-medium text-slate-700 dark:text-slate-300">
                    Jumlah &amp; Status Stok Real-time
                  </span>
                  <input
                    type="checkbox"
                    checked={showStockLevel}
                    onChange={(e) => setShowStockLevel(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer">
                  <span className="font-medium text-slate-700 dark:text-slate-300">
                    Lokasi Rak / Lorong (Aisle)
                  </span>
                  <input
                    type="checkbox"
                    checked={showAisleLocation}
                    onChange={(e) => setShowAisleLocation(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer">
                  <span className="font-medium text-slate-700 dark:text-slate-300">
                    Barcode 1D (Garis)
                  </span>
                  <input
                    type="checkbox"
                    checked={showBarcode}
                    onChange={(e) => setShowBarcode(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer">
                  <span className="font-medium text-slate-700 dark:text-slate-300">
                    Header Nama Toko
                  </span>
                  <input
                    type="checkbox"
                    checked={showStoreHeader}
                    onChange={(e) => setShowStoreHeader(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer">
                  <span className="font-medium text-slate-700 dark:text-slate-300">
                    Garis Panduan Potong / Gunting
                  </span>
                  <input
                    type="checkbox"
                    checked={showCutLines}
                    onChange={(e) => setShowCutLines(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                  />
                </label>
              </div>
            </div>

            {/* QR SIZE SELECTION */}
            <div className="pt-2">
              <label className="font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider text-[10px] block mb-1.5">
                Ukuran QR Code Pada Label
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {(['compact', 'standard', 'prominent'] as const).map((sz) => (
                  <button
                    key={sz}
                    type="button"
                    onClick={() => setQrSize(sz)}
                    className={`py-1.5 rounded-xl border text-[11px] font-bold capitalize transition cursor-pointer ${
                      qrSize === sz
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {sz === 'compact' ? 'Kecil' : sz === 'standard' ? 'Sedang' : 'Besar'}
                  </button>
                ))}
              </div>
            </div>

            {/* PROMO BADGE INPUT */}
            <div>
              <label className="font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider text-[10px] block mb-1">
                Teks Badge Promo / Tagline
              </label>
              <input aria-label="Teks Badge Promo / Tagline"
                type="text"
                value={customPromoBadge}
                onChange={(e) => setCustomPromoBadge(e.target.value)}
                placeholder="HARGA PAS, PROMO MINGGU INI..."
                className="w-full px-3 py-1.5 text-xs rounded-xl bg-white dark:bg-slate-800 border border-slate-500 dark:border-slate-700 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {/* RIGHT WORKSPACE: PREVIEW OR PRODUCT SELECTOR */}
          <div className="flex-1 flex flex-col bg-slate-100 dark:bg-slate-950 overflow-hidden">
            {activeTab === 'preview' ? (
              /* TAB 1: VISUAL PREVIEW */
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Preview Toolbar */}
                <div className="bg-white dark:bg-slate-900 px-4 py-2.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                      Pratinjau Cetak Label:
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold text-[11px]">
                      {totalSelectedProducts} Produk ({totalLabelTagsCount} Salinan Total)
                    </span>
                    {isLoadingQrs && (
                      <span className="text-[11px] text-amber-500 font-semibold animate-pulse">
                        Menyiapkan QR SVG...
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleSetAllCopies(1)}
                      className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 transition cursor-pointer"
                    >
                      1 Salinan Tiap Produk
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSetAllCopies(2)}
                      className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 transition cursor-pointer"
                    >
                      2 Salinan Tiap Produk
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('select')}
                      className="px-3 py-1 text-xs font-bold rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 transition cursor-pointer"
                    >
                      + Tambah Produk Lain
                    </button>
                  </div>
                </div>

                {/* Preview Content Area */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col items-center">
                  {totalSelectedProducts === 0 ? (
                    <div className="my-auto text-center max-w-sm">
                      <div className="w-16 h-16 rounded-3xl bg-slate-200 dark:bg-slate-800 text-slate-500 flex items-center justify-center mx-auto mb-3">
                        <Tag className="w-8 h-8" />
                      </div>
                      <h4 className="font-black text-slate-800 dark:text-slate-200 text-sm mb-1">
                        Belum Ada Produk Dipilih
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                        Pilih produk yang ingin Anda cetak label rak QR dinamisnya dari katalog inventaris.
                      </p>
                      <button
                        type="button"
                        onClick={() => setActiveTab('select')}
                        className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs cursor-pointer shadow-md"
                      >
                        Buka Pemilih Produk
                      </button>
                    </div>
                  ) : (
                    <div className="w-full max-w-4xl space-y-6">
                      {/* Interactive Shelf Talkers Grid */}
                      <div
                        className={`grid gap-4 ${
                          preset === 'compact_strip_50x30'
                            ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4'
                            : preset === 'thermal_roll_58mm' || preset === 'thermal_roll_80mm'
                            ? 'grid-cols-1 sm:grid-cols-2 max-w-xl mx-auto'
                            : 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-3'
                        }`}
                      >
                        {currentPageItems.map(({ product, copies }) => {
                          const qrSvg = qrSvgMap[product.id] || '<svg width="50" height="50"></svg>';
                          const labelHtml = generateSingleQrShelfLabelHtml(
                            product,
                            qrSvg,
                            tagOptions,
                            settings.currency
                          );

                          return (
                            <div
                              key={product.id}
                              className="bg-white rounded-2xl shadow-md border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col transition hover:shadow-lg"
                            >
                              {/* Label Visual Renderer (Actual HTML that will print) */}
                              <div
                                className="p-2 min-h-[140px] flex items-center justify-center bg-white"
                                dangerouslySetInnerHTML={{ __html: labelHtml }}
                              />

                              {/* Card Control Bar */}
                              <div className="bg-slate-50 dark:bg-slate-850 p-2.5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                                    Salinan:
                                  </span>
                                  <div className="flex items-center gap-1 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 px-1 py-0.5">
                                    <button aria-label="Kurangi"
                                      type="button"
                                      onClick={() => handleUpdateCopies(product.id, -1)}
                                      className="w-5 h-5 flex items-center justify-center rounded text-slate-600 dark:text-slate-400 hover:bg-slate-100 cursor-pointer"
                                    >
                                      <Minus className="w-3 h-3" />
                                    </button>
                                    <span className="w-6 text-center font-bold font-mono">
                                      {copies}
                                    </span>
                                    <button aria-label="Tambah"
                                      type="button"
                                      onClick={() => handleUpdateCopies(product.id, 1)}
                                      className="w-5 h-5 flex items-center justify-center rounded text-slate-600 dark:text-slate-400 hover:bg-slate-100 cursor-pointer"
                                    >
                                      <Plus className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>

                                {/* Simulation Button (Test QR Scan live) */}
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => setTestScanProductId(product.id)}
                                    className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 font-bold text-[11px] flex items-center gap-1 cursor-pointer transition"
                                    title="Uji coba tampilan saat QR code discan dari HP"
                                  >
                                    <QrCode className="w-3 h-3" />
                                    <span>Tes Scan</span>
                                  </button>
                                  <button aria-label="Hapus dari daftar cetak"
                                    type="button"
                                    onClick={() => handleToggleProduct(product.id)}
                                    className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-500 hover:text-rose-600 transition cursor-pointer"
                                    title="Hapus dari daftar cetak"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Pagination Controls */}
                      {totalPages > 1 && (
                        <div className="flex items-center justify-center gap-2 pt-4">
                          <button aria-label="Sebelumnya"
                            type="button"
                            onClick={() => setPreviewPage((p) => Math.max(1, p - 1))}
                            disabled={previewPage === 1}
                            className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 disabled:opacity-40 cursor-pointer"
                          >
                            <ChevronLeft className="w-4 h-4" />
                          </button>
                          <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                            Halaman {previewPage} dari {totalPages}
                          </span>
                          <button aria-label="Berikutnya"
                            type="button"
                            onClick={() => setPreviewPage((p) => Math.min(totalPages, p + 1))}
                            disabled={previewPage === totalPages}
                            className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 disabled:opacity-40 cursor-pointer"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* TAB 2: PRODUCT SELECTION CATALOG */
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Search & Filter Bar */}
                <div className="p-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2 flex-1 max-w-md">
                    <div className="relative flex-1">
                      <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input aria-label="Cari nama, SKU, barcode produk..."
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Cari nama, SKU, barcode produk..."
                        className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-500 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    <select aria-label="Filter kategori"
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="px-2.5 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-500 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-medium cursor-pointer"
                    >
                      <option value="all">Semua Kategori</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Quick Filter Buttons */}
                  <div className="flex items-center gap-1.5 flex-wrap text-xs">
                    {[
                      { id: 'all', label: 'Semua' },
                      { id: 'recent_price', label: '⚡ Update Harga Baru' },
                      { id: 'low_stock', label: '⚠️ Stok Kritis' },
                      { id: 'has_promo', label: '🏷️ Promo' },
                    ].map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setQuickFilter(f.id as any)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                          quickFilter === f.id
                            ? 'bg-indigo-600 text-white'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>

                  {/* Select / Deselect All */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleSelectAllFiltered}
                      className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold text-xs border border-emerald-200 dark:border-emerald-800 cursor-pointer"
                    >
                      Pilih Semua ({filteredProducts.length})
                    </button>
                    <button
                      type="button"
                      onClick={handleDeselectAll}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold text-xs cursor-pointer hover:bg-slate-200"
                    >
                      Batal Semua
                    </button>
                  </div>
                </div>

                {/* Products Table */}
                <div className="flex-1 overflow-y-auto p-4">
                  <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-750 text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        <tr>
                          <th className="py-2.5 px-3 w-10 text-center">Pilih</th>
                          <th className="py-2.5 px-3">Produk &amp; SKU</th>
                          <th className="py-2.5 px-3">Harga Retail</th>
                          <th className="py-2.5 px-3">Update Harga Terakhir</th>
                          <th className="py-2.5 px-3 text-center">Stok Fisik</th>
                          <th className="py-2.5 px-3 text-center">Lokasi Rak</th>
                          <th className="py-2.5 px-3 text-center w-28">Salinan Cetak</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {filteredProducts.map((p) => {
                          const isSelected = Boolean(selectedCopies[p.id]);
                          const copies = selectedCopies[p.id] || 0;
                          const priceUpdate = getLastPriceUpdateInfo(p);

                          return (
                            <tr
                              key={p.id}
                              className={`hover:bg-indigo-50/40 dark:hover:bg-slate-800/50 transition ${
                                isSelected ? 'bg-indigo-50/20 dark:bg-indigo-950/20' : ''
                              }`}
                            >
                              <td className="py-2 px-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleToggleProduct(p.id)}
                                  className="cursor-pointer text-indigo-600"
                                >
                                  {isSelected ? (
                                    <CheckSquare className="w-4 h-4 fill-indigo-600 text-white" />
                                  ) : (
                                    <Square className="w-4 h-4 text-slate-300 dark:text-slate-600" />
                                  )}
                                </button>
                              </td>
                              <td className="py-2 px-3">
                                <div className="font-bold text-slate-900 dark:text-white leading-tight">
                                  {p.name}
                                </div>
                                <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                                  SKU: {p.sku} | Barcode: {p.barcode}
                                </div>
                              </td>
                              <td className="py-2 px-3 font-mono font-bold text-slate-900 dark:text-emerald-400">
                                {formatCurrency(p.price, settings.currency)}
                              </td>
                              <td className="py-2 px-3">
                                <div className="font-semibold text-slate-800 dark:text-slate-200">
                                  {priceUpdate.formattedDate}
                                </div>
                                <div className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium">
                                  {priceUpdate.changeTypeLabel}
                                </div>
                              </td>
                              <td className="py-2 px-3 text-center font-bold">
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] ${
                                    p.stock <= 0
                                      ? 'bg-rose-100 text-rose-700'
                                      : p.stock <= p.minStock
                                      ? 'bg-amber-100 text-amber-700'
                                      : 'bg-emerald-100 text-emerald-700'
                                  }`}
                                >
                                  {p.stock} {p.unit || 'pcs'}
                                </span>
                              </td>
                              <td className="py-2 px-3 text-center text-slate-500 font-mono text-[11px]">
                                {p.aisle || '-'}
                              </td>
                              <td className="py-2 px-3 text-center">
                                {isSelected ? (
                                  <div className="flex items-center justify-center gap-1">
                                    <button
                                      type="button"
                                      onClick={() => handleUpdateCopies(p.id, -1)}
                                      aria-label={`Kurangi jumlah salinan ${p.name}`}
                                      className="w-5 h-5 rounded bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-slate-600 hover:bg-slate-200 cursor-pointer"
                                    >
                                      -
                                    </button>
                                    <span className="w-5 font-mono font-bold">{copies}</span>
                                    <button
                                      type="button"
                                      onClick={() => handleUpdateCopies(p.id, 1)}
                                      aria-label={`Tambah jumlah salinan ${p.name}`}
                                      className="w-5 h-5 rounded bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-slate-600 hover:bg-slate-200 cursor-pointer"
                                    >
                                      +
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => handleToggleProduct(p.id)}
                                    className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-indigo-600 hover:text-white text-slate-600 dark:bg-slate-800 dark:text-slate-300 font-bold text-[10px] cursor-pointer transition"
                                  >
                                    + Tambah
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer Summary & Action Bar */}
        <div className="bg-slate-900 text-white px-5 py-3 border-t border-slate-800 flex items-center justify-between gap-3 shrink-0 flex-wrap">
          <div className="flex items-center gap-3 text-xs">
            <span className="text-slate-500">Total Label Dicetak:</span>
            <span className="font-mono font-black text-indigo-300 text-sm">
              {totalLabelTagsCount} Lembar Tag
            </span>
            <span className="text-slate-500">|</span>
            <span className="text-slate-500">Format Kertas:</span>
            <span className="font-semibold text-white">
              {preset === 'sheet_a4_3x8'
                ? 'Lembar A4 Grid'
                : preset === 'compact_strip_50x30'
                ? 'Strip Rak 50×30mm'
                : preset.startsWith('thermal')
                ? 'Thermal Continuous Roll'
                : 'Gondola Standar 60×40mm'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs cursor-pointer transition"
            >
              Batal / Tutup
            </button>
            <button
              onClick={handlePrint}
              disabled={totalLabelTagsCount === 0}
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-indigo-600/30 cursor-pointer transition active:scale-95"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak Sekarang ({totalLabelTagsCount} Label)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Simulated QR Scan Modal */}
      {testScanProductId && (
        <ShelfProductLiveModal
          productId={testScanProductId}
          isOpen={Boolean(testScanProductId)}
          onClose={() => setTestScanProductId(null)}
          onOpenPrintLabel={() => setTestScanProductId(null)}
        />
      )}
    </div>
  );
};

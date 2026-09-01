import React, { useState } from 'react';
import {
  Globe,
  Search,
  Barcode,
  Sparkles,
  Package,
  Layers,
  CheckCircle2,
  AlertCircle,
  Plus,
  X,
  ExternalLink,
  RefreshCw,
  Zap,
  Info,
  DollarSign,
  Tag,
  Boxes,
  Copy,
  Check,
  Award,
  Link,
  ArrowRight,
  Database,
} from 'lucide-react';
import { usePOS } from '../context/POSContext';
import { Product, WholesaleUnit, GroundingSource } from '../types';
import { formatCurrency } from '../utils/formatters';

interface OnlineDatabaseMatcherModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectForForm?: (matchedData: Partial<Product>) => void;
}

interface OnlineProductResult {
  barcode: string;
  name: string;
  brand?: string;
  categoryId: string;
  unit: string;
  price: number;
  costPrice: number;
  image?: string;
  description?: string;
  wholesaleUnits?: WholesaleUnit[];
  source?: string;
  groundingSources?: GroundingSource[];
  isTop3GoogleResult?: boolean;
  googleRank?: number;
}

export const OnlineDatabaseMatcherModal: React.FC<OnlineDatabaseMatcherModalProps> = ({
  isOpen,
  onClose,
  onSelectForForm,
}) => {
  const { addProduct, categories, products } = usePOS();

  const [activeTab, setActiveTab] = useState<'barcode' | 'keyword'>('barcode');
  const [barcodeInput, setBarcodeInput] = useState('');
  const [keywordInput, setKeywordInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [barcodeResult, setBarcodeResult] = useState<OnlineProductResult | null>(null);
  const [searchResults, setSearchResults] = useState<OnlineProductResult[]>([]);
  const [groundingSources, setGroundingSources] = useState<GroundingSource[]>([]);
  const [dataSource, setDataSource] = useState<string>('');
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [copiedUrlIndex, setCopiedUrlIndex] = useState<number | null>(null);

  if (!isOpen) return null;

  const showToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3500);
  };

  const handleCopyUrl = (url: string, index: number) => {
    navigator.clipboard.writeText(url);
    setCopiedUrlIndex(index);
    showToast('📋 Tautan sitasi Google Search berhasil disalin ke clipboard!');
    setTimeout(() => setCopiedUrlIndex(null), 2000);
  };

  const handleLookupBarcode = async (codeToLookup?: string) => {
    const target = (codeToLookup || barcodeInput).trim();
    if (!target) {
      setErrorMsg('Masukkan barcode fisik atau scan kode terlebih dahulu.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setBarcodeResult(null);
    setGroundingSources([]);
    setSearched(true);

    try {
      const res = await fetch('/api/online/lookup-barcode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ barcode: target }),
      });
      const data = await res.json();

      if (data.success && data.data) {
        setBarcodeResult(data.data);
        setDataSource(data.source || 'Google Search Grounding (Live Web)');
        if (Array.isArray(data.top3GoogleSources) && data.top3GoogleSources.length > 0) {
          setGroundingSources(data.top3GoogleSources);
        } else if (Array.isArray(data.groundingSources)) {
          setGroundingSources(data.groundingSources);
        }
      } else {
        setErrorMsg(data.message || `Barcode "${target}" tidak ditemukan di Google Grounding atau database internet.`);
      }
    } catch {
      setErrorMsg('Gagal terhubung ke layanan Google Grounding. Periksa koneksi internet.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchKeyword = async (qToSearch?: string) => {
    const target = (qToSearch || keywordInput).trim();
    if (!target) {
      setErrorMsg('Ketik nama produk, merk, atau kata kunci pencarian.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setSearchResults([]);
    setGroundingSources([]);
    setSearched(true);

    try {
      const res = await fetch('/api/online/search-products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: target }),
      });
      const data = await res.json();

      if (data.success && Array.isArray(data.results)) {
        setSearchResults(data.results);
        setDataSource(data.source || 'Google Search Grounding (Live Web)');
        if (Array.isArray(data.top3GoogleSources) && data.top3GoogleSources.length > 0) {
          setGroundingSources(data.top3GoogleSources);
        } else if (Array.isArray(data.groundingSources)) {
          setGroundingSources(data.groundingSources);
        }
        if (data.results.length === 0) {
          setErrorMsg(`Tidak ditemukan produk yang cocok untuk kata kunci "${target}".`);
        }
      } else {
        setErrorMsg('Tidak dapat memproses hasil pencarian Google Search Grounding.');
      }
    } catch {
      setErrorMsg('Gagal terhubung ke layanan Google Search Grounding.');
    } finally {
      setLoading(false);
    }
  };

  const handleImportToCatalog = (item: OnlineProductResult, citationUrl?: string) => {
    // Check if barcode already exists in catalog
    const existing = products.find((p) => p.barcode === item.barcode);
    if (existing) {
      showToast(`⚠️ Produk dengan barcode ${item.barcode} (${existing.name}) sudah ada di katalog.`);
      return;
    }

    // Auto-generate SKU
    const prefix = item.categoryId.replace('cat-', '').toUpperCase().slice(0, 3);
    const randomCode = Math.floor(1000 + Math.random() * 9000);
    const sku = `${prefix}-${item.brand ? item.brand.slice(0, 3).toUpperCase() : 'PRD'}-${randomCode}`;

    const sourceNote = citationUrl
      ? `Terverifikasi Google Search Engine (${citationUrl})`
      : groundingSources.length > 0
      ? `Terverifikasi Google Search: ${groundingSources[0].domain}`
      : 'Terverifikasi Google Search Grounding';

    const newProduct: Omit<Product, 'id'> = {
      name: item.name,
      brand: item.brand,
      sku,
      barcode: item.barcode,
      categoryId: item.categoryId || 'cat-staple',
      price: item.price,
      costPrice: item.costPrice,
      stock: 40,
      minStock: 8,
      unit: item.unit || 'pcs',
      image: item.image || '',
      description: item.description
        ? `${item.description} [${sourceNote}]`
        : `Produk resmi terverifikasi [${sourceNote}].`,
      wholesaleUnits:
        item.wholesaleUnits && item.wholesaleUnits.length > 0
          ? item.wholesaleUnits.map((u, idx) => ({
              id: `wh-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 5)}`,
              name: u.name,
              multiplier: u.multiplier,
              price: u.price,
              costPrice: u.costPrice,
              barcode: `${item.barcode}-${u.multiplier}`,
            }))
          : undefined,
    };

    addProduct(newProduct);
    setAddedIds((prev) => new Set([...prev, item.barcode]));
    showToast(`✅ "${item.name}" berhasil dimasukkan ke sistem katalog toko!`);
  };

  // Mass-import Top 3 Google Search Results into system catalog
  const handleImportTop3ToCatalog = () => {
    const targetItems = searchResults.slice(0, 3);
    if (targetItems.length === 0) {
      showToast('⚠️ Tidak ada produk hasil pencarian yang dapat dimasukkan.');
      return;
    }

    let countAdded = 0;
    const newlyAdded = new Set(addedIds);

    targetItems.forEach((item, index) => {
      const existing = products.find((p) => p.barcode === item.barcode);
      if (!existing && !newlyAdded.has(item.barcode)) {
        const prefix = item.categoryId.replace('cat-', '').toUpperCase().slice(0, 3);
        const randomCode = Math.floor(1000 + Math.random() * 9000);
        const sku = `${prefix}-${item.brand ? item.brand.slice(0, 3).toUpperCase() : 'PRD'}-${randomCode}`;
        const citation = groundingSources[index] || groundingSources[0];

        const sourceNote = citation
          ? `Top #${index + 1} Google Search (${citation.domain || citation.title})`
          : `Top #${index + 1} Google Search Result`;

        const newProduct: Omit<Product, 'id'> = {
          name: item.name,
          brand: item.brand,
          sku,
          barcode: item.barcode,
          categoryId: item.categoryId || 'cat-staple',
          price: item.price,
          costPrice: item.costPrice,
          stock: 40,
          minStock: 8,
          unit: item.unit || 'pcs',
          image: item.image || '',
          description: item.description
            ? `${item.description} [${sourceNote}]`
            : `Produk terverifikasi [${sourceNote}].`,
          wholesaleUnits:
            item.wholesaleUnits && item.wholesaleUnits.length > 0
              ? item.wholesaleUnits.map((u, idx) => ({
                  id: `wh-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 5)}`,
                  name: u.name,
                  multiplier: u.multiplier,
                  price: u.price,
                  costPrice: u.costPrice,
                  barcode: `${item.barcode}-${u.multiplier}`,
                }))
              : undefined,
        };

        addProduct(newProduct);
        newlyAdded.add(item.barcode);
        countAdded++;
      }
    });

    setAddedIds(newlyAdded);
    if (countAdded > 0) {
      showToast(`🎉 Berhasil memasukkan ${countAdded} produk Top 3 Google Search ke dalam sistem toko!`);
    } else {
      showToast(`ℹ️ Semua produk dari Top 3 Google Search sudah ada di sistem toko.`);
    }
  };

  const handleSendToForm = (item: OnlineProductResult) => {
    if (onSelectForForm) {
      onSelectForForm({
        name: item.name,
        brand: item.brand,
        barcode: item.barcode,
        categoryId: item.categoryId,
        unit: item.unit,
        price: item.price,
        costPrice: item.costPrice,
        image: item.image,
        description: item.description,
        wholesaleUnits: item.wholesaleUnits,
      });
      onClose();
    }
  };

  const getCategoryName = (catId: string) => {
    const found = categories.find((c) => c.id === catId);
    return found ? found.name : 'Umum';
  };

  const getRankBadge = (rank: number) => {
    if (rank === 1) {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700 flex items-center gap-1 shadow-xs">
          <span>🥇</span> Top #1 Google Search
        </span>
      );
    }
    if (rank === 2) {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-600 flex items-center gap-1">
          <span>🥈</span> Top #2 Google Search
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-orange-100 dark:bg-orange-950/70 text-orange-800 dark:text-orange-300 border border-orange-300 dark:border-orange-700 flex items-center gap-1">
        <span>🥉</span> Top #3 Google Search
      </span>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-4xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-teal-900/40 via-emerald-900/30 to-slate-900">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/20">
              <Globe className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Pencocokan Database Online & Cek Barcode Internet
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                  <Zap className="w-3 h-3" /> Google Search Engine Grounding
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Terhubung ke Google Search Engine & Gemini AI untuk menyaring Top 3 sitasi sumber web terpercaya dan memasukkannya ke sistem toko.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success Toast */}
        {successToast && (
          <div className="bg-emerald-600 text-white text-xs font-bold px-4 py-2 flex items-center justify-between animate-in slide-in-from-top-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>{successToast}</span>
            </div>
            <button onClick={() => setSuccessToast(null)} className="text-emerald-200 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 p-3 bg-slate-100 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800">
          <button
            onClick={() => {
              setActiveTab('barcode');
              setErrorMsg(null);
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'barcode'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <Barcode className="w-4 h-4" />
            <span>Cek Barcode EAN-13 / UPC</span>
          </button>
          <button
            onClick={() => {
              setActiveTab('keyword');
              setErrorMsg(null);
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'keyword'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <Search className="w-4 h-4" />
            <span>Cari Berdasarkan Nama Produk / Merk</span>
          </button>

          <div className="ml-auto hidden sm:flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
            <span>Top 3 Google Search Grounding Aktif</span>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Top 3 Citations Card (Universal Google Web Citations Block) */}
          {groundingSources.length > 0 && (
            <div className="bg-gradient-to-br from-emerald-950/20 via-teal-950/10 to-slate-900/40 rounded-2xl border border-emerald-500/30 p-4 shadow-lg space-y-3 animate-in fade-in-50">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
                    <Award className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                      <span>Top 3 Sitasi Sumber Web Google Search Engine</span>
                      <span className="text-[10px] font-normal px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                        {groundingSources.length} Sumber Terindeks
                      </span>
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Sitasi web resmi hasil query search engine Google untuk verifikasi spesifikasi, katalog, &amp; harga ritel.
                    </p>
                  </div>
                </div>

                {/* Batch Button for Top 3 Import */}
                {activeTab === 'keyword' && searchResults.length > 0 && (
                  <button
                    onClick={handleImportTop3ToCatalog}
                    className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-600/20 cursor-pointer active:scale-95 transition-transform"
                  >
                    <Database className="w-3.5 h-3.5" />
                    <span>Masukkan Top 3 Hasil ke Sistem</span>
                  </button>
                )}
              </div>

              {/* 3 Citation Grid Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 pt-1">
                {groundingSources.slice(0, 3).map((src, idx) => {
                  const rank = src.rank || idx + 1;
                  return (
                    <div
                      key={idx}
                      className="bg-white dark:bg-slate-800/90 rounded-xl border border-slate-200 dark:border-slate-700/80 p-3 flex flex-col justify-between space-y-2 hover:border-emerald-500/50 transition-colors shadow-xs"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between gap-1">
                          {getRankBadge(rank)}
                          <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 font-bold truncate max-w-[110px]">
                            {src.domain || 'google.com'}
                          </span>
                        </div>
                        <h5 className="text-xs font-bold text-slate-800 dark:text-slate-200 line-clamp-2 leading-snug">
                          {src.title || 'Hasil Pencarian Google Ritel Indonesia'}
                        </h5>
                        {src.snippet && (
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-2">
                            {src.snippet}
                          </p>
                        )}
                      </div>

                      {/* Citation Actions */}
                      <div className="pt-2 border-t border-slate-100 dark:border-slate-700/50 flex items-center justify-between gap-1.5">
                        <button
                          onClick={() => handleCopyUrl(src.uri, idx)}
                          className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                          title="Salin Tautan Web"
                        >
                          {copiedUrlIndex === idx ? (
                            <Check className="w-3 h-3 text-emerald-500" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                          <span>Salin</span>
                        </button>

                        <a
                          href={src.uri}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-emerald-100 dark:hover:bg-emerald-950/60 text-slate-700 dark:text-slate-300 hover:text-emerald-700 dark:hover:text-emerald-400 text-[10px] font-bold flex items-center gap-1 transition-colors"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>Buka Web</span>
                        </a>

                        {/* Quick Add Product related to this citation */}
                        {activeTab === 'keyword' && searchResults[idx] && (
                          <button
                            onClick={() => handleImportToCatalog(searchResults[idx], src.uri)}
                            disabled={addedIds.has(searchResults[idx].barcode)}
                            className={`px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-colors ${
                              addedIds.has(searchResults[idx].barcode)
                                ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                                : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                            }`}
                            title="Masukkan produk ini ke sistem toko"
                          >
                            <Plus className="w-3 h-3" />
                            <span>{addedIds.has(searchResults[idx].barcode) ? 'Tersimpan' : 'Ke Sistem'}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Barcode Search Form */}
          {activeTab === 'barcode' && (
            <div className="space-y-4">
              <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 flex items-center justify-between">
                  <span>Pindai atau Masukkan Barcode (Angka / Alfanumerik):</span>
                  <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-normal">
                    Mendukung EAN-13 (899...) &amp; Alfanumerik (ZN-SHMP-170, BC-1029)
                  </span>
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Barcode className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={barcodeInput}
                      onChange={(e) => setBarcodeInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleLookupBarcode()}
                      placeholder="Scan atau ketik kode barcode angka / alfanumerik di sini..."
                      autoFocus
                      className="w-full pl-10 pr-4 py-2.5 text-sm font-mono rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                  <button
                    onClick={() => handleLookupBarcode()}
                    disabled={loading}
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 shadow-md shadow-emerald-600/20 cursor-pointer disabled:opacity-50"
                  >
                    {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                    <span>{loading ? 'Mencari...' : 'Cari di Database'}</span>
                  </button>
                </div>

                {/* Quick Test Barcode Buttons */}
                <div className="mt-3 flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] text-slate-400 font-semibold mr-1">Coba Barcode Contoh:</span>
                  {[
                    { label: 'Indomie Goreng', code: '8998866200223' },
                    { label: 'Zinc Shampoo 170ml', code: '8998866500118' },
                    { label: 'Aqua 600ml', code: '8992753311105' },
                    { label: 'Bimoli 2L', code: '8992775211018' },
                    { label: 'Zinc Men Sachet', code: '8998866500125' },
                    { label: 'Alfanumerik (ZN-SHMP-170)', code: 'ZN-SHMP-170' },
                  ].map((sample) => (
                    <button
                      key={sample.code}
                      onClick={() => {
                        setBarcodeInput(sample.code);
                        handleLookupBarcode(sample.code);
                      }}
                      className="px-2 py-1 rounded-md text-[10px] bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-emerald-100 dark:hover:bg-emerald-950/60 hover:text-emerald-700 dark:hover:text-emerald-400 font-mono transition-colors cursor-pointer"
                    >
                      {sample.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Barcode Single Result Card */}
              {barcodeResult && (
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-emerald-500/40 p-5 shadow-xl space-y-4 animate-in fade-in-50">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700/60 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="w-4 h-4" />
                      </span>
                      <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                        Produk Teridentifikasi di Database Online
                      </span>
                    </div>
                    <span className="text-[11px] px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-medium">
                      Sumber: <strong className="text-emerald-600 dark:text-emerald-400">{dataSource}</strong>
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-5 items-start">
                    {/* Image / Thumbnail */}
                    <div className="md:col-span-1 flex flex-col items-center justify-center p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
                      {barcodeResult.image ? (
                        <img
                          src={barcodeResult.image}
                          alt={barcodeResult.name}
                          referrerPolicy="no-referrer"
                          className="w-32 h-32 object-contain rounded-lg shadow-xs"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="w-32 h-32 rounded-lg bg-slate-200 dark:bg-slate-800 flex flex-col items-center justify-center text-slate-400">
                          <Package className="w-10 h-10 mb-1" />
                          <span className="text-[10px]">Tanpa Foto</span>
                        </div>
                      )}
                      <span className="mt-2 text-[10px] font-mono text-slate-500 font-bold">
                        EAN: {barcodeResult.barcode}
                      </span>
                    </div>

                    {/* Details Info */}
                    <div className="md:col-span-3 space-y-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                            {barcodeResult.brand || 'Brand Terdaftar'}
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                            Kategori: {getCategoryName(barcodeResult.categoryId)}
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300">
                            Satuan: {barcodeResult.unit}
                          </span>
                        </div>
                        <h4 className="text-lg font-black text-slate-900 dark:text-white leading-snug">
                          {barcodeResult.name}
                        </h4>
                        {barcodeResult.description && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            {barcodeResult.description}
                          </p>
                        )}
                      </div>

                      {/* Pricing & Margin info */}
                      <div className="grid grid-cols-3 gap-3 p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-700/60">
                        <div>
                          <span className="text-[10px] text-slate-500 uppercase font-bold block">Harga Eceran (HET)</span>
                          <span className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">
                            {formatCurrency(barcodeResult.price)}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 uppercase font-bold block">Estimasi Modal (HPP)</span>
                          <span className="text-sm font-bold text-slate-700 dark:text-slate-300 font-mono">
                            {formatCurrency(barcodeResult.costPrice)}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 uppercase font-bold block">Margin Laba Eceran</span>
                          <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                            {barcodeResult.price > 0
                              ? (((barcodeResult.price - barcodeResult.costPrice) / barcodeResult.price) * 100).toFixed(1)
                              : 0}
                            % (Poin Aktif)
                          </span>
                        </div>
                      </div>

                      {/* Wholesale Packaging Units */}
                      {barcodeResult.wholesaleUnits && barcodeResult.wholesaleUnits.length > 0 && (
                        <div className="space-y-1.5">
                          <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                            <Boxes className="w-3.5 h-3.5 text-indigo-500" />
                            <span>Kemasan Grosir Resmi Terdaftar (Multi-Kemasan):</span>
                          </span>
                          <div className="flex flex-wrap gap-2">
                            {barcodeResult.wholesaleUnits.map((wh, idx) => (
                              <div
                                key={idx}
                                className="px-2.5 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-xs font-mono"
                              >
                                <strong className="text-indigo-900 dark:text-indigo-200 font-sans">{wh.name}</strong>:{' '}
                                <span className="text-slate-600 dark:text-slate-400">
                                  {wh.multiplier}x {barcodeResult.unit} = {formatCurrency(wh.price)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="pt-2 flex items-center gap-3 flex-wrap">
                        <button
                          onClick={() => handleImportToCatalog(barcodeResult)}
                          disabled={addedIds.has(barcodeResult.barcode)}
                          className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 shadow-md cursor-pointer transition-all ${
                            addedIds.has(barcodeResult.barcode)
                              ? 'bg-slate-200 dark:bg-slate-700 text-slate-400 cursor-not-allowed'
                              : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20 active:scale-95'
                          }`}
                        >
                          <Plus className="w-4 h-4" />
                          <span>
                            {addedIds.has(barcodeResult.barcode) ? 'Sudah Ada di Sistem' : 'Masukkan ke Sistem Toko'}
                          </span>
                        </button>

                        {onSelectForForm && (
                          <button
                            onClick={() => handleSendToForm(barcodeResult)}
                            className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-2 shadow-md shadow-blue-600/20 cursor-pointer"
                          >
                            <ExternalLink className="w-4 h-4" />
                            <span>Isi ke Formulir Produk</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Keyword Search Form */}
          {activeTab === 'keyword' && (
            <div className="space-y-4">
              <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 flex items-center justify-between">
                  <span>Cari Produk di Katalog Online FMCG & Retail:</span>
                  <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-normal">
                    Ketik nama barang, varian rasa, atau merk (misal: "Mie Sedaap", "SunCo", "Teh Botol")
                  </span>
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={keywordInput}
                      onChange={(e) => setKeywordInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSearchKeyword()}
                      placeholder="Ketik nama produk, brand, atau varian..."
                      autoFocus
                      className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                  <button
                    onClick={() => handleSearchKeyword()}
                    disabled={loading}
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 shadow-md shadow-emerald-600/20 cursor-pointer disabled:opacity-50"
                  >
                    {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                    <span>{loading ? 'Mencari...' : 'Cari Produk Online'}</span>
                  </button>
                </div>

                {/* Keyword shortcuts */}
                <div className="mt-3 flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] text-slate-400 font-semibold mr-1">Pencarian Populer:</span>
                  {['Indomie', 'Mie Sedaap', 'Aqua', 'Bimoli', 'SunCo', 'Kapal Api', 'Chitato', 'Lifebuoy'].map(
                    (kw) => (
                      <button
                        key={kw}
                        onClick={() => {
                          setKeywordInput(kw);
                          handleSearchKeyword(kw);
                        }}
                        className="px-2.5 py-1 rounded-md text-[10px] bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-emerald-100 dark:hover:bg-emerald-950/60 hover:text-emerald-700 dark:hover:text-emerald-400 font-medium transition-colors cursor-pointer"
                      >
                        {kw}
                      </button>
                    )
                  )}
                </div>
              </div>

              {/* Search Results Grid */}
              {searchResults.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-1 flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span>
                        Ditemukan <strong>{searchResults.length} produk</strong> dari Google Search Engine:
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleImportTop3ToCatalog}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
                      >
                        <Database className="w-3.5 h-3.5" />
                        <span>Masukkan Top 3 ke Sistem</span>
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {searchResults.map((item, idx) => {
                      const isAdded = addedIds.has(item.barcode);
                      const isTop3 = idx < 3;
                      const rank = idx + 1;

                      return (
                        <div
                          key={idx}
                          className={`bg-white dark:bg-slate-800 p-4 rounded-xl border transition-all flex flex-col justify-between space-y-3 ${
                            isTop3
                              ? 'border-emerald-500/50 shadow-md ring-1 ring-emerald-500/20'
                              : 'border-slate-200 dark:border-slate-700'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            {item.image ? (
                              <img
                                src={item.image}
                                alt={item.name}
                                referrerPolicy="no-referrer"
                                className="w-16 h-16 object-contain rounded-lg bg-slate-50 dark:bg-slate-900 p-1 border border-slate-200 dark:border-slate-700 shrink-0"
                                onError={(e) => {
                                  (e.target as HTMLElement).style.display = 'none';
                                }}
                              />
                            ) : (
                              <div className="w-16 h-16 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-400 shrink-0">
                                <Package className="w-6 h-6" />
                              </div>
                            )}

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap mb-1">
                                {isTop3 && getRankBadge(rank)}
                                {item.brand && (
                                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300">
                                    {item.brand}
                                  </span>
                                )}
                                <span className="text-[9px] font-mono text-slate-500 dark:text-slate-400">
                                  {item.barcode}
                                </span>
                              </div>
                              <h5 className="text-xs font-bold text-slate-900 dark:text-white line-clamp-2">
                                {item.name}
                              </h5>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">
                                  {formatCurrency(item.price)}
                                </span>
                                <span className="text-[10px] text-slate-400 font-mono">
                                  Modal: {formatCurrency(item.costPrice)}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Wholesale summary if any */}
                          {item.wholesaleUnits && item.wholesaleUnits.length > 0 && (
                            <div className="text-[10px] text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/60 px-2.5 py-1.5 rounded-lg border border-slate-100 dark:border-slate-800">
                              <strong className="text-slate-700 dark:text-slate-300">Grosir:</strong>{' '}
                              {item.wholesaleUnits.map((u) => `${u.name} (${formatCurrency(u.price)})`).join(', ')}
                            </div>
                          )}

                          {/* Action Button */}
                          <div className="flex items-center gap-2 pt-1">
                            <button
                              onClick={() => handleImportToCatalog(item)}
                              disabled={isAdded}
                              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                                isAdded
                                  ? 'bg-slate-200 dark:bg-slate-700 text-slate-400 cursor-not-allowed'
                                  : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs'
                              }`}
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>{isAdded ? 'Sudah Ada di Sistem' : 'Masukkan ke Sistem'}</span>
                            </button>

                            {onSelectForForm && (
                              <button
                                onClick={() => handleSendToForm(item)}
                                className="px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold cursor-pointer"
                                title="Gunakan di formulir"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Error / Empty State */}
          {errorMsg && (
            <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-800 dark:text-amber-300">
                <p className="font-bold">Informasi Pencarian Database</p>
                <p className="mt-0.5">{errorMsg}</p>
              </div>
            </div>
          )}

          {/* Initial State / How It Works Explainer */}
          {!searched && !barcodeResult && searchResults.length === 0 && (
            <div className="p-6 rounded-2xl bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-800/40 dark:to-slate-800/20 border border-slate-200 dark:border-slate-800 space-y-4">
              <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200 font-bold text-sm">
                <Info className="w-4 h-4 text-emerald-500" />
                <span>Bagaimana Sistem Pencocokan Database Google Bekerja?</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-3.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 space-y-1.5">
                  <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 font-bold text-xs flex items-center justify-center">
                    1
                  </div>
                  <h5 className="text-xs font-bold text-slate-900 dark:text-white">Top 3 Google Search Citations</h5>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                    Menampilkan 3 sitasi web teratas dari indeks Google Search ritel Indonesia (KlikIndomaret, Alfagift, Tokopedia, produsen resmi) dan dapat dimasukkan langsung ke sistem.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 space-y-1.5">
                  <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-bold text-xs flex items-center justify-center">
                    2
                  </div>
                  <h5 className="text-xs font-bold text-slate-900 dark:text-white">AI Retail Normalizer</h5>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                    AI otomatis menstandarkan gramasi kemasan (80g, 600ml, 2L), brand produsen, serta mengestimasi HET dan HPP
                    sesuai harga pasar ritel Indonesia.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 space-y-1.5">
                  <div className="w-7 h-7 rounded-lg bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 font-bold text-xs flex items-center justify-center">
                    3
                  </div>
                  <h5 className="text-xs font-bold text-slate-900 dark:text-white">Auto Multi-Kemasan Grosir</h5>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                    Menyusun opsi satuan grosir standar distributor (Dus isi 40, Slop isi 10, Karton isi 6, Bal isi 200) dengan
                    estimasi harga grosir dan margin laba &ge; 15%.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/40">
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <Globe className="w-4 h-4 text-emerald-500" />
            <span>Terhubung ke Google Search Engine Grounding &amp; Katalog Ritel FMCG Indonesia</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 font-bold text-xs cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};

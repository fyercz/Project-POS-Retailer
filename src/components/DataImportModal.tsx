import React, { useState, useMemo, useRef } from 'react';
import {
  X,
  Upload,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  ArrowRight,
  Boxes,
  Award,
  Trash2,
  RefreshCw,
  FileText,
  Copy,
  Layers,
  Tag,
  Check,
  Globe,
  Edit2,
  Search,
  Filter,
  CheckSquare,
  Square,
  FileUp,
  Info,
  DollarSign,
  Package,
} from 'lucide-react';
import { Product, WholesaleUnit } from '../types';
import { usePOS } from '../context/POSContext';
import { INITIAL_PRODUCTS } from '../data/mockData';
import { formatCurrency } from '../utils/formatters';
import { getImageForCategory } from '../data/importHelpers';
import { parseRetailLine, ParsedItem } from '../utils/retailNormalizer';

interface DataImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PRESETS = [
  {
    name: 'Campuran Retail & FMCG (15 Item)',
    data: `8999999190112, indomi grg spsial 80 gr, 2700, 3100, 120
8992775211029, myk grg bmol 2 ltr, 33500, 38500, 36
8993175532014, myk grg snia 1 ltr, 16800, 19500, 48
8999909001234, rokok samporna mild 16 btg, 31500, 34000, 80
8998866200112, rokok djarum supr 12 btg, 22000, 24000, 60
8991001100223, kopi kapal api spc mix 24 gr, 1100, 1500, 200
8992745330101, kopi luwak wite koffie 20 gr, 1200, 1600, 150
8999999052212, sbun lifbouy red 110 gr, 3800, 4800, 72
8992741981203, sabun b29 piring 750 ml, 9500, 12500, 40
8999999041121, shampo sunslk black 170 ml, 18500, 23500, 30
8999999031102, pasta gigi pepsoden 190 gr, 12500, 16000, 45
8991234567890, beras pandn wngi 5 kg, 68000, 78000, 25
8992745110021, susu uht ultr coklat 1000 ml, 17500, 21500, 36
8992741910012, air min aqua btl 600 ml, 2800, 3500, 96
8992388011200, biskut khong guan kalg 1600 gr, 85000, 105000, 12`,
  },
  {
    name: 'Sembako & Bumbu Dapur (7 Item)',
    data: `8992775211029, bmol myk grg 2 ltr, 33500, 38500, 40
8993175532014, snia minyak 1 liter, 16500, 19000, 50
8991234567890, beras pandn wngi 5kg, 68000, 78000, 30
8992741981203, kecap bngo manis 550 ml, 19000, 23000, 35
8999999050019, royco aym bubuk 230 gr, 8500, 10500, 60
8991002233445, ladaku mrica bubuk 10 sct, 8000, 10000, 100
8992233445566, gulaku prmium putih 1 kg, 15000, 17500, 80`,
  },
  {
    name: 'Minuman & Snack (6 Item)',
    data: `8992741910012, air min aqua 600 ml, 2800, 3500, 120
8992745110021, ultr milk coklat 1000 ml, 17500, 21500, 48
8991001100223, kpl api mix 24 gr, 1100, 1500, 250
8992745330101, luwak wite koffie 20 gr, 1200, 1600, 200
8991001410010, chtato sapi pgg 68 gr, 9200, 11500, 50
8992388011200, biskut khong guan kaleng 1600 gr, 85000, 105000, 15`,
  },
];

export const DataImportModal: React.FC<DataImportModalProps> = ({ isOpen, onClose }) => {
  const { products, categories, addProductsBatch, clearImportedProducts, settings } = usePOS();
  const minProfitPoints = settings.minProfitPercentForPoints ?? 15;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [rawInput, setRawInput] = useState(PRESETS[0].data);
  const [itemsState, setItemsState] = useState<ParsedItem[]>([]);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [filterQuery, setFilterQuery] = useState('');
  const [matchingInternet, setMatchingInternet] = useState(false);
  const [internetSyncStatus, setInternetSyncStatus] = useState<string | null>(null);
  const [importedCount, setImportedCount] = useState<number | null>(null);
  const [clearMessage, setClearMessage] = useState<string | null>(null);

  // Check how many imported products exist in system
  const initialProductIds = useMemo(() => new Set(INITIAL_PRODUCTS.map((p) => p.id)), []);
  const currentImportedCount = useMemo(
    () => products.filter((p) => !initialProductIds.has(p.id)).length,
    [products, initialProductIds]
  );

  // Parse raw text into corrected items
  const autoParsedItems: ParsedItem[] = useMemo(() => {
    if (!rawInput.trim()) return [];
    return rawInput
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0)
      .map((l, idx) => parseRetailLine(l, idx, minProfitPoints))
      .filter((it): it is ParsedItem => it !== null);
  }, [rawInput, minProfitPoints]);

  // Sync state whenever autoParsedItems changes
  React.useEffect(() => {
    setItemsState(autoParsedItems);
  }, [autoParsedItems]);

  const handleClearPreviousImported = () => {
    const count = currentImportedCount;
    clearImportedProducts();
    setClearMessage(`Berhasil menghapus ${count} data master produk impor dari katalog.`);
    setTimeout(() => setClearMessage(null), 4000);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setRawInput(content);
        setClearMessage(`File "${file.name}" berhasil dimuat (${content.split('\n').length} baris).`);
        setTimeout(() => setClearMessage(null), 3500);
      }
    };
    reader.readAsText(file);
  };

  // Google Search Grounding + Gemini AI Batch Correction
  const handleMatchInternetDatabase = async () => {
    if (itemsState.length === 0) return;
    setMatchingInternet(true);
    setInternetSyncStatus('Menghubungi Google Search Grounding & AI Retail Normalizer...');

    try {
      const payload = itemsState.map((it) => ({
        id: it.id,
        rawInput: it.originalText,
        name: it.name,
        barcode: it.barcode,
        price: it.price,
        costPrice: it.costPrice,
        stock: it.stock,
      }));

      const res = await fetch('/api/online/match-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: payload }),
      });
      const data = await res.json();

      if (data.success && Array.isArray(data.matchedItems)) {
        const matchedMap = new Map<string, any>();
        data.matchedItems.forEach((m: any) => matchedMap.set(m.id, m));

        setItemsState((prev) =>
          prev.map((it) => {
            const hit = matchedMap.get(it.id);
            if (!hit) return it;

            const marginNominal = Math.max(0, (hit.price || it.price) - (hit.costPrice || it.costPrice));
            const profitMarginPercent = hit.price > 0 ? (marginNominal / hit.price) * 100 : it.profitMarginPercent;

            return {
              ...it,
              name: hit.name || it.name,
              brand: hit.brand || it.brand,
              barcode: hit.barcode || it.barcode,
              categoryId: hit.categoryId || it.categoryId,
              unit: hit.unit || it.unit,
              price: hit.price || it.price,
              costPrice: hit.costPrice || it.costPrice,
              profitMarginPercent,
              isPointsEligible: profitMarginPercent >= minProfitPoints,
              wholesaleUnits:
                hit.wholesaleUnits && hit.wholesaleUnits.length > 0
                  ? hit.wholesaleUnits.map((u: any, idx: number) => ({
                      id: `wh-${it.id}-${idx}`,
                      name: u.name,
                      multiplier: u.multiplier,
                      price: u.price,
                      costPrice: u.costPrice,
                      barcode: `${hit.barcode || it.barcode}-${u.multiplier}`,
                    }))
                  : it.wholesaleUnits,
              corrections: [
                ...it.corrections.filter((c) => !c.includes('Google Search') && !c.includes('Grounding')),
                `🌐 Terverifikasi Google Search Grounding (${hit.matchSource || 'Google Search'})`,
              ],
            };
          })
        );

        setInternetSyncStatus(
          `✅ Berhasil mengoreksi dan menyelaraskan ${data.matchedItems.length} produk dengan Google Search Grounding!`
        );
        setTimeout(() => setInternetSyncStatus(null), 4000);
      } else {
        setInternetSyncStatus('Menggunakan hasil normalizer ejaan retail lokal.');
        setTimeout(() => setInternetSyncStatus(null), 4000);
      }
    } catch {
      setInternetSyncStatus('⚠️ Gagal terhubung ke Google Grounding. Menggunakan hasil normalizer lokal.');
      setTimeout(() => setInternetSyncStatus(null), 4000);
    } finally {
      setMatchingInternet(false);
    }
  };

  const handleToggleSelect = (id: string) => {
    setItemsState((prev) =>
      prev.map((it) => (it.id === id ? { ...it, selected: !it.selected } : it))
    );
  };

  const handleToggleSelectAll = (checked: boolean) => {
    setItemsState((prev) => prev.map((it) => ({ ...it, selected: checked })));
  };

  const handleDeleteItem = (id: string) => {
    setItemsState((prev) => prev.filter((it) => it.id !== id));
  };

  const handleItemFieldChange = (id: string, field: keyof ParsedItem, value: any) => {
    setItemsState((prev) =>
      prev.map((it) => {
        if (it.id !== id) return it;
        const updated = { ...it, [field]: value };
        if (field === 'price' || field === 'costPrice') {
          const p = field === 'price' ? Number(value) : it.price;
          const c = field === 'costPrice' ? Number(value) : it.costPrice;
          const margin = Math.max(0, p - c);
          updated.profitMarginPercent = p > 0 ? (margin / p) * 100 : 0;
          updated.isPointsEligible = updated.profitMarginPercent >= minProfitPoints;
        }
        return updated;
      })
    );
  };

  const handleExecuteImport = () => {
    const selected = itemsState.filter((it) => it.selected);
    if (selected.length === 0) return;

    const payloads: Omit<Product, 'id'>[] = selected.map((it) => ({
      name: it.name,
      brand: it.brand,
      sku: it.sku,
      barcode: it.barcode,
      categoryId: it.categoryId,
      price: it.price,
      costPrice: it.costPrice,
      stock: it.stock,
      minStock: Math.max(2, Math.floor(it.stock * 0.2)),
      unit: it.unit,
      aisle: it.aisle || 'Lorong Toko',
      wholesaleUnits: it.wholesaleUnits.length > 0 ? it.wholesaleUnits : undefined,
      image: getImageForCategory(it.categoryId, it.name),
    }));

    addProductsBatch(payloads);

    setImportedCount(selected.length);
    setTimeout(() => {
      setImportedCount(null);
      onClose();
    }, 1200);
  };

  if (!isOpen) return null;

  const filteredItems = itemsState.filter(
    (it) =>
      it.name.toLowerCase().includes(filterQuery.toLowerCase()) ||
      it.barcode.includes(filterQuery) ||
      it.brand.toLowerCase().includes(filterQuery.toLowerCase()) ||
      it.originalText.toLowerCase().includes(filterQuery.toLowerCase())
  );

  const totalSelected = itemsState.filter((it) => it.selected).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-5xl shadow-2xl flex flex-col max-h-[94vh] overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-emerald-900/30 via-teal-900/20 to-slate-900">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/20">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Smart Data Import &amp; Auto-Koreksi Retail Cerdas
                </h3>
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-emerald-500 text-slate-950">
                  AI Retail Engine Active
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Pembersihan ejaan singkatan/typo FMCG, normalisasi gramasi baku (80g, 2L, 600ml), pembentukan satuan grosir, &amp; verifikasi Google Grounding.
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

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* Notification when cleared */}
          {clearMessage && (
            <div className="p-3 rounded-xl bg-emerald-500 text-slate-950 text-xs font-bold flex items-center justify-between animate-in fade-in">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4" />
                <span>{clearMessage}</span>
              </div>
              <button
                type="button"
                onClick={() => setClearMessage(null)}
                className="p-1 hover:opacity-80 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Existing Imported Items Info Bar */}
          {currentImportedCount > 0 && (
            <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3 text-xs flex-wrap">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-500 shrink-0" />
                <span className="text-slate-700 dark:text-slate-300">
                  Saat ini terdapat <strong>{currentImportedCount} produk hasil impor</strong> di dalam master katalog toko.
                </span>
              </div>
              <button
                type="button"
                onClick={handleClearPreviousImported}
                className="px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
                title="Hapus semua produk impor yang pernah dimasukkan sebelumnya"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Hapus Data Impor Sebelumnya ({currentImportedCount})</span>
              </button>
            </div>
          )}

          {/* Section 1: Raw Input Box & Preset Bar */}
          <div className="space-y-2.5 bg-slate-50 dark:bg-slate-800/30 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-emerald-500" />
                <span>Tempel Data Produk Mentah / Import Berkas:</span>
              </label>

              {/* Preset Selector */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] text-slate-400 font-semibold">Pilihan Contoh:</span>
                {PRESETS.map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setRawInput(p.data);
                      setClearMessage(`Memuat template: ${p.name}`);
                      setTimeout(() => setClearMessage(null), 2500);
                    }}
                    className="px-2 py-1 text-[11px] font-semibold rounded-lg bg-white dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 hover:text-emerald-600 dark:hover:text-emerald-400 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                  >
                    {p.name}
                  </button>
                ))}

                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept=".csv,.txt,.tsv"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                  title="Unggah file CSV, TXT, atau TSV"
                >
                  <FileUp className="w-3.5 h-3.5" />
                  <span>Upload CSV/TXT</span>
                </button>
              </div>
            </div>

            {/* Formula Hint Chips */}
            <div className="flex items-center gap-1.5 flex-wrap text-[11px] text-slate-500">
              <span className="font-semibold text-slate-400">Pola Kolom Bebas:</span>
              <span className="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300 font-mono font-bold">
                1. Barcode
              </span>
              <span className="text-slate-400 font-bold">,</span>
              <span className="px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-950/80 border border-blue-300 dark:border-blue-700 text-blue-800 dark:text-blue-300 font-mono font-bold">
                2. Nama Produk
              </span>
              <span className="text-slate-400 font-bold">,</span>
              <span className="px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/80 border border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-300 font-mono font-bold">
                3. Harga Modal (HPP)
              </span>
              <span className="text-slate-400 font-bold">,</span>
              <span className="px-2 py-0.5 rounded-md bg-teal-100 dark:bg-teal-950/80 border border-teal-300 dark:border-teal-700 text-teal-800 dark:text-teal-300 font-mono font-bold">
                4. Harga Jual (HET)
              </span>
              <span className="text-slate-400 font-bold">,</span>
              <span className="px-2 py-0.5 rounded-md bg-purple-100 dark:bg-purple-950/80 border border-purple-300 dark:border-purple-700 text-purple-800 dark:text-purple-300 font-mono font-bold">
                5. Stok
              </span>
              <span className="text-[10px] text-slate-400 ml-1">
                (Mendukung copy-paste tabel Excel / Google Sheets atau teks tanpa koma)
              </span>
            </div>

            <textarea
              rows={5}
              value={rawInput}
              onChange={(e) => setRawInput(e.target.value)}
              placeholder="Contoh: 8999999190112, indomi grg spsial 80 gr, 2700, 3100, 120&#10;8992775211029, myk grg bmol 2 ltr, 33500, 38500, 36..."
              className="w-full p-3 text-xs font-mono rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:outline-none leading-relaxed shadow-inner"
            />
          </div>

          {/* Section 2: Smart Auto-Correction & Preview Table */}
          <div className="space-y-3">
            {internetSyncStatus && (
              <div className="p-3 rounded-xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 text-xs font-semibold text-teal-800 dark:text-teal-300 flex items-center justify-between animate-in fade-in">
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
                  <span>{internetSyncStatus}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setInternetSyncStatus(null)}
                  className="text-teal-600 hover:text-teal-800 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Table Control Bar */}
            <div className="flex items-center justify-between flex-wrap gap-2 pt-1">
              <div className="flex items-center gap-3">
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span>Hasil Analisis &amp; Auto-Koreksi ({itemsState.length} Item Terdeteksi)</span>
                </h4>
                <button
                  type="button"
                  onClick={() => handleToggleSelectAll(totalSelected !== itemsState.length)}
                  className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 cursor-pointer font-medium"
                >
                  {totalSelected === itemsState.length && itemsState.length > 0 ? (
                    <CheckSquare className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <Square className="w-4 h-4 text-slate-400" />
                  )}
                  <span>Pilih Semua ({totalSelected}/{itemsState.length})</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                {/* Search in preview */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={filterQuery}
                    onChange={(e) => setFilterQuery(e.target.value)}
                    placeholder="Saring hasil..."
                    className="pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 w-36 sm:w-44"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleMatchInternetDatabase}
                  disabled={matchingInternet || itemsState.length === 0}
                  className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-teal-600/20 cursor-pointer disabled:opacity-50 transition-all"
                  title="Cocokkan nama singkatan dengan katalog resmi melalui Google Search Grounding & Gemini AI"
                >
                  {matchingInternet ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Globe className="w-3.5 h-3.5" />
                  )}
                  <span>{matchingInternet ? 'Menyinkronkan...' : '✨ Koreksi dg Google AI Grounding'}</span>
                </button>
              </div>
            </div>

            {/* List of Corrected Items */}
            <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
              {filteredItems.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 text-slate-400 text-xs">
                  Tidak ada item yang cocok dengan filter atau input kosong.
                </div>
              ) : (
                filteredItems.map((item) => (
                  <div
                    key={item.id}
                    className={`p-3.5 rounded-2xl border transition-all ${
                      item.selected
                        ? 'border-emerald-300 dark:border-emerald-700/80 bg-white dark:bg-slate-900 shadow-sm'
                        : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 opacity-60'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={item.selected}
                        onChange={() => handleToggleSelect(item.id)}
                        className="mt-1.5 w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                      />

                      <div className="flex-1 min-w-0 space-y-2">
                        {/* Row 1: Corrected Name & Original Text Diff */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            {editingItemId === item.id ? (
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-2 bg-slate-50 dark:bg-slate-800 rounded-xl border border-emerald-500/40">
                                <div className="sm:col-span-2">
                                  <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">
                                    Nama Produk Terkoreksi:
                                  </label>
                                  <input
                                    type="text"
                                    value={item.name}
                                    onChange={(e) => handleItemFieldChange(item.id, 'name', e.target.value)}
                                    className="w-full px-2.5 py-1 text-xs rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 font-bold text-slate-900 dark:text-white"
                                  />
                                </div>
                                <div>
                                  <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">
                                    Brand:
                                  </label>
                                  <input
                                    type="text"
                                    value={item.brand}
                                    onChange={(e) => handleItemFieldChange(item.id, 'brand', e.target.value)}
                                    className="w-full px-2.5 py-1 text-xs rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                                  />
                                </div>
                                <div>
                                  <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">
                                    Barcode EAN-13:
                                  </label>
                                  <input
                                    type="text"
                                    value={item.barcode}
                                    onChange={(e) => handleItemFieldChange(item.id, 'barcode', e.target.value)}
                                    className="w-full px-2.5 py-1 text-xs font-mono rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                                  />
                                </div>
                                <div>
                                  <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">
                                    Harga Modal (HPP):
                                  </label>
                                  <input
                                    type="number"
                                    value={item.costPrice}
                                    onChange={(e) => handleItemFieldChange(item.id, 'costPrice', Number(e.target.value))}
                                    className="w-full px-2.5 py-1 text-xs font-mono rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                                  />
                                </div>
                                <div>
                                  <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">
                                    Harga Jual (HET):
                                  </label>
                                  <input
                                    type="number"
                                    value={item.price}
                                    onChange={(e) => handleItemFieldChange(item.id, 'price', Number(e.target.value))}
                                    className="w-full px-2.5 py-1 text-xs font-mono rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-emerald-600 font-bold"
                                  />
                                </div>
                                <div className="sm:col-span-3 flex justify-end pt-1">
                                  <button
                                    type="button"
                                    onClick={() => setEditingItemId(null)}
                                    className="px-3 py-1 bg-emerald-600 text-white rounded-lg text-xs font-bold cursor-pointer"
                                  >
                                    Selesai Edit
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                                    {item.name}
                                  </span>
                                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 border border-slate-200 dark:border-slate-700 font-bold">
                                    EAN: {item.barcode}
                                  </span>
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                                    {item.brand}
                                  </span>
                                  <span className="text-[10px] text-slate-400 font-mono">
                                    (Stok: {item.stock} {item.unit})
                                  </span>
                                </div>

                                <div className="text-[10px] text-slate-400 font-mono mt-1 flex items-center gap-1.5 flex-wrap">
                                  <span className="text-slate-500 font-sans font-semibold">Teks Asli Input:</span>
                                  <span className="line-through bg-slate-100 dark:bg-slate-800/60 px-1.5 py-0.5 rounded">
                                    {item.originalText}
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Pricing info */}
                          <div className="text-right shrink-0">
                            <div className="text-xs font-extrabold font-mono text-emerald-600 dark:text-emerald-400">
                              {formatCurrency(item.price)}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              HPP: {formatCurrency(item.costPrice)}
                            </div>
                          </div>
                        </div>

                        {/* Row 2: Badges of Corrections, Margin Points, and Wholesale Packaging */}
                        <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-slate-100 dark:border-slate-800/80">
                          {/* Corrections list */}
                          {item.corrections.length > 0 ? (
                            item.corrections.map((corr, cIdx) => (
                              <span
                                key={cIdx}
                                className="text-[10px] font-semibold bg-emerald-50 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded-md flex items-center gap-1"
                              >
                                <Check className="w-3 h-3 text-emerald-500" />
                                <span>{corr}</span>
                              </span>
                            ))
                          ) : (
                            <span className="text-[10px] font-medium bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 px-2 py-0.5 rounded-md">
                              Format Standar
                            </span>
                          )}

                          {/* Profit margin & Points */}
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 ${
                              item.isPointsEligible
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                                : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                            }`}
                          >
                            <Award className="w-3 h-3" />
                            <span>
                              Margin {(item.profitMarginPercent ?? 0).toFixed(1)}% (
                              {item.isPointsEligible ? 'Poin Member Aktif' : 'Tanpa Poin <15%'})
                            </span>
                          </span>

                          {/* Wholesale multi-units */}
                          {item.wholesaleUnits.map((wu) => (
                            <span
                              key={wu.id}
                              className="text-[10px] font-semibold bg-purple-50 text-purple-800 dark:bg-purple-950/70 dark:text-purple-300 border border-purple-200 dark:border-purple-800 px-2 py-0.5 rounded-md flex items-center gap-1"
                            >
                              <Boxes className="w-3 h-3 text-purple-500" />
                              <span>
                                {wu.name}: {formatCurrency(wu.price)}
                              </span>
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Item Actions */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => setEditingItemId(editingItemId === item.id ? null : item.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-blue-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                          title="Edit detail produk secara manual"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteItem(item.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                          title="Hapus baris ini dari daftar import"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex items-center justify-between flex-wrap gap-3">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {importedCount !== null ? (
              <span className="font-bold text-emerald-600 flex items-center gap-1">
                <Check className="w-4 h-4" /> Berhasil mengimport {importedCount} produk ke katalog toko!
              </span>
            ) : (
              <span>
                *Data produk yang diimpor langsung mendapatkan SKU unik, gambar visual, kemasan grosir, &amp; kalkulasi margin.
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl cursor-pointer transition-colors"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleExecuteImport}
              disabled={totalSelected === 0}
              className="px-5 py-2.5 text-xs font-bold text-slate-950 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-lg shadow-emerald-500/20 flex items-center gap-2 cursor-pointer transition-all active:scale-95"
            >
              <Upload className="w-4 h-4" />
              <span>Import {totalSelected} Produk ke Katalog</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

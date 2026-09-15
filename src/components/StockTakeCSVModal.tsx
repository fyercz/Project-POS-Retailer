import React, { useState, useMemo, useRef } from 'react';
import {
  X,
  FileSpreadsheet,
  Upload,
  Download,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Sparkles,
  Trash2,
  Search,
  Check,
  Copy,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import { Product } from '../types';
import { usePOS } from '../context/POSContext';
import { formatCurrency } from '../utils/formatters';

export interface StockTakeCSVModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplied?: (count: number, summary: string) => void;
}

export type StockTakeMode = 'set' | 'add' | 'subtract';

export interface ParsedStockRow {
  id: string;
  rawLine: string;
  lineNumber: number;
  identifier: string;
  inputQty: number;
  newExpiry?: string;
  status: 'matched' | 'unmatched' | 'invalid_qty';
  matchedProduct?: Product;
  currentStock: number;
  targetStock: number;
  diff: number;
  costImpact: number;
}

const COMMON_REASONS = [
  'Stock Opname Fisik Rutin (Harian / Mingguan)',
  'Audit Selisih Fisik Rak Toko',
  'Hasil Export Scanner Barcode Gudang',
  'Pembaruan Stok Akhir Bulan',
  'Penyesuaian Fisik & Barang Rusak / Kadaluarsa',
  'Koreksi Manual Hasil Hitung Cepat',
];

export const StockTakeCSVModal: React.FC<StockTakeCSVModalProps> = ({
  isOpen,
  onClose,
  onApplied,
}) => {
  const { products, bulkAdjustProducts, activeEmployee, settings } = usePOS();

  const [rawText, setRawText] = useState('');
  const [mode, setMode] = useState<StockTakeMode>('set');
  const [selectedReason, setSelectedReason] = useState(COMMON_REASONS[0]);
  const [customNotes, setCustomNotes] = useState('');
  const [filterTab, setFilterTab] = useState<'all' | 'matched' | 'unmatched'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedNotification, setCopiedNotification] = useState(false);
  const [excludedRowIds, setExcludedRowIds] = useState<Set<string>>(new Set());
  const [isApplying, setIsApplying] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Parse CSV / TSV / Delimited text into structured rows
  const parsedRows: ParsedStockRow[] = useMemo(() => {
    if (!rawText.trim()) return [];

    const lines = rawText.split(/\r?\n/);
    const results: ParsedStockRow[] = [];

    // Map products for fast O(1) lookup
    const barcodeMap = new Map<string, Product>();
    const skuMap = new Map<string, Product>();
    const idMap = new Map<string, Product>();
    const nameMap = new Map<string, Product>();

    products.forEach((p) => {
      if (p.barcode) barcodeMap.set(p.barcode.trim().toLowerCase(), p);
      if (p.sku) skuMap.set(p.sku.trim().toLowerCase(), p);
      if (p.id) idMap.set(p.id.trim().toLowerCase(), p);
      if (p.name) nameMap.set(p.name.trim().toLowerCase(), p);
    });

    let currentLineNumber = 0;

    for (const rawLine of lines) {
      currentLineNumber++;
      const trimmedLine = rawLine.trim();
      if (!trimmedLine || trimmedLine.startsWith('#') || trimmedLine.startsWith('//')) {
        continue;
      }

      // Detect delimiter: comma, tab, semicolon, pipe
      let delimiter = ',';
      if (trimmedLine.includes('\t')) delimiter = '\t';
      else if (trimmedLine.includes(';')) delimiter = ';';
      else if (trimmedLine.includes('|')) delimiter = '|';
      else if (trimmedLine.includes(',')) delimiter = ',';

      // Split while respecting optional quotes
      const rawTokens = trimmedLine.split(delimiter).map((col) => {
        let cleaned = col.trim();
        if (
          (cleaned.startsWith('"') && cleaned.endsWith('"')) ||
          (cleaned.startsWith("'") && cleaned.endsWith("'"))
        ) {
          cleaned = cleaned.slice(1, -1).trim();
        }
        return cleaned;
      });

      if (rawTokens.length === 0 || !rawTokens[0]) continue;

      const firstToken = rawTokens[0];
      const firstLower = firstToken.toLowerCase();

      // Check if this is a header line (e.g. "barcode,stok" or "sku,qty")
      if (
        firstLower === 'barcode' ||
        firstLower === 'sku' ||
        firstLower === 'kode' ||
        firstLower === 'kode_barang' ||
        firstLower === 'nama' ||
        firstLower === 'nama_barang' ||
        firstLower === 'id' ||
        firstLower === 'product'
      ) {
        continue; // skip header
      }

      const secondToken = rawTokens[1] || '';
      const thirdToken = rawTokens[2] || '';

      // Parse quantity
      const parsedQty = parseFloat(secondToken.replace(/[^0-9.-]/g, ''));
      const isQtyValid = !isNaN(parsedQty);
      const inputQty = isQtyValid ? Math.round(parsedQty) : 0;

      // Find matching product
      const queryKey = firstToken.toLowerCase();
      let matchedProd =
        barcodeMap.get(queryKey) ||
        skuMap.get(queryKey) ||
        idMap.get(queryKey) ||
        nameMap.get(queryKey);

      // Fallback substring search if not found
      if (!matchedProd && queryKey.length >= 3) {
        matchedProd = products.find(
          (p) =>
            p.name.toLowerCase().includes(queryKey) ||
            p.barcode.toLowerCase().includes(queryKey) ||
            p.sku.toLowerCase().includes(queryKey)
        );
      }

      let status: 'matched' | 'unmatched' | 'invalid_qty' = 'matched';
      if (!isQtyValid) {
        status = 'invalid_qty';
      } else if (!matchedProd) {
        status = 'unmatched';
      }

      const currentStock = matchedProd ? matchedProd.stock : 0;
      let targetStock = currentStock;

      if (isQtyValid) {
        if (mode === 'set') {
          targetStock = Math.max(0, inputQty);
        } else if (mode === 'add') {
          targetStock = Math.max(0, currentStock + inputQty);
        } else if (mode === 'subtract') {
          targetStock = Math.max(0, currentStock - inputQty);
        }
      }

      const diff = targetStock - currentStock;
      const costImpact = matchedProd ? diff * matchedProd.costPrice : 0;

      // Parse expiry date if supplied (YYYY-MM-DD or DD/MM/YYYY)
      let newExpiry: string | undefined = undefined;
      if (thirdToken) {
        const cleanDate = thirdToken.trim();
        if (/^\d{4}-\d{2}-\d{2}$/.test(cleanDate)) {
          newExpiry = cleanDate;
        } else if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(cleanDate)) {
          const parts = cleanDate.split('/');
          newExpiry = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        }
      }

      results.push({
        id: `row-${currentLineNumber}-${firstToken}`,
        rawLine: trimmedLine,
        lineNumber: currentLineNumber,
        identifier: firstToken,
        inputQty,
        newExpiry,
        status,
        matchedProduct: matchedProd,
        currentStock,
        targetStock,
        diff,
        costImpact,
      });
    }

    return results;
  }, [rawText, products, mode]);

  // Active (non-excluded) rows
  const activeRows = useMemo(() => {
    return parsedRows.filter((r) => !excludedRowIds.has(r.id));
  }, [parsedRows, excludedRowIds]);

  const matchedRows = useMemo(() => {
    return activeRows.filter((r) => r.status === 'matched');
  }, [activeRows]);

  const unmatchedRows = useMemo(() => {
    return activeRows.filter((r) => r.status === 'unmatched' || r.status === 'invalid_qty');
  }, [activeRows]);

  // Aggregate metrics
  const totalParsedCount = activeRows.length;
  const matchedCount = matchedRows.length;
  const unmatchedCount = unmatchedRows.length;
  const netStockDiff = matchedRows.reduce((sum, r) => sum + r.diff, 0);
  const totalCostImpact = matchedRows.reduce((sum, r) => sum + r.costImpact, 0);

  // Filtered rows for the preview table
  const displayedRows = useMemo(() => {
    return parsedRows.filter((r) => {
      // Exclusion filter
      if (excludedRowIds.has(r.id)) return false;

      // Tab filter
      if (filterTab === 'matched' && r.status !== 'matched') return false;
      if (filterTab === 'unmatched' && r.status === 'matched') return false;

      // Search filter
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchesIdent = r.identifier.toLowerCase().includes(q);
        const matchesName = r.matchedProduct?.name.toLowerCase().includes(q) || false;
        const matchesSku = r.matchedProduct?.sku.toLowerCase().includes(q) || false;
        if (!matchesIdent && !matchesName && !matchesSku) return false;
      }

      return true;
    });
  }, [parsedRows, excludedRowIds, filterTab, searchTerm]);

  // Handle Load Sample Data
  const handleLoadSampleData = () => {
    const sampleProducts = products.slice(0, 6);
    if (sampleProducts.length === 0) {
      setRawText(
        '# Barcode/SKU, Stok_Fisik, Kadaluarsa (Opsional)\n' +
          '8992753101111, 45, 2026-12-31\n' +
          '8991001100222, 28, 2027-06-30\n' +
          '8998866100333, 60\n' +
          '8999999999999, 15\n'
      );
      return;
    }

    const sampleLines = sampleProducts.map((p, idx) => {
      const barcode = p.barcode || p.sku || p.id;
      // create small variance to illustrate stock count
      const variance = (idx % 3 === 0 ? 5 : idx % 2 === 0 ? -3 : 0);
      const countedStock = Math.max(0, p.stock + variance);
      const expiry = p.expiryDate ? `, ${p.expiryDate}` : '';
      return `${barcode}, ${countedStock}${expiry}`;
    });

    // Also add one unknown barcode to showcase warning/unmatched handling
    sampleLines.push('8999999999999, 20, 2027-08-15');

    const fullSample =
      '# Format: Barcode atau SKU, Stok Fisik Baru, [Kadaluarsa Opsional: YYYY-MM-DD]\n' +
      sampleLines.join('\n');

    setRawText(fullSample);
    setExcludedRowIds(new Set());
  };

  // Handle Download CSV Template
  const handleDownloadTemplate = () => {
    const headers = ['barcode', 'sku', 'nama_produk', 'stok_tercatat', 'stok_fisik_hitung', 'tanggal_kadaluarsa'];
    const rows = products.slice(0, 50).map((p) => [
      `"${p.barcode || ''}"`,
      `"${p.sku || ''}"`,
      `"${p.name.replace(/"/g, '""')}"`,
      p.stock,
      p.stock, // pre-fill with current stock as baseline
      `"${p.expiryDate || ''}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `template_stock_opname_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Handle Copy Format to Clipboard
  const handleCopyFormat = () => {
    const textToCopy = 'barcode, stok_fisik, tanggal_kadaluarsa\n8992753101111, 45, 2026-12-31';
    navigator.clipboard.writeText(textToCopy);
    setCopiedNotification(true);
    setTimeout(() => setCopiedNotification(false), 2500);
  };

  // Handle File Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setRawText(content);
        setExcludedRowIds(new Set());
      }
    };
    reader.readAsText(file);
    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Handle Drag & Drop File
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        if (content) {
          setRawText(content);
          setExcludedRowIds(new Set());
        }
      };
      reader.readAsText(file);
    }
  };

  // Toggle row exclusion
  const handleToggleExcludeRow = (id: string) => {
    setExcludedRowIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Apply Bulk Stock Update
  const handleApplyStockUpdate = () => {
    if (matchedRows.length === 0) return;

    setIsApplying(true);

    try {
      const adjustments = matchedRows.map((r) => ({
        id: r.matchedProduct!.id,
        stock: r.targetStock,
        expiryDate: r.newExpiry || r.matchedProduct!.expiryDate,
      }));

      const auditSummaryNote = `${selectedReason} - ${customNotes || 'Pembaruan Stok Cepat via CSV'} (${
        activeEmployee ? activeEmployee.name : 'Staff Toko'
      })`;

      bulkAdjustProducts(adjustments, auditSummaryNote);

      if (onApplied) {
        onApplied(
          adjustments.length,
          `Berhasil memperbarui stok ${adjustments.length} barang secara serentak. Selisih net: ${
            netStockDiff >= 0 ? `+${netStockDiff}` : netStockDiff
          } unit.`
        );
      }

      onClose();
    } catch (err) {
      console.error('Failed to apply bulk stock update:', err);
    } finally {
      setIsApplying(false);
      setShowConfirm(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      id="stocktake-csv-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200"
    >
      <div
        className="relative w-full max-w-5xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/90 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/30 shadow-inner">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  Stock Opname Cepat via Form CSV
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                  Batch Parser
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Paste teks barcode & jumlah stok (dari Excel/Google Sheets/Scanner) untuk pembaruan inventaris instan
              </p>
            </div>
          </div>

          <button
            id="btn-close-stocktake-csv"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Tutup Modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {/* Top Controls: Mode Selection & Action Utilities */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 mr-1">
                Metode Input:
              </span>
              <button
                id="btn-mode-set"
                type="button"
                onClick={() => setMode('set')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  mode === 'set'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700'
                }`}
                title="Ganti total stok sekarang menjadi angka hasil hitung fisik"
              >
                Ganti Stok Fisik (Absolute)
              </button>
              <button
                id="btn-mode-add"
                type="button"
                onClick={() => setMode('add')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  mode === 'add'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700'
                }`}
                title="Tambahkan angka input ke stok yang sudah ada"
              >
                + Tambah ke Stok
              </button>
              <button
                id="btn-mode-subtract"
                type="button"
                onClick={() => setMode('subtract')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  mode === 'subtract'
                    ? 'bg-rose-600 text-white shadow-sm'
                    : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700'
                }`}
                title="Kurangi stok sekarang dengan angka input"
              >
                - Kurangi Stok
              </button>
            </div>

            {/* Template & Sample Buttons */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                id="btn-load-sample-csv"
                type="button"
                onClick={handleLoadSampleData}
                className="px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Muat contoh barcode produk dari toko Anda"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Muat Contoh Toko</span>
              </button>

              <button
                id="btn-download-csv-template"
                type="button"
                onClick={handleDownloadTemplate}
                className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Download file CSV berisi barcode & nama seluruh produk toko Anda"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                <span>Download Template</span>
              </button>

              <button
                id="btn-copy-format-guide"
                type="button"
                onClick={handleCopyFormat}
                className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Salin contoh format kolom"
              >
                {copiedNotification ? (
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                ) : (
                  <Copy className="w-3.5 h-3.5 text-slate-500" />
                )}
                <span>{copiedNotification ? 'Disalin!' : 'Salin Format'}</span>
              </button>
            </div>
          </div>

          {/* Form Input Area: Textarea & File Dropzone */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label
                htmlFor="textarea-stocktake-csv"
                className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2"
              >
                <span>Input Data CSV / Tab Delimited:</span>
                <span className="text-[11px] font-normal text-slate-500 dark:text-slate-400">
                  (Format: <code>Barcode / SKU, Jumlah Stok, [Kadaluarsa Opsional]</code>)
                </span>
              </label>

              <div className="flex items-center gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept=".csv,.txt,.tsv"
                  className="hidden"
                  id="input-stocktake-file"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload File (.csv / .txt)</span>
                </button>

                {rawText && (
                  <button
                    type="button"
                    onClick={() => setRawText('')}
                    className="text-xs text-slate-400 hover:text-rose-500 flex items-center gap-0.5 ml-2 cursor-pointer"
                    title="Kosongkan form input"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Bersihkan</span>
                  </button>
                )}
              </div>
            </div>

            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              className="relative rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 focus-within:ring-2 focus-within:ring-emerald-500/30 focus-within:border-emerald-500 transition-all"
            >
              <textarea
                id="textarea-stocktake-csv"
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder={
                  'Tempel atau ketik baris data di sini...\n' +
                  'Contoh 1: 8992753101111, 45\n' +
                  'Contoh 2: IDM-MIE-001, 100, 2026-12-31\n' +
                  'Contoh 3 (Copy dari Excel): 8991001100222\t32\n' +
                  'Dukungan pemisah: Koma (,), Titik-koma (;), atau Tab (Excel).'
                }
                rows={5}
                className="w-full p-3.5 text-xs font-mono text-slate-800 dark:text-slate-200 bg-transparent border-none focus:outline-none resize-y min-h-[110px]"
              />
              <div className="px-3.5 py-1.5 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-900/50 rounded-b-xl flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                <span>
                  {rawText ? `${rawText.split(/\r?\n/).filter(Boolean).length} baris teks terdeteksi` : 'Formulir siap menerima input'}
                </span>
                <span>Bisa drag & drop file .csv ke area ini</span>
              </div>
            </div>
          </div>

          {/* Metric Badges */}
          {parsedRows.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80">
                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                  Total Baris Diproses
                </span>
                <div className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                  {totalParsedCount}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium text-emerald-700 dark:text-emerald-300">
                    Produk Cocok
                  </span>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="text-lg font-bold text-emerald-700 dark:text-emerald-300 mt-0.5">
                  {matchedCount}{' '}
                  <span className="text-[11px] font-normal text-emerald-600/80">
                    ({totalParsedCount > 0 ? Math.round((matchedCount / totalParsedCount) * 100) : 0}%)
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium text-amber-700 dark:text-amber-300">
                    Tidak Ditemukan / Error
                  </span>
                  {unmatchedCount > 0 ? (
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  ) : (
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                  )}
                </div>
                <div className="text-lg font-bold text-amber-700 dark:text-amber-300 mt-0.5">
                  {unmatchedCount}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium text-indigo-700 dark:text-indigo-300">
                    Net Selisih Stok
                  </span>
                  {netStockDiff >= 0 ? (
                    <TrendingUp className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  ) : (
                    <TrendingDown className="w-3.5 h-3.5 text-rose-500" />
                  )}
                </div>
                <div
                  className={`text-lg font-bold mt-0.5 ${
                    netStockDiff > 0
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : netStockDiff < 0
                      ? 'text-rose-600 dark:text-rose-400'
                      : 'text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {netStockDiff > 0 ? `+${netStockDiff}` : netStockDiff} unit
                </div>
              </div>
            </div>
          )}

          {/* Parsed Preview Table & Filter Toolbar */}
          {parsedRows.length > 0 && (
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
                {/* Tabs */}
                <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={() => setFilterTab('all')}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      filterTab === 'all'
                        ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    Semua ({activeRows.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterTab('matched')}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      filterTab === 'matched'
                        ? 'bg-emerald-600 text-white shadow-2xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400'
                    }`}
                  >
                    Cocok ({matchedCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterTab('unmatched')}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      filterTab === 'unmatched'
                        ? 'bg-amber-600 text-white shadow-2xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-400'
                    }`}
                  >
                    Tidak Cocok ({unmatchedCount})
                  </button>
                </div>

                {/* Search */}
                <div className="relative w-full sm:w-64">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Cari barcode / nama..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Table Container */}
              <div className="border border-slate-200 dark:border-slate-700/80 rounded-xl overflow-hidden shadow-2xs">
                <div className="overflow-x-auto max-h-[300px]">
                  <table className="w-full text-left text-xs">
                    <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700 z-10">
                      <tr>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3">Input Barcode / SKU</th>
                        <th className="py-2.5 px-3">Nama Produk Teridentifikasi</th>
                        <th className="py-2.5 px-3 text-center">Stok Awal</th>
                        <th className="py-2.5 px-3 text-center">Jumlah Input</th>
                        <th className="py-2.5 px-3 text-center">Stok Akhir</th>
                        <th className="py-2.5 px-3 text-center">Selisih</th>
                        <th className="py-2.5 px-3">Kadaluarsa</th>
                        <th className="py-2.5 px-3 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 bg-white dark:bg-slate-900/60">
                      {displayedRows.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="py-8 text-center text-slate-400 text-xs">
                            Tidak ada data yang sesuai dengan filter.
                          </td>
                        </tr>
                      ) : (
                        displayedRows.map((row) => {
                          const isMatched = row.status === 'matched';
                          const isInvalidQty = row.status === 'invalid_qty';

                          return (
                            <tr
                              key={row.id}
                              className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors ${
                                !isMatched ? 'bg-amber-50/40 dark:bg-amber-950/20' : ''
                              }`}
                            >
                              {/* Status */}
                              <td className="py-2 px-3">
                                {isMatched ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                                    <Check className="w-2.5 h-2.5" />
                                    <span>Cocok</span>
                                  </span>
                                ) : isInvalidQty ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
                                    <AlertCircle className="w-2.5 h-2.5" />
                                    <span>Qty Tidak Valid</span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                                    <AlertTriangle className="w-2.5 h-2.5" />
                                    <span>Tidak Ditemukan</span>
                                  </span>
                                )}
                              </td>

                              {/* Input Barcode */}
                              <td className="py-2 px-3 font-mono font-medium text-slate-800 dark:text-slate-200">
                                {row.identifier}
                              </td>

                              {/* Matched Product */}
                              <td className="py-2 px-3">
                                {row.matchedProduct ? (
                                  <div>
                                    <div className="font-semibold text-slate-900 dark:text-white line-clamp-1">
                                      {row.matchedProduct.name}
                                    </div>
                                    <div className="text-[10px] text-slate-500 dark:text-slate-400">
                                      SKU: {row.matchedProduct.sku} • {formatCurrency(row.matchedProduct.price, settings.currency)}
                                    </div>
                                  </div>
                                ) : (
                                  <span className="text-slate-400 italic">
                                    Kode tidak ada di katalog toko (diabaikan)
                                  </span>
                                )}
                              </td>

                              {/* Current Stock */}
                              <td className="py-2 px-3 text-center font-mono text-slate-600 dark:text-slate-400">
                                {isMatched ? row.currentStock : '-'}
                              </td>

                              {/* Input Qty */}
                              <td className="py-2 px-3 text-center font-mono font-bold text-slate-800 dark:text-slate-200">
                                {row.inputQty}
                              </td>

                              {/* Target Stock */}
                              <td className="py-2 px-3 text-center font-mono font-bold text-emerald-600 dark:text-emerald-400">
                                {isMatched ? row.targetStock : '-'}
                              </td>

                              {/* Difference */}
                              <td className="py-2 px-3 text-center">
                                {isMatched ? (
                                  <span
                                    className={`inline-block px-1.5 py-0.5 rounded text-[11px] font-mono font-bold ${
                                      row.diff > 0
                                        ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                                        : row.diff < 0
                                        ? 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300'
                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                                    }`}
                                  >
                                    {row.diff > 0 ? `+${row.diff}` : row.diff}
                                  </span>
                                ) : (
                                  '-'
                                )}
                              </td>

                              {/* Expiry */}
                              <td className="py-2 px-3 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                                {row.newExpiry ? (
                                  <span className="text-amber-600 dark:text-amber-400 font-semibold">
                                    {row.newExpiry}
                                  </span>
                                ) : row.matchedProduct?.expiryDate ? (
                                  row.matchedProduct.expiryDate
                                ) : (
                                  '-'
                                )}
                              </td>

                              {/* Action */}
                              <td className="py-2 px-3 text-right">
                                <button
                                  type="button"
                                  onClick={() => handleToggleExcludeRow(row.id)}
                                  className="text-slate-400 hover:text-rose-500 p-1 rounded transition-colors cursor-pointer"
                                  title="Keluarkan baris ini dari eksekusi"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Audit Note & Reason Section */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200 dark:border-slate-800">
            <div>
              <label
                htmlFor="select-stocktake-reason"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
              >
                Alasan Stock Opname:
              </label>
              <select
                id="select-stocktake-reason"
                value={selectedReason}
                onChange={(e) => setSelectedReason(e.target.value)}
                className="w-full text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 px-3 py-2 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {COMMON_REASONS.map((reason) => (
                  <option key={reason} value={reason}>
                    {reason}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="input-stocktake-notes"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
              >
                Catatan Petugas / Nomor Rak / Batch:
              </label>
              <input
                id="input-stocktake-notes"
                type="text"
                value={customNotes}
                onChange={(e) => setCustomNotes(e.target.value)}
                placeholder="Contoh: Rak B4 - Shift Pagi (Hitung Fisik Manual)"
                className="w-full text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 px-3 py-2 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/90 shrink-0">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {matchedCount > 0 ? (
              <span>
                Siap memperbarui <strong className="text-slate-900 dark:text-white">{matchedCount} barang</strong>
                {totalCostImpact !== 0 && (
                  <>
                    {' '}
                    (Dampak Nilai:{' '}
                    <strong
                      className={
                        totalCostImpact >= 0
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-rose-600 dark:text-rose-400'
                      }
                    >
                      {totalCostImpact >= 0 ? '+' : ''}
                      {formatCurrency(totalCostImpact, settings.currency)}
                    </strong>
                    )
                  </>
                )}
              </span>
            ) : (
              <span>Ketik atau upload format data CSV untuk memulai stock opname</span>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              id="btn-cancel-stocktake-csv"
              type="button"
              onClick={onClose}
              disabled={isApplying}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
            >
              Batal
            </button>

            {showConfirm ? (
              <div className="flex items-center gap-1.5 animate-in fade-in">
                <button
                  id="btn-confirm-apply-stocktake"
                  type="button"
                  onClick={handleApplyStockUpdate}
                  disabled={isApplying || matchedCount === 0}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20 flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>{isApplying ? 'Menerapkan...' : 'Ya, Update Sekarang!'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowConfirm(false)}
                  className="px-2.5 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Batal
                </button>
              </div>
            ) : (
              <button
                id="btn-submit-stocktake-csv"
                type="button"
                onClick={() => {
                  if (matchedCount > 0) setShowConfirm(true);
                }}
                disabled={matchedCount === 0 || isApplying}
                className={`px-5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md ${
                  matchedCount > 0
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20 cursor-pointer active:scale-95'
                    : 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Terapkan Pembaruan Stok ({matchedCount})</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

import React, { useState, useMemo, useRef } from 'react';
import {
  X,
  Upload,
  CheckCircle2,
  FileSpreadsheet,
  Trash2,
  FileText,
  Search,
  CheckSquare,
  Square,
  Download,
  AlertCircle,
  ArrowRight,
  Package,
} from 'lucide-react';
import { Product } from '../types';
import { usePOS } from '../context/POSContext';
import { formatCurrency } from '../utils/formatters';
import { parseRetailLineRaw, ParsedItem } from '../utils/retailNormalizer';

interface DirectFileImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SAMPLE_CSV = `barcode,nama_produk,harga_beli,harga_jual,stok,kategori,satuan
8999999190112,Indomie Goreng Spesial 80g,2700,3100,120,Makanan,pcs
8992775211029,Bimoli Minyak Goreng 2L,33500,38500,36,Sembako,pouch
8991001100223,Kopi Kapal Api Special Mix 24g,1100,1500,200,Minuman,sachet
8999999052212,Sabun Lifebuoy Total 10 110g,3800,4800,72,Kebutuhan Rumah,pcs
8991234567890,Beras Pandan Wangi Premium 5kg,68000,78000,25,Sembako,karung`;

export const DirectFileImportModal: React.FC<DirectFileImportModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { addProductsBatch, settings } = usePOS();
  const minProfitPoints = settings.minProfitPercentForPoints ?? 15;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [rawText, setRawText] = useState('');
  const [fileName, setFileName] = useState<string | null>(null);
  const [filterQuery, setFilterQuery] = useState('');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Parse lines purely AS-IS without any spelling or typo alteration
  const parsedItems: ParsedItem[] = useMemo(() => {
    if (!rawText.trim()) return [];
    return rawText
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0)
      .map((l, idx) => parseRetailLineRaw(l, idx, minProfitPoints))
      .filter((it): it is ParsedItem => it !== null);
  }, [rawText, minProfitPoints]);

  const [itemsState, setItemsState] = useState<ParsedItem[]>([]);

  // Sync state whenever parsedItems changes
  React.useEffect(() => {
    setItemsState(parsedItems);
  }, [parsedItems]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setRawText(content);
      }
    };
    reader.readAsText(file);
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

  const handleFieldChange = (id: string, field: keyof ParsedItem, value: any) => {
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

  const handleDownloadSample = () => {
    const blob = new Blob([SAMPLE_CSV], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'contoh_import_produk_asli.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleLoadSample = () => {
    setFileName('contoh_import_produk_asli.csv');
    setRawText(SAMPLE_CSV);
  };

  const handleExecuteImport = () => {
    const selected = itemsState.filter((it) => it.selected);
    if (selected.length === 0) return;

    setIsProcessing(true);

    const payloads: Omit<Product, 'id'>[] = selected.map((it) => ({
      name: it.name, // Exactly as in the user's file!
      brand: it.brand || '',
      sku: it.sku,
      barcode: it.barcode,
      categoryId: it.categoryId,
      price: it.price,
      costPrice: it.costPrice,
      stock: it.stock,
      minStock: Math.max(2, Math.floor(it.stock * 0.2)),
      unit: it.unit || 'pcs',
      aisle: it.aisle || 'Lorong Toko',
      wholesaleUnits: undefined,
    }));

    addProductsBatch(payloads);

    setSuccessMessage(`Berhasil mengimpor ${selected.length} produk langsung ke katalog toko.`);
    setTimeout(() => {
      setSuccessMessage(null);
      setIsProcessing(false);
      onClose();
    }, 1200);
  };

  if (!isOpen) return null;

  const filteredItems = itemsState.filter(
    (it) =>
      it.name.toLowerCase().includes(filterQuery.toLowerCase()) ||
      it.barcode.includes(filterQuery) ||
      it.originalText.toLowerCase().includes(filterQuery.toLowerCase())
  );

  const totalSelected = itemsState.filter((it) => it.selected).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-5xl shadow-2xl flex flex-col max-h-[94vh] overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-600 text-white shadow-md">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Impor File Produk Langsung (As-Is / Tanpa Auto-Koreksi)
                </h3>
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                  Data Asli Dipertahankan
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Impor file CSV, Excel, TXT persis seperti isi aslinya tanpa modifikasi ejaan, tanpa auto-koreksi, dan tanpa rekomendasi AI.
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
          {successMessage && (
            <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 flex items-center gap-2 text-sm font-semibold">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Upload Area & Quick Controls */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Drag & Drop File Upload */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="md:col-span-2 border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-emerald-500 rounded-2xl p-5 bg-slate-50/50 dark:bg-slate-800/30 flex flex-col items-center justify-center text-center cursor-pointer transition-colors group"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv, .txt, .tsv, .xlsx, .xls, .json"
                onChange={handleFileUpload}
                className="hidden"
              />
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-slate-900 dark:text-white">
                {fileName ? `File Terpilih: ${fileName}` : 'Klik atau Tarik File CSV / Excel / TXT ke Sini'}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Mendukung file teks dipisahkan koma, tab, titik koma (Barcode, Nama, Modal, Jual, Stok)
              </p>
            </div>

            {/* Quick Actions & Format Template */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 flex flex-col justify-between space-y-3">
              <div>
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 mb-1.5">
                  <FileText className="w-4 h-4 text-emerald-500" />
                  <span>Format Kolom File</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed font-mono">
                  Barcode, Nama Produk, Harga Beli, Harga Jual, Stok, Kategori, Satuan
                </p>
              </div>

              <div className="flex flex-col gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleDownloadSample}
                  className="w-full py-2 px-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center gap-2 cursor-pointer transition"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Unduh Contoh CSV</span>
                </button>
                <button
                  type="button"
                  onClick={handleLoadSample}
                  className="w-full py-2 px-3 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center justify-center gap-2 cursor-pointer transition"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Muat Data Sampel</span>
                </button>
              </div>
            </div>
          </div>

          {/* Direct Paste Fallback (Optional) */}
          <details className="rounded-xl border border-slate-200 dark:border-slate-800 p-3 bg-white dark:bg-slate-950 text-xs">
            <summary className="font-bold text-slate-700 dark:text-slate-300 cursor-pointer flex items-center gap-2">
              <span>Atau Tempel / Ketik Teks CSV Langsung</span>
              <span className="text-[10px] text-slate-400 font-normal">
                ({rawText ? `${rawText.split('\n').filter((l) => l.trim()).length} baris` : 'Kosong'})
              </span>
            </summary>
            <div className="mt-3">
              <textarea
                rows={4}
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder={`8999999190112, Indomie Goreng Spesial 80g, 2700, 3100, 120\n8992775211029, Bimoli Minyak Goreng 2L, 33500, 38500, 36`}
                className="w-full font-mono text-xs p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:outline-emerald-500 text-slate-800 dark:text-slate-200"
              />
            </div>
          </details>

          {/* Parsed Items List */}
          {itemsState.length > 0 ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3 flex-wrap bg-slate-100 dark:bg-slate-800/80 p-3 rounded-xl">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => handleToggleSelectAll(totalSelected < itemsState.length)}
                    className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 cursor-pointer"
                  >
                    {totalSelected === itemsState.length && itemsState.length > 0 ? (
                      <CheckSquare className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-400" />
                    )}
                    <span>Pilih Semua ({totalSelected}/{itemsState.length})</span>
                  </button>
                </div>

                <div className="relative flex-1 max-w-xs">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    value={filterQuery}
                    onChange={(e) => setFilterQuery(e.target.value)}
                    placeholder="Cari nama/barcode..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-emerald-500"
                  />
                </div>
              </div>

              {/* Items Table */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-x-auto max-h-96">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-bold sticky top-0 z-10 border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="py-2.5 px-3 w-10 text-center">Pilih</th>
                      <th className="py-2.5 px-3">Barcode</th>
                      <th className="py-2.5 px-3">Nama Produk (Asli dari Berkas)</th>
                      <th className="py-2.5 px-3">Harga Beli</th>
                      <th className="py-2.5 px-3">Harga Jual</th>
                      <th className="py-2.5 px-3">Stok</th>
                      <th className="py-2.5 px-3">Satuan</th>
                      <th className="py-2.5 px-3 w-10 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredItems.map((item) => (
                      <tr
                        key={item.id}
                        className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors ${
                          item.selected ? 'bg-white dark:bg-slate-900' : 'opacity-40 bg-slate-50/50'
                        }`}
                      >
                        <td className="py-2 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleToggleSelect(item.id)}
                            className="cursor-pointer text-slate-400 hover:text-emerald-600"
                          >
                            {item.selected ? (
                              <CheckSquare className="w-4 h-4 text-emerald-600" />
                            ) : (
                              <Square className="w-4 h-4" />
                            )}
                          </button>
                        </td>
                        <td className="py-2 px-3 font-mono text-slate-600 dark:text-slate-400">
                          <input
                            type="text"
                            value={item.barcode}
                            onChange={(e) => handleFieldChange(item.id, 'barcode', e.target.value)}
                            className="w-32 bg-transparent border-b border-dashed border-slate-300 dark:border-slate-700 py-0.5 focus:outline-emerald-500"
                          />
                        </td>
                        <td className="py-2 px-3 font-bold text-slate-900 dark:text-white">
                          <input
                            type="text"
                            value={item.name}
                            onChange={(e) => handleFieldChange(item.id, 'name', e.target.value)}
                            className="w-full bg-transparent border-b border-dashed border-slate-300 dark:border-slate-700 py-0.5 focus:outline-emerald-500"
                          />
                        </td>
                        <td className="py-2 px-3">
                          <input
                            type="number"
                            value={item.costPrice}
                            onChange={(e) => handleFieldChange(item.id, 'costPrice', Number(e.target.value))}
                            className="w-24 bg-transparent border-b border-dashed border-slate-300 dark:border-slate-700 py-0.5 focus:outline-emerald-500 font-mono text-right"
                          />
                        </td>
                        <td className="py-2 px-3 font-bold text-emerald-600 dark:text-emerald-400">
                          <input
                            type="number"
                            value={item.price}
                            onChange={(e) => handleFieldChange(item.id, 'price', Number(e.target.value))}
                            className="w-24 bg-transparent border-b border-dashed border-slate-300 dark:border-slate-700 py-0.5 focus:outline-emerald-500 font-mono text-right"
                          />
                        </td>
                        <td className="py-2 px-3">
                          <input
                            type="number"
                            value={item.stock}
                            onChange={(e) => handleFieldChange(item.id, 'stock', Number(e.target.value))}
                            className="w-16 bg-transparent border-b border-dashed border-slate-300 dark:border-slate-700 py-0.5 focus:outline-emerald-500 font-mono text-right"
                          />
                        </td>
                        <td className="py-2 px-3 text-slate-500">
                          <input
                            type="text"
                            value={item.unit || 'pcs'}
                            onChange={(e) => handleFieldChange(item.id, 'unit', e.target.value)}
                            className="w-16 bg-transparent border-b border-dashed border-slate-300 dark:border-slate-700 py-0.5 focus:outline-emerald-500"
                          />
                        </td>
                        <td className="py-2 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleDeleteItem(item.id)}
                            className="p-1 rounded text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 cursor-pointer"
                            title="Hapus baris"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="py-12 flex flex-col items-center justify-center text-center text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
              <Package className="w-10 h-10 mb-2 opacity-40 text-slate-400" />
              <p className="text-sm font-bold text-slate-600 dark:text-slate-400">
                Belum ada data file yang dimuat
              </p>
              <p className="text-xs text-slate-400 mt-1 max-w-sm">
                Silakan pilih file CSV/Excel atau klik &quot;Muat Data Sampel&quot; di atas untuk melihat preview data asli.
              </p>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex items-center justify-between gap-3">
          <div className="text-xs text-slate-500">
            {totalSelected > 0 ? (
              <span>
                <strong className="text-slate-900 dark:text-white font-mono">{totalSelected}</strong> produk siap diimpor langsung
              </span>
            ) : (
              <span>Pilih minimal 1 produk untuk diimpor</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              Batal
            </button>
            <button
              type="button"
              disabled={totalSelected === 0 || isProcessing}
              onClick={handleExecuteImport}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold shadow-lg shadow-emerald-600/20 flex items-center gap-2 cursor-pointer transition active:scale-98"
            >
              <Upload className="w-4 h-4" />
              <span>Impor {totalSelected} Produk Langsung (As-Is)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

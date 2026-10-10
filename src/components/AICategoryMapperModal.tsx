import React, { useState, useMemo } from 'react';
import {
  X,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Layers,
  ArrowRight,
  Filter,
  Check,
  Package,
} from 'lucide-react';
import { usePOS } from '../context/POSContext';
import { batchMapCategoriesWithAI } from '../utils/aiCategoryMapper';

interface AICategoryMapperModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface MappingCandidate {
  id: string;
  name: string;
  brand?: string;
  currentCategoryId: string;
  currentCategoryName: string;
  suggestedCategoryId: string;
  suggestedCategoryName: string;
  confidence: number;
  reasoning: string;
  isDifferent: boolean;
  selected: boolean;
}

export const AICategoryMapperModal: React.FC<AICategoryMapperModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { products, categories, updateProduct } = usePOS();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [candidates, setCandidates] = useState<MappingCandidate[]>([]);
  const [filterMode, setFilterMode] = useState<'different_only' | 'all'>('different_only');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const categoryMap = useMemo(() => {
    const map = new Map<string, string>();
    categories.forEach((c) => map.set(c.id, c.name));
    return map;
  }, [categories]);

  const handleStartAnalysis = async () => {
    setIsAnalyzing(true);
    setSuccessMessage(null);

    try {
      const itemsToScan = products.map((p) => ({
        id: p.id,
        name: p.name,
        brand: p.brand,
        categoryId: p.categoryId,
      }));

      const results = await batchMapCategoriesWithAI(itemsToScan, categories);

      const mappedCandidates: MappingCandidate[] = results.map((res) => {
        const prod = products.find((p) => p.id === res.id);
        const currentCatId = prod?.categoryId || 'groceries';
        const currentCatName = categoryMap.get(currentCatId) || currentCatId;
        const suggestedCatName = categoryMap.get(res.categoryId) || res.categoryName || res.categoryId;
        const isDifferent = currentCatId !== res.categoryId;

        return {
          id: res.id,
          name: prod?.name || '',
          brand: prod?.brand,
          currentCategoryId: currentCatId,
          currentCategoryName: currentCatName,
          suggestedCategoryId: res.categoryId,
          suggestedCategoryName: suggestedCatName,
          confidence: res.confidence,
          reasoning: res.reasoning,
          isDifferent,
          selected: isDifferent, // Pre-select if different
        };
      });

      setCandidates(mappedCandidates);
    } catch (err: any) {
      console.warn('Analysis error:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const displayedCandidates = useMemo(() => {
    if (filterMode === 'different_only') {
      return candidates.filter((c) => c.isDifferent);
    }
    return candidates;
  }, [candidates, filterMode]);

  const selectedCount = useMemo(() => {
    return displayedCandidates.filter((c) => c.selected).length;
  }, [displayedCandidates]);

  const handleToggleSelectAll = (select: boolean) => {
    setCandidates((prev) =>
      prev.map((c) => {
        if (filterMode === 'different_only' && !c.isDifferent) return c;
        return { ...c, selected: select };
      })
    );
  };

  const handleToggleItem = (id: string) => {
    setCandidates((prev) =>
      prev.map((c) => (c.id === id ? { ...c, selected: !c.selected } : c))
    );
  };

  const handleApplySelected = () => {
    const toApply = candidates.filter((c) => c.selected && c.isDifferent);
    if (toApply.length === 0) return;

    let count = 0;
    toApply.forEach((c) => {
      const existing = products.find((p) => p.id === c.id);
      if (existing) {
        updateProduct(c.id, {
          categoryId: c.suggestedCategoryId,
        });
        count++;
      }
    });

    setSuccessMessage(`Berhasil memperbarui ${count} kategori produk secara sistematis.`);
    // Refresh candidate list
    setCandidates((prev) =>
      prev.map((c) => {
        if (c.selected) {
          return {
            ...c,
            currentCategoryId: c.suggestedCategoryId,
            currentCategoryName: c.suggestedCategoryName,
            isDifferent: false,
            selected: false,
          };
        }
        return c;
      })
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-4xl max-h-[85vh] rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <span>Pemetaan Kategori Inventaris Otomatis (Gemini AI)</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-semibold">
                  FMCG Retail
                </span>
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                AI mengelompokkan produk secara sistematis berdasarkan nama produk untuk menghindari kesalahan kategori manual.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 flex-1 overflow-y-auto space-y-4">
          {/* Top Banner / Actions */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-purple-500/10 via-indigo-500/10 to-emerald-500/10 border border-purple-200 dark:border-purple-900/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                Total Produk Inventaris: {products.length} Item
              </span>
              <p className="text-[11px] text-slate-600 dark:text-slate-300">
                Pindai seluruh master produk toko untuk menemukan produk yang berada di kategori umum/kurang tepat.
              </p>
            </div>

            <button
              type="button"
              onClick={handleStartAnalysis}
              disabled={isAnalyzing}
              className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-md shadow-purple-600/20 disabled:opacity-50 transition active:scale-95 shrink-0"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isAnalyzing ? 'animate-spin' : ''}`} />
              <span>{isAnalyzing ? 'Sedang Menganalisis AI...' : candidates.length > 0 ? 'Pindai Ulang AI' : 'Mulai Analisis AI Sekarang'}</span>
            </button>
          </div>

          {successMessage && (
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-xs font-bold text-emerald-800 dark:text-emerald-200 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Results Area */}
          {candidates.length > 0 && (
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setFilterMode('different_only')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer transition ${
                      filterMode === 'different_only'
                        ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    Perlu Penyesuaian ({candidates.filter((c) => c.isDifferent).length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterMode('all')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer transition ${
                      filterMode === 'all'
                        ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    Semua Produk ({candidates.length})
                  </button>
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => handleToggleSelectAll(true)}
                    className="text-purple-600 dark:text-purple-400 hover:underline cursor-pointer font-semibold text-[11px]"
                  >
                    Pilih Semua
                  </button>
                  <span className="text-slate-300 dark:text-slate-700">|</span>
                  <button
                    type="button"
                    onClick={() => handleToggleSelectAll(false)}
                    className="text-slate-500 hover:underline cursor-pointer font-semibold text-[11px]"
                  >
                    Batal Pilih
                  </button>
                </div>
              </div>

              {/* Candidates Table */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden text-xs">
                <div className="overflow-x-auto max-h-80">
                  <table className="w-full text-left divide-y divide-slate-200 dark:divide-slate-800">
                    <thead className="bg-slate-50 dark:bg-slate-800/60 text-[10px] uppercase font-bold text-slate-500 tracking-wider sticky top-0">
                      <tr>
                        <th className="p-2.5 w-10 text-center">Pilih</th>
                        <th className="p-2.5">Nama Produk</th>
                        <th className="p-2.5">Kategori Saat Ini</th>
                        <th className="p-2.5">Rekomendasi AI</th>
                        <th className="p-2.5">Alasan Pemetaan AI</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 bg-white dark:bg-slate-900">
                      {displayedCandidates.map((item) => (
                        <tr
                          key={item.id}
                          className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 transition ${
                            item.isDifferent ? 'bg-purple-50/20 dark:bg-purple-950/10' : ''
                          }`}
                        >
                          <td className="p-2.5 text-center">
                            <input
                              type="checkbox"
                              checked={item.selected}
                              onChange={() => handleToggleItem(item.id)}
                              className="rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                            />
                          </td>
                          <td className="p-2.5">
                            <div className="font-bold text-slate-900 dark:text-white truncate max-w-xs">
                              {item.name}
                            </div>
                            {item.brand && (
                              <span className="text-[10px] text-slate-400">
                                Brand: {item.brand}
                              </span>
                            )}
                          </td>
                          <td className="p-2.5">
                            <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                              {item.currentCategoryName}
                            </span>
                          </td>
                          <td className="p-2.5">
                            <div className="flex items-center gap-1.5">
                              {item.isDifferent ? (
                                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 flex items-center gap-1">
                                  <Sparkles className="w-3 h-3 text-emerald-600" />
                                  {item.suggestedCategoryName}
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded text-[11px] font-medium text-slate-400 dark:text-slate-500 flex items-center gap-1">
                                  <Check className="w-3 h-3 text-emerald-500" />
                                  Sudah Tepat
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="p-2.5 text-[11px] text-slate-600 dark:text-slate-400">
                            {item.reasoning}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {candidates.length === 0 && !isAnalyzing && (
            <div className="py-12 text-center text-slate-400 space-y-2">
              <Package className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
              <p className="font-semibold text-slate-700 dark:text-slate-300 text-xs">
                Klik tombol "Mulai Analisis AI Sekarang" di atas
              </p>
              <p className="text-[11px] text-slate-500 max-w-md mx-auto">
                Sistem akan memindai katalog nama produk Anda dan memetakan ke kategori yang sesuai secara otomatis dan terstandarisasi.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            {selectedCount > 0 ? (
              <span><strong>{selectedCount} produk</strong> siap diselaraskan ke kategori AI</span>
            ) : (
              <span>Pilih produk yang ingin diselaraskan</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs cursor-pointer"
            >
              Tutup
            </button>
            <button
              type="button"
              onClick={handleApplySelected}
              disabled={selectedCount === 0}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-md shadow-emerald-600/20 disabled:opacity-40 transition active:scale-95"
            >
              <Check className="w-4 h-4" />
              <span>Terapkan Kategori Terpilih ({selectedCount})</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

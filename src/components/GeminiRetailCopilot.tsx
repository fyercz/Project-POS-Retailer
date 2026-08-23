import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  X,
  TrendingUp,
  Package,
  ShoppingBag,
  Tag,
  MessageSquare,
  RefreshCw,
  Plus,
  Check,
  AlertTriangle,
  Send,
  Zap,
  Clock,
  ArrowRight,
  ShieldCheck,
  Award,
  Layers,
} from 'lucide-react';
import { usePOS } from '../context/POSContext';
import { formatCurrency } from '../utils/formatters';
import { AIForecastItem, AIDailyInsights, AIPromoResult } from '../types';

export const GeminiRetailCopilot: React.FC = () => {
  const {
    isGeminiCopilotOpen,
    setIsGeminiCopilotOpen,
    activeCopilotTab,
    setActiveCopilotTab,
    cart,
    products,
    transactions,
    customers,
    settings,
    addToCart,
    addVoucher,
    aiUpsellSuggestions,
    isFetchingUpsell,
    fetchUpsellSuggestions,
  } = usePOS();

  // Forecast state
  const [forecastData, setForecastData] = useState<{
    summary: string;
    healthScore?: number;
    forecasts: AIForecastItem[];
    deadstockOrExpiryAlerts?: { productName: string; issue: string; suggestedPromotion: string }[];
    isAiGenerated?: boolean;
  } | null>(null);
  const [isLoadingForecast, setIsLoadingForecast] = useState(false);

  // Insights state
  const [insightsData, setInsightsData] = useState<AIDailyInsights | null>(null);
  const [isLoadingInsights, setIsLoadingInsights] = useState(false);

  // Promo Generator state
  const [promoTheme, setPromoTheme] = useState('Promo JSM Super Hemat');
  const [promoCategory, setPromoCategory] = useState('Semua Kategori');
  const [generatedPromo, setGeneratedPromo] = useState<AIPromoResult | null>(null);
  const [isGeneratingPromo, setIsGeneratingPromo] = useState(false);
  const [promoAppliedSuccess, setPromoAppliedSuccess] = useState(false);

  // Chat Assistant state
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<
    { sender: 'user' | 'ai'; text: string; time: string; actions?: string[] }[]
  >([
    {
      sender: 'ai',
      text: 'Halo! Saya **Gemini Retail Copilot**, asisten pintar toko ritel modern Anda. Ada yang bisa saya bantu terkait inventaris stok, rekomendasi kasir, atau strategi penjualan hari ini?',
      time: 'Baru saja',
      actions: [
        'Produk apa yang stoknya menipis?',
        'Bagaimana tren penjualan hari ini?',
        'Buat promo akhir pekan untuk sembako',
      ],
    },
  ]);
  const [isSendingChat, setIsSendingChat] = useState(false);

  // Fetch forecast data
  const handleFetchForecast = async () => {
    setIsLoadingForecast(true);
    try {
      const res = await fetch('/api/ai/inventory-forecast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          products,
          recentTransactions: transactions,
          storeSettings: settings,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setForecastData(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingForecast(false);
    }
  };

  // Fetch daily sales insights
  const handleFetchInsights = async () => {
    setIsLoadingInsights(true);
    try {
      const res = await fetch('/api/ai/daily-insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactions,
          products,
          settings,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setInsightsData(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingInsights(false);
    }
  };

  // Generate Promo
  const handleGeneratePromo = async () => {
    setIsGeneratingPromo(true);
    setPromoAppliedSuccess(false);
    try {
      const res = await fetch('/api/ai/generate-promo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignTheme: promoTheme,
          targetCategory: promoCategory,
          products,
          settings,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setGeneratedPromo(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsGeneratingPromo(false);
    }
  };

  // Apply generated promo as active store voucher
  const handleApplyPromoVoucher = () => {
    if (!generatedPromo) return;
    addVoucher({
      code: generatedPromo.voucherCode,
      discountType: generatedPromo.discountType,
      value: generatedPromo.value,
      minSpend: generatedPromo.minSpend,
      description: generatedPromo.description,
    });
    setPromoAppliedSuccess(true);
    setTimeout(() => setPromoAppliedSuccess(false), 3000);
  };

  // Send Chat message
  const handleSendChatMessage = async (customQuery?: string) => {
    const query = customQuery || chatInput.trim();
    if (!query) return;

    const userMsg = {
      sender: 'user' as const,
      text: query,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setChatMessages((prev) => [...prev, userMsg]);
    if (!customQuery) setChatInput('');
    setIsSendingChat(true);

    try {
      const res = await fetch('/api/ai/smart-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          products,
          transactions,
          customers,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setChatMessages((prev) => [
          ...prev,
          {
            sender: 'ai',
            text: data.answer || 'Maaf, tidak dapat memproses jawaban saat ini.',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            actions: data.suggestedActions,
          },
        ]);
      }
    } catch (err) {
      setChatMessages((prev) => [
        ...prev,
        {
          sender: 'ai',
          text: 'Terjadi kendala koneksi server. Pastikan aplikasi berjalan dengan baik.',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsSendingChat(false);
    }
  };

  // Trigger data fetch on tab change if not loaded
  useEffect(() => {
    if (isGeminiCopilotOpen) {
      if (activeCopilotTab === 'forecast' && !forecastData) {
        handleFetchForecast();
      } else if (activeCopilotTab === 'insights' && !insightsData) {
        handleFetchInsights();
      }
    }
  }, [isGeminiCopilotOpen, activeCopilotTab]);

  if (!isGeminiCopilotOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        id="gemini-retail-copilot-drawer"
        className="w-full max-w-xl h-full bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-200"
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-emerald-950 via-slate-900 to-slate-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-slate-950 shadow-md shadow-emerald-500/30">
              <Sparkles className="w-5 h-5 fill-current animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base tracking-tight text-white">Gemini Retail Copilot</h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  AI v3.7
                </span>
              </div>
              <p className="text-xs text-slate-300">Asisten Kecerdasan Buatan Ritel Modern & Kasir</p>
            </div>
          </div>

          <button
            onClick={() => setIsGeminiCopilotOpen(false)}
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-slate-200 flex items-center justify-center cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 p-2 bg-slate-100 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveCopilotTab('upsell')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap transition-all cursor-pointer ${
              activeCopilotTab === 'upsell'
                ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>Kasir Upsell</span>
            {cart.length > 0 && (
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
            )}
          </button>

          <button
            onClick={() => setActiveCopilotTab('forecast')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap transition-all cursor-pointer ${
              activeCopilotTab === 'forecast'
                ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            <span>Prediksi Stok</span>
          </button>

          <button
            onClick={() => setActiveCopilotTab('insights')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap transition-all cursor-pointer ${
              activeCopilotTab === 'insights'
                ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Analisis Z-Report</span>
          </button>

          <button
            onClick={() => setActiveCopilotTab('promo')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap transition-all cursor-pointer ${
              activeCopilotTab === 'promo'
                ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Tag className="w-3.5 h-3.5" />
            <span>Generator Promo</span>
          </button>

          <button
            onClick={() => setActiveCopilotTab('chat')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap transition-all cursor-pointer ${
              activeCopilotTab === 'chat'
                ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Tanya Gemini</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 dark:bg-slate-900/50">
          {/* TAB 1: KASIR UPSELL */}
          {activeCopilotTab === 'upsell' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-500" />
                    Rekomendasi Bundling & Cross-Sell Kasir
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Saran otomatis berbasis isi keranjang pembeli untuk menaikkan nilai belanja (Basket Size).
                  </p>
                </div>

                <button
                  onClick={fetchUpsellSuggestions}
                  disabled={isFetchingUpsell}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isFetchingUpsell ? 'animate-spin' : ''}`} />
                  <span>Refresh AI</span>
                </button>
              </div>

              {/* Cart status */}
              {cart.length === 0 ? (
                <div className="p-8 text-center rounded-2xl bg-white dark:bg-slate-950 border border-dashed border-slate-300 dark:border-slate-800 space-y-2">
                  <ShoppingBag className="w-10 h-10 mx-auto text-slate-400 opacity-60" />
                  <p className="font-semibold text-sm text-slate-700 dark:text-slate-300">Keranjang Masih Kosong</p>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    Tambahkan produk dari katalog kasir untuk memicu rekomendasi cerdas Gemini AI secara otomatis.
                  </p>
                </div>
              ) : isFetchingUpsell ? (
                <div className="p-8 text-center rounded-2xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3">
                  <RefreshCw className="w-8 h-8 mx-auto text-emerald-500 animate-spin" />
                  <p className="font-medium text-xs text-slate-600 dark:text-slate-300">
                    Gemini AI sedang menganalisis kombinasi belanja ritel...
                  </p>
                </div>
              ) : aiUpsellSuggestions.length > 0 ? (
                <div className="space-y-2.5">
                  {aiUpsellSuggestions.map((sug, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-xs flex items-center justify-between gap-3 hover:border-emerald-500/60 transition-all"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={sug.product.image}
                          alt={sug.product.name}
                          className="w-14 h-14 rounded-xl object-cover border border-slate-200 dark:border-slate-800 shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                              {sug.urgency}
                            </span>
                            {sug.discountOffer && (
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                                {sug.discountOffer}
                              </span>
                            )}
                          </div>

                          <h5 className="font-semibold text-xs text-slate-900 dark:text-slate-100 truncate mt-1">
                            {sug.product.name}
                          </h5>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5 leading-snug">
                            {sug.reason}
                          </p>

                          <div className="text-xs font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">
                            {formatCurrency(sug.product.price, settings.currency)}
                            <span className="text-[10px] font-normal text-slate-400 ml-1">
                              • Stok: {sug.product.stock} {sug.product.unit}
                            </span>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => addToCart(sug.product)}
                        className="px-3 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs flex items-center gap-1.5 shrink-0 transition-colors shadow-xs cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Tambah</span>
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 text-center rounded-2xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-500">
                  Tidak ada rekomendasi tambahan saat ini.
                </div>
              )}
            </div>
          )}

          {/* TAB 2: PREDIKSI STOK */}
          {activeCopilotTab === 'forecast' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                    <Package className="w-4 h-4 text-emerald-500" />
                    Prediksi Kebutuhan Stok & FEFO (Expiry)
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Analisis perputaran barang fast-moving dan batas minimum stok ritel.
                  </p>
                </div>

                <button
                  onClick={handleFetchForecast}
                  disabled={isLoadingForecast}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingForecast ? 'animate-spin' : ''}`} />
                  <span>Hitung Ulang</span>
                </button>
              </div>

              {isLoadingForecast ? (
                <div className="p-8 text-center rounded-2xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3">
                  <RefreshCw className="w-8 h-8 mx-auto text-emerald-500 animate-spin" />
                  <p className="font-medium text-xs text-slate-600 dark:text-slate-300">
                    Menghitung perputaran stok FMCG & Purchase Order recommendations...
                  </p>
                </div>
              ) : forecastData ? (
                <div className="space-y-3">
                  {/* Summary Card */}
                  <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-emerald-900 dark:text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4 text-emerald-500" />
                        Kesehatan Inventaris Toko
                      </span>
                      {forecastData.healthScore && (
                        <span className="text-xs font-black px-2 py-0.5 rounded-md bg-emerald-500 text-slate-950">
                          {forecastData.healthScore}/100
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-emerald-950 dark:text-emerald-200 leading-relaxed font-medium">
                      {forecastData.summary}
                    </p>
                  </div>

                  {/* Restock items */}
                  <div className="space-y-2">
                    <h5 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                      Rekomendasi Purchase Order (PO)
                    </h5>
                    {forecastData.forecasts && forecastData.forecasts.length > 0 ? (
                      forecastData.forecasts.map((fc, i) => (
                        <div
                          key={i}
                          className="p-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 space-y-1.5"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-xs text-slate-900 dark:text-white">
                              {fc.productName}
                            </span>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                fc.urgency.includes('KRITIS')
                                  ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                                  : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                              }`}
                            >
                              {fc.urgency}
                            </span>
                          </div>

                          <div className="flex items-center gap-4 text-xs font-mono text-slate-600 dark:text-slate-400">
                            <span>Sisa: {fc.currentStock} unit</span>
                            <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                              Saran PO: +{fc.recommendedOrderQty} unit
                            </span>
                            <span>Habis dlm: ~{fc.estimatedDaysLeft} hari</span>
                          </div>

                          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                            {fc.actionAdvice}
                          </p>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-slate-500">Seluruh stok produk berada dalam batas aman.</p>
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          )}

          {/* TAB 3: ANALISIS Z-REPORT & INSIGHTS */}
          {activeCopilotTab === 'insights' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-emerald-500" />
                    Insight Eksekutif & Laporan Z-Report Harian
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Evaluasi omzet, jam sibuk ritel, dan efisiensi operasional kasir.
                  </p>
                </div>

                <button
                  onClick={handleFetchInsights}
                  disabled={isLoadingInsights}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingInsights ? 'animate-spin' : ''}`} />
                  <span>Update Analisis</span>
                </button>
              </div>

              {isLoadingInsights ? (
                <div className="p-8 text-center rounded-2xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3">
                  <RefreshCw className="w-8 h-8 mx-auto text-emerald-500 animate-spin" />
                  <p className="font-medium text-xs text-slate-600 dark:text-slate-300">
                    Menganalisis performa transaksi kasir hari ini...
                  </p>
                </div>
              ) : insightsData ? (
                <div className="space-y-3">
                  {/* Executive Summary */}
                  <div className="p-4 rounded-2xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                      <Zap className="w-3.5 h-3.5" />
                      Ringkasan Operasional
                    </div>
                    <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                      {insightsData.executiveSummary}
                    </p>
                  </div>

                  {/* Metrics Box */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-3 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                      <div className="flex items-center gap-1 text-[11px] text-slate-500">
                        <Clock className="w-3.5 h-3.5 text-blue-500" />
                        Jam Sibuk Puncak
                      </div>
                      <p className="text-xs font-bold text-slate-900 dark:text-white mt-1">
                        {insightsData.peakPerformanceTime || '12:00 - 14:00 & 18:00 - 20:00'}
                      </p>
                    </div>

                    <div className="p-3 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                      <div className="flex items-center gap-1 text-[11px] text-slate-500">
                        <Award className="w-3.5 h-3.5 text-amber-500" />
                        Kategori Paling Laris
                      </div>
                      <p className="text-xs font-bold text-slate-900 dark:text-white mt-1">
                        {insightsData.topGrowthCategory || 'Sembako & Minuman'}
                      </p>
                    </div>
                  </div>

                  {/* Actionable Tips */}
                  {insightsData.actionableTips && (
                    <div className="p-4 rounded-2xl bg-slate-100/80 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
                      <h5 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                        Saran Taktis untuk Store Manager
                      </h5>
                      <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                        {insightsData.actionableTips.map((tip, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                              {i + 1}
                            </span>
                            <span>{tip}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          )}

          {/* TAB 4: GENERATOR PROMO */}
          {activeCopilotTab === 'promo' && (
            <div className="space-y-4">
              <div>
                <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <Tag className="w-4 h-4 text-emerald-500" />
                  Pembuat Promo Kilat Ritel (AI Campaign Maker)
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Ciptakan voucher belanja menarik (JSM, Gajian, Beli 2 Hemat) dengan 1 klik.
                </p>
              </div>

              {/* Form Controls */}
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Tema Kampanye Promo
                  </label>
                  <input
                    type="text"
                    value={promoTheme}
                    onChange={(e) => setPromoTheme(e.target.value)}
                    placeholder="Contoh: Promo JSM Akhir Pekan, Gajian Ceria, Tebus Murah"
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Target Kategori
                  </label>
                  <select
                    value={promoCategory}
                    onChange={(e) => setPromoCategory(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none"
                  >
                    <option value="Semua Kategori">Semua Kategori</option>
                    <option value="Sembako & Bahan Pokok">Sembako & Bahan Pokok</option>
                    <option value="Minuman & Susu">Minuman & Susu</option>
                    <option value="Snack & Biskuit">Snack & Biskuit</option>
                    <option value="Makanan Instan">Makanan Instan</option>
                    <option value="Perawatan Tubuh">Perawatan Tubuh</option>
                  </select>
                </div>

                <button
                  onClick={handleGeneratePromo}
                  disabled={isGeneratingPromo}
                  className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-sm"
                >
                  <Sparkles className={`w-4 h-4 ${isGeneratingPromo ? 'animate-spin' : ''}`} />
                  <span>{isGeneratingPromo ? 'Gemini Merancang Promo...' : 'Generate Ide Promo AI'}</span>
                </button>
              </div>

              {/* Generated Promo Result */}
              {generatedPromo && (
                <div className="p-4 rounded-2xl border border-emerald-500/50 bg-white dark:bg-slate-950 space-y-3 shadow-md animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500 text-slate-950">
                      Voucher Siap Pakai
                    </span>
                    <span className="text-xs font-mono font-bold text-slate-400">
                      Min. Rp {generatedPromo.minSpend.toLocaleString('id-ID')}
                    </span>
                  </div>

                  <div>
                    <h5 className="font-bold text-sm text-slate-900 dark:text-white">
                      {generatedPromo.title}
                    </h5>
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium italic mt-0.5">
                      "{generatedPromo.tagline}"
                    </p>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                      {generatedPromo.description}
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-900 flex items-center justify-between border border-dashed border-slate-300 dark:border-slate-700">
                    <div>
                      <span className="text-[10px] text-slate-400 font-mono">KODE VOUCHER</span>
                      <p className="text-sm font-mono font-black text-slate-900 dark:text-white tracking-widest">
                        {generatedPromo.voucherCode}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400">NILAI POTONGAN</span>
                      <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                        {generatedPromo.discountType === 'percentage'
                          ? `${generatedPromo.value}%`
                          : `Rp ${generatedPromo.value.toLocaleString('id-ID')}`}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={handleApplyPromoVoucher}
                    className="w-full py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-emerald-500 dark:hover:bg-emerald-600 dark:text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                  >
                    {promoAppliedSuccess ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-400 dark:text-slate-950" />
                        <span>Voucher Berhasil Ditambahkan ke Kasir!</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4" />
                        <span>Aktifkan Voucher di Kasir Sekarang</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 5: TANYA GEMINI */}
          {activeCopilotTab === 'chat' && (
            <div className="flex flex-col h-[520px]">
              <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                {chatMessages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
                  >
                    <div
                      className={`max-w-[85%] p-3 rounded-2xl text-xs ${
                        msg.sender === 'user'
                          ? 'bg-emerald-500 text-slate-950 font-medium rounded-tr-xs'
                          : 'bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-800 rounded-tl-xs shadow-2xs'
                      }`}
                    >
                      <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                    </div>
                    <span className="text-[10px] text-slate-400 mt-1 px-1">{msg.time}</span>

                    {/* Quick suggestion pills */}
                    {msg.actions && msg.actions.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {msg.actions.map((act, aIdx) => (
                          <button
                            key={aIdx}
                            onClick={() => handleSendChatMessage(act)}
                            className="text-[11px] px-2.5 py-1 rounded-full bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-emerald-500 hover:text-slate-950 transition-colors cursor-pointer"
                          >
                            {act}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                {isSendingChat && (
                  <div className="flex items-center gap-2 text-xs text-slate-400 italic">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-500 animate-spin" />
                    <span>Gemini sedang menyusun jawaban...</span>
                  </div>
                )}
              </div>

              {/* Chat Input Bar */}
              <div className="pt-3 border-t border-slate-200 dark:border-slate-800">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendChatMessage();
                  }}
                  className="flex items-center gap-2"
                >
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Ketik pertanyaan terkait toko, stok, atau kasir..."
                    className="flex-1 text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <button
                    type="submit"
                    disabled={!chatInput.trim() || isSendingChat}
                    className="p-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-slate-950 font-bold cursor-pointer transition-colors"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

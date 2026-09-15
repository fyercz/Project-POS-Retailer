import React, { useState, useMemo } from 'react';
import {
  X,
  BookOpen,
  Search,
  Sparkles,
  HelpCircle,
  Keyboard,
  Printer,
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  ExternalLink,
  ShieldAlert,
  ArrowRight,
  History,
  ShoppingCart,
  Package,
  Truck,
  Coins,
  Database,
  Laptop,
  Network,
} from 'lucide-react';
import {
  APP_VERSION,
  APP_LAST_UPDATED,
  USER_MANUAL_SECTIONS,
  APP_CHANGELOG,
  USER_FAQS,
  ManualSection,
} from '../data/userManualData';

interface UserManualModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'manual' | 'changelog' | 'faq' | 'shortcuts';
}

export const UserManualModal: React.FC<UserManualModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'manual',
}) => {
  const [activeTab, setActiveTab] = useState<'manual' | 'changelog' | 'faq' | 'shortcuts'>(initialTab);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSectionId, setSelectedSectionId] = useState<string>(USER_MANUAL_SECTIONS[0]?.id || 'kasir-penjualan');
  const [expandedFaqIndex, setExpandedFaqIndex] = useState<number | null>(0);

  if (!isOpen) return null;

  // Icon mapper
  const renderSectionIcon = (iconName: string) => {
    switch (iconName) {
      case 'ShoppingCart':
        return <ShoppingCart className="w-4 h-4 text-emerald-500" />;
      case 'Package':
        return <Package className="w-4 h-4 text-blue-500" />;
      case 'Truck':
        return <Truck className="w-4 h-4 text-amber-500" />;
      case 'Coins':
        return <Coins className="w-4 h-4 text-indigo-500" />;
      case 'Database':
        return <Database className="w-4 h-4 text-purple-500" />;
      case 'Laptop':
        return <Laptop className="w-4 h-4 text-cyan-500" />;
      case 'Network':
        return <Network className="w-4 h-4 text-indigo-500" />;
      default:
        return <BookOpen className="w-4 h-4 text-emerald-500" />;
    }
  };

  // Filter sections by search query
  const filteredSections = useMemo(() => {
    if (!searchQuery.trim()) return USER_MANUAL_SECTIONS;
    const query = searchQuery.toLowerCase();
    return USER_MANUAL_SECTIONS.filter((sec) => {
      const matchTitle = sec.title.toLowerCase().includes(query);
      const matchDesc = sec.description.toLowerCase().includes(query);
      const matchTopics = sec.topics.some(
        (t) =>
          t.title.toLowerCase().includes(query) ||
          t.summary.toLowerCase().includes(query) ||
          t.steps.some((st) => st.toLowerCase().includes(query))
      );
      return matchTitle || matchDesc || matchTopics;
    });
  }, [searchQuery]);

  const activeSection = useMemo(() => {
    return (
      filteredSections.find((s) => s.id === selectedSectionId) ||
      filteredSections[0] ||
      USER_MANUAL_SECTIONS[0]
    );
  }, [filteredSections, selectedSectionId]);

  const handlePrintManual = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        id="user-manual-modal"
        className="w-full max-w-5xl max-h-[92vh] flex flex-col rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden"
      >
        {/* Modal Header */}
        <div className="p-4 sm:px-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  Buku Panduan &amp; Manual Pengguna
                </h2>
                <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                  {APP_VERSION}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Dokumentasi fitur, petunjuk operasional kasir, dan riwayat pembaruan aplikasi
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="btn-print-user-manual"
              onClick={handlePrintManual}
              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-all shadow-2xs"
              title="Cetak panduan ini untuk lembar kerja kasir"
            >
              <Printer className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden sm:inline">Cetak Panduan</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs & Search */}
        <div className="px-4 sm:px-6 py-2.5 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Main Navigation Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            <button
              id="tab-manual"
              onClick={() => setActiveTab('manual')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'manual'
                  ? 'bg-emerald-500 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              Panduan Fitur
            </button>

            <button
              id="tab-changelog"
              onClick={() => setActiveTab('changelog')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'changelog'
                  ? 'bg-emerald-500 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              Pembaruan &amp; Versi
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            </button>

            <button
              id="tab-faq"
              onClick={() => setActiveTab('faq')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'faq'
                  ? 'bg-emerald-500 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <HelpCircle className="w-3.5 h-3.5" />
              Tanya Jawab (FAQ)
            </button>

            <button
              id="tab-shortcuts"
              onClick={() => setActiveTab('shortcuts')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'shortcuts'
                  ? 'bg-emerald-500 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Keyboard className="w-3.5 h-3.5" />
              Pintasan Keyboard
            </button>
          </div>

          {/* Quick Search */}
          {activeTab === 'manual' && (
            <div className="relative sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                id="input-search-manual"
                type="text"
                placeholder="Cari fitur, tombol, atau cara..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8.5 pr-3 py-1.5 rounded-xl text-xs bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-hidden">
          {/* TAB 1: USER MANUAL CHAPTERS */}
          {activeTab === 'manual' && (
            <div className="h-full flex flex-col md:flex-row overflow-hidden">
              {/* Left Column: Chapters / Sections List */}
              <div className="w-full md:w-72 lg:w-80 border-r border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 overflow-y-auto p-3 space-y-1 shrink-0">
                <div className="px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Daftar Bab Panduan
                </div>
                {filteredSections.map((sec) => {
                  const isSelected = sec.id === activeSection?.id;
                  return (
                    <button
                      key={sec.id}
                      onClick={() => setSelectedSectionId(sec.id)}
                      className={`w-full p-2.5 rounded-xl text-left transition-all flex items-start gap-2.5 cursor-pointer ${
                        isSelected
                          ? 'bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-400 border border-emerald-400/40 shadow-xs'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-white/70 dark:hover:bg-slate-800/50 border border-transparent'
                      }`}
                    >
                      <div className="p-1 rounded-lg bg-slate-100 dark:bg-slate-900 shrink-0 mt-0.5">
                        {renderSectionIcon(sec.iconName)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-xs font-bold truncate">{sec.title}</span>
                          {sec.badge && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200/80 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-medium shrink-0">
                              {sec.badge}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                          {sec.topics.length} topik panduan
                        </p>
                      </div>
                      <ChevronRight
                        className={`w-4 h-4 shrink-0 transition-transform mt-1 ${
                          isSelected ? 'text-emerald-500 translate-x-0.5' : 'text-slate-400 opacity-40'
                        }`}
                      />
                    </button>
                  );
                })}
              </div>

              {/* Right Column: Active Chapter Content */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-white dark:bg-slate-900 space-y-6">
                {activeSection ? (
                  <div>
                    {/* Chapter Header */}
                    <div className="pb-4 border-b border-slate-200 dark:border-slate-800">
                      <div className="flex flex-wrap items-center gap-2 mb-1.5">
                        <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          BAB DOKUMENTASI
                        </span>
                        <span className="text-slate-300 dark:text-slate-700">•</span>
                        <div className="flex items-center gap-1">
                          <span className="text-[11px] text-slate-500">Dapat diakses oleh:</span>
                          {activeSection.roles.map((role) => (
                            <span
                              key={role}
                              className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium"
                            >
                              {role}
                            </span>
                          ))}
                        </div>
                      </div>
                      <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                        {activeSection.title}
                      </h3>
                      <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                        {activeSection.description}
                      </p>
                    </div>

                    {/* Topics List */}
                    <div className="mt-6 space-y-6">
                      {activeSection.topics.map((topic, idx) => (
                        <div
                          key={topic.id}
                          className="p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 space-y-4"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center justify-center">
                                  {idx + 1}
                                </span>
                                <h4 className="text-base font-bold text-slate-900 dark:text-white">
                                  {topic.title}
                                </h4>
                              </div>
                              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 pl-7">
                                {topic.summary}
                              </p>
                            </div>

                            {topic.shortcuts && topic.shortcuts.length > 0 && (
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {topic.shortcuts.map((sc) => (
                                  <span
                                    key={sc}
                                    className="px-2 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-[11px] font-mono font-bold text-emerald-700 dark:text-emerald-300 shadow-2xs"
                                  >
                                    {sc}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Step by step */}
                          <div className="space-y-2.5 pl-2">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                              Langkah Operasional:
                            </span>
                            <div className="space-y-2">
                              {topic.steps.map((step, sIdx) => (
                                <div key={sIdx} className="flex items-start gap-3 text-xs text-slate-700 dark:text-slate-300">
                                  <div className="w-5 h-5 rounded-md bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono font-semibold flex items-center justify-center shrink-0 mt-0.5 text-slate-600 dark:text-slate-400 shadow-2xs">
                                    {sIdx + 1}
                                  </div>
                                  <div className="flex-1 leading-relaxed">{step}</div>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Tips & Warnings if any */}
                          {topic.tips && topic.tips.length > 0 && (
                            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 flex items-start gap-2.5 text-xs text-amber-900 dark:text-amber-200">
                              <Lightbulb className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                              <div className="space-y-1">
                                {topic.tips.map((tip, tIdx) => (
                                  <p key={tIdx}>{tip}</p>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12 text-slate-500">
                    Tidak ada hasil bab manual yang cocok dengan "{searchQuery}".
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: CHANGELOG & RELEASE NOTES */}
          {activeTab === 'changelog' && (
            <div className="h-full overflow-y-auto p-4 sm:p-6 bg-white dark:bg-slate-900 space-y-6">
              <div className="max-w-3xl mx-auto space-y-6">
                <div className="p-4 rounded-2xl border border-emerald-200 dark:border-emerald-800/80 bg-emerald-50/50 dark:bg-emerald-950/30 flex items-start gap-3">
                  <Sparkles className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                  <div className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                    <p className="font-bold text-slate-900 dark:text-white">
                      Status Versi Sistem: {APP_VERSION} (Terbaru)
                    </p>
                    <p className="mt-0.5 text-slate-600 dark:text-slate-400">
                      Seluruh fitur baru, pembaruan keamanan, dan peningkatan performa dicatat di sini. Untuk memperbarui aplikasi ke versi terbaru di masa mendatang, Anda dapat menjalankan skrip otomatis <code className="px-1 py-0.5 bg-white dark:bg-slate-800 border rounded font-mono font-bold">npm run app:update</code> atau <code className="px-1 py-0.5 bg-white dark:bg-slate-800 border rounded font-mono font-bold">update.bat</code>.
                    </p>
                  </div>
                </div>

                <div className="space-y-6">
                  {APP_CHANGELOG.map((release, rIdx) => (
                    <div
                      key={release.version}
                      className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-950/40 space-y-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800/80 pb-3">
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-1 rounded-xl bg-emerald-500 text-white font-mono font-bold text-xs shadow-2xs">
                            {release.version}
                          </span>
                          <h4 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                            {release.title}
                          </h4>
                        </div>
                        <span className="text-xs text-slate-500 font-mono">
                          {release.releaseDate}
                        </span>
                      </div>

                      <p className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
                        ⭐ {release.highlight}
                      </p>

                      <div className="space-y-2 pt-1">
                        {release.changes.map((ch, cIdx) => (
                          <div key={cIdx} className="flex items-start gap-2.5 text-xs text-slate-700 dark:text-slate-300">
                            {ch.type === 'new' && (
                              <span className="px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold shrink-0">
                                BARU
                              </span>
                            )}
                            {ch.type === 'improved' && (
                              <span className="px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400 text-[10px] font-bold shrink-0">
                                OPTIMASI
                              </span>
                            )}
                            {ch.type === 'security' && (
                              <span className="px-1.5 py-0.5 rounded bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400 text-[10px] font-bold shrink-0">
                                SECURITY
                              </span>
                            )}
                            {ch.type === 'fix' && (
                              <span className="px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400 text-[10px] font-bold shrink-0">
                                PERBAIKAN
                              </span>
                            )}
                            <span className="leading-relaxed">{ch.text}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: FAQ */}
          {activeTab === 'faq' && (
            <div className="h-full overflow-y-auto p-4 sm:p-6 bg-white dark:bg-slate-900">
              <div className="max-w-3xl mx-auto space-y-4">
                <div className="text-center pb-4">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    Pertanyaan yang Sering Diajukan (FAQ)
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Solusi cepat untuk kendala operasional kasir, printer, dan koneksi
                  </p>
                </div>

                <div className="space-y-3">
                  {USER_FAQS.map((faq, idx) => {
                    const isExpanded = expandedFaqIndex === idx;
                    return (
                      <div
                        key={idx}
                        className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 overflow-hidden"
                      >
                        <button
                          onClick={() => setExpandedFaqIndex(isExpanded ? null : idx)}
                          className="w-full p-4 text-left flex items-center justify-between gap-3 cursor-pointer hover:bg-slate-100/60 dark:hover:bg-slate-800/40 transition-colors"
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold">
                              {faq.category}
                            </span>
                            <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                              {faq.question}
                            </span>
                          </div>
                          <ChevronRight
                            className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${
                              isExpanded ? 'rotate-90' : ''
                            }`}
                          />
                        </button>

                        {isExpanded && (
                          <div className="px-4 pb-4 pt-1 text-xs text-slate-600 dark:text-slate-300 leading-relaxed border-t border-slate-200/60 dark:border-slate-800/60">
                            {faq.answer}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: SHORTCUTS CHEAT SHEET */}
          {activeTab === 'shortcuts' && (
            <div className="h-full overflow-y-auto p-4 sm:p-6 bg-white dark:bg-slate-900">
              <div className="max-w-3xl mx-auto space-y-4">
                <div className="text-center pb-2">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    Pintasan Keyboard Cepat (Kasir Super Cepat)
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Gunakan tombol keyboard untuk memproses transaksi tanpa perlu memegang mouse
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { key: 'Ctrl + F / F2', action: 'Fokus Pencarian Produk & Filter SKU', desc: 'Arahkan kursor langsung ke kolom pencarian produk untuk filter nama atau SKU' },
                    { key: 'F3', action: 'Buka Barcode Scanner Kamera', desc: 'Scan barcode produk menggunakan kamera komputer / HP' },
                    { key: 'F4', action: 'Parkir Pesanan (Hold Order)', desc: 'Simpan keranjang sementara dan layani pembeli berikutnya' },
                    { key: 'F9', action: 'Pusat Backup & Restore Data', desc: 'Buka pusat cadangan data, titik pemulihan, dan ekspor database' },
                    { key: 'F11', action: 'Mode Kiosk Layar Penuh (Fullscreen)', desc: 'Kunci layar kasir penuh untuk fokus pelayanan tanpa gangguan' },
                    { key: 'Alt + L', action: 'Kunci Layar Kasir (Lock PIN)', desc: 'Kunci kasir saat ditinggal istirahat / ganti shift' },
                    { key: 'Alt + D', action: 'Pusat Aplikasi Desktop & Kiosk', desc: 'Menu kontrol aplikasi desktop, cetak senyap, dan laci uang' },
                    { key: 'Alt + G', action: 'Kecerdasan Buatan (Gemini Copilot)', desc: 'Asisten pintar untuk analisis tren dan saran stok toko' },
                    { key: 'Alt + T', action: 'Ganti Tema Gelap / Terang', desc: 'Beralih antara Dark Mode dan Light Mode' },
                    { key: 'Esc', action: 'Tutup Jendela Modal yang Aktif', desc: 'Menutup dialog popup yang sedang terbuka' },
                  ].map((sc) => (
                    <div
                      key={sc.key}
                      className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 flex items-start gap-3"
                    >
                      <kbd className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-mono font-bold text-xs shadow-2xs shrink-0">
                        {sc.key}
                      </kbd>
                      <div>
                        <h5 className="text-xs font-bold text-slate-900 dark:text-white">
                          {sc.action}
                        </h5>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          {sc.desc}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 sm:px-6 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span>Versi Aktif: <strong className="text-slate-700 dark:text-slate-300">{APP_VERSION}</strong></span>
            <span>•</span>
            <span>Pembaruan: {APP_LAST_UPDATED}</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:hover:bg-white dark:text-slate-900 text-xs font-bold cursor-pointer transition-colors shadow-2xs"
          >
            Tutup Panduan (Esc)
          </button>
        </div>
      </div>
    </div>
  );
};

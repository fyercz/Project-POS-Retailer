import React, { useState, useMemo, useEffect } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Sparkles,
  Calendar,
  CalendarDays,
  CalendarRange,
  DollarSign,
  ShoppingBag,
  Zap,
  ArrowUpRight,
  ShieldCheck,
  AlertCircle,
  Clock,
  Layers,
  ChevronRight,
  Database,
  RefreshCw,
  PackageCheck,
  PartyPopper,
  Sliders,
  Plus,
  Trash2,
  X,
  CheckCircle2,
  Info,
  SlidersHorizontal,
} from 'lucide-react';
import { Transaction } from '../types';
import { formatCurrency } from '../utils/formatters';
import {
  computeSalesProjection,
  SalesProjectionSummary,
  CombinedChartPoint,
  DemandCalendarEvent,
  getAllDemandEvents,
  saveCustomDemandEvents,
  DEFAULT_DEMAND_EVENTS,
  formatYMD,
} from '../utils/salesForecaster';
import { activateOnKey } from '../utils/a11y';

interface ProjectedSalesWidgetProps {
  transactions: Transaction[];
  currency?: string;
  className?: string;
}

export const ProjectedSalesWidget: React.FC<ProjectedSalesWidgetProps> = ({
  transactions,
  currency = 'IDR',
  className = '',
}) => {
  const [scenario, setScenario] = useState<'realistic' | 'optimistic' | 'conservative'>('realistic');
  const [selectedDayIndex, setSelectedDayIndex] = useState<number | null>(null);

  // Demand Events States (Hari Raya, Hari Jadi Kota Magetan, Libur Nasional, Payday)
  const [enableEventMultiplier, setEnableEventMultiplier] = useState<boolean>(true);
  const [eventsList, setEventsList] = useState<DemandCalendarEvent[]>(() => getAllDemandEvents());
  const [isEventModalOpen, setIsEventModalOpen] = useState<boolean>(false);
  const [simulatedDate, setSimulatedDate] = useState<Date | null>(null);

  // Custom Event Form State
  const [newEventName, setNewEventName] = useState('');
  const [newEventDatePattern, setNewEventDatePattern] = useState('');
  const [newEventMultiplierPercent, setNewEventMultiplierPercent] = useState('35');
  const [newEventCategory, setNewEventCategory] = useState<'local_event' | 'religious_holiday' | 'national_holiday' | 'store_promo'>('local_event');
  const [newEventDescription, setNewEventDescription] = useState('');
  const [newEventAdvice, setNewEventAdvice] = useState('');
  const [formError, setFormError] = useState('');

  // Save events whenever updated
  const handleSaveEvents = (updated: DemandCalendarEvent[]) => {
    setEventsList(updated);
    saveCustomDemandEvents(updated);
  };

  const handleAddCustomEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEventName.trim()) {
      setFormError('Nama event / perayaan wajib diisi');
      return;
    }
    if (!newEventDatePattern.trim()) {
      setFormError('Format tanggal wajib diisi (contoh: 10-12 atau 2026-10-12)');
      return;
    }
    const pct = parseFloat(newEventMultiplierPercent) || 30;
    const mult = Math.max(1.05, Math.min(2.5, 1 + pct / 100));

    const newEvt: DemandCalendarEvent = {
      id: `evt-custom-${Date.now()}`,
      name: newEventName.trim(),
      datePattern: newEventDatePattern.trim(),
      category: newEventCategory,
      demandMultiplier: Math.round(mult * 100) / 100,
      badge: `🎉 ${newEventName.trim()}`,
      description: newEventDescription.trim() || `Event khusus ${newEventName.trim()} meningkatkan trafik belanja toko ritel.`,
      stockAdvice: newEventAdvice.trim() || `Tingkatkan stok barang fast-moving dan persiapkan uang kembalian kasir ekstra.`,
      isDefault: false,
    };

    handleSaveEvents([...eventsList, newEvt]);
    setNewEventName('');
    setNewEventDatePattern('');
    setNewEventMultiplierPercent('35');
    setNewEventDescription('');
    setNewEventAdvice('');
    setFormError('');
  };

  const handleDeleteCustomEvent = (id: string) => {
    const updated = eventsList.filter((ev) => ev.id !== id);
    handleSaveEvents(updated);
  };

  // Compute projection using time-series model with demand event multipliers
  const projection: SalesProjectionSummary = useMemo(() => {
    return computeSalesProjection(transactions, 7, scenario, {
      customEvents: eventsList,
      enableEventMultiplier,
      referenceDate: simulatedDate || undefined,
    });
  }, [transactions, scenario, eventsList, enableEventMultiplier, simulatedDate]);

  const hasFewHistoricalData = projection.historicalDataPoints.length < 3;

  // Selected day details for inspector
  const activeDayDetail = useMemo(() => {
    if (selectedDayIndex === null) {
      // Default to peak day if none selected
      return projection.projectedDays.find((d) => d.projectedSales === projection.peakDay.sales) || projection.projectedDays[0];
    }
    return projection.projectedDays.find((d) => d.dayIndex === selectedDayIndex) || projection.projectedDays[0];
  }, [selectedDayIndex, projection]);


  return (
    <div
      id="projected-sales-widget"
      data-testid="projected-sales-widget"
      className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden transition-all ${className}`}
    >
      {/* 1. WIDGET HEADER */}
      <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-gradient-to-r from-slate-50 via-white to-indigo-50/30 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950/20">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-emerald-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-indigo-500/20">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white flex items-center gap-1.5 flex-wrap">
                <span>Proyeksi Penjualan 7 Hari Mendatang</span>
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  (Projected Sales for the Next 7 Days)
                </span>
                <span className="text-[11px] px-2 py-0.5 rounded-full font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                  AI Forecasting
                </span>
              </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Prediksi omzet ritel harian dihitung dari data transaksi historis (historical transaction data), musiman hari (Day-of-Week), dan momentum tren toko ritel.
            </p>
          </div>
        </div>

        {/* Controls: Scenario Selector, Event Calendar, & Sample Seeder */}
        <div className="flex items-center gap-2 self-start md:self-auto flex-wrap">
          {/* Demand Events Manager Button */}
          <button
            type="button"
            id="btn-demand-calendar-modal"
            onClick={() => setIsEventModalOpen(true)}
            className="px-2.5 py-1.5 rounded-xl border border-amber-300 dark:border-amber-700/80 bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 dark:hover:bg-amber-900/60 text-amber-900 dark:text-amber-200 font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-sm transition active:scale-95"
            title="Kelola faktor lonjakan demand tanggal tertentu (Hari Jadi Kabupaten Magetan, Hari Raya, Libur Nasional)"
          >
            <PartyPopper className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
            <span>Event Demand &amp; Hari Raya</span>
            {projection.activeEvents.length > 0 && (
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>
            )}
          </button>

          {/* Toggle Event Multiplier */}
          <button
            type="button"
            onClick={() => setEnableEventMultiplier(!enableEventMultiplier)}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold border flex items-center gap-1.5 transition cursor-pointer ${
              enableEventMultiplier
                ? 'bg-amber-500/10 border-amber-500/40 text-amber-800 dark:text-amber-300'
                : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500'
            }`}
            title="Aktifkan atau nonaktifkan efek lonjakan demand event khusus"
          >
            <SlidersHorizontal className="w-3 h-3 text-amber-700 dark:text-amber-400" />
            <span>Demand Event: {enableEventMultiplier ? 'Aktif' : 'Nonaktif'}</span>
          </button>


          {/* Scenario Tabs */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
            <button aria-pressed={scenario === 'conservative'}
              type="button"
              onClick={() => setScenario('conservative')}
              className={`px-2.5 py-1 rounded-xl font-semibold transition cursor-pointer ${
                scenario === 'conservative'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm font-bold'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
              }`}
              title="Skenario Konservatif: Perhitungan batas bawah estimasi (-15%)"
            >
              Konservatif
            </button>
            <button aria-pressed={scenario === 'realistic'}
              type="button"
              onClick={() => setScenario('realistic')}
              className={`px-2.5 py-1 rounded-xl font-semibold transition cursor-pointer ${
                scenario === 'realistic'
                  ? 'bg-indigo-600 text-white shadow-sm font-bold'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
              }`}
              title="Skenario Realistis: Target penjualan standar berbasis regresi waktu"
            >
              Realistis
            </button>
            <button aria-pressed={scenario === 'optimistic'}
              type="button"
              onClick={() => setScenario('optimistic')}
              className={`px-2.5 py-1 rounded-xl font-semibold transition cursor-pointer ${
                scenario === 'optimistic'
                  ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-sm font-bold'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
              }`}
              title="Skenario Optimis: Perhitungan batas atas estimasi lonjakan (+15%)"
            >
              Optimis
            </button>
          </div>
        </div>
      </div>

      {/* Special Demand Event Detection Banner */}
      {projection.hasEventBoost && (
        <div className="px-4 sm:px-5 py-2.5 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-amber-500/10 border-b border-amber-200 dark:border-amber-900/60 flex items-center justify-between gap-3 text-xs flex-wrap">
          <div className="flex items-center gap-2">
            <PartyPopper className="w-4 h-4 text-amber-700 dark:text-amber-400 shrink-0" />
            <span className="font-bold text-amber-900 dark:text-amber-200">
              Peringatan Lonjakan Demand Terdeteksi:
            </span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {projection.activeEvents.map((evt) => (
                <span
                  key={evt.id}
                  className="px-2 py-0.5 rounded-xl bg-amber-200/80 dark:bg-amber-900/70 text-amber-900 dark:text-amber-100 font-bold font-mono text-[11px] border border-amber-300 dark:border-amber-700 flex items-center gap-1"
                >
                  <span>{evt.badge}</span>
                  <span className="text-amber-700 dark:text-amber-300 font-normal">
                    (+{Math.round((evt.demandMultiplier - 1) * 100)}% Demand)
                  </span>
                </span>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {simulatedDate && (
              <button
                type="button"
                onClick={() => setSimulatedDate(null)}
                className="text-[11px] font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 underline cursor-pointer"
              >
                Reset Simulasi Tanggal
              </button>
            )}
            <button
              type="button"
              onClick={() => setIsEventModalOpen(true)}
              className="text-[11px] font-bold text-amber-800 dark:text-amber-300 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>Atur / Tambah Event</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Simulated Date Bar if active */}
      {simulatedDate && !projection.hasEventBoost && (
        <div className="px-4 sm:px-5 py-2 bg-blue-50 dark:bg-blue-950/40 border-b border-blue-200 dark:border-blue-900 flex items-center justify-between text-xs">
          <span className="text-blue-800 dark:text-blue-300">
            🔎 Sedang mensimulasikan tanggal awal proyeksi: <strong>{formatYMD(simulatedDate)}</strong>
          </span>
          <button
            type="button"
            onClick={() => setSimulatedDate(null)}
            className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
          >
            Kembali ke Hari Ini
          </button>
        </div>
      )}

      {/* 2. TOP 4 HIGHLIGHT METRIC CARDS */}
      <div className="p-4 sm:p-5 grid grid-cols-2 lg:grid-cols-4 gap-3 bg-white dark:bg-slate-900">
        {/* Card 1: Total Proyeksi 7 Hari */}
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Total Proyeksi 7 Hari
            </span>
            <span className="p-1 rounded-xl bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400">
              <Calendar className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="text-lg sm:text-xl font-black font-mono text-indigo-700 dark:text-indigo-300 mt-1">
            {formatCurrency(projection.totalProjected7Days, currency)}
          </div>
          <div className="flex items-center gap-1.5 text-[11px] mt-1 font-mono">
            {projection.trendPercentage >= 0 ? (
              <span className="text-emerald-700 dark:text-emerald-400 font-bold flex items-center">
                <TrendingUp className="w-3 h-3 mr-0.5" />
                +{projection.trendPercentage}%
              </span>
            ) : (
              <span className="text-rose-600 dark:text-rose-400 font-bold flex items-center">
                <TrendingDown className="w-3 h-3 mr-0.5" />
                {projection.trendPercentage}%
              </span>
            )}
            <span className="text-slate-500">vs 7 hari lalu</span>
          </div>
        </div>

        {/* Card 2: Rata-Rata Omzet Harian */}
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Rata-Rata Per Hari
            </span>
            <span className="p-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400">
              <DollarSign className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="text-lg sm:text-xl font-black font-mono text-emerald-700 dark:text-emerald-300 mt-1">
            {formatCurrency(projection.avgDailyProjected, currency)}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-mono">
            <span>~{Math.round(projection.projectedTotalTxCount / 7)} transaksi / hari</span>
          </div>
        </div>

        {/* Card 3: Hari Puncak Penjualan (Peak Day) */}
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Hari Puncak (Peak Day)
            </span>
            <span className="px-1.5 py-0.2 rounded-md text-[11px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
              🔥 Teramai
            </span>
          </div>
          <div className="text-base sm:text-lg font-bold text-slate-900 dark:text-white mt-1 truncate">
            {projection.peakDay.dayName || 'Sabtu'}
          </div>
          <div className="text-[11px] font-mono font-bold text-amber-700 dark:text-amber-400">
            {formatCurrency(projection.peakDay.sales, currency)}
          </div>
        </div>

        {/* Card 4: Estimasi Total Transaksi (Struk) */}
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Estimasi Volume Struk
            </span>
            <span className="p-1 rounded-xl bg-blue-50 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400">
              <ShoppingBag className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="text-lg sm:text-xl font-black font-mono text-blue-700 dark:text-blue-300 mt-1">
            ~{projection.projectedTotalTxCount} Struk
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-mono">
            <span>AOV: {formatCurrency(projection.projectedAvgTicket, currency)}/struk</span>
          </div>
        </div>
      </div>

      {/* 3. VISUAL TIME-SERIES PROJECTION CHART */}
      <div className="px-4 sm:px-5 pb-4 bg-white dark:bg-slate-900">
        <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2 text-xs">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">Riwayat Transaksi Aktual</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-indigo-500"></span>
                <span className="font-semibold text-indigo-700 dark:text-indigo-300">
                  Proyeksi 7 Hari ({scenario === 'optimistic' ? 'Optimis' : scenario === 'conservative' ? 'Konservatif' : 'Realistis'})
                </span>
              </div>
              <div className="hidden sm:flex items-center gap-1.5 text-slate-500">
                <span className="w-4 h-1 border-t-2 border-dashed border-indigo-300 dark:border-indigo-700"></span>
                <span className="text-[11px]">Rentang Toleransi</span>
              </div>
            </div>

            <span className="text-[11px] text-slate-500 font-mono">
              {projection.chartData.length} Titik Data Analisis
            </span>
          </div>

          {/* Chart Container */}
          <div className="w-full h-64 sm:h-72">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={projection.chartData}
                margin={{ top: 12, right: 12, left: 10, bottom: 4 }}
              >
                <defs>
                  {/* Historical Gradient */}
                  <linearGradient id="colorActualSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>

                  {/* Projected Gradient */}
                  <linearGradient id="colorProjectedSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.45} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                  </linearGradient>

                  {/* Confidence Interval Gradient */}
                  <linearGradient id="colorConfidence" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#818cf8" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="#818cf8" stopOpacity={0.05} />
                  </linearGradient>
                </defs>

                <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" opacity={0.2} />

                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 10, fill: '#64748b' }}
                  tickLine={false}
                  dy={4}
                />

                <YAxis
                  tick={{ fontSize: 10, fill: '#64748b' }}
                  tickLine={false}
                  tickFormatter={(val) => {
                    if (val >= 1000000) return `${(val / 1000000).toFixed(1)}jt`;
                    if (val >= 1000) return `${Math.round(val / 1000)}rb`;
                    return String(val);
                  }}
                />

                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload || !payload.length) return null;
                    const data = payload[0].payload as CombinedChartPoint;
                    const isProj = data.isProjected;

                    return (
                      <div className="bg-slate-900 border border-slate-700/80 rounded-xl p-3 shadow-xl text-xs text-white max-w-xs space-y-1.5 pointer-events-none">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 gap-2">
                          <span className="font-bold text-slate-200">
                            {data.dayName}, {data.label}
                          </span>
                          <span
                            className={`px-1.5 py-0.2 rounded-md text-[11px] font-bold ${
                              isProj
                                ? 'bg-indigo-900/80 text-indigo-300 border border-indigo-700/60'
                                : 'bg-emerald-900/80 text-emerald-300 border border-emerald-700/60'
                            }`}
                          >
                            {isProj ? 'Prediksi 7 Hari' : 'Data Riwayat'}
                          </span>
                        </div>

                        {isProj ? (
                          <>
                            <div className="flex justify-between items-center">
                              <span className="text-slate-500">Proyeksi Penjualan:</span>
                              <span className="font-mono font-bold text-indigo-300">
                                {formatCurrency(data.projectedSales || 0, currency)}
                              </span>
                            </div>
                            <div className="flex justify-between items-center text-[11px] text-slate-500">
                              <span>Rentang Skenario:</span>
                              <span className="font-mono">
                                {formatCurrency(data.conservativeSales || 0, currency)} – {formatCurrency(data.optimisticSales || 0, currency)}
                              </span>
                            </div>
                            <div className="flex justify-between items-center text-[11px] text-slate-500 pt-1 border-t border-slate-800/80">
                              <span>Estimasi Struk:</span>
                              <span className="font-mono font-semibold text-slate-300">
                                ~{data.txCount || 0} transaksi
                              </span>
                            </div>

                            {data.specialEvent && (
                              <div className="p-2 rounded-xl bg-amber-950/80 border border-amber-600/70 text-amber-200 text-xs mt-1 space-y-0.5">
                                <div className="font-bold flex items-center justify-between gap-1">
                                  <span>{data.specialEvent.badge}</span>
                                  <span className="text-[11px] px-1.5 py-0.2 rounded-md bg-amber-500/25 text-amber-300 font-mono font-bold">
                                    +{Math.round((data.specialEvent.demandMultiplier - 1) * 100)}% Demand
                                  </span>
                                </div>
                                <p className="text-[11px] text-amber-300/90 leading-tight">
                                  {data.specialEvent.description}
                                </p>
                              </div>
                            )}
                          </>
                        ) : (
                          <>
                            <div className="flex justify-between items-center">
                              <span className="text-slate-500">Omzet Aktual:</span>
                              <span className="font-mono font-bold text-emerald-400">
                                {formatCurrency(data.actualSales || 0, currency)}
                              </span>
                            </div>
                            <div className="flex justify-between items-center text-[11px] text-slate-500">
                              <span>Jumlah Struk:</span>
                              <span className="font-mono text-slate-300">
                                {data.txCount || 0} transaksi
                              </span>
                            </div>
                          </>
                        )}
                      </div>
                    );
                  }}
                />

                {/* Optimistic / Confidence upper bound */}
                <Area
                  type="monotone"
                  dataKey="optimisticSales"
                  stroke="#818cf8"
                  strokeWidth={1}
                  strokeDasharray="4 4"
                  fill="url(#colorConfidence)"
                  fillOpacity={0.6}
                  name="Rentang Optimis"
                />

                {/* Historical Area */}
                <Area
                  type="monotone"
                  dataKey="actualSales"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  fill="url(#colorActualSales)"
                  name="Omzet Aktual"
                />

                {/* Projected Line */}
                <Line
                  type="monotone"
                  dataKey="projectedSales"
                  stroke="#6366f1"
                  strokeWidth={3}
                  strokeDasharray="5 5"
                  dot={{ r: 4, fill: '#6366f1', stroke: '#ffffff', strokeWidth: 2 }}
                  activeDot={{ r: 6, fill: '#4f46e5', stroke: '#ffffff', strokeWidth: 2 }}
                  name="Proyeksi Penjualan"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* 4. DAY-BY-DAY 7-DAY FORECAST GRID */}
      <div className="px-4 sm:px-5 pb-5 bg-white dark:bg-slate-900">
        <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
          <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
            <CalendarDays className="w-4 h-4 text-indigo-500" />
            <span>Rincian Proyeksi Harian (D+1 Sampai D+7)</span>
          </span>
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            Klik kartu hari untuk melihat rekomendasi aksi toko &amp; event
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
          {projection.projectedDays.map((day) => {
            const isSelected = activeDayDetail?.dayIndex === day.dayIndex;
            const isPeak = day.peakStatus === 'peak';
            const isHigh = day.peakStatus === 'high';
            const isLow = day.peakStatus === 'low';
            const hasEvent = !!day.specialEvent;

            return (
              <div role="button" tabIndex={0} onKeyDown={activateOnKey}
                key={day.dayIndex}
                onClick={() => setSelectedDayIndex(day.dayIndex)}
                className={`p-3 rounded-xl border transition-all cursor-pointer select-none flex flex-col justify-between ${
                  isSelected
                    ? hasEvent
                      ? 'bg-amber-50/95 dark:bg-amber-950/70 border-amber-500 shadow-sm ring-2 ring-amber-500/30'
                      : 'bg-indigo-50/90 dark:bg-indigo-950/70 border-indigo-500 shadow-sm ring-2 ring-indigo-500/20'
                    : hasEvent
                    ? 'bg-gradient-to-b from-amber-50/70 to-white dark:from-amber-950/30 dark:to-slate-900 border-amber-300 dark:border-amber-800/80 hover:border-amber-400'
                    : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-bold text-xs text-slate-900 dark:text-white truncate">
                      {day.dayName}
                    </span>
                    <span
                      className={`text-[11px] px-1.5 py-0.2 rounded-md font-bold shrink-0 ${
                        hasEvent
                          ? 'bg-amber-200 text-amber-900 dark:bg-amber-900 dark:text-amber-200 font-mono'
                          : isPeak
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                          : isHigh
                          ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300'
                          : isLow
                          ? 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                          : 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                      }`}
                    >
                      {hasEvent ? '🎉 Event' : isPeak ? '🔥 Puncak' : isHigh ? '⚡ Ramai' : isLow ? 'Tenang' : 'Normal'}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono block">
                    {day.label}
                  </span>

                  {day.specialEvent && (
                    <div className="mt-1 px-1.5 py-0.5 rounded-md text-[11px] font-bold bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700/60 truncate flex items-center justify-between gap-0.5">
                      <span className="truncate">{day.specialEvent.badge}</span>
                      <span className="shrink-0 font-mono">+{Math.round((day.specialEvent.demandMultiplier - 1) * 100)}%</span>
                    </div>
                  )}
                </div>

                <div className="pt-2">
                  <div className="text-xs sm:text-sm font-black font-mono text-slate-900 dark:text-white">
                    {formatCurrency(day.projectedSales, currency)}
                  </div>
                  <div className="flex items-center justify-between text-[11px] font-mono mt-0.5">
                    <span className="text-slate-500 dark:text-slate-400">~{day.projectedTxCount} struk</span>
                    <span
                      className={`font-bold ${
                        day.growthVsAvg >= 0
                          ? 'text-emerald-700 dark:text-emerald-400'
                          : 'text-slate-500'
                      }`}
                    >
                      {day.growthVsAvg >= 0 ? `+${day.growthVsAvg}%` : `${day.growthVsAvg}%`}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* 5. ACTIVE DAY ACTIONABLE INSIGHT BAR */}
        {activeDayDetail && (
          <div
            className={`mt-3 p-3.5 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs animate-in fade-in ${
              activeDayDetail.specialEvent
                ? 'bg-amber-50/90 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700/80 shadow-sm'
                : 'bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800'
            }`}
          >
            <div className="flex items-start sm:items-center gap-2.5">
              <div
                className={`p-1.5 rounded-xl text-white shrink-0 ${
                  activeDayDetail.specialEvent ? 'bg-amber-600' : 'bg-indigo-600'
                }`}
              >
                {activeDayDetail.specialEvent ? <PartyPopper className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={`font-bold ${
                      activeDayDetail.specialEvent
                        ? 'text-amber-950 dark:text-amber-200'
                        : 'text-indigo-900 dark:text-indigo-200'
                    }`}
                  >
                    {activeDayDetail.specialEvent
                      ? `Hari Khusus / Event: ${activeDayDetail.specialEvent.name} (${activeDayDetail.dayName}, ${activeDayDetail.label})`
                      : `Rekomendasi Operasional Toko (${activeDayDetail.dayName}, ${activeDayDetail.label}):`}
                  </span>
                  {activeDayDetail.specialEvent && (
                    <span className="text-[11px] px-2 py-0.5 rounded-full font-bold bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-100 font-mono">
                      Faktor Demand +{Math.round((activeDayDetail.specialEvent.demandMultiplier - 1) * 100)}%
                    </span>
                  )}
                </div>
                <p className="text-slate-600 dark:text-slate-300 mt-0.5">
                  {activeDayDetail.actionAdvice}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto font-mono text-xs">
              <span className="text-slate-500 dark:text-slate-400">Target Omzet:</span>
              <span
                className={`font-bold ${
                  activeDayDetail.specialEvent
                    ? 'text-amber-700 dark:text-amber-300'
                    : 'text-indigo-700 dark:text-indigo-300'
                }`}
              >
                {formatCurrency(activeDayDetail.projectedSales, currency)}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* 6. STRATEGIC BUSINESS ACTION POINTS */}
      <div className="p-4 sm:p-5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60 text-xs">
        <h4 className="font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-2 flex items-center gap-1.5 text-[11px]">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span>Langkah Taktis Berdasarkan Proyeksi Penjualan 7 Hari</span>
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
            <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1 text-[11px]">
              <PackageCheck className="w-3.5 h-3.5 text-blue-500" />
              <span>Persiapan Pasokan PO Supplier</span>
            </span>
            <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed">
              {projection.hasEventBoost
                ? `Jelang perayaan ${projection.activeEvents.map((e) => e.name).join(', ')}, buat PO supplier minimal 2-3 hari sebelumnya untuk pasokan minuman dingin, air mineral, dan snack.`
                : `Jadwalkan order faktur pembelian (PO) 2 hari sebelum hari puncak (${projection.peakDay.dayName}) agar barang terlaris tidak habis di rak saat akhir pekan.`}
            </p>
          </div>

          <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
            <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1 text-[11px]">
              <Clock className="w-3.5 h-3.5 text-amber-500" />
              <span>Jadwal Kasir &amp; Uang Pecahan Kas</span>
            </span>
            <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed">
              Siapkan uang kembalian kasir ekstra pada hari puncak ({formatCurrency(projection.peakDay.sales, currency)}) dan pastikan laci kasir mencukupi pecahan kecil.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
            <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1 text-[11px]">
              <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
              <span>Promo Peningkatan Hari Tenang</span>
            </span>
            <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed">
              Manfaatkan hari berpenjualan rendah ({projection.lowestDay.dayName}) untuk diskon member, voucher poin ganda, dan penataan ulang rak minimarket.
            </p>
          </div>
        </div>
      </div>

      {/* 7. DEMAND EVENTS & SPECIAL CALENDAR MODAL */}
      {isEventModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                  <PartyPopper className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                    Kalender Demand Khusus &amp; Hari Raya
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Faktor penyesuaian demand penjualan untuk Hari Jadi Kota Magetan, Hari Raya, dan libur nasional.
                  </p>
                </div>
              </div>
              <button aria-label="Tutup"
                type="button"
                onClick={() => setIsEventModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-5 overflow-y-auto space-y-5 text-xs">
              {/* Quick Simulation Presets */}
              <div className="p-3.5 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-indigo-950 dark:text-indigo-200 flex items-center gap-1.5">
                    <Zap className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <span>Uji Coba Cepat Simulasi Tanggal Event</span>
                  </span>
                  {simulatedDate && (
                    <span className="text-[11px] font-mono text-indigo-600 dark:text-indigo-300 font-bold">
                      Aktif: {formatYMD(simulatedDate)}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setSimulatedDate(null)}
                    className={`px-2.5 py-1.5 rounded-xl font-semibold transition cursor-pointer ${
                      simulatedDate === null
                        ? 'bg-indigo-600 text-white shadow-sm font-bold'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    📅 Hari Ini (11 Okt - Termasuk Hari Jadi Magetan 12 Okt)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSimulatedDate(new Date(2026, 2, 19))}
                    className={`px-2.5 py-1.5 rounded-xl font-semibold transition cursor-pointer ${
                      simulatedDate && formatYMD(simulatedDate) === '2026-03-19'
                        ? 'bg-indigo-600 text-white shadow-sm font-bold'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    🌙 Hari Raya Idul Fitri (Lebaran 2026)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSimulatedDate(new Date(2026, 11, 29))}
                    className={`px-2.5 py-1.5 rounded-xl font-semibold transition cursor-pointer ${
                      simulatedDate && formatYMD(simulatedDate) === '2026-12-29'
                        ? 'bg-indigo-600 text-white shadow-sm font-bold'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    🎆 Malam Tahun Baru (31 Des)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSimulatedDate(new Date(2026, 9, 24))}
                    className={`px-2.5 py-1.5 rounded-xl font-semibold transition cursor-pointer ${
                      simulatedDate && formatYMD(simulatedDate) === '2026-10-24'
                        ? 'bg-indigo-600 text-white shadow-sm font-bold'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    💰 Periode Gajian (Payday tgl 25)
                  </button>
                </div>
              </div>

              {/* List of Active Demand Events */}
              <div>
                <h4 className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px] mb-2 flex items-center justify-between">
                  <span>Daftar Event Demand &amp; Hari Besar ({eventsList.length})</span>
                  <span className="text-slate-500 text-[11px] lowercase font-normal">
                    pola MM-DD berlaku tahunan
                  </span>
                </h4>

                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {eventsList.map((evt) => (
                    <div
                      key={evt.id}
                      className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 flex items-start justify-between gap-2"
                    >
                      <div className="space-y-0.5 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-slate-900 dark:text-white">
                            {evt.name}
                          </span>
                          <span className="px-1.5 py-0.2 rounded-md font-mono text-[11px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                            +{Math.round((evt.demandMultiplier - 1) * 100)}% Surge
                          </span>
                          <span className="text-[11px] text-slate-500 font-mono">
                            {evt.datePattern === 'payday' ? 'tgl 25 - 5' : `Pola: ${evt.datePattern}`}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                          {evt.description}
                        </p>
                        <p className="text-[11px] text-emerald-700 dark:text-emerald-400 italic">
                          💡 {evt.stockAdvice}
                        </p>
                      </div>

                      {!evt.isDefault && (
                        <button aria-label="Hapus event kustom"
                          type="button"
                          onClick={() => handleDeleteCustomEvent(evt.id)}
                          className="p-1.5 rounded-md text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition shrink-0 cursor-pointer"
                          title="Hapus event kustom"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Form to Add New Custom Event */}
              <form
                onSubmit={handleAddCustomEvent}
                className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 space-y-3"
              >
                <h4 className="font-bold text-slate-900 dark:text-white text-xs flex items-center gap-1.5">
                  <Plus className="w-4 h-4 text-indigo-600" />
                  <span>Tambah Event Demand / Hari Peringatan Khusus</span>
                </h4>

                {formError && (
                  <div role="alert" className="p-2 rounded-xl bg-rose-50 text-rose-700 text-xs font-semibold">
                    {formError}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                      Nama Event / Perayaan
                    </label>
                    <input aria-label="Nama Event / Perayaan"
                      type="text"
                      value={newEventName}
                      onChange={(e) => setNewEventName(e.target.value)}
                      placeholder="Contoh: Festival Telaga Sarangan Magetan"
                      className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-500 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                      Pola Tanggal (MM-DD atau YYYY-MM-DD)
                    </label>
                    <input aria-label="Pola Tanggal (MM-DD atau YYYY-MM-DD)"
                      type="text"
                      value={newEventDatePattern}
                      onChange={(e) => setNewEventDatePattern(e.target.value)}
                      placeholder="Contoh: 10-12 atau 2026-10-12"
                      className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-500 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                      Estimasi Lonjakan Demand (%)
                    </label>
                    <div className="flex items-center gap-2">
                      <input aria-label="Estimasi Lonjakan Demand (%)"
                        type="number"
                        min="5"
                        max="200"
                        value={newEventMultiplierPercent}
                        onChange={(e) => setNewEventMultiplierPercent(e.target.value)}
                        className="w-24 px-2.5 py-1.5 text-xs rounded-xl border border-slate-500 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono"
                      />
                      <span className="text-[11px] text-slate-500">
                        = x{(1 + (parseFloat(newEventMultiplierPercent) || 0) / 100).toFixed(2)} omzet
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                      Kategori Event
                    </label>
                    <select aria-label="Kategori Event"
                      value={newEventCategory}
                      onChange={(e) => setNewEventCategory(e.target.value as any)}
                      className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-500 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                    >
                      <option value="local_event">Event Daerah / Kota (Magetan)</option>
                      <option value="religious_holiday">Hari Raya Keagamaan</option>
                      <option value="national_holiday">Libur Nasional</option>
                      <option value="store_promo">Promo Akbar Toko</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    Deskripsi Singkat / Latar Belakang Keramaian
                  </label>
                  <input aria-label="Deskripsi Singkat / Latar Belakang Keramaian"
                    type="text"
                    value={newEventDescription}
                    onChange={(e) => setNewEventDescription(e.target.value)}
                    placeholder="Contoh: Pawai budaya dan pasar rakyat memicu lonjakan konsumsi warga"
                    className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-500 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    Instruksi Persiapan Stok / Logistik Kasir
                  </label>
                  <input aria-label="Instruksi Persiapan Stok / Logistik Kasir"
                    type="text"
                    value={newEventAdvice}
                    onChange={(e) => setNewEventAdvice(e.target.value)}
                    placeholder="Contoh: Tambah stok minuman dingin & siapkan uang kembalian pecahan kecil"
                    className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-500 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                  />
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-sm transition active:scale-95"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Simpan Event ke Kalender</span>
                  </button>
                </div>
              </form>
            </div>

            {/* Modal Footer */}
            <div className="p-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex justify-end">
              <button
                type="button"
                onClick={() => setIsEventModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs transition cursor-pointer"
              >
                Tutup Kalender
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

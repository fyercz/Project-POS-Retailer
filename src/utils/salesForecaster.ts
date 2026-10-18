import { Transaction } from '../types';
import { formatCurrency } from './formatters';

export interface DailyHistoricalData {
  date: string; // YYYY-MM-DD
  label: string; // "10 Okt"
  dayName: string; // "Sabtu"
  actualSales: number;
  txCount: number;
  isProjected: false;
}

export interface DemandCalendarEvent {
  id: string;
  name: string;
  datePattern: string; // 'MM-DD' (annual recurring), 'YYYY-MM-DD' (specific date), or 'payday'
  category: 'local_event' | 'religious_holiday' | 'national_holiday' | 'payday' | 'store_promo';
  demandMultiplier: number; // e.g. 1.45 = +45% surge
  badge: string; // e.g. '🎉 Hari Jadi Magetan'
  description: string;
  stockAdvice: string;
  isDefault?: boolean;
}

export interface DailyProjectedData {
  date: string; // YYYY-MM-DD
  label: string; // "12 Okt"
  dayName: string; // "Senin"
  dayIndex: number; // 1 to 7
  projectedSales: number;
  projectedSalesOptimistic: number;
  projectedSalesConservative: number;
  projectedTxCount: number;
  growthVsAvg: number; // e.g. +14.5 (%)
  peakStatus: 'peak' | 'high' | 'regular' | 'low';
  actionAdvice: string;
  isProjected: true;
  specialEvent?: DemandCalendarEvent;
  eventMultiplier?: number;
}

export interface CombinedChartPoint {
  date: string;
  label: string;
  dayName: string;
  actualSales?: number;
  projectedSales?: number;
  optimisticSales?: number;
  conservativeSales?: number;
  txCount?: number;
  isProjected: boolean;
  specialEvent?: DemandCalendarEvent;
}

export interface SalesProjectionSummary {
  totalProjected7Days: number;
  avgDailyProjected: number;
  peakDay: { date: string; dayName: string; sales: number };
  lowestDay: { date: string; dayName: string; sales: number };
  historical7DaysTotal: number;
  trendPercentage: number; // vs previous 7 days
  projectedTotalTxCount: number;
  projectedAvgTicket: number;
  scenario: 'realistic' | 'optimistic' | 'conservative';
  historicalDataPoints: DailyHistoricalData[];
  projectedDays: DailyProjectedData[];
  chartData: CombinedChartPoint[];
  dataSource: 'actual_transactions' | 'hybrid_projected' | 'starter_baseline';
  activeEvents: DemandCalendarEvent[];
  hasEventBoost: boolean;
  enableEventMultiplier: boolean;
}

// Default Catalog of Special Retail Demand Events (Hari Jadi Magetan, Hari Raya, Libur Nasional, Payday)
export const DEFAULT_DEMAND_EVENTS: DemandCalendarEvent[] = [
  {
    id: 'evt-magetan-anniversary',
    name: 'Hari Jadi Kabupaten Magetan (HUT Magetan ke-351)',
    datePattern: '10-12', // 12 Oktober setiap tahun
    category: 'local_event',
    demandMultiplier: 1.45, // +45%
    badge: '🎉 Hari Jadi Magetan',
    description: 'Peringatan Hari Jadi Kabupaten Magetan (12 Oktober). Pawai budaya, pameran daerah, dan keramaian masyarakat di pusat kota & alun-alun memicu lonjakan belanja ritel.',
    stockAdvice: 'Tingkatkan stok minuman dingin botol/cup, air mineral, camilan ringan, rokok, dan siapkan uang kembalian pecahan Rp 2.000 - Rp 20.000 ekstra di laci kasir.',
    isDefault: true,
  },
  {
    id: 'evt-lebaran-h1',
    name: 'Hari Raya Idul Fitri (H-1 Lebaran)',
    datePattern: '03-20',
    category: 'religious_holiday',
    demandMultiplier: 1.90, // +90%
    badge: '🌙 H-1 Lebaran Idul Fitri',
    description: 'Puncak belanja sembako dan logistik silaturahmi keluarga menyambut Hari Raya Idul Fitri.',
    stockAdvice: 'Maksimalkan pasokan beras, minyak goreng, gula pasir, biskuit kaleng, sirup, dan minuman manis bersoda.',
    isDefault: true,
  },
  {
    id: 'evt-lebaran-h0',
    name: 'Hari Raya Idul Fitri (Hari H Lebaran)',
    datePattern: '03-21',
    category: 'religious_holiday',
    demandMultiplier: 1.75, // +75%
    badge: '🌙 Hari Raya Idul Fitri',
    description: 'Silaturahmi lebaran akbar. Peningkatan pembelian camilan siap santap, minuman segar dingin, dan es batu.',
    stockAdvice: 'Pastikan ketersediaan minuman dingin kulkas, toples makanan ringan, tisu, dan baterai cadangan EDC.',
    isDefault: true,
  },
  {
    id: 'evt-idul-adha',
    name: 'Hari Raya Idul Adha (Hari Kurban)',
    datePattern: '05-27',
    category: 'religious_holiday',
    demandMultiplier: 1.40, // +40%
    badge: '🐄 Hari Raya Idul Adha',
    description: 'Hari Raya Kurban. Lonjakan pembelian bumbu masak, kecap, arang sate, tusuk sate, dan kantong plastik.',
    stockAdvice: 'Pajang tusuk sate, kecap manis, bumbu instan, arang briket, serta kantong plastik transparan higienis di rak depan kasir.',
    isDefault: true,
  },
  {
    id: 'evt-new-year-eve',
    name: 'Malam Tahun Baru',
    datePattern: '12-31',
    category: 'national_holiday',
    demandMultiplier: 1.55, // +55%
    badge: '🎆 Malam Tahun Baru',
    description: 'Perayaan malam pergantian tahun. Pesta barbeque keluarga, kumpul bersama warga, dan konsumsi malam hari.',
    stockAdvice: 'Siapkan arang panggangan, sosis bakar, saus sambal/tomat, mentega, minuman bersoda, dan camilan begadang.',
    isDefault: true,
  },
  {
    id: 'evt-new-year-day',
    name: 'Tahun Baru Masehi',
    datePattern: '01-01',
    category: 'national_holiday',
    demandMultiplier: 1.35, // +35%
    badge: '✨ Libur Tahun Baru',
    description: 'Liburan tahun baru dan piknik keluarga ke objek wisata daerah (Telaga Sarangan dsb).',
    stockAdvice: 'Tingkatkan stok air mineral kardusan, snack anak, dan roti segar.',
    isDefault: true,
  },
  {
    id: 'evt-kemerdekaan',
    name: 'HUT Kemerdekaan RI (17 Agustus)',
    datePattern: '08-17',
    category: 'national_holiday',
    demandMultiplier: 1.35, // +35%
    badge: '🇮🇩 HUT Kemerdekaan RI',
    description: 'Peringatan 17 Agustus: lomba tingkat RT/RW dan malam tirakatan syukuran warga.',
    stockAdvice: 'Sediakan paket snack hadiah lomba, air mineral cup kardusan, dan kopi rencengan.',
    isDefault: true,
  },
  {
    id: 'evt-natal',
    name: 'Hari Raya Natal',
    datePattern: '12-25',
    category: 'religious_holiday',
    demandMultiplier: 1.35, // +35%
    badge: '🎄 Hari Raya Natal',
    description: 'Libur Hari Raya Natal dan kumpul keluarga.',
    stockAdvice: 'Sediakan bingkisan kue kering, cokelat, minuman sirup, dan paket gift parcel.',
    isDefault: true,
  },
  {
    id: 'evt-payday',
    name: 'Periode Gajian Rutin (Payday ASN / Karyawan)',
    datePattern: 'payday',
    category: 'payday',
    demandMultiplier: 1.20, // +20%
    badge: '💰 Payday / Gajian',
    description: 'Waktu gajian bulanan pegawai & karyawan (tgl 25 - 5). Peningkatan signifikan belanja sembako dan kebutuhan rumah tangga bulanan.',
    stockAdvice: 'Penuhkan stok sembako (beras premium, minyak goreng, gula, deterjen, sabun, popok) di rak utama.',
    isDefault: true,
  },
];

/**
 * Get all demand calendar events (default + custom events from localStorage)
 */
export function getAllDemandEvents(): DemandCalendarEvent[] {
  try {
    const raw = localStorage.getItem('pos_custom_demand_events');
    if (raw) {
      const customList = JSON.parse(raw);
      if (Array.isArray(customList)) {
        // Merge with default list, custom overrides or adds
        const customIds = new Set(customList.map((c: DemandCalendarEvent) => c.id));
        const filteredDefaults = DEFAULT_DEMAND_EVENTS.filter((d) => !customIds.has(d.id));
        return [...filteredDefaults, ...customList];
      }
    }
  } catch (err) {
    console.warn('Failed to load custom demand events from localStorage:', err);
  }
  return DEFAULT_DEMAND_EVENTS;
}

/**
 * Save custom demand events to localStorage
 */
export function saveCustomDemandEvents(events: DemandCalendarEvent[]): void {
  try {
    const onlyCustom = events.filter((e) => !e.isDefault);
    localStorage.setItem('pos_custom_demand_events', JSON.stringify(onlyCustom));
  } catch (err) {
    console.warn('Failed to save custom demand events to localStorage:', err);
  }
}

/**
 * Find matching special demand event for a given Date
 */
export function findDemandEventForDate(date: Date, events: DemandCalendarEvent[]): DemandCalendarEvent | null {
  const ymd = formatYMD(date);
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const mmdd = `${mm}-${dd}`;
  const dayOfMonth = date.getDate();

  // 1. Check exact YYYY-MM-DD match first (specific date override)
  const exactMatch = events.find((e) => e.datePattern === ymd);
  if (exactMatch) return exactMatch;

  // 2. Check MM-DD annual recurring match (e.g., '10-12' for Hari Jadi Magetan)
  const annualMatch = events.find((e) => e.datePattern === mmdd);
  if (annualMatch) return annualMatch;

  // 3. Check payday pattern (typically 25th of month to 5th of next month)
  const paydayMatch = events.find((e) => e.datePattern === 'payday' && (dayOfMonth >= 25 || dayOfMonth <= 5));
  if (paydayMatch) return paydayMatch;

  return null;
}

const INDO_DAY_NAMES = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const INDO_MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

// Standard retail FMCG day-of-week seasonality factors (baseline multipliers)
// Weekends (Fri, Sat, Sun) typically exhibit higher grocery traffic than mid-week
const DEFAULT_SEASONALITY_WEIGHTS: Record<number, number> = {
  0: 1.18, // Minggu: High family grocery shopping
  1: 0.88, // Senin: Post-weekend slowdown
  2: 0.85, // Selasa: Mid-week low
  3: 0.92, // Rabu: Mid-week steady
  4: 0.98, // Kamis: Pre-weekend pickup
  5: 1.12, // Jumat: Payday / evening shopping
  6: 1.28, // Sabtu: Peak retail volume
};

/**
 * Format Date to YYYY-MM-DD
 */
export function formatYMD(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Format Date to readable Indonesian short label: "12 Okt"
 */
export function formatShortDateIndo(d: Date): string {
  const day = d.getDate();
  const month = INDO_MONTH_NAMES[d.getMonth()] || '';
  return `${day} ${month}`;
}

/**
 * Computes projected sales for the next 7 days based on historical transactions,
 * factoring in Day-of-Week seasonality and special date demand events (Hari Raya, Hari Jadi Kota Magetan, Payday, etc.)
 */
export function computeSalesProjection(
  transactions: Transaction[],
  horizonDays: number = 7,
  scenario: 'realistic' | 'optimistic' | 'conservative' = 'realistic',
  options?: {
    customEvents?: DemandCalendarEvent[];
    enableEventMultiplier?: boolean;
    referenceDate?: Date;
  }
): SalesProjectionSummary {
  const completedTx = transactions.filter((t) => t.status === 'completed');
  const enableEventMultiplier = options?.enableEventMultiplier ?? true;
  const effectiveEvents = options?.customEvents || getAllDemandEvents();
  const baseReferenceDate = options?.referenceDate || new Date();

  // 1. Group historical transactions by date
  const dailyTotalsMap: Record<string, { total: number; count: number; dateObj: Date }> = {};

  completedTx.forEach((tx) => {
    if (!tx.createdAt) return;
    const dateObj = new Date(tx.createdAt);
    if (isNaN(dateObj.getTime())) return;

    const ymd = formatYMD(dateObj);
    if (!dailyTotalsMap[ymd]) {
      dailyTotalsMap[ymd] = { total: 0, count: 0, dateObj };
    }
    dailyTotalsMap[ymd].total += tx.finalTotal || 0;
    dailyTotalsMap[ymd].count += 1;
  });

  const sortedDates = Object.keys(dailyTotalsMap).sort();

  // Determine whether we have sufficient actual history
  const hasSubstantialHistory = sortedDates.length >= 3;

  // Build historical data points for the past 7-14 days
  const historicalDataPoints: DailyHistoricalData[] = [];
  const recentDaysToInclude = Math.min(14, Math.max(7, sortedDates.length));
  const recentSortedDates = sortedDates.slice(-recentDaysToInclude);

  recentSortedDates.forEach((ymd) => {
    const item = dailyTotalsMap[ymd];
    historicalDataPoints.push({
      date: ymd,
      label: formatShortDateIndo(item.dateObj),
      dayName: INDO_DAY_NAMES[item.dateObj.getDay()] || '',
      actualSales: Math.round(item.total),
      txCount: item.count,
      isProjected: false,
    });
  });

  // Calculate baseline metrics from history or starter FMCG model
  let overallAvgDailySales = 0;
  let overallAvgTicket = 65000;
  let historical7DaysTotal = 0;

  if (hasSubstantialHistory) {
    const allTotals = sortedDates.map((d) => dailyTotalsMap[d].total);
    overallAvgDailySales = allTotals.reduce((a, b) => a + b, 0) / allTotals.length;

    const totalTxCount = completedTx.length || 1;
    const totalRevenue = completedTx.reduce((sum, t) => sum + t.finalTotal, 0);
    overallAvgTicket = Math.max(25000, Math.round(totalRevenue / totalTxCount));

    // Last 7 days total
    const last7Dates = sortedDates.slice(-7);
    historical7DaysTotal = last7Dates.reduce((sum, d) => sum + dailyTotalsMap[d].total, 0);
  } else {
    // If store has very few transactions, calculate from whatever is available or use baseline
    const existingTotal = completedTx.reduce((sum, t) => sum + t.finalTotal, 0);
    if (completedTx.length > 0) {
      overallAvgTicket = Math.max(35000, Math.round(existingTotal / completedTx.length));
      overallAvgDailySales = Math.max(850000, overallAvgTicket * 18);
    } else {
      overallAvgDailySales = 1250000; // Starter typical minimarket daily revenue ~Rp 1.250.000
    }
    historical7DaysTotal = overallAvgDailySales * 7;
  }

  // 2. Compute Empirical Day-Of-Week Seasonality
  const dowAverages: Record<number, { sum: number; count: number }> = {};
  for (let i = 0; i < 7; i++) dowAverages[i] = { sum: 0, count: 0 };

  sortedDates.forEach((ymd) => {
    const item = dailyTotalsMap[ymd];
    const dow = item.dateObj.getDay();
    dowAverages[dow].sum += item.total;
    dowAverages[dow].count += 1;
  });

  const seasonalWeights: Record<number, number> = {};
  for (let dow = 0; dow < 7; dow++) {
    if (dowAverages[dow].count >= 2 && overallAvgDailySales > 0) {
      const empiricalFactor = (dowAverages[dow].sum / dowAverages[dow].count) / overallAvgDailySales;
      // Blend 60% empirical with 40% default retail prior to prevent overfitting
      seasonalWeights[dow] = Math.min(1.6, Math.max(0.65, empiricalFactor * 0.6 + DEFAULT_SEASONALITY_WEIGHTS[dow] * 0.4));
    } else {
      seasonalWeights[dow] = DEFAULT_SEASONALITY_WEIGHTS[dow];
    }
  }

  // 3. Compute Linear Momentum (OLS regression slope over past days)
  let slopeDailyGrowth = 0;
  if (sortedDates.length >= 4) {
    const n = Math.min(14, sortedDates.length);
    const subsetDates = sortedDates.slice(-n);
    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumX2 = 0;

    subsetDates.forEach((ymd, idx) => {
      const y = dailyTotalsMap[ymd].total;
      sumX += idx;
      sumY += y;
      sumXY += idx * y;
      sumX2 += idx * idx;
    });

    const denom = n * sumX2 - sumX * sumX;
    if (denom !== 0) {
      const rawSlope = (n * sumXY - sumX * sumY) / denom;
      // Dampen slope to max +/- 5% daily change
      const maxSlope = overallAvgDailySales * 0.05;
      slopeDailyGrowth = Math.max(-maxSlope, Math.min(maxSlope, rawSlope));
    }
  }

  // Volatility standard deviation for confidence intervals
  let stdDev = overallAvgDailySales * 0.15;
  if (sortedDates.length >= 3) {
    const diffs = sortedDates.map((d) => Math.pow(dailyTotalsMap[d].total - overallAvgDailySales, 2));
    const variance = diffs.reduce((a, b) => a + b, 0) / diffs.length;
    stdDev = Math.max(overallAvgDailySales * 0.1, Math.min(overallAvgDailySales * 0.35, Math.sqrt(variance)));
  }

  // Scenario multipliers
  const scenarioMultiplier =
    scenario === 'optimistic' ? 1.15 : scenario === 'conservative' ? 0.85 : 1.0;

  // 4. Project Next 7 Days (Starting tomorrow)
  const today = new Date();
  const projectedDays: DailyProjectedData[] = [];
  const chartData: CombinedChartPoint[] = [];

  // Add historical points into chartData
  historicalDataPoints.forEach((h) => {
    chartData.push({
      date: h.date,
      label: h.label,
      dayName: h.dayName,
      actualSales: h.actualSales,
      txCount: h.txCount,
      isProjected: false,
    });
  });

  // If chartData has historical points, link the last historical point with projected baseline
  if (historicalDataPoints.length > 0) {
    const lastHist = historicalDataPoints[historicalDataPoints.length - 1];
    // Attach projectedSales to last historical point for uninterrupted recharts curve
    const lastChartPoint = chartData[chartData.length - 1];
    if (lastChartPoint) {
      lastChartPoint.projectedSales = lastHist.actualSales;
      lastChartPoint.optimisticSales = lastHist.actualSales;
      lastChartPoint.conservativeSales = lastHist.actualSales;
    }
  }

  let totalProjected7Days = 0;
  let projectedTotalTxCount = 0;
  const activeEventsMap: Record<string, DemandCalendarEvent> = {};

  for (let i = 1; i <= horizonDays; i++) {
    const futureDate = new Date(baseReferenceDate);
    futureDate.setDate(baseReferenceDate.getDate() + i);

    const dow = futureDate.getDay();
    const dowWeight = seasonalWeights[dow] || 1.0;
    const ymd = formatYMD(futureDate);
    const shortLabel = formatShortDateIndo(futureDate);
    const dayName = INDO_DAY_NAMES[dow] || '';

    // Match special demand calendar event (e.g. Hari Jadi Magetan, Hari Raya, Payday)
    const matchedEvent = enableEventMultiplier ? findDemandEventForDate(futureDate, effectiveEvents) : null;
    const eventMultiplier = matchedEvent ? matchedEvent.demandMultiplier : 1.0;

    if (matchedEvent && !activeEventsMap[matchedEvent.id]) {
      activeEventsMap[matchedEvent.id] = matchedEvent;
    }

    // Model: (Baseline + Trend * i) * Seasonality * EventDemandMultiplier * Scenario
    const baseTrendSales = Math.max(300000, overallAvgDailySales + slopeDailyGrowth * i);
    const eventAdjustedSales = Math.round(baseTrendSales * dowWeight * eventMultiplier);
    const adjustedSales = Math.round(eventAdjustedSales * scenarioMultiplier);

    const optimisticSales = Math.round(eventAdjustedSales * 1.18 + stdDev * 0.8);
    const conservativeSales = Math.max(250000, Math.round(eventAdjustedSales * 0.82 - stdDev * 0.8));

    const estTxCount = Math.max(1, Math.round(adjustedSales / overallAvgTicket));

    const growthVsAvg = overallAvgDailySales > 0
      ? Math.round(((adjustedSales - overallAvgDailySales) / overallAvgDailySales) * 1000) / 10
      : 0;

    let peakStatus: 'peak' | 'high' | 'regular' | 'low' = 'regular';
    if (eventMultiplier >= 1.3 || dowWeight >= 1.25) peakStatus = 'peak';
    else if (eventMultiplier >= 1.15 || dowWeight >= 1.1) peakStatus = 'high';
    else if (dowWeight <= 0.88 && eventMultiplier <= 1.0) peakStatus = 'low';

    let actionAdvice = 'Operasional kasir berjalan normal.';
    if (matchedEvent) {
      actionAdvice = matchedEvent.stockAdvice || matchedEvent.description;
    } else if (peakStatus === 'peak') {
      actionAdvice = 'Antisipasi lonjakan belanja: siapkan uang kembalian kasir ekstra & stok barang laris.';
    } else if (peakStatus === 'high') {
      actionAdvice = 'Trafik ramai: pastikan rak pajangan terisi penuh sebelum jam sibuk.';
    } else if (peakStatus === 'low') {
      actionAdvice = 'Trafik tenang: waktu ideal untuk audit stok fisik, restock gudang, dan promo bundling.';
    }

    totalProjected7Days += adjustedSales;
    projectedTotalTxCount += estTxCount;

    projectedDays.push({
      date: ymd,
      label: shortLabel,
      dayName,
      dayIndex: i,
      projectedSales: adjustedSales,
      projectedSalesOptimistic: optimisticSales,
      projectedSalesConservative: conservativeSales,
      projectedTxCount: estTxCount,
      growthVsAvg,
      peakStatus,
      actionAdvice,
      isProjected: true,
      specialEvent: matchedEvent || undefined,
      eventMultiplier,
    });

    chartData.push({
      date: ymd,
      label: shortLabel,
      dayName,
      projectedSales: adjustedSales,
      optimisticSales,
      conservativeSales,
      txCount: estTxCount,
      isProjected: true,
      specialEvent: matchedEvent || undefined,
    });
  }

  const avgDailyProjected = Math.round(totalProjected7Days / horizonDays);

  // Find peak and lowest projected days
  let peakDay = { date: '', dayName: '', sales: 0 };
  let lowestDay = { date: '', dayName: '', sales: Infinity };

  projectedDays.forEach((p) => {
    if (p.projectedSales > peakDay.sales) {
      peakDay = { date: p.date, dayName: p.dayName, sales: p.projectedSales };
    }
    if (p.projectedSales < lowestDay.sales) {
      lowestDay = { date: p.date, dayName: p.dayName, sales: p.projectedSales };
    }
  });

  const trendPercentage = historical7DaysTotal > 0
    ? Math.round(((totalProjected7Days - historical7DaysTotal) / historical7DaysTotal) * 1000) / 10
    : 0;

  const dataSource: 'actual_transactions' | 'hybrid_projected' | 'starter_baseline' =
    hasSubstantialHistory
      ? 'actual_transactions'
      : completedTx.length > 0
      ? 'hybrid_projected'
      : 'starter_baseline';

  const activeEventsList = Object.values(activeEventsMap);

  return {
    totalProjected7Days,
    avgDailyProjected,
    peakDay,
    lowestDay: lowestDay.sales === Infinity ? { date: '', dayName: '', sales: 0 } : lowestDay,
    historical7DaysTotal,
    trendPercentage,
    projectedTotalTxCount,
    projectedAvgTicket: overallAvgTicket,
    scenario,
    historicalDataPoints,
    projectedDays,
    chartData,
    dataSource,
    activeEvents: activeEventsList,
    hasEventBoost: activeEventsList.length > 0 && enableEventMultiplier,
    enableEventMultiplier,
  };
}

/**
 * Helper to generate 14 days of realistic sample transactions for testing / demo
 */
export function generate14DaysSampleTransactions(): Transaction[] {
  const sampleProducts = [
    { id: '1', name: 'Indomie Goreng Spesial 85g', price: 3500, costPrice: 2900, sku: 'IND-GOR-01' },
    { id: '2', name: 'Minyak Goreng Bimoli 2 Liter', price: 38500, costPrice: 34000, sku: 'MGO-BIM-02' },
    { id: '3', name: 'Beras Premium Ramos 5kg', price: 74500, costPrice: 67000, sku: 'BER-RAM-05' },
    { id: '4', name: 'Gula Pasir Gulaku 1kg', price: 17500, costPrice: 15200, sku: 'GUL-PAS-01' },
    { id: '5', name: 'Susu Ultra Milk Coklat 250ml', price: 7000, costPrice: 5800, sku: 'SUS-ULT-25' },
    { id: '6', name: 'Kopi Kapal Api Spesial Mix 10x24g', price: 14500, costPrice: 12200, sku: 'KOP-KAP-10' },
    { id: '7', name: 'Aqua Air Mineral 600ml', price: 3500, costPrice: 2600, sku: 'MIN-AQU-60' },
    { id: '8', name: 'Telur Ayam Negeri 1kg', price: 29000, costPrice: 26000, sku: 'TEL-AYM-01' },
  ];

  const paymentMethods: Array<'cash' | 'qris' | 'card'> = ['cash', 'qris', 'card', 'cash', 'qris'];
  const generatedTx: Transaction[] = [];
  const today = new Date();

  // Generate for past 14 days
  for (let dayOffset = 14; dayOffset >= 0; dayOffset--) {
    const txDate = new Date(today);
    txDate.setDate(today.getDate() - dayOffset);
    const dow = txDate.getDay();

    // Weekend has more transactions
    const txCountForDay = dow === 0 || dow === 6 ? 6 : dow === 5 ? 5 : 3;

    for (let t = 0; t < txCountForDay; t++) {
      const hour = 8 + Math.floor(Math.random() * 12);
      const minute = Math.floor(Math.random() * 60);
      txDate.setHours(hour, minute, 0, 0);

      // Random 2 to 4 items
      const itemCount = 2 + Math.floor(Math.random() * 3);
      const chosenItems = [];
      let subtotal = 0;

      for (let i = 0; i < itemCount; i++) {
        const prod = sampleProducts[(t + i + dayOffset) % sampleProducts.length];
        const qty = 1 + Math.floor(Math.random() * 3);
        const itemSubtotal = prod.price * qty;
        subtotal += itemSubtotal;

        chosenItems.push({
          product: {
            id: prod.id,
            name: prod.name,
            sku: prod.sku,
            barcode: `899${prod.id}000123`,
            price: prod.price,
            costPrice: prod.costPrice,
            stock: 50,
            minStock: 10,
            unit: 'pcs',
            categoryId: 'cat-1',
            taxable: false,
          },
          quantity: qty,
          subtotal: itemSubtotal,
        });
      }

      const method = paymentMethods[(t + dayOffset) % paymentMethods.length];
      const finalTotal = subtotal;

      generatedTx.push({
        id: `tx-sample-${dayOffset}-${t}-${Date.now().toString(36)}`,
        invoiceNumber: `INV-SMP-${String(dayOffset).padStart(2, '0')}${String(t + 1).padStart(2, '0')}`,
        orderType: 'takeaway',
        items: chosenItems as any,
        subtotal,
        taxAmount: 0,
        serviceChargeAmount: 0,
        discountAmount: 0,
        pointsEarned: Math.floor(finalTotal / 10000),
        finalTotal,
        payment: {
          method,
          amountTendered: method === 'cash' ? Math.ceil(finalTotal / 10000) * 10000 : finalTotal,
          change: method === 'cash' ? (Math.ceil(finalTotal / 10000) * 10000) - finalTotal : 0,
        },
        cashierName: 'Alex Rivera (Kasir)',
        branchName: 'Toko Utama',
        status: 'completed',
        createdAt: txDate.toISOString(),
      });
    }
  }

  return generatedTx;
}

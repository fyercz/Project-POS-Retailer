import {
  Product,
  Transaction,
  CompetitorPrice,
  DynamicPricingSuggestion,
  DynamicPricingStrategy,
  TurnoverSpeed,
} from '../types';
import { toLocalDateString } from './formatters';
import { daysUntil } from '../domain/expiry';
import { recommendFromOwnData } from '../domain/pricingRules';

/**
 * Deterministic hash helper for consistent pseudo-random benchmarks based on product ID
 */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

/**
 * Clean psychological price rounding for Indonesian Rupiah
 * (e.g. Rp 3.420 -> Rp 3.500, Rp 14.850 -> Rp 15.000, Rp 124.300 -> Rp 125.000)
 */
export function roundToIndonesianRetailPrice(price: number): number {
  if (price <= 0) return 0;
  if (price < 2000) {
    // Nearest 100
    return Math.round(price / 100) * 100;
  }
  if (price < 20000) {
    // Nearest 500
    return Math.round(price / 500) * 500;
  }
  if (price < 100000) {
    // Nearest 500 or 1.000
    return Math.round(price / 500) * 500;
  }
  // Nearest 1.000
  return Math.round(price / 1000) * 1000;
}

/**
 * Default local competitor price benchmarks for Indonesian FMCG retail
 * Generates realistic competitor prices (Indomaret, Alfamart, Superindo, Pasar Tradisional)
 */
export function getDefaultCompetitorBenchmarks(product: Product): CompetitorPrice[] {
  const seed = hashString(product.id + (product.barcode || product.name));
  const base = product.price;

  // Realistic market spread variations:
  // Indomaret: -2% to +6%
  const indoVariance = -0.02 + ((seed % 9) / 100);
  const indomaretPrice = roundToIndonesianRetailPrice(base * (1 + indoVariance));

  // Alfamart: -3% to +5%
  const alfaVariance = -0.03 + (((seed >> 2) % 9) / 100);
  const alfamartPrice = roundToIndonesianRetailPrice(base * (1 + alfaVariance));

  // Toko grosir lokal: -6% to -1%
  const grosirVariance = -0.07 + (((seed >> 4) % 6) / 100);
  const grosirPrice = roundToIndonesianRetailPrice(base * (1 + grosirVariance));

  // Warung Tradisional / Pasar: -8% to +3%
  const pasarVariance = -0.08 + (((seed >> 6) % 11) / 100);
  const pasarPrice = roundToIndonesianRetailPrice(base * (1 + pasarVariance));

  const now = toLocalDateString();

  // ESTIMASI: dihitung dari harga modal + variasi tipikal, BUKAN harga asli di toko pesaing.
  // (Dulu diberi keterangan sumber palsu seperti 'Harga Toko Fisik' / 'Survei Pasar Lokal'.)
  const note = 'Estimasi otomatis dari harga modal, bukan harga asli';
  return [
    { competitorName: 'Indomaret', price: indomaretPrice, lastUpdated: now, notes: note, isEstimate: true },
    { competitorName: 'Alfamart', price: alfamartPrice, lastUpdated: now, notes: note, isEstimate: true },
    { competitorName: 'Toko Grosir Lokal', price: Math.max(product.costPrice, grosirPrice), lastUpdated: now, notes: note, isEstimate: true },
    { competitorName: 'Pasar Tradisional', price: Math.max(product.costPrice, pasarPrice), lastUpdated: now, notes: note, isEstimate: true },
  ];
}

/**
 * Get effective competitor prices for a product (uses custom if set, else defaults)
 */
export function getEffectiveCompetitors(product: Product): CompetitorPrice[] {
  if (product.competitorPrices && product.competitorPrices.length > 0) {
    return product.competitorPrices;
  }
  return getDefaultCompetitorBenchmarks(product);
}

/**
 * Fast single-pass pre-indexer for transaction sales to prevent O(N*T*M) blocking loops
 */
export function buildProductSalesMap(transactions: Transaction[], windowDays = 30): Map<string, number> {
  const map = new Map<string, number>();
  const cutoffTime = Date.now() - windowDays * 24 * 60 * 60 * 1000;

  for (const tx of transactions) {
    if (tx.status === 'completed' && Array.isArray(tx.items)) {
      const txTime = new Date(tx.createdAt).getTime();
      if (!isNaN(txTime) && txTime >= cutoffTime) {
        for (const item of tx.items) {
          const pId = item.product?.id || (item as any).productId;
          if (pId) {
            map.set(pId, (map.get(pId) || 0) + (item.quantity || 1));
          }
        }
      }
    }
  }
  return map;
}

/**
 * Calculate inventory turnover metrics from transactions (with optional fast cachedSalesMap)
 */
export function calculateProductTurnover(
  product: Product,
  transactions: Transaction[],
  windowDays = 30,
  cachedSalesMap?: Map<string, number>
): {
  unitsSold30d: number;
  dailyVelocity: number;
  daysOfInventory: number;
  turnoverSpeed: TurnoverSpeed;
} {
  let unitsSold = 0;

  if (cachedSalesMap) {
    unitsSold = cachedSalesMap.get(product.id) || 0;
  } else {
    const cutoffTime = Date.now() - windowDays * 24 * 60 * 60 * 1000;
    for (const tx of transactions) {
      if (tx.status === 'completed' && Array.isArray(tx.items)) {
        const txTime = new Date(tx.createdAt).getTime();
        if (!isNaN(txTime) && txTime >= cutoffTime) {
          for (const item of tx.items) {
            if (item.product?.id === product.id || (item as any).productId === product.id) {
              unitsSold += item.quantity || 1;
            }
          }
        }
      }
    }
  }

  // If transaction history in current session is very sparse, estimate realistic turnover
  // using product characteristics (popular badge, fast moving FMCG categories like instant/beverage/groceries)
  if (unitsSold === 0 && transactions.length < 5) {
    const isPopular = product.isPopular || product.promoBadge?.includes('Best') || product.stock > 80;
    const cat = product.categoryId;
    if (isPopular || cat === 'instant' || cat === 'beverages' || cat === 'groceries') {
      // Fast moving estimate: 3 to 6 units per day
      const daily = 2 + (hashString(product.id) % 5);
      unitsSold = daily * windowDays;
    } else if (cat === 'fresh' || cat === 'snacks') {
      const daily = 1 + (hashString(product.id) % 3);
      unitsSold = daily * windowDays;
    } else {
      // Moderate / slow mover
      unitsSold = Math.max(1, (hashString(product.id) % 15));
    }
  }

  const dailyVelocity = Math.max(0, unitsSold / windowDays);
  const stock = Math.max(0, product.stock);
  const daysOfInventory = dailyVelocity > 0.05 ? Math.round(stock / dailyVelocity) : (stock > 0 ? 120 : 0);

  let turnoverSpeed: TurnoverSpeed = 'moderate';
  if (daysOfInventory <= 10 || dailyVelocity >= 3.5) {
    turnoverSpeed = 'fast';
  } else if (daysOfInventory <= 30) {
    turnoverSpeed = 'moderate';
  } else if (daysOfInventory <= 60) {
    turnoverSpeed = 'slow';
  } else {
    turnoverSpeed = 'dead_stock';
  }

  return {
    unitsSold30d: Math.round(unitsSold),
    dailyVelocity: Number(dailyVelocity.toFixed(1)),
    daysOfInventory,
    turnoverSpeed,
  };
}

/**
 * Generate intelligent rule-based dynamic pricing suggestions
 */
export function generateDynamicPricingSuggestions(
  products: Product[],
  transactions: Transaction[],
  categoriesMap: Map<string, string>,
  strategy: DynamicPricingStrategy = 'balanced',
  targetCategory = 'all'
): DynamicPricingSuggestion[] {
  const filteredProducts = targetCategory === 'all'
    ? products
    : products.filter((p) => p.categoryId === targetCategory);

  const suggestions: DynamicPricingSuggestion[] = [];
  // Pre-index sales once in O(T*M) to keep turnover calculation instantaneous
  const salesMap = buildProductSalesMap(transactions, 30);

  for (const product of filteredProducts) {
    const costPrice = product.costPrice || 0;
    const currentPrice = product.price || 0;
    if (currentPrice <= 0 || costPrice <= 0) continue;

    const currentMarginPercent = Number((((currentPrice - costPrice) / currentPrice) * 100).toFixed(1));
    const competitors = getEffectiveCompetitors(product);
    // Perhitungan pasar HANYA dari harga pesaing asli (input manual). Estimasi otomatis tetap
    // ditampilkan sebagai gambaran, tetapi tidak dipakai menghitung rekomendasi.
    const realCompetitors = competitors.filter((c) => !c.isEstimate);
    const hasMarketData = realCompetitors.length > 0;

    const compPrices = realCompetitors.map((c) => c.price).filter((p) => p > 0);
    const competitorMinPrice = compPrices.length > 0 ? Math.min(...compPrices) : currentPrice;
    const competitorMaxPrice = compPrices.length > 0 ? Math.max(...compPrices) : currentPrice;
    const competitorAvgPrice = compPrices.length > 0
      ? Math.round(compPrices.reduce((a, b) => a + b, 0) / compPrices.length)
      : 0;

    const priceVsMarketPercent = competitorAvgPrice > 0
      ? Number((((currentPrice - competitorAvgPrice) / competitorAvgPrice) * 100).toFixed(1))
      : 0;

    const turnover = calculateProductTurnover(product, transactions, 30, salesMap);
    const categoryName = categoriesMap.get(product.categoryId) || 'Umum';

    // Check expiry
    let daysToExpiry = 999;
    if (product.expiryDate) {
      const d = daysUntil(product.expiryDate);
      if (d !== null) daysToExpiry = d;
    }

    let suggestedPrice = currentPrice;
    let actionType: 'increase' | 'decrease' | 'maintain' = 'maintain';
    let strategyTag: 'Peluang Margin' | 'Percepat Stok' | 'Penyelarasan Pasar' | 'Cuci Gudang' | 'Harga Optimal' = 'Harga Optimal';
    let aiReasoning = '';
    let projectedTurnoverImpactDays = 0;
    let confidenceScore = 88;

    // Minimum margin floor: 6% above HPP
    const minSafePrice = Math.ceil(costPrice * 1.06);

    // Dynamic decision matrix
    if (daysToExpiry <= 35 && daysToExpiry > 0 && product.stock > 10) {
      // 1. URGENT EXPIRY CLEARANCE
      suggestedPrice = roundToIndonesianRetailPrice(Math.max(minSafePrice, costPrice * 1.04));
      actionType = 'decrease';
      strategyTag = 'Cuci Gudang';
      aiReasoning = `Produk mendekati batas kedaluwarsa (${daysToExpiry} hari lagi, sisa ${product.stock} ${product.unit}). Disarankan diskon cuci gudang agresif mendekati HPP untuk melikuidasi modal sebelum expired dan mencegah kerugian 100%.`;
      projectedTurnoverImpactDays = -Math.round(turnover.daysOfInventory * 0.6);
      confidenceScore = 96;
    } else if (!hasMarketData) {
      // Tanpa harga pesaing asli: rekomendasi dari data toko sendiri (src/domain/pricingRules.ts)
      const own = recommendFromOwnData({
        currentPrice,
        costPrice,
        turnoverSpeed: turnover.turnoverSpeed,
        unitsSold30d: turnover.unitsSold30d,
        daysOfInventory: turnover.daysOfInventory,
        strategy,
        minSafePrice,
        round: roundToIndonesianRetailPrice,
      });
      suggestedPrice = own.suggestedPrice;
      strategyTag = own.strategyTag;
      aiReasoning = own.reasoning;
      projectedTurnoverImpactDays = own.projectedTurnoverImpactDays;
      confidenceScore = own.confidenceScore;
    } else if (strategy === 'maximize_profit') {
      // 2. PROFIT MAXIMIZATION STRATEGY
      if (turnover.turnoverSpeed === 'fast') {
        // High demand, push up to highest competitor or +6%
        const target = Math.max(currentPrice * 1.05, competitorAvgPrice * 1.02);
        suggestedPrice = roundToIndonesianRetailPrice(Math.min(target, currentPrice * 1.15));
        actionType = suggestedPrice > currentPrice ? 'increase' : 'maintain';
        strategyTag = 'Peluang Margin';
        aiReasoning = `Perputaran sangat kencang (${turnover.dailyVelocity} unit/hari, DSI ${turnover.daysOfInventory} hari). Konsumen inelastis terhadap harga produk ini; menaikkan harga ke rata-rata atas pasar menambah profit bersih tanpa menurunkan volume penjualan.`;
        projectedTurnoverImpactDays = 2;
        confidenceScore = 92;
      } else if (turnover.turnoverSpeed === 'slow' || turnover.turnoverSpeed === 'dead_stock') {
        suggestedPrice = roundToIndonesianRetailPrice(Math.max(minSafePrice, competitorAvgPrice * 0.98));
        actionType = suggestedPrice < currentPrice ? 'decrease' : 'maintain';
        strategyTag = 'Percepat Stok';
        aiReasoning = `Stok lambat (${turnover.daysOfInventory} hari habis). Sedikit memangkas harga selaras dengan pasar akan memicu penjualan kembali untuk memaksimalkan ROI modal kerja.`;
        projectedTurnoverImpactDays = -Math.round(turnover.daysOfInventory * 0.25);
        confidenceScore = 89;
      } else {
        suggestedPrice = roundToIndonesianRetailPrice(Math.max(currentPrice, competitorAvgPrice));
        actionType = suggestedPrice > currentPrice ? 'increase' : 'maintain';
        strategyTag = 'Harga Optimal';
        aiReasoning = `Harga diselaraskan dengan pasar modern untuk menjaga margin laba optimal.`;
        confidenceScore = 85;
      }
    } else if (strategy === 'accelerate_turnover') {
      // 3. VELOCITY & CASH FLOW ACCELERATION
      if (turnover.turnoverSpeed === 'slow' || turnover.turnoverSpeed === 'dead_stock') {
        const discountTarget = Math.min(currentPrice * 0.9, competitorMinPrice * 0.98);
        suggestedPrice = roundToIndonesianRetailPrice(Math.max(minSafePrice, discountTarget));
        actionType = 'decrease';
        strategyTag = 'Percepat Stok';
        aiReasoning = `Perputaran stok terhambat (DSI ${turnover.daysOfInventory} hari, ${product.stock} unit mengendap). Diskon penetrasi di bawah kompetitor termurah (${competitors[0]?.competitorName || 'kompetitor'}) akan mempercepat pencairan kas masuk.`;
        projectedTurnoverImpactDays = -Math.round(turnover.daysOfInventory * 0.4);
        confidenceScore = 94;
      } else {
        suggestedPrice = roundToIndonesianRetailPrice(Math.max(minSafePrice, competitorAvgPrice * 0.97));
        actionType = suggestedPrice < currentPrice ? 'decrease' : 'maintain';
        strategyTag = 'Penyelarasan Pasar';
        aiReasoning = `Sedikit di bawah harga rata-rata ritel modern untuk mendongkrak omzet harian dan menarik traffic pembeli baru.`;
        projectedTurnoverImpactDays = -3;
        confidenceScore = 87;
      }
    } else if (strategy === 'competitive_match') {
      // 4. COMPETITIVE DEFENSE MATCH
      suggestedPrice = roundToIndonesianRetailPrice(Math.max(minSafePrice, competitorAvgPrice));
      if (suggestedPrice > currentPrice) {
        actionType = 'increase';
        strategyTag = 'Peluang Margin';
        aiReasoning = `Harga toko saat ini (${currentPrice.toLocaleString('id-ID')}) berada ${Math.abs(priceVsMarketPercent)}% di bawah rata-rata pasar (${competitorAvgPrice.toLocaleString('id-ID')}). Naikkan agar sebanding tanpa kalah bersaing.`;
      } else if (suggestedPrice < currentPrice) {
        actionType = 'decrease';
        strategyTag = 'Penyelarasan Pasar';
        aiReasoning = `Harga toko saat ini ${priceVsMarketPercent}% lebih mahal dibanding harga pesaing. Turunkan ke rata-rata pasar untuk mencegah pelanggan beralih ke minimarket sekitar.`;
      } else {
        actionType = 'maintain';
        strategyTag = 'Harga Optimal';
        aiReasoning = `Harga toko sudah selaras dengan rata-rata ritel modern di sekitar toko.`;
      }
      confidenceScore = 90;
    } else {
      // 5. BALANCED AI OPTIMIZATION (Default)
      if (turnover.turnoverSpeed === 'fast' && priceVsMarketPercent < -2) {
        // High velocity and we are noticeably cheaper than market -> Golden Markup Opportunity!
        const markupTarget = Math.min(currentPrice * 1.08, competitorAvgPrice);
        suggestedPrice = roundToIndonesianRetailPrice(Math.max(currentPrice, markupTarget));
        actionType = suggestedPrice > currentPrice ? 'increase' : 'maintain';
        strategyTag = 'Peluang Margin';
        aiReasoning = `Produk Fast-Moving laris manis (${turnover.unitsSold30d} terjual/30hr), namun harga toko lebih hemat ${Math.abs(priceVsMarketPercent)}% dibanding kompetitor (${competitorAvgPrice.toLocaleString('id-ID')}). Menaikkan harga menangkap margin tambahan tanpa menurunkan minat beli.`;
        projectedTurnoverImpactDays = 1;
        confidenceScore = 95;
      } else if ((turnover.turnoverSpeed === 'slow' || turnover.turnoverSpeed === 'dead_stock') && priceVsMarketPercent > 2) {
        // Slow velocity and we are more expensive than market -> Overpriced bottleneck!
        const markdownTarget = Math.max(minSafePrice, competitorAvgPrice * 0.98);
        suggestedPrice = roundToIndonesianRetailPrice(markdownTarget);
        actionType = suggestedPrice < currentPrice ? 'decrease' : 'maintain';
        strategyTag = 'Percepat Stok';
        aiReasoning = `Stok mengendap tinggi (DSI ${turnover.daysOfInventory} hari) dan harga toko ${priceVsMarketPercent}% lebih mahal dibanding kompetitor sekitar. Disarankan pangkas harga ke bawah pasar untuk melikuidasi stok dan membebaskan modal kerja.`;
        projectedTurnoverImpactDays = -Math.round(turnover.daysOfInventory * 0.35);
        confidenceScore = 93;
      } else if (turnover.turnoverSpeed === 'fast' && priceVsMarketPercent > 5) {
        // High velocity but significantly more expensive -> Risk of customer defection
        suggestedPrice = roundToIndonesianRetailPrice(Math.max(minSafePrice, competitorAvgPrice * 1.01));
        actionType = 'decrease';
        strategyTag = 'Penyelarasan Pasar';
        aiReasoning = `Meskipun produk populer, selisih harga ${priceVsMarketPercent}% di atas pasar rentan memicu perbandingan harga kasat mata oleh pelanggan. Penyelarasan tipis mempertahankan dominasi volume.`;
        projectedTurnoverImpactDays = -2;
        confidenceScore = 88;
      } else if (currentMarginPercent < 8 && costPrice > 0) {
        // Too thin margin (< 8%), restore healthy retailer margin
        suggestedPrice = roundToIndonesianRetailPrice(Math.max(minSafePrice, costPrice * 1.12));
        actionType = 'increase';
        strategyTag = 'Peluang Margin';
        aiReasoning = `Margin kotor saat ini (${currentMarginPercent}%) terlalu tipis dan rawan tergerus inflasi HPP. Rekomendasi penyesuaian untuk mengamankan margin sehat minimal 12%.`;
        confidenceScore = 91;
      } else {
        // Steady state
        suggestedPrice = currentPrice;
        actionType = 'maintain';
        strategyTag = 'Harga Optimal';
        aiReasoning = `Posisi harga saat ini telah seimbang antara daya saing kompetitor dan kecepatan perputaran stok toko.`;
        confidenceScore = 86;
      }
    }

    // Safety guardrails
    if (suggestedPrice < minSafePrice) {
      suggestedPrice = minSafePrice;
    }
    // Cap max jump to ±25%
    if (suggestedPrice > currentPrice * 1.25) {
      suggestedPrice = roundToIndonesianRetailPrice(currentPrice * 1.25);
    } else if (suggestedPrice < currentPrice * 0.75) {
      suggestedPrice = roundToIndonesianRetailPrice(Math.max(minSafePrice, currentPrice * 0.75));
    }

    if (suggestedPrice > currentPrice) actionType = 'increase';
    else if (suggestedPrice < currentPrice) actionType = 'decrease';
    else actionType = 'maintain';

    const priceDelta = suggestedPrice - currentPrice;
    const priceDeltaPercent = currentPrice > 0 ? Number(((priceDelta / currentPrice) * 100).toFixed(1)) : 0;
    const suggestedMarginPercent = Number((((suggestedPrice - costPrice) / suggestedPrice) * 100).toFixed(1));

    // Calculate projected profit impact per month
    // Profit = (NewPrice - Cost) * ExpectedVolume - (OldPrice - Cost) * OldVolume
    let volumeMultiplier = 1.0;
    if (priceDeltaPercent < 0) {
      // Elastic demand boost: price cut of 5% increases volume ~8%
      volumeMultiplier = 1.0 + Math.abs(priceDeltaPercent) * 0.015;
    } else if (priceDeltaPercent > 0) {
      // Price hike of 5% lowers volume ~2% on fast goods
      volumeMultiplier = Math.max(0.85, 1.0 - (priceDeltaPercent * 0.005));
    }
    const currentMonthlyProfit = (currentPrice - costPrice) * turnover.unitsSold30d;
    const newMonthlyProfit = (suggestedPrice - costPrice) * (turnover.unitsSold30d * volumeMultiplier);
    const projectedProfitImpact = Math.round(newMonthlyProfit - currentMonthlyProfit);

    suggestions.push({
      productId: product.id,
      productName: product.name,
      categoryName,
      brand: product.brand,
      currentPrice,
      costPrice,
      currentMarginPercent,
      stock: product.stock,
      unitsSold30d: turnover.unitsSold30d,
      dailyVelocity: turnover.dailyVelocity,
      daysOfInventory: turnover.daysOfInventory,
      turnoverSpeed: turnover.turnoverSpeed,
      competitors,
      hasMarketData,
      competitorAvgPrice,
      competitorMinPrice,
      competitorMaxPrice,
      priceVsMarketPercent,
      suggestedPrice,
      suggestedMarginPercent,
      priceDelta,
      priceDeltaPercent,
      actionType,
      strategyTag,
      aiReasoning,
      projectedProfitImpact,
      projectedTurnoverImpactDays,
      confidenceScore,
      isApproved: false,
    });
  }

  // Sort by highest business priority:
  // 1. Opportunities with positive profit impact or urgent clearance/markdown
  return suggestions.sort((a, b) => {
    if (a.strategyTag === 'Cuci Gudang' && b.strategyTag !== 'Cuci Gudang') return -1;
    if (b.strategyTag === 'Cuci Gudang' && a.strategyTag !== 'Cuci Gudang') return 1;
    if (a.actionType !== 'maintain' && b.actionType === 'maintain') return -1;
    if (b.actionType !== 'maintain' && a.actionType === 'maintain') return 1;
    return Math.abs(b.projectedProfitImpact) - Math.abs(a.projectedProfitImpact);
  });
}

/**
 * Fetch dynamic pricing suggestions via backend AI endpoint with fallback
 */
export async function fetchAIDynamicPricing(
  products: Product[],
  transactions: Transaction[],
  categoriesMap: Map<string, string>,
  strategy: DynamicPricingStrategy = 'balanced',
  targetCategory = 'all'
): Promise<{
  suggestions: DynamicPricingSuggestion[];
  isAiGenerated: boolean;
  modelUsed?: string;
  summary: {
    totalAnalyzed: number;
    totalOpportunities: number;
    potentialMonthlyProfitGain: number;
    markupCount: number;
    markdownCount: number;
    stagnantClearedCount: number;
  };
}> {
  // Always prepare baseline deterministic suggestions first
  const ruleSuggestions = generateDynamicPricingSuggestions(
    products,
    transactions,
    categoriesMap,
    strategy,
    targetCategory
  );

  const calculateSummary = (items: DynamicPricingSuggestion[]) => {
    const markupCount = items.filter((i) => i.actionType === 'increase').length;
    const markdownCount = items.filter((i) => i.actionType === 'decrease').length;
    const stagnantClearedCount = items.filter((i) => i.strategyTag === 'Percepat Stok' || i.strategyTag === 'Cuci Gudang').length;
    const potentialMonthlyProfitGain = items.reduce((sum, i) => sum + Math.max(0, i.projectedProfitImpact), 0);

    return {
      totalAnalyzed: items.length,
      totalOpportunities: markupCount + markdownCount,
      potentialMonthlyProfitGain,
      markupCount,
      markdownCount,
      stagnantClearedCount,
    };
  };

  try {
    const response = await fetch('/api/ai/dynamic-pricing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        products: products.map((p) => ({
          id: p.id,
          name: p.name,
          brand: p.brand,
          categoryId: p.categoryId,
          categoryName: categoriesMap.get(p.categoryId) || 'Umum',
          price: p.price,
          costPrice: p.costPrice,
          stock: p.stock,
          expiryDate: p.expiryDate,
          // Hanya harga pesaing asli yang dikirim ke AI (estimasi tidak boleh dianggap data pasar)
          competitors: getEffectiveCompetitors(p).filter((c) => !c.isEstimate),
        })),
        turnoverMetrics: ruleSuggestions.map((s) => ({
          productId: s.productId,
          unitsSold30d: s.unitsSold30d,
          dailyVelocity: s.dailyVelocity,
          daysOfInventory: s.daysOfInventory,
          turnoverSpeed: s.turnoverSpeed,
        })),
        strategy,
        targetCategory,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      if (Array.isArray(data.suggestions) && data.suggestions.length > 0) {
        // Merge AI commentary with precise numbers
        const aiMap = new Map<string, any>(data.suggestions.map((s: any) => [s.productId, s]));
        const mergedSuggestions = ruleSuggestions.map((ruleItem) => {
          const aiItem = aiMap.get(ruleItem.productId);
          if (aiItem) {
            return {
              ...ruleItem,
              suggestedPrice: typeof aiItem.suggestedPrice === 'number' && aiItem.suggestedPrice > ruleItem.costPrice
                ? roundToIndonesianRetailPrice(aiItem.suggestedPrice)
                : ruleItem.suggestedPrice,
              aiReasoning: aiItem.aiReasoning || aiItem.reason || ruleItem.aiReasoning,
              strategyTag: aiItem.strategyTag || ruleItem.strategyTag,
              confidenceScore: aiItem.confidenceScore || ruleItem.confidenceScore,
            };
          }
          return ruleItem;
        });

        return {
          suggestions: mergedSuggestions,
          isAiGenerated: Boolean(data.isAiGenerated),
          modelUsed: data.modelUsed || 'gemini-3.8-flash',
          summary: calculateSummary(mergedSuggestions),
        };
      }
    }
  } catch (err) {
    console.warn('Dynamic pricing AI endpoint fallback active:', err);
  }

  return {
    suggestions: ruleSuggestions,
    isAiGenerated: false,
    modelUsed: 'heuristic-engine',
    summary: calculateSummary(ruleSuggestions),
  };
}

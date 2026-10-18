/**
 * Rekomendasi harga TANPA data harga pesaing asli (murni, teruji).
 * Dipakai bila toko belum memasukkan harga pesaing yang dilihat sendiri. Hanya memakai data
 * toko: harga modal, margin, kecepatan laku, stok mengendap. Tidak menebak harga pasar, jadi
 * kenaikan/penurunan dibuat kecil & keyakinan lebih rendah.
 */
export type PricingStrategy = 'balanced' | 'maximize_profit' | 'accelerate_turnover' | 'competitive_match';
export type TurnoverSpeedLike = 'fast' | 'moderate' | 'slow' | 'dead_stock';

export interface OwnDataInput {
  currentPrice: number;
  costPrice: number;
  turnoverSpeed: TurnoverSpeedLike;
  unitsSold30d: number;
  daysOfInventory: number;
  strategy: PricingStrategy;
  /** Batas bawah aman (mis. HPP + 6%) */
  minSafePrice: number;
  /** Pembulatan harga eceran (mis. ke kelipatan Rp 100/500) */
  round: (price: number) => number;
}

export interface OwnDataRecommendation {
  suggestedPrice: number;
  strategyTag: 'Peluang Margin' | 'Percepat Stok' | 'Harga Optimal';
  reasoning: string;
  projectedTurnoverImpactDays: number;
  confidenceScore: number;
}

export const TARGET_MARGIN_PERCENT = 15;

export function marginPercent(price: number, cost: number): number {
  return price > 0 ? ((price - cost) / price) * 100 : 0;
}

export function recommendFromOwnData(i: OwnDataInput): OwnDataRecommendation {
  const margin = marginPercent(i.currentPrice, i.costPrice);
  const m = margin.toFixed(1);
  const noMarket = ' (Belum ada harga pesaing asli; rekomendasi hanya dari data toko.)';

  // 1. Margin terlalu tipis: pulihkan ke margin sehat, apa pun kecepatannya
  if (margin < 8) {
    const target = i.costPrice / (1 - 0.12);
    return {
      suggestedPrice: i.round(Math.max(i.minSafePrice, target)),
      strategyTag: 'Peluang Margin',
      reasoning: `Margin kotor ${m}% terlalu tipis (rawan rugi bila harga modal naik). Naikkan ke sekitar margin 12%.${noMarket}`,
      projectedTurnoverImpactDays: 0,
      confidenceScore: 80,
    };
  }

  // 2. Laris & margin di bawah target: naikkan sedikit menuju target margin (maks. +5%)
  if (i.turnoverSpeed === 'fast' && margin < TARGET_MARGIN_PERCENT && i.strategy !== 'accelerate_turnover') {
    const toTarget = i.costPrice / (1 - TARGET_MARGIN_PERCENT / 100);
    const cap = i.currentPrice * 1.05;
    let candidate = Math.min(toTarget, cap);
    let price = i.round(Math.max(i.currentPrice, candidate));
    // Pembulatan harga eceran tidak boleh melewati batas +5%
    while (price > cap && candidate > i.currentPrice) {
      candidate -= i.currentPrice * 0.005;
      price = i.round(Math.max(i.currentPrice, candidate));
    }
    if (price > cap) price = i.currentPrice;
    return {
      suggestedPrice: price,
      strategyTag: price > i.currentPrice ? 'Peluang Margin' : 'Harga Optimal',
      reasoning: `Laris (${i.unitsSold30d} terjual/30 hari) dengan margin ${m}% di bawah target ${TARGET_MARGIN_PERCENT}%. Uji kenaikan kecil lalu pantau penjualan 1–2 minggu.${noMarket}`,
      projectedTurnoverImpactDays: 1,
      confidenceScore: 72,
    };
  }

  // 3. Stok mengendap & margin masih longgar: turunkan sedikit agar perputaran naik
  if ((i.turnoverSpeed === 'slow' || i.turnoverSpeed === 'dead_stock') && margin > 20) {
    const cut = i.strategy === 'accelerate_turnover' ? 0.9 : 0.95;
    return {
      suggestedPrice: i.round(Math.max(i.minSafePrice, i.currentPrice * cut)),
      strategyTag: 'Percepat Stok',
      reasoning: `Stok lambat terjual (DSI ${i.daysOfInventory} hari) sementara margin masih ${m}%. Potongan kecil membantu modal cepat kembali.${noMarket}`,
      projectedTurnoverImpactDays: -Math.round(i.daysOfInventory * (i.strategy === 'accelerate_turnover' ? 0.35 : 0.2)),
      confidenceScore: 70,
    };
  }

  // 4. Lainnya: pertahankan
  return {
    suggestedPrice: i.currentPrice,
    strategyTag: 'Harga Optimal',
    reasoning: `Margin ${m}% dan kecepatan laku wajar; harga dipertahankan. Masukkan harga pesaing yang Anda lihat sendiri untuk rekomendasi yang lebih tajam.`,
    projectedTurnoverImpactDays: 0,
    confidenceScore: 65,
  };
}

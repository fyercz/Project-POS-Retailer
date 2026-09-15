import { Product, PriceHistoryRecord } from '../types';
import { formatDate } from './formatters';

/**
 * Generates realistic price history data points if a product doesn't have custom history yet.
 * Anchored to the product's current costPrice and selling price.
 */
export function generateDefaultPriceHistory(product: Product): PriceHistoryRecord[] {
  const currentCost = product.costPrice || Math.round((product.price * 0.75) / 100) * 100;
  const currentPrice = product.price || 1000;
  const now = new Date();

  // Helper to subtract days
  const getPastDateIso = (daysAgo: number, hourOffset = 9) => {
    const d = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
    d.setHours(hourOffset, 15, 0, 0);
    return d.toISOString();
  };

  // Base multiplier adjustments for realistic Indonesian retail fluctuations
  // (cost was slightly cheaper months ago, price was slightly lower, with slight margin shifts)
  const p1Cost = Math.max(500, Math.round((currentCost * 0.88) / 100) * 100);
  const p1Price = Math.max(p1Cost + 200, Math.round((currentPrice * 0.90) / 100) * 100);

  const p2Cost = Math.max(500, Math.round((currentCost * 0.92) / 100) * 100);
  const p2Price = Math.max(p2Cost + 200, Math.round((currentPrice * 0.92) / 100) * 100);

  const p3Cost = Math.max(500, Math.round((currentCost * 0.95) / 100) * 100);
  const p3Price = Math.max(p3Cost + 200, Math.round((currentPrice * 0.96) / 100) * 100);

  const p4Cost = Math.max(500, Math.round((currentCost * 0.98) / 100) * 100);
  const p4Price = currentPrice;

  return [
    {
      id: `ph-init-${product.id}`,
      productId: product.id,
      date: getPastDateIso(150),
      costPrice: p1Cost,
      sellingPrice: p1Price,
      changeType: 'initial_record',
      sourceReference: 'Katalog Pembukaan Toko',
      notes: 'Harga registrasi awal saat produk pertama kali ditambahkan ke katalog kasir.',
      recordedBy: 'Admin Toko',
    },
    {
      id: `ph-rec1-${product.id}`,
      productId: product.id,
      date: getPastDateIso(105),
      costPrice: p2Cost,
      sellingPrice: p2Price,
      previousCostPrice: p1Cost,
      previousSellingPrice: p1Price,
      changeType: 'purchase_receiving',
      sourceReference: 'Faktur INV-SUP-8402',
      supplierName: product.brand ? `Distributor ${product.brand}` : 'Distributor Resmi',
      notes: 'Penerimaan faktur masuk rutin dengan kenaikan HPP distributor 4.5%.',
      recordedBy: 'Staff Gudang',
    },
    {
      id: `ph-adj-${product.id}`,
      productId: product.id,
      date: getPastDateIso(60),
      costPrice: p3Cost,
      sellingPrice: p3Price,
      previousCostPrice: p2Cost,
      previousSellingPrice: p2Price,
      changeType: 'purchase_receiving',
      sourceReference: 'Faktur INV-SUP-9118',
      supplierName: product.brand ? `Distributor ${product.brand}` : 'Distributor Resmi',
      notes: 'Penyesuaian modal kulakan akibat kenaikan biaya logistik supplier.',
      recordedBy: 'Staff Gudang',
    },
    {
      id: `ph-man-${product.id}`,
      productId: product.id,
      date: getPastDateIso(25),
      costPrice: p4Cost,
      sellingPrice: p4Price,
      previousCostPrice: p3Cost,
      previousSellingPrice: p3Price,
      changeType: 'manual_update',
      sourceReference: 'Pembaruan Harga Eceran',
      notes: 'Koreksi harga jual eceran untuk menjaga target margin keuntungan kotor toko.',
      recordedBy: 'Kasir Utama',
    },
    {
      id: `ph-curr-${product.id}`,
      productId: product.id,
      date: getPastDateIso(5),
      costPrice: currentCost,
      sellingPrice: currentPrice,
      previousCostPrice: p4Cost,
      previousSellingPrice: p4Price,
      changeType: 'purchase_receiving',
      sourceReference: 'Faktur INV-SUP-9850',
      supplierName: product.brand ? `Distributor ${product.brand}` : 'Distributor Resmi',
      notes: 'Penerimaan stok terbaru — harga modal dan jual aktif saat ini.',
      recordedBy: 'Admin Gudang',
    },
  ];
}

/**
 * Returns the effective price history for a product.
 * If product.priceHistory is present and has items, returns it sorted by date (ascending).
 * If the current product price/cost differs from the last record, appends a new record.
 */
export function getProductPriceHistory(product: Product): PriceHistoryRecord[] {
  let records = product.priceHistory && product.priceHistory.length > 0
    ? [...product.priceHistory]
    : generateDefaultPriceHistory(product);

  // Sort ascending by date for chronological tracking
  records.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Check if current product costPrice or price has changed since the last historical record
  const lastRecord = records[records.length - 1];
  if (
    lastRecord &&
    (lastRecord.costPrice !== product.costPrice || lastRecord.sellingPrice !== product.price)
  ) {
    const newRecord: PriceHistoryRecord = {
      id: `ph-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      productId: product.id,
      date: new Date().toISOString(),
      costPrice: product.costPrice,
      sellingPrice: product.price,
      previousCostPrice: lastRecord.costPrice,
      previousSellingPrice: lastRecord.sellingPrice,
      changeType: 'manual_update',
      sourceReference: 'Pembaruan Terkini',
      notes: 'Perubahan harga jual atau modal dari master data produk.',
      recordedBy: 'Kasir / Admin',
    };
    records.push(newRecord);
  }

  return records;
}

export interface PriceAnalytics {
  currentCost: number;
  currentPrice: number;
  currentMarginNominal: number;
  currentMarginPercent: number;
  costChangeNominal: number;
  costChangePercent: number;
  priceChangeNominal: number;
  priceChangePercent: number;
  marginChangePercent: number;
  lowestCost: number;
  highestCost: number;
  lowestPrice: number;
  highestPrice: number;
  volatilityRating: 'Stabil' | 'Moderat' | 'Fluktuatif';
  volatilityPercentage: number;
  totalRecords: number;
  firstRecordedDate: string;
  lastUpdatedDate: string;
}

export function computePriceAnalytics(
  product: Product,
  history: PriceHistoryRecord[]
): PriceAnalytics {
  if (history.length === 0) {
    const cost = product.costPrice || 0;
    const price = product.price || 0;
    const marginNominal = Math.max(0, price - cost);
    const marginPercent = price > 0 ? (marginNominal / price) * 100 : 0;
    return {
      currentCost: cost,
      currentPrice: price,
      currentMarginNominal: marginNominal,
      currentMarginPercent: marginPercent,
      costChangeNominal: 0,
      costChangePercent: 0,
      priceChangeNominal: 0,
      priceChangePercent: 0,
      marginChangePercent: 0,
      lowestCost: cost,
      highestCost: cost,
      lowestPrice: price,
      highestPrice: price,
      volatilityRating: 'Stabil',
      volatilityPercentage: 0,
      totalRecords: 1,
      firstRecordedDate: new Date().toISOString(),
      lastUpdatedDate: new Date().toISOString(),
    };
  }

  const sorted = [...history].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const latest = sorted[sorted.length - 1];
  const previous = sorted.length > 1 ? sorted[sorted.length - 2] : null;

  const currentCost = latest.costPrice;
  const currentPrice = latest.sellingPrice;
  const currentMarginNominal = currentPrice - currentCost;
  const currentMarginPercent = currentPrice > 0 ? (currentMarginNominal / currentPrice) * 100 : 0;

  let costChangeNominal = 0;
  let costChangePercent = 0;
  let priceChangeNominal = 0;
  let priceChangePercent = 0;
  let marginChangePercent = 0;

  if (previous) {
    costChangeNominal = currentCost - previous.costPrice;
    costChangePercent = previous.costPrice > 0 ? (costChangeNominal / previous.costPrice) * 100 : 0;

    priceChangeNominal = currentPrice - previous.sellingPrice;
    priceChangePercent = previous.sellingPrice > 0 ? (priceChangeNominal / previous.sellingPrice) * 100 : 0;

    const prevMarginNominal = previous.sellingPrice - previous.costPrice;
    const prevMarginPercent = previous.sellingPrice > 0 ? (prevMarginNominal / previous.sellingPrice) * 100 : 0;
    marginChangePercent = currentMarginPercent - prevMarginPercent;
  }

  const allCosts = sorted.map((r) => r.costPrice);
  const allPrices = sorted.map((r) => r.sellingPrice);

  const lowestCost = Math.min(...allCosts);
  const highestCost = Math.max(...allCosts);
  const lowestPrice = Math.min(...allPrices);
  const highestPrice = Math.max(...allPrices);

  // Volatility calculation based on cost swing
  const costSpread = highestCost - lowestCost;
  const volatilityPercentage = lowestCost > 0 ? (costSpread / lowestCost) * 100 : 0;

  let volatilityRating: 'Stabil' | 'Moderat' | 'Fluktuatif' = 'Stabil';
  if (volatilityPercentage > 15) {
    volatilityRating = 'Fluktuatif';
  } else if (volatilityPercentage > 6) {
    volatilityRating = 'Moderat';
  }

  return {
    currentCost,
    currentPrice,
    currentMarginNominal,
    currentMarginPercent,
    costChangeNominal,
    costChangePercent,
    priceChangeNominal,
    priceChangePercent,
    marginChangePercent,
    lowestCost,
    highestCost,
    lowestPrice,
    highestPrice,
    volatilityRating,
    volatilityPercentage,
    totalRecords: sorted.length,
    firstRecordedDate: sorted[0].date,
    lastUpdatedDate: latest.date,
  };
}

/**
 * Exports price history to CSV file with UTF-8 BOM
 */
export function exportPriceHistoryCSV(product: Product, history: PriceHistoryRecord[]) {
  const sorted = [...history].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const headers = [
    'No',
    'Tanggal & Waktu',
    'SKU',
    'Barcode',
    'Nama Produk',
    'Tipe Perubahan',
    'Harga Modal / HPP (Rp)',
    'Harga Jual Retail (Rp)',
    'Laba Kotor Unit (Rp)',
    'Margin Laba (%)',
    'Referensi / No Faktur',
    'Supplier / Pemasok',
    'Dicatat Oleh',
    'Catatan / Keterangan',
  ];

  const changeTypeLabels: Record<string, string> = {
    initial_record: 'Registrasi Awal Katalog',
    purchase_receiving: 'Penerimaan Faktur Supplier (Kulakan)',
    manual_update: 'Penyesuaian Manual Kasir',
    bulk_adjust: 'Penyesuaian Massal',
    promotion: 'Penetapan Harga Promo',
  };

  const rows = sorted.map((rec, index) => {
    const grossProfit = rec.sellingPrice - rec.costPrice;
    const marginPct = rec.sellingPrice > 0 ? ((grossProfit / rec.sellingPrice) * 100).toFixed(1) : '0';
    const typeLabel = changeTypeLabels[rec.changeType] || rec.changeType;

    const escapeCsv = (val: string | number | undefined) => {
      const str = String(val ?? '');
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    return [
      index + 1,
      formatDate(rec.date),
      escapeCsv(product.sku),
      escapeCsv(product.barcode),
      escapeCsv(product.name),
      escapeCsv(typeLabel),
      rec.costPrice,
      rec.sellingPrice,
      grossProfit,
      `${marginPct}%`,
      escapeCsv(rec.sourceReference || '-'),
      escapeCsv(rec.supplierName || '-'),
      escapeCsv(rec.recordedBy || '-'),
      escapeCsv(rec.notes || '-'),
    ].join(',');
  });

  const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const safeSku = (product.sku || 'produk').replace(/[^a-zA-Z0-9_-]/g, '_');
  link.setAttribute('href', url);
  link.setAttribute('download', `riwayat_harga_${safeSku}_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

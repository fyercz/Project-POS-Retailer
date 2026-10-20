/**
 * HPP (harga pokok) satu baris transaksi, memperhitungkan satuan grosir.
 * Mis. 2 Dus isi 40 dengan modal Rp 2.750/pcs = 2 x (40 x 2.750), bukan 2 x 2.750.
 * Memakai harga modal yang TERSIMPAN di transaksi (saat barang dijual), bukan harga modal terkini.
 */
export interface CogsLine {
  quantity: number;
  product: { costPrice?: number };
  selectedUnit?: { multiplier?: number; costPrice?: number };
}

export function unitMultiplierOf(item: CogsLine): number {
  return Number(item.selectedUnit?.multiplier) || 1;
}

/** Jumlah unit dasar (pcs) dalam satu baris. */
export function baseUnitsOf(item: CogsLine): number {
  return (Number(item.quantity) || 0) * unitMultiplierOf(item);
}

export function lineCogs(item: CogsLine): number {
  const perSellingUnit =
    item.selectedUnit?.costPrice !== undefined
      ? Number(item.selectedUnit.costPrice) || 0
      : (Number(item.product?.costPrice) || 0) * unitMultiplierOf(item);
  return perSellingUnit * (Number(item.quantity) || 0);
}

/**
 * HPP barang retur yang DIKEMBALIKAN KE STOK (mengurangi HPP periode itu).
 * Barang retur yang tidak dikembalikan ke stok (rusak/dibuang) tetap menjadi biaya.
 * Harga modal diambil dari baris transaksi asal (harga modal saat dijual), bukan harga terkini.
 */
export interface ReturnLike {
  transactionId: string;
  items: Array<{ productId: string; quantity: number; restockToInventory?: boolean; unitMultiplier?: number }>;
}
export interface TxLike {
  id: string;
  items?: Array<CogsLine & { product: { id?: string; costPrice?: number } }>;
}

export function returnedCogs(ret: ReturnLike, transactionsById: Map<string, TxLike>): number {
  const tx = transactionsById.get(ret.transactionId);
  let total = 0;
  for (const it of ret.items || []) {
    if (!it.restockToInventory || !(Number(it.quantity) > 0)) continue;
    const mult = Number(it.unitMultiplier) || 1;
    const lines = (tx?.items || []).filter((l) => l.product?.id === it.productId);
    // Utamakan baris dengan isi satuan yang sama (mis. retur 1 Dus dari baris Dus)
    const line = lines.find((l) => unitMultiplierOf(l) === mult) || lines[0];
    if (!line) continue; // transaksi asal tidak ditemukan: tidak menebak
    const perSellingUnit = lineCogs({ ...line, quantity: 1 });
    const perBaseUnit = perSellingUnit / unitMultiplierOf(line);
    total += perBaseUnit * mult * Number(it.quantity);
  }
  return Math.round(total);
}

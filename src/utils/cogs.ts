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

/**
 * Pergerakan stok (murni, tanpa React). Dipakai aplikasi kasir DAN server LAN, sehingga
 * aturan stok di keduanya selalu sama.
 * Semua jumlah dalam satuan dasar (pcs): 2 Dus isi 12 = 24.
 */

export interface StockDelta {
  productId: string;
  /** negatif = keluar (jual), positif = masuk (retur/void) */
  delta: number;
}

export interface ReturnLine {
  productId: string;
  quantity: number;
  unitMultiplier: number;
}

const multiplierOf = (item: any): number => Number(item?.selectedUnit?.multiplier) || 1;

/** Stok yang keluar karena penjualan (dari keranjang atau dari transaksi). */
export function saleStockDeltas(items: any[] | undefined | null): StockDelta[] {
  if (!Array.isArray(items)) return [];
  return items
    .map((it) => ({
      productId: it?.product?.id || it?.productId,
      delta: -((Number(it?.quantity) || 1) * multiplierOf(it)),
    }))
    .filter((d) => Boolean(d.productId));
}

/** Barang retur yang dikembalikan ke stok (hanya yang ditandai restock & jumlah > 0). */
export function returnRestockLines(
  items: Array<{ productId: string; quantity: number; restockToInventory?: boolean; unitMultiplier?: number }>
): ReturnLine[] {
  return items
    .filter((item) => item.restockToInventory && item.quantity > 0)
    .map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
      unitMultiplier: item.unitMultiplier && item.unitMultiplier > 0 ? item.unitMultiplier : 1,
    }));
}

/**
 * Barang dari transaksi yang di-void, dikembalikan ke stok. Bila transaksi sudah diretur
 * sebagian (returnedAmount > 0), tidak ada yang dikembalikan otomatis agar tidak dobel.
 */
export function voidRestockLines(tx: { items?: any[]; returnedAmount?: number }): ReturnLine[] {
  if ((tx.returnedAmount || 0) > 0) return [];
  return (tx.items || [])
    .map((item: any) => ({
      productId: item?.product?.id || item?.productId,
      quantity: Number(item?.quantity) || 1,
      unitMultiplier: multiplierOf(item),
    }))
    .filter((l: ReturnLine) => Boolean(l.productId));
}

export function linesToDeltas(lines: ReturnLine[]): StockDelta[] {
  return lines.map((l) => ({ productId: l.productId, delta: l.quantity * l.unitMultiplier }));
}

/** Terapkan selisih stok ke daftar produk. Stok tidak pernah di bawah 0. Produk lain tidak berubah (objek sama). */
export function applyStockDeltas<T extends { id: string; stock: number }>(products: T[], deltas: StockDelta[]): T[] {
  if (deltas.length === 0) return products;
  const byProduct = new Map<string, number>();
  for (const d of deltas) byProduct.set(d.productId, (byProduct.get(d.productId) || 0) + d.delta);
  return products.map((p) => {
    const delta = byProduct.get(p.id);
    if (!delta) return p;
    return { ...p, stock: Math.max(0, (Number(p.stock) || 0) + delta) };
  });
}

/**
 * Status stok produk (murni, tanpa React).
 *
 * Membedakan "Belum ada stok" dari "Habis": produk hasil impor dari sistem lama yang stoknya 0 dan
 * belum pernah diisi (belum terima barang, belum opname, belum terjual) BUKAN masalah stok, jadi
 * tidak masuk peringatan. Dulu ribuan produk seperti ini membuat peringatan "habis/menipis"
 * selalu menyala sehingga peringatan yang penting (mis. barang kedaluwarsa) ikut diabaikan.
 */

export type StockStatus = 'unstocked' | 'out' | 'low' | 'ok';

export interface StockStatusProduct {
  id: string;
  stock: number;
  minStock: number;
  /** Diisi saat stok produk pertama kali tercatat > 0 (terima barang, opname, koreksi, input) */
  stockInitializedAt?: string;
}

/** ID produk yang punya riwayat stok: pernah terjual atau pernah diterima dari supplier. */
export function buildStockHistoryIds(
  transactions: Array<{ items?: Array<{ product?: { id?: string }; productId?: string }> }>,
  supplierPurchases: Array<{ items?: Array<{ productId?: string }> }> = []
): Set<string> {
  const ids = new Set<string>();
  for (const tx of transactions) for (const it of tx.items || []) {
    const id = it.product?.id || it.productId;
    if (id) ids.add(id);
  }
  for (const po of supplierPurchases) for (const it of po.items || []) if (it.productId) ids.add(it.productId);
  return ids;
}

export function stockStatusOf(p: StockStatusProduct, history?: Set<string>): StockStatus {
  const stock = Number(p.stock) || 0;
  if (stock > 0) return stock <= (Number(p.minStock) || 0) ? 'low' : 'ok';
  return p.stockInitializedAt || history?.has(p.id) ? 'out' : 'unstocked';
}

/** Perlu tindakan (masuk peringatan): habis setelah pernah ada stok, atau menipis. */
export function needsRestock(status: StockStatus): boolean {
  return status === 'out' || status === 'low';
}

export const STOCK_STATUS_LABEL: Record<StockStatus, string> = {
  unstocked: 'Belum ada stok',
  out: 'Habis',
  low: 'Menipis',
  ok: 'Aman',
};

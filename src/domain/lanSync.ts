/**
 * Deteksi perubahan produk untuk sinkron LAN (murni, tanpa React). Dipakai POSContext.
 *
 * "Baseline" = keadaan produk yang sudah diketahui server. Perubahan di luar itu dikirim:
 * data produk utuh bila isinya berubah, dan stok sebagai SELISIH (+/-) agar tidak menimpa
 * penjualan dari kasir lain. Perubahan yang server sudah tahu (penjualan, retur, void, stok dari
 * server) dicatat lewat markStockKnown sehingga tidak terkirim dua kali.
 */

export interface BaselineEntry<P> {
  stock: number;
  sig: string;
  /** Objek produk terakhir yang dicek (lewati bila objeknya sama persis) */
  ref?: P;
}

export type LanBaseline<P> = Map<string, BaselineEntry<P>>;

/** Tanda isi produk tanpa stok (stok dikirim terpisah sebagai selisih). */
export function productSignature(p: object): string {
  const { stock: _stock, ...rest } = p as any;
  try {
    return JSON.stringify(rest);
  } catch {
    return '';
  }
}

export function createBaseline<P extends { id: string; stock: number }>(products: P[]): LanBaseline<P> {
  return new Map(products.map((p) => [p.id, { stock: Number(p.stock) || 0, sig: productSignature(p), ref: p }]));
}

/** Catat perubahan stok yang sudah diketahui server. delta (relatif) atau newStock (mutlak). */
export function markStockKnown<P>(
  baseline: LanBaseline<P> | null | undefined,
  changes: Array<{ productId: string; delta?: number; newStock?: number }>
): void {
  if (!baseline) return;
  for (const c of changes) {
    const b = baseline.get(c.productId);
    if (!b) continue;
    b.stock = c.newStock !== undefined ? Number(c.newStock) || 0 : Math.max(0, b.stock + (c.delta || 0));
  }
}

/**
 * Bandingkan produk dengan baseline dan perbarui baseline. Mengembalikan produk yang perlu dikirim
 * (baru / isinya berubah) dan selisih stok yang perlu dikirim sebagai penyesuaian.
 */
export function diffAgainstBaseline<P extends { id: string; stock: number }>(
  baseline: LanBaseline<P>,
  products: P[]
): { changedProducts: P[]; stockDeltas: Array<{ productId: string; delta: number }> } {
  const changedProducts: P[] = [];
  const stockDeltas: Array<{ productId: string; delta: number }> = [];
  for (const p of products) {
    const b = baseline.get(p.id);
    if (b && b.ref === p) continue; // objek tidak berubah sejak terakhir dicek
    const stock = Number(p.stock) || 0;
    const sig = productSignature(p);
    if (!b) {
      changedProducts.push(p); // produk baru: server memakai stok yang dikirim
      baseline.set(p.id, { stock, sig, ref: p });
      continue;
    }
    b.ref = p;
    if (b.sig !== sig) {
      changedProducts.push(p);
      b.sig = sig;
    }
    if (b.stock !== stock) {
      stockDeltas.push({ productId: p.id, delta: stock - b.stock });
      b.stock = stock;
    }
  }
  return { changedProducts, stockDeltas };
}

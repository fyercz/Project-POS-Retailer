/**
 * Penyesuaian persediaan (murni, teruji): perubahan stok di luar transaksi (koreksi cepat, stock
 * opname CSV/AI, penyesuaian massal, edit stok di formulir) dicatat beserta NILAINYA (selisih x
 * harga modal saat itu). Dulu perubahan ini tidak dicatat pembukuan sehingga hanya muncul sebagai
 * "Selisih Belum Tercatat" di neraca.
 */
export interface StockAdjustment {
  id: string;
  date: string;
  productId: string;
  productName: string;
  delta: number; // + lebih (ditemukan), - kurang (hilang/rusak)
  unitCost: number;
  value: number; // delta x unitCost (negatif = kerugian)
  reason: string;
  recordedBy?: string;
}

export function makeStockAdjustments(
  before: Array<{ id: string; name: string; stock: number; costPrice: number }>,
  after: Array<{ id: string; stock: number }>,
  reason: string,
  recordedBy?: string,
  now: Date = new Date()
): StockAdjustment[] {
  const prev = new Map(before.map((p) => [p.id, p]));
  const out: StockAdjustment[] = [];
  for (const a of after) {
    const p = prev.get(a.id);
    if (!p) continue;
    const delta = Math.round((Number(a.stock) || 0) - (Number(p.stock) || 0));
    if (delta === 0) continue;
    const unitCost = Math.max(0, Number(p.costPrice) || 0);
    out.push({
      id: `adj-${now.getTime()}-${a.id}-${Math.random().toString(36).slice(2, 6)}`,
      date: now.toISOString(),
      productId: a.id,
      productName: p.name,
      delta,
      unitCost,
      value: Math.round(delta * unitCost),
      reason: reason || 'Penyesuaian stok',
      ...(recordedBy ? { recordedBy } : {}),
    });
  }
  return out;
}

/** Ringkasan nilai: kerugian (selisih kurang) & keuntungan (selisih lebih) dalam rentang tanggal. */
export function summarizeAdjustments(list: StockAdjustment[], startMs = 0, endMs = Number.MAX_SAFE_INTEGER) {
  let loss = 0;
  let gain = 0;
  for (const a of list || []) {
    const t = new Date(a.date).getTime();
    if (t < startMs || t > endMs) continue;
    if (a.value < 0) loss += -a.value;
    else gain += a.value;
  }
  return { loss: Math.round(loss), gain: Math.round(gain) };
}

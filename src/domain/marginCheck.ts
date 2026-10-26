/**
 * Pemeriksaan margin saat terima barang (murni, teruji). Dibandingkan dengan HARGA KULAKAN BARU
 * (bukan modal rata-rata): stok berikutnya akan dibeli dengan harga itu. Dulu harga kulakan yang
 * naik tidak memicu peringatan apa pun sehingga produk bisa terjual rugi tanpa diketahui.
 */
export type MarginStatus = 'loss' | 'thin' | 'ok';

export interface MarginResult {
  status: MarginStatus;
  marginRp: number; // harga jual - kulakan (per satuan jual)
  marginPct: number; // terhadap harga jual
  suggestedPrice: number;
}

/** Usulan harga: kulakan x (1 + margin minimal), dibulatkan KE ATAS ke kelipatan Rp 500. */
export function suggestPrice(cost: number, minMarginPct: number, roundTo = 500): number {
  const c = Math.max(0, Number(cost) || 0);
  if (c <= 0) return 0;
  const target = c * (1 + Math.max(0, Number(minMarginPct) || 0) / 100);
  let p = Math.ceil(target / roundTo) * roundTo;
  if (p <= c) p += roundTo; // selalu di atas kulakan
  return p;
}

export function checkMargin(sellingPrice: number, purchaseCost: number, minMarginPct = 10): MarginResult {
  const price = Math.max(0, Number(sellingPrice) || 0);
  const cost = Math.max(0, Number(purchaseCost) || 0);
  const marginRp = price - cost;
  const marginPct = price > 0 ? (marginRp / price) * 100 : -100;
  const status: MarginStatus = cost <= 0 ? 'ok' : marginRp <= 0 ? 'loss' : marginPct < minMarginPct ? 'thin' : 'ok';
  return { status, marginRp: Math.round(marginRp), marginPct: Math.round(marginPct * 10) / 10, suggestedPrice: suggestPrice(cost, minMarginPct) };
}

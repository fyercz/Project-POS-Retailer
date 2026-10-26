/**
 * Harga modal rata-rata tertimbang (murni, teruji).
 * Dipakai saat menerima barang: (stok lama x modal lama + jumlah beli x harga beli) / stok baru.
 * Dulu harga modal langsung diganti harga beli terbaru, sehingga nilai persediaan & HPP barang
 * yang sudah ada di rak ikut berubah tanpa transaksi apa pun.
 */
export function weightedAverageCost(oldStock: number, oldCost: number, qty: number, newCost: number): number {
  const s = Math.max(0, Number(oldStock) || 0);
  const c = Math.max(0, Number(oldCost) || 0);
  const q = Math.max(0, Number(qty) || 0);
  const n = Math.max(0, Number(newCost) || 0);
  if (n <= 0) return c; // harga beli tidak diisi: modal lama tetap
  if (s <= 0 || c <= 0 || q <= 0) return n; // belum ada stok bernilai: modal = harga beli
  return Math.round((s * c + q * n) / (s + q));
}

/**
 * Faktor biaya faktur: total yang dibayar / subtotal barang. Diskon & PPN tingkat faktur dibagi
 * proporsional ke setiap barang, sama seperti jurnal yang mencatat persediaan sebesar total
 * faktur. Dulu modal produk memakai harga SEBELUM diskon/PPN sehingga HPP terlalu kecil (PPN 11%:
 * laba tampak 11% x pembelian lebih besar) dan selisihnya menumpuk di "Selisih Belum Tercatat".
 * Catatan: untuk toko PKP yang mengkreditkan PPN Masukan, PPN seharusnya bukan bagian modal.
 */
export function invoiceCostFactor(po: { subtotal?: number; totalAmount?: number; finalTotal?: number }): number {
  const subtotal = Number(po.subtotal) || 0;
  const total = Number(po.finalTotal ?? po.totalAmount) || 0;
  if (subtotal <= 0 || total <= 0) return 1;
  return total / subtotal;
}

/** Modal per unit setelah diskon & PPN faktur (dibulatkan ke rupiah). */
export function landedUnitCost(unitCost: number, factor: number): number {
  return Math.round((Number(unitCost) || 0) * (Number(factor) || 1));
}

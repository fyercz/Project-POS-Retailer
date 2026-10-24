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

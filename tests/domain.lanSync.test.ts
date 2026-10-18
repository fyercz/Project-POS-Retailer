import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createBaseline, diffAgainstBaseline, markStockKnown } from '../src/domain/lanSync.ts';

const gula = { id: 'gula', name: 'Gula', price: 15000, stock: 10 };

test('produk baru dikirim utuh; objek yang sama tidak dikirim lagi', () => {
  const base = createBaseline<any>([]);
  const products = [gula];
  assert.deepEqual(diffAgainstBaseline(base, products).changedProducts, [gula]);
  const again = diffAgainstBaseline(base, products);
  assert.equal(again.changedProducts.length, 0);
  assert.equal(again.stockDeltas.length, 0);
});

test('edit harga -> kirim produk; stock opname -> kirim SELISIH, bukan angka mutlak', () => {
  const base = createBaseline<any>([gula]);
  const r1 = diffAgainstBaseline(base, [{ ...gula, price: 16000 }]);
  assert.equal(r1.changedProducts.length, 1);
  assert.equal(r1.stockDeltas.length, 0);

  const r2 = diffAgainstBaseline(base, [{ ...gula, price: 16000, stock: 15 }]);
  assert.equal(r2.changedProducts.length, 0, 'isi tidak berubah, hanya stok');
  assert.deepEqual(r2.stockDeltas, [{ productId: 'gula', delta: 5 }]);
});

test('perubahan yang server sudah tahu (penjualan, stok dari server) tidak dikirim balik', () => {
  const base = createBaseline<any>([gula]);
  // Penjualan 3 pcs: server memotong sendiri dari transaksi
  markStockKnown(base, [{ productId: 'gula', delta: -3 }]);
  assert.equal(diffAgainstBaseline(base, [{ ...gula, stock: 7 }]).stockDeltas.length, 0);
  // Stok terbaru dari server (penjualan kasir lain)
  markStockKnown(base, [{ productId: 'gula', newStock: 4 }]);
  assert.equal(diffAgainstBaseline(base, [{ ...gula, stock: 4 }]).stockDeltas.length, 0);
  markStockKnown(null, [{ productId: 'gula', delta: 1 }]); // tanpa baseline (mode Standalone): aman
});

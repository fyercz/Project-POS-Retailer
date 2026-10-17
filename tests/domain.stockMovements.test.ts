import { test } from 'node:test';
import assert from 'node:assert/strict';
import { saleStockDeltas, returnRestockLines, voidRestockLines, linesToDeltas, applyStockDeltas } from '../src/domain/stockMovements.ts';

const products = [
  { id: 'mie', stock: 100 },
  { id: 'aqua', stock: 5 },
  { id: 'gula', stock: 10 },
];

test('penjualan: satuan grosir dikali isi; baris produk sama dijumlah; stok tidak negatif', () => {
  const deltas = saleStockDeltas([
    { product: { id: 'mie' }, quantity: 2, selectedUnit: { multiplier: 12 } },
    { product: { id: 'mie' }, quantity: 3 },
    { product: { id: 'aqua' }, quantity: 9 },
  ]);
  const after = applyStockDeltas(products, deltas);
  assert.equal(after.find((p) => p.id === 'mie')!.stock, 100 - 24 - 3);
  assert.equal(after.find((p) => p.id === 'aqua')!.stock, 0, 'tidak di bawah 0');
  assert.equal(after.find((p) => p.id === 'gula'), products[2], 'produk lain objeknya tetap sama');
});

test('transaksi dari server (productId tanpa objek product) dihitung sama', () => {
  assert.deepEqual(saleStockDeltas([{ productId: 'gula', quantity: 1, selectedUnit: { multiplier: 40 } }]), [{ productId: 'gula', delta: -40 }]);
  assert.deepEqual(saleStockDeltas(undefined), []);
});

test('retur: hanya yang ditandai kembali ke stok, dikali isi satuan', () => {
  const lines = returnRestockLines([
    { productId: 'mie', quantity: 1, restockToInventory: true, unitMultiplier: 12 },
    { productId: 'aqua', quantity: 2, restockToInventory: false },
    { productId: 'gula', quantity: 0, restockToInventory: true },
  ]);
  assert.deepEqual(linesToDeltas(lines), [{ productId: 'mie', delta: 12 }]);
});

test('void: semua barang kembali; bila sudah diretur sebagian, tidak dikembalikan dua kali', () => {
  const tx = { items: [{ product: { id: 'mie' }, quantity: 2, selectedUnit: { multiplier: 12 } }] };
  assert.deepEqual(linesToDeltas(voidRestockLines(tx)), [{ productId: 'mie', delta: 24 }]);
  assert.deepEqual(voidRestockLines({ ...tx, returnedAmount: 5_000 }), []);
});

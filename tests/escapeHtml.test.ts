import { test } from 'node:test';
import assert from 'node:assert/strict';
import { escapeHtml, escapeTextFields } from '../src/utils/escapeHtml.ts';

test('escapeHtml: karakter HTML berbahaya diubah jadi teks biasa', () => {
  assert.equal(escapeHtml('<img src=x onerror="alert(1)">'), '&lt;img src=x onerror=&quot;alert(1)&quot;&gt;');
  assert.equal(escapeHtml("Kopi & Teh 'Asli'"), 'Kopi &amp; Teh &#39;Asli&#39;');
  assert.equal(escapeHtml(undefined), '');
  assert.equal(escapeHtml(1500), '1500');
});

test('escapeTextFields: hanya field teks yang di-escape, angka tetap', () => {
  const p = escapeTextFields({ name: '<b>Mie</b>', price: 3500, stock: 10 });
  assert.equal(p.name, '&lt;b&gt;Mie&lt;/b&gt;');
  assert.equal(p.price, 3500);
  assert.equal(p.stock, 10);
});

test('label QR rak: nama produk berisi skrip tidak ikut menjadi HTML aktif', async () => {
  const { generateSingleQrShelfLabelHtml } = await import('../src/utils/qrLabelGenerator.ts');
  const html = generateSingleQrShelfLabelHtml(
    { id: 'x', name: '<img src=x onerror=alert(1)>', brand: '<script>', sku: 'S1', barcode: '123', price: 1000, stock: 5, unit: 'pcs' } as any,
    '<svg></svg>',
    { storeName: '<b>Toko</b>', showBarcode: false, showCutLines: false } as any,
    'IDR'
  );
  assert.equal(html.includes('<img src=x'), false);
  assert.equal(html.includes('<script>'), false);
  assert.equal(html.includes('<b>Toko</b>'), false);
  assert.equal(html.includes('&lt;img src=x onerror=alert(1)&gt;'), true);
});

/**
 * Dua kasir (dua browser terpisah) yang terhubung ke server yang sama.
 * Membuktikan: produk baru dari kasir A sampai ke server, kasir B bisa menarik katalog,
 * penjualan dari kedua kasir memotong stok server dengan benar, dan penjualan saat jaringan
 * putus dikirim ulang otomatis tanpa dobel setelah jaringan kembali.
 */
import { test, expect, type APIRequestContext } from '@playwright/test';
import { registerOwner, addProduct, sellFirstProduct } from './helpers';

const BARCODE = '2000000000022';

async function serverStock(request: APIRequestContext): Promise<number | null> {
  const res = await request.get('/api/lan/data/pull');
  if (!res.ok()) return null;
  const data = await res.json();
  const p = (data.products || []).find((x: any) => x.barcode === BARCODE);
  return p ? Number(p.stock) : null;
}

test('dua kasir: stok server benar, katalog tersinkron, penjualan offline dikirim ulang', async ({ browser, request }) => {
  test.setTimeout(150_000);
  const ctxA = await browser.newContext();
  const ctxB = await browser.newContext();
  for (const ctx of [ctxA, ctxB]) {
    await ctx.addInitScript(() => {
      window.print = () => {};
    });
  }
  const a = await ctxA.newPage();
  const b = await ctxB.newPage();

  // Kasir A: daftar & tambah produk -> otomatis terkirim ke server
  await registerOwner(a, { owner: 'Kasir A', pin: '2580' });
  await addProduct(a, { name: 'Teh Botol 450ml', sku: 'TEH-450', barcode: BARCODE, cost: 3000, price: 5000, stock: 20 });
  await expect.poll(() => serverStock(request), { timeout: 20_000 }).toBe(20);

  // Kasir B: daftar & tarik katalog dari server
  await registerOwner(b, { owner: 'Kasir B', pin: '3691' });
  // Di layar desktop, Server LAN ada di menu "Pusat Alat & Sistem"
  await b.locator('#btn-tools-menu').click();
  await b.getByRole('button', { name: /Server LAN Multi-Kasir/ }).click();
  await b.locator('#btn-pull-master-db').click();
  await b.locator('#btn-close-lan-modal').click();
  await b.locator('#nav-btn-pos').click();
  await expect(b.locator('[id^="product-card-"]')).toHaveCount(1);

  // Masing-masing menjual 1 -> stok server 18 (tidak ada yang tertimpa)
  await sellFirstProduct(a, 5000);
  await expect.poll(() => serverStock(request), { timeout: 20_000 }).toBe(19);
  await sellFirstProduct(b, 5000);
  await expect.poll(() => serverStock(request), { timeout: 20_000 }).toBe(18);

  // Jaringan kasir A putus: penjualan masuk antrean, stok server belum berubah
  await ctxA.setOffline(true);
  await sellFirstProduct(a, 5000);
  await a.waitForTimeout(2_000);
  expect(await serverStock(request)).toBe(18);

  // Jaringan kembali: antrean dikirim ulang otomatis (timer 10 detik), dipotong SEKALI
  await ctxA.setOffline(false);
  await expect.poll(() => serverStock(request), { timeout: 45_000, intervals: [2_000] }).toBe(17);
  await a.waitForTimeout(12_000); // satu siklus kirim ulang lagi: tidak boleh dobel
  expect(await serverStock(request)).toBe(17);

  await ctxA.close();
  await ctxB.close();
});

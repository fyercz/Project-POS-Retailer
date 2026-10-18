/**
 * Dua kasir (dua browser terpisah) yang terhubung ke server yang sama.
 * Membuktikan: produk baru dari kasir A sampai ke server, kasir B bisa menarik katalog,
 * penjualan dari kedua kasir memotong stok server dengan benar, dan penjualan saat jaringan
 * putus dikirim ulang otomatis tanpa dobel setelah jaringan kembali.
 */
import { test, expect, type APIRequestContext } from '@playwright/test';
import { registerOwner, addProduct, sellProductByName } from './helpers';


async function serverStock(request: APIRequestContext, BARCODE: string): Promise<number | null> {
  const res = await request.get('/api/lan/data/pull');
  if (!res.ok()) return null;
  const data = await res.json();
  const p = (data.products || []).find((x: any) => x.barcode === BARCODE);
  return p ? Number(p.stock) : null;
}

test('dua kasir: stok server benar, katalog tersinkron, penjualan offline dikirim ulang', async ({ browser, request }) => {
  test.setTimeout(150_000);
  // Nama & barcode unik per percobaan (server dipakai bersama; percobaan ulang tidak tertukar)
  const retry = test.info().retry;
  const BARCODE = String(2000000000022 + retry * 10);
  const NAME = `Teh Botol 450ml #${retry + 1}`;
  const stockNow = () => serverStock(request, BARCODE);
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
  await addProduct(a, { name: NAME, sku: 'TEH-450', barcode: BARCODE, cost: 3000, price: 5000, stock: 20 });
  await expect.poll(stockNow, { timeout: 20_000 }).toBe(20);

  // Kasir B: daftar & tarik katalog dari server
  await registerOwner(b, { owner: 'Kasir B', pin: '3691' });
  // Di layar desktop, Server LAN ada di menu "Pusat Alat & Sistem"
  await b.locator('#btn-tools-menu').click();
  await b.getByRole('button', { name: /Server LAN Multi-Kasir/ }).click();
  await b.locator('#btn-pull-master-db').click();
  await b.locator('#btn-close-lan-modal').click();
  await b.locator('#nav-btn-pos').click();
  // Server dipakai bersama tes E2E lain, jadi bisa ada produk lain: cari produk ini berdasarkan nama
  // Diagnosa bila gagal: produk di server & kartu yang tampil di kasir B
  const serverList = ((await (await request.get('/api/lan/data/pull')).json()).products || [])
    .filter((x: any) => x.name === NAME)
    .map((x: any) => `${x.id}|${x.barcode}|stok=${x.stock}`);
  const cardIds = await b.locator('[id^="product-card-"]', { hasText: NAME }).evaluateAll((els) => els.map((e) => e.id));
  const aCardIds = await a.locator('[id^="product-card-"]', { hasText: NAME }).evaluateAll((els) => els.map((e) => e.id));
  await expect(
    b.locator('[id^="product-card-"]', { hasText: NAME }),
    `server=${JSON.stringify(serverList)} kartuB=${JSON.stringify(cardIds)} kartuA=${JSON.stringify(aCardIds)}`
  ).toHaveCount(1);

  // Masing-masing menjual 1 -> stok server 18 (tidak ada yang tertimpa)
  await sellProductByName(a, NAME, 5000);
  await expect.poll(stockNow, { timeout: 20_000 }).toBe(19);
  await sellProductByName(b, NAME, 5000);
  await expect.poll(stockNow, { timeout: 20_000 }).toBe(18);

  // Jaringan kasir A putus: penjualan masuk antrean, stok server belum berubah
  await ctxA.setOffline(true);
  await sellProductByName(a, NAME, 5000);
  await a.waitForTimeout(2_000);
  expect(await stockNow()).toBe(18);

  // Jaringan kembali: antrean dikirim ulang otomatis (timer 10 detik), dipotong SEKALI
  await ctxA.setOffline(false);
  await expect.poll(stockNow, { timeout: 45_000, intervals: [2_000] }).toBe(17);
  await a.waitForTimeout(12_000); // satu siklus kirim ulang lagi: tidak boleh dobel
  expect(await stockNow()).toBe(17);

  await ctxA.close();
  await ctxB.close();
});

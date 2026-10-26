/**
 * Penyesuaian persediaan: stock opname CSV & koreksi stok cepat dicatat beserta nilainya dan
 * dijurnal (6050 beban / 4040 pendapatan). Diperiksa dua tahap: tertulis, lalu bertahan setelah reload.
 */
import { test, expect, type Page } from '@playwright/test';
import { registerOwner, addProduct, readStored } from './helpers';

const adjustments = async (page: Page) =>
  (await readStored(page, 'pos_stock_adjustments')).map((a: any) => `${a.productName}:${a.delta}:${a.value}`).sort();

test('opname CSV & koreksi stok cepat tercatat bernilai dan masuk Buku Jurnal', async ({ page }) => {
  test.setTimeout(180_000);
  page.on('dialog', (d) => d.accept().catch(() => {}));
  await registerOwner(page, { store: 'Toko Selisih' });
  await addProduct(page, { name: 'Susu Kotak', sku: 'SUS-1', barcode: '2000000006001', cost: 4000, price: 5000, stock: 20 });
  await addProduct(page, { name: 'Mie Instan', sku: 'MIE-1', barcode: '2000000006002', cost: 2500, price: 3500, stock: 40 });

  // Stock opname CSV: Susu kurang 2 (-8.000), Mie lebih 1 (+2.500)
  await page.locator('#nav-btn-inventory').click();
  await page.locator('#btn-dropdown-audit').click();
  await page.getByText('Stock Opname CSV / Excel').click();
  const csv = ['barcode,sku,nama_produk,stok_tercatat,stok_fisik_hitung', '2000000006001,SUS-1,Susu Kotak,20,18', '2000000006002,MIE-1,Mie Instan,40,41'].join('\n');
  await page.getByRole('dialog').locator('input[type="file"]').setInputFiles({ name: 'opname.csv', mimeType: 'text/csv', buffer: Buffer.from(csv) });
  await page.locator('#btn-mode-set').click();
  await page.locator('#btn-submit-stocktake-csv').click();
  await page.locator('#btn-confirm-apply-stocktake').click();
  await expect.poll(() => adjustments(page), { timeout: 10_000 }).toEqual(['Mie Instan:1:2500', 'Susu Kotak:-2:-8000']);

  // Koreksi stok cepat: Susu 18 -> 15 (-12.000)
  await page.keyboard.press('Escape');
  await page.locator('tr', { hasText: 'Susu Kotak' }).first().getByTitle('Koreksi Stok Cepat').click();
  await page.getByRole('button', { name: /Set Fisik/ }).click();
  await page.getByLabel('Jumlah koreksi stok').fill('15');
  await page.getByRole('button', { name: 'Terapkan Koreksi' }).click();
  const expected = ['Mie Instan:1:2500', 'Susu Kotak:-2:-8000', 'Susu Kotak:-3:-12000'];
  await expect.poll(() => adjustments(page), { timeout: 10_000, message: 'sebelum reload' }).toEqual(expected);

  // Muncul di Buku Jurnal Umum
  await page.locator('#nav-btn-reports').click();
  await page.getByRole('button', { name: /Buku Jurnal Umum/ }).first().click();
  await expect(page.getByText(/Penyesuaian stok Susu Kotak \(-2\)/).first()).toBeVisible();
  await expect(page.getByText(/Penyesuaian stok Mie Instan \(\+1\)/).first()).toBeVisible();

  await page.reload();
  await expect.poll(() => adjustments(page), { timeout: 15_000 }).toEqual(expected);
});

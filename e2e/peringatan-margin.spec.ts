/**
 * Peringatan margin saat terima barang: harga jual saat ini vs harga kulakan baru. Rugi tampil di
 * baris formulir; setelah faktur diproses, Owner bisa langsung menyimpan harga jual baru (usulan
 * kulakan + margin minimal, dibulatkan Rp 500), tercatat di Riwayat Harga.
 */
import { test, expect } from '@playwright/test';
import { registerOwner, addProduct, readStored } from './helpers';

test('harga kulakan naik melewati harga jual: peringatan rugi, usulan harga, simpan', async ({ page }) => {
  test.setTimeout(180_000);
  await registerOwner(page, { store: 'Toko Margin' });
  await addProduct(page, { name: 'Gula Margin 1kg', sku: 'GLM-1', barcode: '2000000007001', cost: 4500, price: 5000, stock: 10 });

  await page.locator('#nav-btn-inventory').click();
  await page.getByRole('button', { name: /Faktur Masuk/ }).first().click();
  await page.locator('#btn-open-receiving-tab').click();
  await page.getByLabel('Nama Supplier / Distributor').selectOption('Supplier Lainnya / Grosir Lokal');
  const picker = page.getByRole('combobox', { name: 'Produk diterima' });
  await picker.click();
  await picker.fill('Gula Margin');
  await page.getByRole('option', { name: /Gula Margin 1kg/ }).click();
  await page.getByLabel('Jumlah diterima').fill('10');
  await page.getByLabel('Harga modal per unit').first().fill('5200');
  // Peringatan langsung di baris, sebelum faktur diproses
  await expect(page.getByTestId('receiving-margin-0')).toContainText('RUGI');
  await expect(page.getByTestId('receiving-margin-0')).toContainText('200');

  await page.getByRole('button', { name: /Proses & Tambah ke Stok Toko/ }).click();
  const dlg = page.getByRole('dialog', { name: /Periksa Harga Jual/ });
  await expect(dlg).toBeVisible();
  await expect(dlg.getByLabel('Harga jual baru Gula Margin 1kg')).toHaveValue('6000'); // 5.200 x 1,1 -> 6.000
  await dlg.getByRole('button', { name: 'Simpan Harga Jual Baru' }).click();
  await expect(dlg.getByText('1 harga jual diperbarui')).toBeVisible();

  const state = async () => {
    const p = (await readStored(page, 'pos_retail_products_v3')).find((x: any) => x.name === 'Gula Margin 1kg');
    const h = (p?.priceHistory || []).find((x: any) => x.sellingPrice === 6000);
    return `${p?.price}|${h ? /Penerimaan faktur/.test(h.sourceReference) : false}`;
  };
  await expect.poll(state, { timeout: 10_000, message: 'sebelum reload' }).toBe('6000|true');
  await page.reload();
  await expect.poll(state, { timeout: 15_000 }).toBe('6000|true');
});

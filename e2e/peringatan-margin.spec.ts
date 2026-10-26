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

test('PPN faktur masuk modal: margin yang tampak aman ternyata rugi, termasuk satuan Dus', async ({ page }) => {
  test.setTimeout(180_000);
  await registerOwner(page, { store: 'Toko PPN' });
  // Produk dengan satuan Dus isi 10 seharga 52.000
  await page.locator('#nav-btn-inventory').click();
  await page.locator('#btn-add-product').click();
  await page.getByTestId('product-name').fill('Teh PPN 350ml');
  await page.getByTestId('product-category').selectOption({ index: 1 });
  await page.getByTestId('product-sku').fill('TEH-PPN');
  await page.getByTestId('product-barcode').fill('2000000007002');
  await page.getByTestId('product-cost').fill('4500');
  await page.getByTestId('product-price').fill('5500');
  await page.getByTestId('product-stock').fill('10');
  await page.getByRole('button', { name: /\+ Satuan Grosir/ }).click();
  await page.getByLabel('Nama Satuan').last().fill('Dus');
  await page.getByLabel(/Isi \/ Multiplier/).last().fill('10');
  await page.getByLabel('Harga Jual Grosir (Rp)').last().fill('52000');
  await page.getByTestId('product-submit').click();
  await expect(page.getByTestId('product-submit')).toBeHidden();

  await page.getByRole('button', { name: /Faktur Masuk/ }).first().click();
  await page.locator('#btn-open-receiving-tab').click();
  await page.getByLabel('Nama Supplier / Distributor').selectOption('Supplier Lainnya / Grosir Lokal');
  const picker = page.getByRole('combobox', { name: 'Produk diterima' });
  await picker.click();
  await picker.fill('Teh PPN');
  await page.getByRole('option', { name: /Teh PPN 350ml/ }).click();
  await page.getByLabel('Jumlah diterima').fill('10');
  await page.getByLabel('Harga modal per unit').first().fill('5000');
  // Tanpa PPN: margin 9% (tipis, bukan rugi)
  await expect(page.getByTestId('receiving-margin-0')).not.toContainText('RUGI');
  // Dengan PPN 11%: modal 5.550 > jual 5.500 -> rugi; Dus 55.500 > 52.000 -> rugi
  await page.getByLabel('Tarif PPN Masukan').selectOption('11');
  const badge = page.getByTestId('receiving-margin-0');
  await expect(badge).toContainText('RUGI');
  await expect(badge).toContainText('modal setelah diskon/PPN');
  await expect(badge).toContainText('Dus: RUGI');

  await page.getByRole('button', { name: /Proses & Tambah ke Stok Toko/ }).click();
  const dlg = page.getByRole('dialog', { name: /Periksa Harga Jual/ });
  await expect(dlg).toContainText('Teh PPN 350ml (Dus)');
  await dlg.getByRole('button', { name: 'Nanti Saja' }).click();

  // Modal rata-rata memakai harga setelah PPN: (10 x 4.500 + 10 x 5.550) / 20 = 5.025
  await expect
    .poll(async () => (await readStored(page, 'pos_retail_products_v3')).find((p: any) => p.name === 'Teh PPN 350ml')?.costPrice, { timeout: 10_000 })
    .toBe(5025);
});

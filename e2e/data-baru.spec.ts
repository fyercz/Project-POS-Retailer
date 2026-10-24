/**
 * Data baru lewat FORMULIR seperti pengguna sungguhan, lalu dipakai, lalu dicek setelah muat ulang:
 * produk baru -> supplier baru -> terima barang dari supplier baru (modal rata-rata tertimbang)
 * -> member baru didaftarkan dari layar kasir -> belanja atas nama member -> reload.
 */
import { test, expect } from '@playwright/test';
import { registerOwner, addProduct, readStored } from './helpers';

const PRODUCT = 'Teh Botol Baru 350ml';
const SUPPLIER = 'CV Sumber Baru Uji';
const MEMBER = 'Bu Uji Baru';

test('produk, supplier, faktur, dan member baru dibuat lewat formulir, dipakai, dan bertahan setelah reload', async ({ page }) => {
  test.setTimeout(180_000);
  await page.addInitScript(() => {
    window.print = () => {};
  });
  await registerOwner(page, { store: 'Toko Data Baru' });

  // 1. Produk baru
  await addProduct(page, { name: PRODUCT, sku: 'TBB-350', barcode: '2000000000992', cost: 4000, price: 5000, stock: 20 });

  // 2. Supplier baru
  await page.locator('#nav-btn-inventory').click();
  await page.getByRole('button', { name: /Supplier Mitra/ }).first().click();
  await page.locator('#btn-add-supplier').click();
  await page.getByLabel('Nama Perusahaan / Supplier / Distributor').fill(SUPPLIER);
  await page.getByLabel('Nomor Telepon / WhatsApp (Opsional)').fill('0811000222');
  await page.getByLabel('Termin Pembayaran Default').selectOption('Tempo 14 Hari');
  await page.getByRole('dialog').locator('button[type="submit"]').click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByText(SUPPLIER).first()).toBeVisible();

  // 3. Terima barang dari supplier baru: termin terisi dari data supplier; modal rata-rata tertimbang
  await page.getByRole('button', { name: /Faktur Masuk/ }).first().click();
  await page.locator('#btn-open-receiving-tab').click();
  await page.getByLabel('Nama Supplier / Distributor').selectOption(SUPPLIER); // label: 'Nama (Kategori)'
  await expect(page.getByLabel('Syarat Pembayaran')).toHaveValue('Tempo 14 Hari');
  const picker = page.getByRole('combobox', { name: 'Produk diterima' });
  await picker.click();
  await picker.fill('Teh Botol Baru');
  await page.getByRole('option', { name: new RegExp(PRODUCT) }).click();
  await page.getByLabel('Jumlah diterima').fill('10');
  await page.getByLabel('Harga modal per unit').first().fill('4600');
  await page.getByRole('button', { name: /Proses & Tambah ke Stok Toko/ }).click();
  await expect(page.getByRole('button', { name: /Proses & Tambah ke Stok Toko/ })).toHaveCount(0);

  await expect.poll(async () => (await readStored(page, 'pos_retail_products_v3')).find((p: any) => p.name === PRODUCT)?.costPrice, { timeout: 10_000 }).toBe(4200);

  // 4. Member baru didaftarkan dari layar kasir, lalu belanja 3 barang atas namanya
  await page.locator('#nav-btn-pos').click();
  const card = page.locator('[id^="product-card-"]', { hasText: PRODUCT }).first();
  for (let i = 0; i < 3; i++) await card.click();
  // Baris lipat keranjang berlabel "Member, Voucher & Poin"
  await expect(page.locator('#btn-cart-extras')).toContainText('Member');
  await page.locator('#btn-cart-extras').click();
  await page.getByRole('button', { name: /Pilih Member/ }).first().click();
  await page.getByRole('button', { name: /\+ Member Baru/ }).click();
  await page.getByLabel('Nama Lengkap Member').fill(MEMBER);
  await page.getByLabel('Nomor Handphone / WhatsApp').fill('081299990000');
  await page.getByLabel('Tier Member Awal').selectOption('Silver');
  await page.getByRole('button', { name: /Daftarkan & Pilih Member Ini/ }).click();
  await expect(page.locator('#btn-cart-extras')).toContainText(MEMBER); // nama member tampil di baris keranjang
  await page.locator('#btn-checkout-pay').click();
  await page.getByTestId('payment-cash-input').fill('20000');
  await page.locator('#btn-confirm-complete-payment').click();
  await page.getByTestId('receipt-close').click();

  // 5. Muat ulang: semua data baru tetap ada & saling terhubung
  await page.reload();
  await expect.poll(async () => (await readStored(page, 'pos_retail_customers_v3')).find((c: any) => c.name === MEMBER)?.ordersCount, { timeout: 15_000 }).toBe(1);
  const product = (await readStored(page, 'pos_retail_products_v3')).find((p: any) => p.name === PRODUCT);
  expect(product?.stock).toBe(27);
  expect(product?.costPrice).toBe(4200);
  expect((await readStored(page, 'pos_retail_suppliers_v2')).some((s: any) => s.name === SUPPLIER)).toBe(true);
  const po = (await readStored(page, 'pos_supplier_purchases_v2')).find((p: any) => p.supplierName === SUPPLIER);
  expect(po?.paymentTerms).toBe('Tempo 14 Hari');

  // Tampil juga di halaman Member
  await page.locator('#nav-btn-customers').click();
  await expect(page.getByText(MEMBER).first()).toBeVisible();
});

test('kategori baru (dari formulir produk) & voucher manual (dari Pengaturan) dipakai di kasir dan bertahan setelah reload', async ({ page }) => {
  test.setTimeout(180_000);
  await page.addInitScript(() => {
    window.print = () => {};
  });
  await registerOwner(page, { store: 'Toko Kategori Voucher' });

  // 1. Produk dengan kategori baru yang dibuat langsung dari formulir produk
  await page.locator('#nav-btn-inventory').click();
  await page.locator('#btn-add-product').click();
  await page.getByTestId('product-name').fill('Nugget Ayam Beku 500g');
  await page.getByTestId('btn-new-category').click();
  await page.getByTestId('new-category-name').fill('Frozen Food Uji');
  await page.getByTestId('save-new-category').click();
  await expect(page.getByTestId('product-category')).toHaveValue('c_frozen_food_uji');
  await page.getByTestId('product-sku').fill('NUG-500');
  await page.getByTestId('product-barcode').fill('2000000000993');
  await page.getByTestId('product-cost').fill('20000');
  await page.getByTestId('product-price').fill('25000');
  await page.getByTestId('product-stock').fill('10');
  await page.getByTestId('product-submit').click();
  await expect(page.getByTestId('product-submit')).toBeHidden();

  // 2. Voucher manual dari Pengaturan (tanpa AI)
  await page.locator('#btn-employee-menu').click();
  await page.locator('#menu-item-settings').click();
  await page.getByTestId('voucher-code').fill('UJI5RB');
  await page.getByTestId('voucher-type').selectOption('fixed');
  await page.getByTestId('voucher-value').fill('5000');
  await page.getByTestId('voucher-min').fill('20000');
  await page.getByTestId('voucher-create').click();
  await expect(page.getByText(/Voucher UJI5RB dibuat/)).toBeVisible();
  await page.keyboard.press('Escape');

  // 3. Kasir: filter kategori baru, pasang voucher, bayar
  await page.locator('#nav-btn-pos').click();
  await page.getByRole('button', { name: /Frozen Food Uji/ }).first().click();
  const card = page.locator('[id^="product-card-"]', { hasText: 'Nugget Ayam Beku 500g' }).first();
  await expect(card).toBeVisible();
  await card.click();
  await page.locator('#btn-cart-extras').click();
  await page.getByLabel('Kode promo / voucher...').fill('UJI5RB');
  await page.getByRole('button', { name: 'Pakai', exact: true }).click();
  await page.locator('#btn-checkout-pay').click();
  await page.getByTestId('payment-cash-input').fill('20000');
  await page.locator('#btn-confirm-complete-payment').click();
  await page.getByTestId('receipt-close').click();

  // 4. Muat ulang: kategori, voucher, dan transaksi bervoucher tetap ada
  await page.reload();
  await expect.poll(async () => (await readStored(page, 'pos_retail_tx_v3')).find((t: any) => t.voucherCode === 'UJI5RB')?.finalTotal, { timeout: 15_000 }).toBe(20000);
  const product = (await readStored(page, 'pos_retail_products_v3')).find((p: any) => p.name === 'Nugget Ayam Beku 500g');
  expect(product?.categoryId).toBe('c_frozen_food_uji');
  await page.locator('#nav-btn-pos').click();
  await expect(page.getByRole('button', { name: /Frozen Food Uji/ }).first()).toBeVisible();
});

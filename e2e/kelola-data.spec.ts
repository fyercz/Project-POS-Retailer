/**
 * Pengelolaan data lewat tampilan (kelompok 🟠), diakhiri muat ulang & cek data tersimpan:
 * edit harga produk (riwayat harga), koreksi stok, hapus produk, hapus banyak produk,
 * koreksi poin member, edit & hapus supplier, hapus karyawan, hapus voucher.
 */
import { test, expect, type Page } from '@playwright/test';
import { registerOwner, addProduct, addEmployee, readStored } from './helpers';

const products = (page: Page) => readStored(page, 'pos_retail_products_v3');
const row = (page: Page, text: string) => page.locator('tr', { hasText: text }).first();

test.beforeEach(async ({ page }) => {
  page.on('dialog', (d) => d.accept().catch(() => {}));
});

test('produk: edit harga tercatat di riwayat, koreksi stok, hapus satu, hapus banyak', async ({ page }) => {
  test.setTimeout(180_000);
  await registerOwner(page, { store: 'Toko Kelola' });
  await addProduct(page, { name: 'Teh Kotak 200ml', sku: 'TEH-200', barcode: '2000000001001', cost: 3000, price: 4000, stock: 20 });
  await addProduct(page, { name: 'Roti Tawar', sku: 'RTI-1', barcode: '2000000001002', cost: 12000, price: 15000, stock: 5 });
  await addProduct(page, { name: 'Biskuit Susu', sku: 'BSK-1', barcode: '2000000001003', cost: 6000, price: 8000, stock: 5 });
  await addProduct(page, { name: 'Wafer Coklat', sku: 'WFR-1', barcode: '2000000001004', cost: 5000, price: 7000, stock: 5 });

  // Edit harga jual
  await row(page, 'Teh Kotak 200ml').getByRole('button', { name: 'Edit Data Item Barang' }).click();
  await page.getByTestId('product-price').fill('4500');
  await page.getByTestId('product-submit').click();
  await expect(page.getByTestId('product-submit')).toBeHidden();

  // Koreksi stok: set fisik 17
  await row(page, 'Teh Kotak 200ml').getByTitle('Koreksi Stok Cepat').click();
  await page.getByRole('button', { name: /Set Fisik/ }).click();
  await page.getByLabel('Jumlah koreksi stok').fill('17');
  await page.getByRole('button', { name: 'Terapkan Koreksi' }).click();

  // Hapus satu produk
  await row(page, 'Roti Tawar').getByRole('button', { name: 'Hapus Produk dari Master Data' }).click();
  await page.getByRole('button', { name: 'Ya, Hapus Produk' }).click();

  // Hapus banyak sekaligus
  await page.getByRole('checkbox', { name: 'Pilih Biskuit Susu' }).check();
  await page.getByRole('checkbox', { name: 'Pilih Wafer Coklat' }).check();
  await page.getByRole('button', { name: /Hapus.*2/ }).first().click();
  await page.getByRole('button', { name: 'Hapus 2 Produk' }).click();
  // Tahap 1: perubahan benar-benar tertulis ke penyimpanan (bila tidak -> bug), tahap 2: tetap ada setelah reload
  await expect.poll(async () => (await products(page)).map((p: any) => p.name), { timeout: 10_000, message: 'sebelum reload' }).toEqual(['Teh Kotak 200ml']);

  await page.reload();
  await expect.poll(async () => (await products(page)).map((p: any) => p.name), { timeout: 15_000 }).toEqual(['Teh Kotak 200ml']);
  const teh = (await products(page))[0];
  expect(teh.name).toBe('Teh Kotak 200ml');
  expect(teh.price).toBe(4500);
  expect(teh.stock).toBe(17);
  expect((teh.priceHistory || []).some((h: any) => h.sellingPrice === 4500 || h.price === 4500 || h.newPrice === 4500)).toBe(true);
});

test('member: koreksi poin manual tercatat', async ({ page }) => {
  test.setTimeout(180_000);
  await registerOwner(page, { store: 'Toko Member' });
  await page.locator('#nav-btn-customers').click();
  await page.getByRole('button', { name: /\+ Tambah Member/ }).click();
  const newTab = page.getByRole('button', { name: /\+ Member Baru/ });
  if (await newTab.isVisible().catch(() => false)) await newTab.click();
  await page.getByLabel('Nama Lengkap Member').fill('Pak Poin');
  await page.getByLabel('Nomor Handphone / WhatsApp').fill('081311112222');
  await page.getByRole('dialog').locator('button[type="submit"]').click();
  await expect(page.getByRole('dialog')).toHaveCount(0);

  await page.getByRole('button', { name: 'Detail' }).first().click(); // daftar member berbentuk kartu
  await page.getByRole('button', { name: /Sesuaikan Poin/ }).click();
  await page.getByRole('button', { name: /Tambah Poin \(\+\)/ }).click();
  await page.getByLabel('Jumlah Poin').fill('50');
  await page.getByLabel('Alasan / Keterangan').fill('Bonus pembukaan toko');
  await page.getByRole('button', { name: 'Simpan Penyesuaian' }).click();
  await expect.poll(async () => (await readStored(page, 'pos_retail_customers_v3')).find((c: any) => c.name === 'Pak Poin')?.points, { timeout: 10_000, message: 'sebelum reload' }).toBe(50);

  await page.reload();
  await expect.poll(async () => (await readStored(page, 'pos_retail_customers_v3')).find((c: any) => c.name === 'Pak Poin')?.points, { timeout: 15_000 }).toBe(50);
});

test('supplier: edit nama lalu hapus', async ({ page }) => {
  test.setTimeout(180_000);
  await registerOwner(page, { store: 'Toko Supplier' });
  await page.locator('#nav-btn-inventory').click();
  await page.getByRole('button', { name: /Supplier Mitra/ }).first().click();
  await page.locator('#btn-add-supplier').click();
  await page.getByLabel('Nama Perusahaan / Supplier / Distributor').fill('CV Lama');
  await page.getByRole('dialog').locator('button[type="submit"]').click();
  await expect(page.getByRole('dialog')).toHaveCount(0);

  await page.getByRole('button', { name: 'Edit Supplier' }).first().click();
  await page.getByLabel('Nama Perusahaan / Supplier / Distributor').fill('CV Baru Jaya');
  await page.getByRole('dialog').locator('button[type="submit"]').click();
  await expect(page.getByText('CV Baru Jaya').first()).toBeVisible();
  await expect.poll(async () => (await readStored(page, 'pos_retail_suppliers_v2')).map((s: any) => s.name)).toEqual(['CV Baru Jaya']);

  await page.getByRole('button', { name: 'Hapus Supplier' }).first().click();
  await page.getByRole('button', { name: /Ya, Hapus Supplier/ }).click();
  await expect.poll(async () => (await readStored(page, 'pos_retail_suppliers_v2')).length, { timeout: 10_000, message: 'sebelum reload' }).toBe(0);

  await page.reload();
  await expect.poll(async () => (await readStored(page, 'pos_retail_suppliers_v2')).length, { timeout: 15_000 }).toBe(0);
});

test('karyawan & voucher bisa dihapus', async ({ page }) => {
  test.setTimeout(180_000);
  await registerOwner(page, { store: 'Toko Hapus' });
  await addEmployee(page, { name: 'Rudi Sementara', role: 'cashier', pin: '7351' });
  await page.locator('#btn-employee-menu').click();
  await page.locator('#menu-item-manage-employees').click();
  await page.locator('div', { hasText: 'Rudi Sementara' }).getByRole('button', { name: 'Hapus Karyawan' }).last().click();
  await page.keyboard.press('Escape');

  await page.locator('#btn-employee-menu').click();
  await page.locator('#menu-item-settings').click();
  await page.getByTestId('voucher-code').fill('HAPUSAKU');
  await page.getByTestId('voucher-type').selectOption('fixed');
  await page.getByTestId('voucher-value').fill('1000');
  await page.getByTestId('voucher-create').click();
  await expect(page.getByText(/Voucher HAPUSAKU dibuat/)).toBeVisible();
  await page.locator('div', { hasText: /^HAPUSAKU/ }).getByRole('button').last().click();
  await expect.poll(async () => (await readStored(page, 'pos_vouchers')).some((v: any) => v.code === 'HAPUSAKU'), { timeout: 10_000, message: 'voucher terhapus, sebelum reload' }).toBe(false);
  await expect.poll(async () => (await readStored(page, 'pos_employees_v2')).some((e: any) => e.name === 'Rudi Sementara'), { timeout: 10_000, message: 'karyawan terhapus, sebelum reload' }).toBe(false);

  await page.reload();
  await expect.poll(async () => (await readStored(page, 'pos_employees_v2')).some((e: any) => e.name === 'Rudi Sementara'), { timeout: 15_000 }).toBe(false);
  expect((await readStored(page, 'pos_vouchers')).some((v: any) => v.code === 'HAPUSAKU')).toBe(false);
});

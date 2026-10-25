/**
 * Aksi tersisa lewat tampilan, diperiksa dua tahap (tertulis, lalu bertahan setelah reload):
 * diskon sambutan member (klaim/lepas), lepas voucher, tukar poin, hapus pesanan parkir,
 * hapus pengeluaran, ganti kasir cepat, aturan stok minimal, hapus transaksi uji coba.
 */
import { test, expect, type Page } from '@playwright/test';
import { registerOwner, addProduct, addEmployee, lockAndLogin, sellProductByName, readStored } from './helpers';

const customers = (page: Page) => readStored(page, 'pos_retail_customers_v3');
const txs = (page: Page) => readStored(page, 'pos_retail_tx_v3');

test.beforeEach(async ({ page }) => {
  page.on('dialog', (d) => d.accept().catch(() => {}));
  await page.addInitScript(() => {
    window.print = () => {};
  });
});

async function openSettings(page: Page) {
  await page.locator('#btn-employee-menu').click();
  await page.locator('#menu-item-settings').click();
}

test('member di kasir: klaim & lepas diskon sambutan, lepas voucher, tukar poin', async ({ page }) => {
  test.setTimeout(180_000);
  await registerOwner(page, { store: 'Toko Poin' });
  await addProduct(page, { name: 'Beras Uji 5kg', sku: 'BRS-5', barcode: '2000000003001', cost: 50000, price: 60000, stock: 10 });
  await openSettings(page);
  await page.getByTestId('voucher-code').fill('LEPAS1');
  await page.getByTestId('voucher-type').selectOption('fixed');
  await page.getByTestId('voucher-value').fill('1000');
  await page.getByTestId('voucher-create').click();
  await expect(page.getByText(/Voucher LEPAS1 dibuat/)).toBeVisible();
  await page.keyboard.press('Escape');

  // Member baru + 100 poin
  await page.locator('#nav-btn-customers').click();
  await page.getByRole('button', { name: /\+ Tambah Member/ }).click();
  const newTab = page.getByRole('button', { name: /\+ Member Baru/ });
  if (await newTab.isVisible().catch(() => false)) await newTab.click();
  await page.getByLabel('Nama Lengkap Member').fill('Bu Tukar');
  await page.getByLabel('Nomor Handphone / WhatsApp').fill('081355556666');
  await page.getByRole('dialog').locator('button[type="submit"]').click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('button', { name: 'Detail' }).first().click();
  await page.getByRole('button', { name: /Sesuaikan Poin/ }).click();
  await page.getByRole('button', { name: /Tambah Poin \(\+\)/ }).click();
  await page.getByLabel('Jumlah Poin').fill('100');
  await page.getByLabel('Alasan / Keterangan').fill('Saldo awal');
  await page.getByRole('button', { name: 'Simpan Penyesuaian' }).click();
  await expect.poll(async () => (await customers(page))[0]?.points).toBe(100);
  await page.keyboard.press('Escape');

  // Kasir: pilih member yang sudah ada
  await page.locator('#nav-btn-pos').click();
  await page.locator('[id^="product-card-"]', { hasText: 'Beras Uji 5kg' }).first().click();
  await page.locator('#btn-cart-extras').click();
  await page.getByRole('button', { name: /Pilih Member/ }).first().click();
  await page.getByLabel('Cari nama member, nomor WhatsApp...').fill('Bu Tukar');
  await page.getByRole('dialog').getByText('Bu Tukar').first().click();
  await expect(page.locator('#btn-cart-extras')).toContainText('Bu Tukar');

  // Diskon sambutan: klaim -> lepas -> klaim lagi
  await page.getByRole('button', { name: 'Klaim Cepat' }).click();
  await expect(page.locator('#btn-cart-extras')).toContainText(/hemat/);
  await page.getByTitle('Hapus diskon khusus member ini').click();
  await expect(page.getByRole('button', { name: 'Klaim Cepat' })).toBeVisible();
  await page.getByRole('button', { name: 'Klaim Cepat' }).click();

  // Voucher: pasang lalu lepas
  await page.getByLabel('Kode promo / voucher...').fill('LEPAS1');
  await page.getByRole('button', { name: 'Pakai', exact: true }).click();
  await page.getByRole('button', { name: 'Lepas voucher' }).click();
  await expect(page.getByRole('button', { name: 'Lepas voucher' })).toHaveCount(0);

  // Tukar poin
  await page.getByRole('button', { name: 'Gunakan', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Aktif', exact: true })).toBeVisible();

  await page.locator('#btn-checkout-pay').click();
  await page.getByTestId('payment-cash-input').fill('60000');
  await page.locator('#btn-confirm-complete-payment').click();
  await page.getByTestId('receipt-close').click();

  // poin ditukar | voucher (harus terlepas) | saldo poin = 100 - ditukar + diperoleh | diskon member terpakai
  const check = async () => {
    const t = (await txs(page))[0];
    const c = (await customers(page))[0];
    if (!t || !c) return 'belum tersimpan';
    return `${t.pointsUsed > 0}|${t.voucherCode ?? '-'}|${c.points === 100 - t.pointsUsed + (t.pointsEarned || 0)}|${t.discountAmount > (t.pointsDiscount || 0) ? 'ada-diskon-member' : 'tanpa-diskon'}`;
  };
  await expect.poll(check, { timeout: 10_000, message: 'sebelum reload' }).toBe('true|-|true|ada-diskon-member');
  await page.reload();
  await expect.poll(check, { timeout: 15_000 }).toBe('true|-|true|ada-diskon-member');
});

test('hapus pesanan parkir & hapus pengeluaran', async ({ page }) => {
  test.setTimeout(180_000);
  await registerOwner(page, { store: 'Toko Hapus Parkir' });
  await addProduct(page, { name: 'Kecap Manis 600ml', sku: 'KCP-1', barcode: '2000000003002', cost: 18000, price: 22000, stock: 10 });
  await page.locator('#nav-btn-pos').click();
  await page.locator('[id^="product-card-"]', { hasText: 'Kecap Manis 600ml' }).first().click();
  await page.locator('#btn-hold-order').click();
  await expect.poll(async () => (await readStored(page, 'pos_held_orders')).length).toBe(1);
  await page.locator('#btn-open-held-orders').click();
  await page.getByRole('button', { name: 'Hapus pesanan parkir' }).click();
  await expect.poll(async () => (await readStored(page, 'pos_held_orders')).length, { message: 'sebelum reload' }).toBe(0);

  await page.keyboard.press('Escape');
  await sellProductByName(page, 'Kecap Manis 600ml', 25000); // shift berjalan
  await page.locator('#nav-btn-reports').click();
  await page.getByRole('button', { name: /Buku Jurnal Umum/ }).first().click();
  await page.getByRole('button', { name: /Catat Beban Kas Keluar/ }).click();
  await page.getByLabel('Nominal Pengeluaran (Rp)').fill('15000');
  await page.getByLabel('Keterangan Pengeluaran').fill('Salah catat');
  await page.getByLabel('Kategori Beban Operasional').selectOption({ index: 1 });
  await page.getByRole('button', { name: /Simpan Beban & Jurnal/ }).click();
  await expect.poll(async () => (await readStored(page, 'pos_operational_expenses')).length).toBe(1);
  await page.getByRole('button', { name: 'Hapus pengeluaran Salah catat' }).click();
  await expect.poll(async () => (await readStored(page, 'pos_operational_expenses')).length, { message: 'sebelum reload' }).toBe(0);

  await page.reload();
  await expect.poll(async () => (await readStored(page, 'pos_held_orders')).length + (await readStored(page, 'pos_operational_expenses')).length, { timeout: 15_000 }).toBe(0);
});

test('ganti kasir cepat, aturan stok minimal, hapus transaksi uji coba', async ({ page }) => {
  test.setTimeout(180_000);
  await registerOwner(page, { store: 'Toko Ganti' });
  await addProduct(page, { name: 'Minyak Uji 1L', sku: 'MNY-U', barcode: '2000000003003', cost: 15000, price: 18000, stock: 0 });
  await addEmployee(page, { name: 'Siti Kasir', role: 'cashier', pin: '4826' });

  // Ganti kasir cepat ke jabatan lebih rendah: tanpa PIN
  await page.locator('#btn-employee-menu').click();
  await page.locator('#menu-item-manage-employees').click();
  await page.locator('div', { hasText: 'Siti Kasir' }).getByRole('button', { name: 'Login sebagai karyawan ini' }).last().click();
  await expect(page.locator('#btn-employee-menu')).toContainText('Siti');
  await expect.poll(async () => (await page.evaluate(() => document.querySelector('#btn-employee-menu')?.textContent || ''))).toContain('Siti');
  // Kembali ke Owner: wajib PIN
  await lockAndLogin(page, 'Pak Uji', '2580');

  // Terima 40 unit: stok minimal otomatis 50% = 20; lalu aturan 25% -> 10
  await page.locator('#nav-btn-inventory').click();
  await page.getByRole('button', { name: /Faktur Masuk/ }).first().click();
  await page.locator('#btn-open-receiving-tab').click();
  await page.getByLabel('Nama Supplier / Distributor').selectOption('Supplier Lainnya / Grosir Lokal');
  const picker = page.getByRole('combobox', { name: 'Produk diterima' });
  await picker.click();
  await picker.fill('Minyak Uji');
  await page.getByRole('option', { name: /Minyak Uji 1L/ }).click();
  await page.getByLabel('Jumlah diterima').fill('40');
  await page.getByLabel('Harga modal per unit').first().fill('15000');
  await page.getByRole('button', { name: /Proses & Tambah ke Stok Toko/ }).click();
  const minStock = async () => (await readStored(page, 'pos_retail_products_v3')).find((p: any) => p.name === 'Minyak Uji 1L')?.minStock;
  await expect.poll(minStock).toBe(20);
  await openSettings(page);
  await page.getByLabel('Persentase Batas Minimal (% Order)').fill('25');
  await page.getByRole('button', { name: /Terapkan Aturan 25% ke Semua Produk Sekarang/ }).click();
  await expect.poll(minStock, { message: 'sebelum reload' }).toBe(10);
  await page.keyboard.press('Escape');

  // Hapus transaksi uji coba
  await sellProductByName(page, 'Minyak Uji 1L', 20000);
  await expect.poll(async () => (await txs(page)).length).toBe(1);
  await openSettings(page);
  await page.getByRole('button', { name: 'Hapus Transaksi Uji Coba', exact: true }).first().click();
  await page.getByRole('button', { name: /Hapus 1 Transaksi Uji Coba/ }).click();
  await page.getByRole('button', { name: 'Ya, Hapus', exact: true }).click();
  await expect.poll(async () => (await txs(page)).length, { message: 'sebelum reload' }).toBe(0);

  await page.reload();
  await expect.poll(async () => `${(await txs(page)).length}|${await minStock()}`, { timeout: 15_000 }).toBe('0|10');
});

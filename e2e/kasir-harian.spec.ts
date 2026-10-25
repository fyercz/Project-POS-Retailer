/**
 * Aksi kasir harian lewat tampilan, diakhiri muat ulang & cek data tersimpan:
 * keranjang (jumlah, satuan grosir, catatan, hapus, kosongkan), parkir & lanjutkan pesanan,
 * retur & void (Owner langsung; Kasir wajib PIN atasan), pengeluaran, modal awal laci.
 */
import { test, expect, type Page } from '@playwright/test';
import { registerOwner, addProduct, addEmployee, lockAndLogin, sellProductByName, readStored, readStoredValue } from './helpers';

const stockOf = async (page: Page, name: string) => (await readStored(page, 'pos_retail_products_v3')).find((p: any) => p.name === name)?.stock;
const txs = (page: Page) => readStored(page, 'pos_retail_tx_v3');

const logs: string[] = [];
test.beforeEach(async ({ page }) => {
  logs.length = 0;
  page.on('console', (m) => {
    if (/\[(void|retur|posStorage)\]|shift|Shift/.test(m.text())) logs.push(m.text().slice(0, 160));
  });
  page.on('dialog', (d) => d.accept().catch(() => {}));
  await page.addInitScript(() => {
    window.print = () => {};
  });
});

test('keranjang: jumlah, satuan grosir, catatan, parkir & lanjutkan, hapus item, kosongkan', async ({ page }) => {
  test.setTimeout(180_000);
  await registerOwner(page, { store: 'Toko Keranjang' });
  // Produk dengan satuan grosir Dus isi 10
  await page.locator('#nav-btn-inventory').click();
  await page.locator('#btn-add-product').click();
  await page.getByTestId('product-name').fill('Air Mineral 600ml');
  await page.getByTestId('product-category').selectOption({ index: 1 });
  await page.getByTestId('product-sku').fill('AIR-600');
  await page.getByTestId('product-barcode').fill('2000000000994');
  await page.getByTestId('product-cost').fill('2500');
  await page.getByTestId('product-price').fill('3500');
  await page.getByTestId('product-stock').fill('100');
  await page.getByRole('button', { name: /\+ Satuan Grosir/ }).click();
  await page.getByLabel('Nama Satuan').last().fill('Dus');
  await page.getByLabel(/Isi \/ Multiplier/).last().fill('10');
  await page.getByLabel('Harga Jual Grosir (Rp)').last().fill('32000');
  await page.getByTestId('product-submit').click();
  await expect(page.getByTestId('product-submit')).toBeHidden();
  await addProduct(page, { name: 'Permen Jahe', sku: 'PMN-1', barcode: '2000000000995', cost: 400, price: 500, stock: 50 });

  await page.locator('#nav-btn-pos').click();
  await page.locator('[id^="product-card-"]', { hasText: 'Air Mineral 600ml' }).first().click();
  await page.getByRole('button', { name: 'Tambah jumlah Air Mineral 600ml' }).click(); // 2
  await page.getByRole('button', { name: 'Dus', exact: true }).click(); // 2 Dus = 20 botol
  await page.getByRole('button', { name: '+ Catatan' }).click();
  await page.getByLabel('Masukkan catatan item...').fill('tanpa plastik');
  await page.getByRole('button', { name: 'Simpan catatan' }).click();

  // Parkir lalu lanjutkan: isi keranjang (satuan & catatan) kembali utuh
  await page.locator('#btn-hold-order').click();
  await expect(page.locator('#pos-cart-panel')).not.toContainText('tanpa plastik');
  await page.locator('#btn-open-held-orders').click();
  await page.getByRole('button', { name: /Lanjutkan Pesanan/ }).click();
  await expect(page.getByText('tanpa plastik')).toBeVisible();

  await page.locator('#btn-checkout-pay').click();
  await page.getByTestId('payment-cash-input').fill('70000');
  await page.locator('#btn-confirm-complete-payment').click();
  await page.getByTestId('receipt-close').click();

  // Hapus item (kurangi dari 1) & kosongkan keranjang
  await page.locator('[id^="product-card-"]', { hasText: 'Permen Jahe' }).first().click();
  await page.getByRole('button', { name: 'Hapus Permen Jahe dari keranjang' }).click();
  await expect(page.getByRole('button', { name: 'Hapus Permen Jahe dari keranjang' })).toHaveCount(0);
  await page.locator('[id^="product-card-"]', { hasText: 'Permen Jahe' }).first().click();
  await page.locator('#btn-clear-cart').click();
  await expect(page.getByRole('button', { name: /Permen Jahe dari keranjang/ })).toHaveCount(0);

  await page.reload();
  await expect.poll(async () => (await txs(page)).length, { timeout: 15_000 }).toBe(1);
  const t = (await txs(page))[0];
  expect(t.items[0].selectedUnit?.name).toBe('Dus');
  expect(t.items[0].quantity).toBe(2);
  expect(t.items[0].notes).toBe('tanpa plastik');
  expect(t.finalTotal).toBe(64000);
  expect(await stockOf(page, 'Air Mineral 600ml')).toBe(80);
  expect(await stockOf(page, 'Permen Jahe')).toBe(50);
  expect((await readStored(page, 'pos_held_orders')).length).toBe(0);
});

test('retur & void oleh Owner: stok kembali, penyetuju tercatat', async ({ page }) => {
  test.setTimeout(180_000);
  await registerOwner(page, { store: 'Toko Retur' });
  await addProduct(page, { name: 'Sabun Cuci 800g', sku: 'SBN-800', barcode: '2000000000996', cost: 15000, price: 19000, stock: 10 });
  await page.locator('#nav-btn-pos').click();
  const card = page.locator('[id^="product-card-"]', { hasText: 'Sabun Cuci 800g' }).first();
  await card.click();
  await card.click();
  await page.locator('#btn-checkout-pay').click();
  await page.getByTestId('payment-cash-input').fill('40000');
  await page.locator('#btn-confirm-complete-payment').click();
  await page.getByTestId('receipt-close').click();
  await sellProductByName(page, 'Sabun Cuci 800g', 20000);
  await expect.poll(() => stockOf(page, 'Sabun Cuci 800g')).toBe(7);

  // Retur 1 dari nota pertama (2 barang), kembali ke stok, tunai
  await page.locator('#nav-btn-transactions').click();
  await page.getByRole('button', { name: 'Retur' }).last().click();
  await page.getByRole('button', { name: 'Tambah' }).first().click();
  await page.getByLabel('Alasan Retur').first().selectOption({ index: 1 });
  await page.getByRole('dialog').locator('input[type="checkbox"]').first().check(); // kembalikan ke stok (bawaan: tidak)
  await page.getByRole('button', { name: 'Tunai', exact: true }).click();
  await page.getByRole('button', { name: /Konfirmasi & Proses Retur/ }).click();
  await expect.poll(() => stockOf(page, 'Sabun Cuci 800g'), { message: `log: ${JSON.stringify(logs)}` }).toBe(8);

  // Void nota kedua
  await page.getByRole('button', { name: 'Batalkan / Void Transaksi' }).first().click();
  await page.getByRole('button', { name: 'Konfirmasi Void' }).click();
  await expect.poll(() => stockOf(page, 'Sabun Cuci 800g')).toBe(9);

  await page.reload();
  await expect.poll(async () => (await txs(page)).filter((t: any) => t.status === 'void').length, { timeout: 15_000 }).toBe(1);
  const voided = (await txs(page)).find((t: any) => t.status === 'void');
  expect(voided.voidedBy).toBe('Pak Uji');
  const ret = await readStored(page, 'pos_sales_returns');
  expect(ret.length).toBe(1);
  expect(ret[0].totalRefundAmount).toBe(19000);
  expect(ret[0].authorizedBy).toBe('Pak Uji');
  expect(await stockOf(page, 'Sabun Cuci 800g')).toBe(9);
});

test('kasir tidak bisa void tanpa PIN atasan; PIN salah ditolak, PIN Owner diterima', async ({ page }) => {
  test.setTimeout(180_000);
  await registerOwner(page, { store: 'Toko PIN' });
  await addProduct(page, { name: 'Gula Pasir 1kg', sku: 'GLA-1', barcode: '2000000000997', cost: 16500, price: 18500, stock: 10 });
  await addEmployee(page, { name: 'Siti Kasir', role: 'cashier', pin: '4826' });
  await lockAndLogin(page, 'Siti Kasir', '4826');
  await sellProductByName(page, 'Gula Pasir 1kg', 20000);

  await page.locator('#nav-btn-transactions').click();
  await page.getByRole('button', { name: 'Batalkan / Void Transaksi' }).first().click();
  // Bukan langsung konfirmasi void: wajib PIN Supervisor/Owner
  await expect(page.getByRole('button', { name: 'Konfirmasi Void' })).toHaveCount(0);
  await expect(page.getByLabel('PIN Otoritas')).toBeVisible();
  await page.getByLabel('PIN Otoritas').fill('4826'); // PIN kasir sendiri: ditolak
  await page.getByLabel('PIN Otoritas').press('Enter');
  await expect(page.getByLabel('PIN Otoritas')).toBeVisible();
  await page.getByLabel('PIN Otoritas').fill('2580'); // PIN Owner
  await page.getByLabel('PIN Otoritas').press('Enter');
  await page.getByRole('button', { name: 'Konfirmasi Void' }).click();
  await expect(page.getByRole('alert').filter({ hasText: /ditolak/ })).toHaveCount(0);
  await expect.poll(async () => (await txs(page)).find((t: any) => t.status === 'void')?.voidedBy, { timeout: 10_000, message: `sebelum reload; log: ${JSON.stringify(logs)}` }).toBe('Pak Uji');

  await page.reload();
  await expect.poll(async () => (await txs(page)).find((t: any) => t.status === 'void')?.voidedBy, { timeout: 15_000 }).toBe('Pak Uji');
  expect(await stockOf(page, 'Gula Pasir 1kg')).toBe(10);
});

test('pengeluaran & modal awal laci tercatat dan bertahan setelah reload', async ({ page }) => {
  test.setTimeout(180_000);
  await registerOwner(page, { store: 'Toko Kas' });
  await addProduct(page, { name: 'Kopi Sachet', sku: 'KOP-1', barcode: '2000000000998', cost: 1100, price: 1500, stock: 50 });
  await sellProductByName(page, 'Kopi Sachet', 2000); // shift berjalan

  await page.locator('#nav-btn-reports').click();
  await page.getByRole('button', { name: /Buku Jurnal Umum/ }).first().click();
  await page.getByRole('button', { name: /Catat Beban Kas Keluar/ }).click();
  await page.getByLabel('Nominal Pengeluaran (Rp)').fill('25000');
  await page.getByLabel('Keterangan Pengeluaran').fill('Beli galon air');
  await page.getByLabel('Kategori Beban Operasional').selectOption({ index: 1 });
  await page.getByRole('button', { name: /Simpan Beban & Jurnal/ }).click();

  await page.locator('#btn-employee-menu').click();
  await page.locator('#menu-item-shift-report').click();
  await page.getByRole('button', { name: 'Ubah', exact: true }).first().click();
  await page.getByLabel('Uang di laci saat shift dimulai').fill('150000');
  await page.getByRole('button', { name: 'Simpan', exact: true }).first().click();
  await expect(page.getByRole('dialog')).toContainText('150.000');
  await expect.poll(async () => (await readStoredValue(page, 'pos_current_shift_v1'))?.startingCash, { timeout: 10_000, message: `sebelum reload; log: ${JSON.stringify(logs)}` }).toBe(150000);
  await page.keyboard.press('Escape');

  await page.reload();
  await expect.poll(async () => (await readStored(page, 'pos_operational_expenses')).find((e: any) => e.description === 'Beli galon air')?.amount, { timeout: 15_000 }).toBe(25000);
  expect((await readStoredValue(page, 'pos_current_shift_v1'))?.startingCash).toBe(150000);
});

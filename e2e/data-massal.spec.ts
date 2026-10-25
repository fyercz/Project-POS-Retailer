/**
 * Operasi data massal lewat tampilan (kelompok 🟡), diperiksa dua tahap (tertulis lalu bertahan
 * setelah reload): impor CSV format toko (titik koma) tanpa duplikat saat diulang, hapus data
 * impor (produk manual tetap), backup -> hapus -> restore, stock opname dengan CSV.
 */
import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';
import { registerOwner, addProduct, readStored } from './helpers';

const products = (page: Page) => readStored(page, 'pos_retail_products_v3');
const names = async (page: Page) => (await products(page)).map((p: any) => p.name).sort();

// Format persis file impor toko (produk_import_stock_bookmark_ulilmart_fixed8.csv)
const STORE_CSV = [
  'barcode;nama_produk;harga_beli;harga_jual;stok;kategori',
  '8997204670622;5DAYS CHOCO BANANA 60G;5342;6500;0;snacks',
  '8999909096004;A MILD 16;35425;44000;7;tobacco',
  '8997225560568;ABAH NAGET AYAM 250G;10500;13000;3;fresh',
].join('\n');

async function openAudit(page: Page, itemSelector: string) {
  await page.locator('#nav-btn-inventory').click();
  const item = page.locator(itemSelector).first();
  if (!(await item.isVisible().catch(() => false))) await page.locator('#btn-dropdown-audit').click();
  await item.click();
}

async function importStoreCsv(page: Page) {
  await openAudit(page, '#btn-import-direct-file');
  const dlg = page.locator('[role="dialog"]', { hasText: 'Impor File Produk Langsung' }).last();
  await dlg.locator('input[type="file"]').setInputFiles({ name: 'produk-toko.csv', mimeType: 'text/csv', buffer: Buffer.from(STORE_CSV) });
  // Bukti: isi file masuk ke area teks & tombol impor aktif
  await expect(dlg.locator('textarea').first(), `log: ${JSON.stringify(logs)}`).toHaveValue(/A MILD 16/, { timeout: 10_000 });
  await expect(page.getByRole('button', { name: /Impor \d+ Produk Langsung/ }), `log: ${JSON.stringify(logs)}`).toBeEnabled({ timeout: 10_000 });
  await page.getByRole('button', { name: /Impor \d+ Produk Langsung/ }).click();
  await page.keyboard.press('Escape');
}

const logs: string[] = [];
test.beforeEach(async ({ page }) => {
  logs.length = 0;
  page.on('pageerror', (e) => logs.push(`pageerror: ${e.message.slice(0, 200)}`));
  page.on('console', (m) => {
    if (m.type() === 'error' || m.type() === 'warning') logs.push(`${m.type()}: ${m.text().slice(0, 200)}`);
  });
  page.on('dialog', (d) => d.accept().catch(() => {}));
});

test('impor CSV format toko, impor ulang tanpa duplikat, hapus data impor (produk manual tetap)', async ({ page }) => {
  test.setTimeout(180_000);
  await registerOwner(page, { store: 'Toko Impor' });
  await addProduct(page, { name: 'Produk Manual', sku: 'MAN-1', barcode: '2000000002001', cost: 1000, price: 1500, stock: 5 });

  await importStoreCsv(page);
  await expect.poll(() => names(page), { timeout: 10_000 }).toEqual(['5DAYS CHOCO BANANA 60G', 'A MILD 16', 'ABAH NAGET AYAM 250G', 'Produk Manual']);
  const mild = (await products(page)).find((p: any) => p.name === 'A MILD 16');
  expect(mild.barcode).toBe('8999909096004');
  expect(mild.costPrice).toBe(35425);
  expect(mild.price).toBe(44000);
  expect(mild.stock).toBe(7);

  // Impor ulang file yang sama: barcode sudah ada -> dilewati, katalog tidak ganda
  await importStoreCsv(page);
  await expect.poll(async () => (await products(page)).length, { timeout: 10_000 }).toBe(4);

  // Hapus data impor: hanya produk hasil impor
  await openAudit(page, '#btn-clear-imported');
  await page.getByRole('button', { name: /Ya, Hapus Semua Data Impor/ }).click();
  await expect.poll(() => names(page), { timeout: 10_000, message: 'sebelum reload' }).toEqual(['Produk Manual']);
  await page.reload();
  await expect.poll(() => names(page), { timeout: 15_000 }).toEqual(['Produk Manual']);
});

test('backup diunduh, data dihapus, lalu dipulihkan dari file', async ({ page }, testInfo) => {
  test.setTimeout(180_000);
  await registerOwner(page, { store: 'Toko Backup' });
  await addProduct(page, { name: 'Barang Penting', sku: 'PNT-1', barcode: '2000000002002', cost: 5000, price: 7000, stock: 12 });

  await page.locator('#btn-employee-menu').click();
  await page.locator('#menu-item-backup-restore').click();
  const downloadPromise = page.waitForEvent('download', { timeout: 20_000 }).catch(() => null);
  await page.getByRole('button', { name: /Unduh Cadangan \.JSON/ }).first().click(); // tombol unduh di bagian atas jendela
  const download = await downloadPromise;
  expect(download, `unduhan tidak terjadi; notifikasi: ${await page.locator('[role="status"],[role="alert"]').allInnerTexts().catch(() => [])}; log: ${JSON.stringify(logs)}`).not.toBeNull();
  const file = testInfo.outputPath('cadangan.json');
  await download!.saveAs(file);
  expect(fs.readFileSync(file, 'utf8')).toContain('Barang Penting');
  await page.keyboard.press('Escape');

  // Hapus produk
  await page.locator('#nav-btn-inventory').click();
  await page.locator('tr', { hasText: 'Barang Penting' }).first().getByRole('button', { name: 'Hapus Produk dari Master Data' }).click();
  await page.getByRole('button', { name: 'Ya, Hapus Produk' }).click();
  await expect.poll(async () => (await products(page)).length).toBe(0);

  // Pulihkan dari file
  await page.locator('#btn-employee-menu').click();
  await page.locator('#menu-item-backup-restore').click();
  await page.getByRole('button', { name: /Ekspor & Impor Berkas/ }).click(); // tab unggah berkas
  await page.locator('input[type="file"][accept*="json"]').setInputFiles(file);
  await page.getByRole('button', { name: /Lanjutkan Pemulihan Berkas Terverifikasi/ }).click();
  await page.getByRole('button', { name: /Ya, Saya Yakin/ }).click();
  await expect.poll(() => names(page), { timeout: 10_000, message: 'sebelum reload' }).toEqual(['Barang Penting']);
  await page.reload();
  await expect.poll(async () => (await products(page)).find((p: any) => p.name === 'Barang Penting')?.stock, { timeout: 15_000 }).toBe(12);
});

test('stock opname dengan CSV: stok disetel sesuai hitungan fisik', async ({ page }) => {
  test.setTimeout(180_000);
  await registerOwner(page, { store: 'Toko Opname' });
  await addProduct(page, { name: 'Susu Kotak', sku: 'SUS-1', barcode: '2000000002003', cost: 4000, price: 5000, stock: 20 });
  await addProduct(page, { name: 'Mie Instan', sku: 'MIE-1', barcode: '2000000002004', cost: 2500, price: 3500, stock: 40 });

  await page.locator('#nav-btn-inventory').click();
  await page.locator('#btn-dropdown-audit').click();
  await page.getByText('Stock Opname CSV / Excel').click();
  const csv = ['barcode,sku,nama_produk,stok_tercatat,stok_fisik_hitung', '2000000002003,SUS-1,Susu Kotak,20,18', '2000000002004,MIE-1,Mie Instan,40,41'].join('\n');
  await page.getByRole('dialog').locator('input[type="file"]').setInputFiles({ name: 'opname.csv', mimeType: 'text/csv', buffer: Buffer.from(csv) });
  await page.locator('#btn-mode-set').click();
  await page.locator('#btn-submit-stocktake-csv').click(); // tinjau dulu, lalu konfirmasi
  await page.locator('#btn-confirm-apply-stocktake').click();

  const stock = async () => Object.fromEntries((await products(page)).map((p: any) => [p.name, p.stock]));
  await expect.poll(stock, { timeout: 10_000, message: 'sebelum reload' }).toEqual({ 'Susu Kotak': 18, 'Mie Instan': 41 });
  await page.reload();
  await expect.poll(stock, { timeout: 15_000 }).toEqual({ 'Susu Kotak': 18, 'Mie Instan': 41 });
});

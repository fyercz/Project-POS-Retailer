/**
 * Alur logistik: terima barang tempo (dengan pencarian produk) -> stok bertambah ->
 * lunasi hutang -> retur supplier -> stok berkurang.
 */
import { test, expect, type Page } from '@playwright/test';
import { registerOwner, addProduct } from './helpers';

const NAME = `Minyak Goreng 1L ${Date.now() % 100000}`;
const BARCODE = `20000${String(Date.now()).slice(-8)}`;

async function rowStock(page: Page): Promise<string> {
  await page.locator('#nav-btn-inventory').click();
  await page.getByRole('button', { name: /Semua Produk/ }).first().click();
  await page.getByPlaceholder(/Cari nama produk/).fill(NAME);
  const row = page.locator('tr', { hasText: NAME }).first();
  await expect(row).toBeVisible();
  return row.innerText();
}

test('terima barang tempo -> stok bertambah -> lunasi hutang -> retur supplier', async ({ page }) => {
  test.setTimeout(120_000);
  await page.addInitScript(() => {
    window.print = () => {};
  });
  await registerOwner(page);
  await addProduct(page, { name: NAME, sku: `MNY-${BARCODE.slice(-4)}`, barcode: BARCODE, cost: 15000, price: 18000, stock: 5 });

  // --- Terima barang (tempo 30 hari)
  await page.getByRole('button', { name: /Faktur Masuk/ }).first().click();
  await page.locator('#btn-open-receiving-tab').click();
  await page.getByLabel('Nama Supplier / Distributor').selectOption('Supplier Lainnya / Grosir Lokal');
  await page.getByLabel('Syarat Pembayaran').selectOption('Tempo 30 Hari');
  const picker = page.getByRole('combobox', { name: 'Produk diterima' });
  await picker.click();
  await picker.fill(NAME.slice(0, 12));
  await page.getByRole('option', { name: new RegExp(NAME) }).click();
  await page.getByLabel('Jumlah diterima').fill('10');
  await page.getByLabel('Harga modal per unit').first().fill('15000');
  await page.getByRole('button', { name: /Proses & Tambah ke Stok Toko/ }).click();
  await expect(page.getByRole('button', { name: /Proses & Tambah ke Stok Toko/ })).toHaveCount(0);

  // --- Lunasi hutang dari detail faktur
  await page.getByRole('button', { name: /Lihat Faktur/ }).first().click();
  await expect(page.getByText(/Hutang Tempo/)).toBeVisible();
  await page.getByRole('button', { name: 'Lunasi' }).click();
  await page.getByLabel('Sumber dana pembayaran').selectOption('bank_transfer');
  await page.getByRole('button', { name: 'Catat Pembayaran' }).click();
  await expect(page.getByText('LUNAS', { exact: true })).toBeVisible();
  await page.keyboard.press('Escape');

  // --- Stok 5 + 10 = 15
  expect(await rowStock(page)).toMatch(/\b15\b/);

  // --- Retur 2 ke supplier -> stok 13
  await page.getByRole('button', { name: /Retur Supplier/ }).first().click();
  await page.locator('#btn-open-return-tab').click();
  await page.getByLabel('Nama Supplier Tujuan').selectOption('Supplier Lainnya / Grosir Lokal');
  await page.getByLabel('Alasan Retur Supplier').selectOption({ index: 1 });
  const rpicker = page.getByRole('combobox', { name: 'Produk diretur' });
  await rpicker.click();
  await rpicker.fill(NAME.slice(0, 12));
  await page.getByRole('option', { name: new RegExp(NAME) }).click();
  await page.getByLabel('Jumlah diretur').fill('2');
  await page.getByRole('button', { name: /Proses Retur & Potong Stok Toko/ }).click();
  await expect(page.getByRole('button', { name: /Proses Retur & Potong Stok Toko/ })).toHaveCount(0);
  expect(await rowStock(page)).toMatch(/\b13\b/);
});

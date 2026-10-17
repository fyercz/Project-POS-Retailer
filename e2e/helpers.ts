import { expect, type Page } from '@playwright/test';

/** Isi layar "Selamat datang" (instalasi baru) dan masuk sebagai Owner. */
export async function registerOwner(page: Page, opts: { owner?: string; pin?: string; store?: string } = {}) {
  await page.goto('/');
  await expect(page.getByTestId('first-run-setup')).toBeVisible();
  if (opts.store) await page.getByTestId('setup-store').fill(opts.store);
  await page.getByTestId('setup-owner').fill(opts.owner ?? 'Pak Uji');
  await page.getByTestId('setup-pin').fill(opts.pin ?? '2580');
  await page.getByTestId('setup-pin-confirm').fill(opts.pin ?? '2580');
  await page.getByTestId('setup-submit').click();
  await expect(page.getByTestId('first-run-setup')).toBeHidden();
}

/** Tambah produk lewat halaman Katalog & Stok. */
export async function addProduct(
  page: Page,
  p: { name: string; sku: string; barcode: string; cost: number; price: number; stock: number }
) {
  await page.locator('#nav-btn-inventory').click();
  await page.locator('#btn-add-product').click();
  await page.getByTestId('product-name').fill(p.name);
  await page.getByTestId('product-category').selectOption({ index: 1 });
  await page.getByTestId('product-sku').fill(p.sku);
  await page.getByTestId('product-barcode').fill(p.barcode);
  await page.getByTestId('product-cost').fill(String(p.cost));
  await page.getByTestId('product-price').fill(String(p.price));
  await page.getByTestId('product-stock').fill(String(p.stock));
  await page.getByTestId('product-submit').click();
  await expect(page.getByTestId('product-submit')).toBeHidden();
}

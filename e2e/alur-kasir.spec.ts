import { test, expect } from '@playwright/test';
import { registerOwner, addProduct } from './helpers';

test.beforeEach(async ({ page }) => {
  // Dialog cetak struk otomatis tidak perlu di tes
  await page.addInitScript(() => {
    window.print = () => {};
  });
});

test('instalasi baru kosong: tanpa produk contoh, tanpa akun bawaan', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('first-run-setup')).toBeVisible();
  await expect(page.locator('[id^="product-card-"]')).toHaveCount(0);
});

test('pendaftaran Owner menolak PIN yang mudah ditebak dan konfirmasi yang berbeda', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('setup-store').fill('Toko Uji');
  await page.getByTestId('setup-owner').fill('Pak Uji');
  await page.getByTestId('setup-pin').fill('1234');
  await page.getByTestId('setup-pin-confirm').fill('1234');
  await page.getByTestId('setup-submit').click();
  await expect(page.getByRole('alert')).toContainText('mudah ditebak');

  await page.getByTestId('setup-pin').fill('2580');
  await page.getByTestId('setup-pin-confirm').fill('2581');
  await page.getByTestId('setup-submit').click();
  await expect(page.getByRole('alert')).toContainText('tidak sama');
  await expect(page.getByTestId('first-run-setup')).toBeVisible();
});

test('alur lengkap: daftar Owner -> tambah produk -> jual tunai -> tutup shift sesuai', async ({ page }) => {
  await registerOwner(page, { store: 'Toko Uji E2E' });
  // Instalasi baru netral: header memakai nama toko yang didaftarkan, bukan identitas bawaan
  await expect(page.getByRole('img', { name: 'Toko Uji E2E' }).first()).toBeVisible();
  await expect(page.locator('body')).not.toContainText('ULIL Mart');
  await addProduct(page, { name: 'Gula Pasir 1kg', sku: 'GULA-1KG', barcode: '2000000000015', cost: 13000, price: 15000, stock: 10 });

  // Jual 1 pcs tunai
  await page.locator('#nav-btn-pos').click();
  await page.locator('[id^="product-card-"]').first().click();
  await page.locator('#btn-checkout-pay').click();
  const cash = page.getByTestId('payment-cash-input');
  await expect(cash).toHaveValue(''); // uang diterima dimulai kosong
  await expect(page.locator('#btn-confirm-complete-payment')).toBeDisabled();
  await cash.fill('20000');
  await page.locator('#btn-confirm-complete-payment').click();
  await page.getByTestId('receipt-close').click();

  // Tutup shift: modal 0 + tunai 15.000 = 15.000 di laci
  await page.locator('#btn-employee-menu').click();
  await page.locator('#menu-item-shift-report').click();
  await page.getByTestId('shift-actual-cash').fill('15000');
  await page.locator('#btn-confirm-close-shift').click();
  await expect(page.getByTestId('shift-difference')).toHaveText('Sesuai (Rp 0)');
});

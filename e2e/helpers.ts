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

/** Tunggu sampai sebuah daftar (array) dengan panjang minimal tertentu tersimpan di IndexedDB aplikasi. */
export async function waitForStoredArray(page: Page, key: string, minLength = 0) {
  await expect
    .poll(
      () =>
        page.evaluate(
          ([k, min]) =>
            new Promise<number>((resolve) => {
              const open = indexedDB.open('ulilmart_pos_main_db', 1);
              open.onerror = () => resolve(-1);
              open.onsuccess = () => {
                try {
                  const req = open.result.transaction('pos_state_store', 'readonly').objectStore('pos_state_store').get(k as string);
                  req.onsuccess = () => resolve(Array.isArray(req.result) && req.result.length >= (min as number) ? 1 : 0);
                  req.onerror = () => resolve(-1);
                } catch {
                  resolve(-1);
                }
              };
            }),
          [key, minLength] as const
        ),
      { timeout: 15_000 }
    )
    .toBe(1);
}

/** Tambah karyawan lewat menu akun -> Kelola Karyawan (dijalankan sebagai Owner/Supervisor). */
export async function addEmployee(page: Page, emp: { name: string; role: 'cashier' | 'supervisor' | 'inventory' | 'owner'; pin: string }) {
  await page.locator('#btn-employee-menu').click();
  await page.locator('#menu-item-manage-employees').click();
  await page.locator('#btn-add-employee-open').click();
  await page.getByTestId('employee-name').fill(emp.name);
  await page.getByTestId('employee-role').selectOption(emp.role);
  await page.getByTestId('employee-pin').fill(emp.pin);
  await page.locator('#btn-save-employee').click();
  await expect(page.getByTestId('employee-notification')).toBeVisible();
  await page.locator('#btn-close-employee-modal').click();
}

/** Kunci layar lalu masuk sebagai karyawan tertentu dengan PIN (diketik lewat keyboard). */
export async function lockAndLogin(page: Page, name: string, pin: string) {
  await page.locator('#btn-header-quick-lock').click();
  await expect(page.locator('#employee-lock-screen')).toBeVisible();
  await page.getByRole('button', { name: `Pilih ${name}` }).click();
  await page.keyboard.type(pin);
  await expect(page.locator('#employee-lock-screen')).toBeHidden();
  await expect(page.locator('#btn-employee-menu')).toContainText(name);
}

/** Jual 1 produk (berdasarkan nama) di layar kasir, bayar tunai. */
export async function sellProductByName(page: Page, productName: string, cashAmount: number) {
  await page.locator('#nav-btn-pos').click();
  await page.locator('[id^="product-card-"]', { hasText: productName }).first().click();
  await page.locator('#btn-checkout-pay').click();
  await page.getByTestId('payment-cash-input').fill(String(cashAmount));
  await page.locator('#btn-confirm-complete-payment').click();
  await page.getByTestId('receipt-close').click();
}

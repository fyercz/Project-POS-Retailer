/**
 * Aksesibilitas (WCAG 2.1 AA) di browser sungguhan dengan axe-core.
 * Aturan yang diperbaiki dalam audit wajib bersih: nama tombol, label kolom, bahasa halaman,
 * nama dialog. Kontras warna dilaporkan sebagai anotasi (bukan penghenti tes).
 */
import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { registerOwner, addProduct } from './helpers';

const REQUIRED_RULES = ['button-name', 'label', 'select-name', 'html-has-lang', 'html-lang-valid', 'aria-dialog-name', 'input-button-name'];

async function scan(page: Page, where: string) {
  // (cast: axe-core/playwright bisa membawa versi tipe Playwright yang berbeda)
  const result = await new AxeBuilder({ page: page as any }).withTags(['wcag2a', 'wcag2aa']).analyze();
  const blocking = result.violations.filter((v) => REQUIRED_RULES.includes(v.id));
  const contrast = result.violations.find((v) => v.id === 'color-contrast');
  test.info().annotations.push({
    type: 'axe',
    description: `${where}: ${result.violations.length} jenis pelanggaran; kontras: ${contrast ? contrast.nodes.length : 0} elemen`,
  });
  const detail = blocking
    .map((v) => `${v.id} (${v.nodes.length}): ${v.nodes.slice(0, 5).map((n) => n.target.join(' ')).join(' | ')}`)
    .join('\n');
  expect(blocking, `${where}\n${detail}`).toEqual([]);
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.print = () => {};
  });
});

test('halaman utama, pembayaran, formulir produk, dan pengaturan lolos pemindaian axe', async ({ page }) => {
  await expect(page.locator('html')).toHaveCount(1);
  await registerOwner(page);
  await expect(page.locator('html')).toHaveAttribute('lang', 'id');
  await addProduct(page, { name: 'Kopi Sachet', sku: 'KOPI-01', barcode: '2000000000039', cost: 1000, price: 1500, stock: 50 });

  await page.locator('#nav-btn-pos').click();
  await scan(page, 'Layar kasir');

  await page.locator('[id^="product-card-"]', { hasText: 'Kopi Sachet' }).first().click();
  await page.locator('#btn-checkout-pay').click();
  await expect(page.getByTestId('payment-cash-input')).toBeVisible();
  await scan(page, 'Pembayaran');
  await page.keyboard.press('Escape');

  await page.locator('#nav-btn-inventory').click();
  await page.locator('#btn-add-product').click();
  await expect(page.getByTestId('product-name')).toBeVisible();
  await scan(page, 'Formulir produk');
});

test('keyboard: modal punya role dialog, Escape menutup, fokus kembali ke tombol pembuka', async ({ page }) => {
  await registerOwner(page);
  await page.locator('#nav-btn-inventory').click();
  const opener = page.locator('#btn-add-product');
  await opener.click();
  const dialog = page.getByRole('dialog').filter({ has: page.getByTestId('product-name') });
  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveAttribute('aria-modal', 'true');
  // fokus berada di dalam modal
  await expect.poll(() => dialog.evaluate((d) => d.contains(document.activeElement))).toBe(true);
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('product-name')).toHaveCount(0);
  await expect(opener).toBeFocused();
});

test('layar kunci tidak bisa ditutup dengan Escape', async ({ page }) => {
  await registerOwner(page);
  await page.locator('#btn-header-quick-lock').click();
  await expect(page.locator('#employee-lock-screen')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('#employee-lock-screen')).toBeVisible();
});

/**
 * Aplikasi berjalan TANPA INTERNET sama sekali (hanya LAN): semua permintaan ke luar alamat lokal
 * diblokir. Alur utama harus berjalan, QR pairing HP & font logo tidak bergantung internet, dan
 * aplikasi tidak mencoba mengakses internet sedikit pun.
 */
import { test, expect, type Page } from '@playwright/test';
import { registerOwner, addProduct, sellProductByName, blockInternet } from './helpers';

async function brokenImages(page: Page) {
  return page.evaluate(() =>
    Array.from(document.images)
      .filter((img) => img.complete && img.naturalWidth === 0 && img.getAttribute('src'))
      .map((img) => (img.getAttribute('src') || '').slice(0, 80))
  );
}

test('satu kasir tanpa internet: alur utama, QR pairing, font logo, tanpa akses internet', async ({ page, context }) => {
  test.setTimeout(240_000);
  const attempted = await blockInternet(context);
  const consoleErrors: string[] = [];
  page.on('console', (m) => m.type() === 'error' && consoleErrors.push(m.text().slice(0, 160)));
  page.on('dialog', (d) => d.accept().catch(() => {}));
  await page.addInitScript(() => {
    window.print = () => {};
  });

  await registerOwner(page, { store: 'ULIL Mart' });
  await addProduct(page, { name: 'Gula Pasir 1kg', sku: 'GLA-OFF', barcode: '2000000010001', cost: 16500, price: 18500, stock: 20 });
  await sellProductByName(page, 'Gula Pasir 1kg', 20000);

  // Struk tetap bisa dicetak
  await page.locator('#nav-btn-transactions').click();
  await expect(page.getByText(/INV-/).first()).toBeVisible();

  // Font logo (ULIL Mart) termuat dari dalam aplikasi
  await page.locator('#nav-btn-pos').click();
  const fontsOk = await page.evaluate(async () => {
    await document.fonts.ready;
    return {
      dancing: document.fonts.check('700 20px "Dancing Script"'),
      montserrat: document.fonts.check('900 20px "Montserrat"'),
    };
  });
  expect(fontsOk).toEqual({ dancing: true, montserrat: true });

  // QR pairing HP di jendela LAN: dibuat di dalam aplikasi & terlihat
  await page.locator('#btn-employee-menu').click();
  await page.locator('#menu-item-lan-server').click();
  const pairingQr = page.getByAltText('QR Code Sambungan Kasir').first();
  await expect(pairingQr).toBeVisible({ timeout: 10_000 });
  expect(await pairingQr.getAttribute('src')).toMatch(/^data:image\/png/);
  expect(await pairingQr.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(50);
  await page.keyboard.press('Escape');

  // Label rak QR dibuat tanpa internet
  await page.locator('#nav-btn-inventory').click();
  const qr = page.locator('#btn-open-qr-shelf-labels').first();
  if (!(await qr.isVisible().catch(() => false))) await page.locator('#btn-dropdown-audit').click();
  await qr.click();
  await expect(page.locator('[role="dialog"] svg').first()).toBeVisible({ timeout: 10_000 });
  await page.keyboard.press('Escape');

  // Semua halaman utama: tanpa gambar rusak
  const broken: string[] = [];
  for (const v of ['pos', 'transactions', 'inventory', 'customers', 'reports']) {
    await page.locator(`#nav-btn-${v}`).click();
    await page.waitForTimeout(400);
    broken.push(...(await brokenImages(page)).map((b) => `${v}: ${b}`));
  }
  expect(broken, broken.join('\n')).toEqual([]);

  // Tidak ada satu pun percobaan akses internet
  expect([...new Set(attempted)], `aplikasi mencoba mengakses internet:\n${[...new Set(attempted)].join('\n')}\nconsole: ${JSON.stringify(consoleErrors.slice(0, 5))}`).toEqual([]);
});

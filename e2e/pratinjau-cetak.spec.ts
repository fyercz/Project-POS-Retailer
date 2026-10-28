/**
 * Pratinjau hasil cetak: menekan tombol cetak sungguhan, menangkap dokumen cetak yang dibuat
 * aplikasi (iframe #pos-print-hidden-frame), lalu Chrome merendernya dalam mode CETAK ke PDF & PNG
 * selebar kertas aslinya. CI mengunggah hasilnya ke rilis "pratinjau-cetak" untuk ditinjau.
 */
import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { registerOwner, addProduct } from './helpers';

const OUT = 'pratinjau-cetak';
const MM = 96 / 25.4; // px per mm

async function capturePrint(page: Page, name: string, widthMm: number | null, trigger: () => Promise<void>) {
  await page.evaluate(() => document.getElementById('pos-print-hidden-frame')?.remove());
  await trigger();
  await page.waitForFunction(() => {
    const f = document.getElementById('pos-print-hidden-frame') as HTMLIFrameElement | null;
    return !!f?.contentDocument?.body && f.contentDocument.body.innerHTML.length > 100;
  });
  const html = await page.evaluate(() => (document.getElementById('pos-print-hidden-frame') as HTMLIFrameElement).contentDocument!.documentElement.outerHTML);
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, `${name}.html`), '<!DOCTYPE html>' + html);
  const p = await page.context().newPage();
  await p.setContent(html, { waitUntil: 'load' });
  await p.emulateMedia({ media: 'print' });
  if (widthMm) {
    await p.setViewportSize({ width: Math.round(widthMm * MM), height: 600 });
    await p.pdf({ path: path.join(OUT, `${name}.pdf`), width: `${widthMm}mm`, printBackground: true });
    await p.screenshot({ path: path.join(OUT, `${name}.png`), fullPage: true, scale: 'device' });
  } else {
    await p.setViewportSize({ width: Math.round(210 * MM), height: 1100 });
    await p.pdf({ path: path.join(OUT, `${name}.pdf`), format: 'A4', printBackground: true, preferCSSPageSize: true });
    await p.screenshot({ path: path.join(OUT, `${name}.png`), fullPage: true });
  }
  await p.close();
  return html;
}

test('pratinjau cetak struk 58 mm & 80 mm', async ({ page }) => {
  test.setTimeout(180_000);
  await page.addInitScript(() => {
    window.print = () => {};
  });
  await registerOwner(page, { store: 'Toko Uji Cetak' });
  await addProduct(page, { name: 'Indomie Goreng Spesial Jumbo Rasa Ayam Panggang 129g', sku: 'IDM-J', barcode: '2000000009001', cost: 3200, price: 4000, stock: 50 });
  await addProduct(page, { name: 'Teh Botol 350ml', sku: 'TEH-C', barcode: '2000000009002', cost: 3000, price: 3500, stock: 50 });
  await addProduct(page, { name: 'Gula Pasir 1kg', sku: 'GLA-C', barcode: '2000000009003', cost: 16500, price: 18500, stock: 50 });

  await page.locator('#nav-btn-pos').click();
  for (const [name, n] of [['Indomie Goreng', 3], ['Teh Botol', 2], ['Gula Pasir', 1]] as const)
    for (let i = 0; i < n; i++) await page.locator('[id^="product-card-"]', { hasText: name }).first().click();
  await page.locator('#btn-checkout-pay').click();
  await page.getByTestId('payment-cash-input').fill('50000');
  await page.locator('#btn-confirm-complete-payment').click();
  await expect(page.locator('#btn-print-thermal-receipt')).toBeVisible();

  for (const size of [58, 80] as const) {
    await page.getByRole('button', { name: `${size}mm`, exact: true }).click();
    const html = await capturePrint(page, `struk-${size}mm`, size, () => page.locator('#btn-print-thermal-receipt').click());
    expect(html).toContain('Toko Uji Cetak');
    expect(html).toContain('Gula Pasir 1kg');
  }
});

test('pratinjau cetak label harga, label rak QR, dan laporan', async ({ page }) => {
  test.setTimeout(240_000);
  page.on('dialog', (d) => d.accept().catch(() => {}));
  await page.addInitScript(() => {
    window.print = () => {};
  });
  await registerOwner(page, { store: 'Toko Uji Cetak' });
  await addProduct(page, { name: 'Indomie Goreng Spesial Jumbo Rasa Ayam Panggang 129g', sku: 'IDM-J', barcode: '2000000009011', cost: 3200, price: 4000, stock: 50 });
  await addProduct(page, { name: 'Teh Botol 350ml', sku: 'TEH-C', barcode: '2000000009012', cost: 3000, price: 3500, stock: 50 });
  await addProduct(page, { name: 'Gula Pasir 1kg', sku: 'GLA-C', barcode: '2000000009013', cost: 16500, price: 18500, stock: 50 });

  // Satu penjualan agar laporan berisi
  await page.locator('#nav-btn-pos').click();
  await page.locator('[id^="product-card-"]', { hasText: 'Gula Pasir' }).first().click();
  await page.locator('#btn-checkout-pay').click();
  await page.getByTestId('payment-cash-input').fill('20000');
  await page.locator('#btn-confirm-complete-payment').click();
  await page.getByTestId('receipt-close').click();

  // Label harga (A4)
  await page.locator('#nav-btn-inventory').click();
  const tagOpener = page.getByText('Cetak Pricetag (A4 / F4)').first();
  if (!(await tagOpener.isVisible().catch(() => false))) await page.locator('#btn-dropdown-audit').click();
  await tagOpener.click();
  await page.getByRole('button', { name: /^Pilih Item \(/ }).first().click(); // tab pemilihan barang
  await page.getByRole('button', { name: /^Pilih Semua \(/ }).first().click();
  await capturePrint(page, 'label-harga-a4', null, () => page.getByRole('button', { name: /^Cetak Pricetag \((?:A4|F4)\)$/ }).click());
  await page.keyboard.press('Escape');

  // Label rak QR
  await page.locator('#nav-btn-inventory').click();
  const qr = page.locator('#btn-open-qr-shelf-labels').first();
  if (!(await qr.isVisible().catch(() => false))) await page.locator('#btn-dropdown-audit').click();
  await qr.click();
  await page.getByRole('button', { name: /^Pilih Produk \(/ }).first().click(); // tab pemilihan produk
  await page.getByRole('button', { name: /^Pilih Semua \(/ }).first().click();
  await capturePrint(page, 'label-rak-qr', null, () => page.getByRole('button', { name: /^Cetak Sekarang \(/ }).click());
  await page.keyboard.press('Escape');

  // Laporan ikhtisar omzet
  await page.locator('#nav-btn-reports').click();
  await page.getByRole('button', { name: /Cetak Ikhtisar Omzet/ }).first().click();
  await capturePrint(page, 'laporan-ikhtisar', null, () => page.getByRole('button', { name: /Cetak Dokumen Sekarang/ }).click());
});

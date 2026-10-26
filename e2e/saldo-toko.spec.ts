/**
 * Saldo toko: retur "Saldo Toko" masuk ke saldo member (hanya nota bermember), lalu dipakai saat
 * belanja. Diperiksa dua tahap: tertulis, lalu bertahan setelah reload.
 */
import { test, expect, type Page } from '@playwright/test';
import { registerOwner, addProduct, sellProductByName, readStored } from './helpers';

const member = async (page: Page) => (await readStored(page, 'pos_retail_customers_v3')).find((c: any) => c.name === 'Bu Saldo');

test('retur ke saldo toko member lalu dipakai belanja; nota tanpa member tidak bisa', async ({ page }) => {
  test.setTimeout(180_000);
  page.on('dialog', (d) => d.accept().catch(() => {}));
  await page.addInitScript(() => {
    window.print = () => {};
  });
  await registerOwner(page, { store: 'Toko Saldo' });
  await addProduct(page, { name: 'Minyak Saldo 1L', sku: 'MNY-S', barcode: '2000000005001', cost: 16000, price: 20000, stock: 10 });

  // Nota 1: dengan member baru
  await page.locator('#nav-btn-pos').click();
  await page.locator('[id^="product-card-"]', { hasText: 'Minyak Saldo 1L' }).first().click();
  await page.locator('#btn-cart-extras').click();
  await page.getByRole('button', { name: /Pilih Member/ }).first().click();
  await page.getByRole('button', { name: /\+ Member Baru/ }).click();
  await page.getByLabel('Nama Lengkap Member').fill('Bu Saldo');
  await page.getByLabel('Nomor Handphone / WhatsApp').fill('081377778888');
  await page.getByRole('button', { name: /Daftarkan & Pilih Member Ini/ }).click();
  await page.locator('#btn-checkout-pay').click();
  await page.getByTestId('payment-cash-input').fill('20000');
  await page.locator('#btn-confirm-complete-payment').click();
  await page.getByTestId('receipt-close').click();
  // Nota 2: tanpa member
  await sellProductByName(page, 'Minyak Saldo 1L', 20000);
  await expect.poll(async () => (await readStored(page, 'pos_retail_tx_v3')).length).toBe(2);

  // Retur: nota tanpa member -> Saldo Toko nonaktif; nota bermember -> Saldo Toko
  await page.locator('#nav-btn-transactions').click();
  const txs = await readStored(page, 'pos_retail_tx_v3');
  const withMember = txs.find((t: any) => t.customer?.name === 'Bu Saldo');
  const without = txs.find((t: any) => !t.customer);
  // Tombol retur pada baris TERDEKAT yang memuat nomor nota (bukan wadah berisi semua nota)
  const returnButtonOf = (invoice: string) =>
    page.locator(`xpath=//*[contains(normalize-space(text()), "${invoice}")]/ancestor::*[.//button[@title="Retur Item Penjualan"]][1]//button[@title="Retur Item Penjualan"]`).first();
  await returnButtonOf(without.invoiceNumber).click();
  await expect(page.getByRole('button', { name: 'Saldo Toko', exact: true })).toBeDisabled();
  await page.keyboard.press('Escape');
  await returnButtonOf(withMember.invoiceNumber).click();
  await expect(page.getByRole('button', { name: 'Saldo Toko', exact: true })).toBeEnabled();
  await page.getByRole('dialog').getByRole('button', { name: 'Tambah' }).first().click();
  await page.getByLabel('Alasan Retur').first().selectOption({ index: 1 });
  await page.getByRole('button', { name: 'Saldo Toko', exact: true }).click();
  await page.getByRole('button', { name: /Konfirmasi & Proses Retur/ }).click();
  await expect.poll(async () => (await member(page))?.storeCredit, { message: 'saldo masuk ke member' }).toBe(20000);

  await page.locator('#nav-btn-customers').click();
  await page.getByRole('button', { name: 'Detail' }).first().click();
  await expect(page.getByTestId('customer-store-credit')).toContainText('20.000');
  await page.keyboard.press('Escape');

  // Belanja memakai saldo: sisa dibayar 0
  await page.locator('#nav-btn-pos').click();
  await page.locator('[id^="product-card-"]', { hasText: 'Minyak Saldo 1L' }).first().click();
  const extras = page.locator('#btn-cart-extras');
  if ((await extras.getAttribute('aria-expanded')) !== 'true') await extras.click();
  if (!(await extras.innerText()).includes('Bu Saldo')) {
    await page.getByRole('button', { name: /Pilih Member/ }).first().click();
    await page.getByLabel('Cari nama member, nomor WhatsApp...').fill('Bu Saldo');
    await page.getByRole('dialog').getByText('Bu Saldo').first().click();
  }
  await page.locator('#btn-checkout-pay').click();
  await page.getByTestId('use-store-credit').check();
  await expect(page.getByText('Sisa Dibayar')).toBeVisible();
  await page.getByTestId('payment-cash-input').fill('0');
  await page.locator('#btn-confirm-complete-payment').click();
  await page.getByTestId('receipt-close').click();

  const state = async () => {
    const m = await member(page);
    const used = (await readStored(page, 'pos_retail_tx_v3')).find((t: any) => t.storeCreditUsed)?.storeCreditUsed;
    return `${m?.storeCredit}|${used}`;
  };
  await expect.poll(state, { timeout: 10_000, message: 'sebelum reload' }).toBe('0|20000');
  await page.reload();
  await expect.poll(state, { timeout: 15_000 }).toBe('0|20000');
});

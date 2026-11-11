/**
 * Buku kas toko (laporan kas manual LAP.HARI / PPOB / LABA): kode supplier, kas masuk lain-lain,
 * penarikan kas (prive), PPOB per shift. Diperiksa dua tahap: tertulis, lalu bertahan setelah reload.
 */
import { test, expect, type Page } from '@playwright/test';
import { registerOwner, addEmployee, lockAndLogin, readStored } from './helpers';

const entries = async (page: Page) =>
  (await readStored(page, 'pos_cash_entries')).map((c: any) => `${c.kind}|${c.category || c.shiftLabel || '-'}|${c.amount}|${c.description}`).sort();

async function openCashBook(page: Page) {
  await page.locator('#nav-btn-reports').click();
  await page.locator('#btn-open-cash-book').click();
}

test('kode supplier unik, kas masuk lain, penarikan kas, PPOB per shift; kasir tidak bisa menarik kas', async ({ page }) => {
  test.setTimeout(180_000);
  page.on('dialog', (d) => d.accept().catch(() => {}));
  await registerOwner(page, { store: 'ULIL Mart' });

  // Supplier berkode 043; kode ganda ditolak
  await page.locator('#nav-btn-inventory').click();
  await page.getByRole('button', { name: /Supplier Mitra/ }).first().click();
  for (const [name, expectOk] of [['CHAMPION', true], ['KAO', false]] as const) {
    await page.locator('#btn-add-supplier').click();
    await page.getByLabel('Nama Perusahaan / Supplier / Distributor').fill(name);
    await page.getByLabel('Kode Supplier (opsional)').fill('043');
    await page.getByRole('dialog').locator('button[type="submit"]').click();
    if (expectOk) await expect(page.getByRole('dialog')).toHaveCount(0);
    else {
      await expect(page.getByText('Kode 043 sudah dipakai supplier lain')).toBeVisible();
      await page.keyboard.press('Escape');
    }
  }
  expect((await readStored(page, 'pos_retail_suppliers_v2')).map((s: any) => `${s.name}:${s.code}`)).toEqual(['CHAMPION:043']);

  // Kas masuk: sewa rak dari CHAMPION
  await openCashBook(page);
  await page.getByLabel('Jenis kas masuk').selectOption('sewa_rak');
  await page.getByLabel('Dari (opsional)').fill('CHAMPION');
  await page.getByLabel('Nominal (Rp)').fill('10000');
  await page.getByRole('button', { name: 'Simpan Catatan' }).click();
  await expect(page.getByText('Sewa Rak dari CHAMPION dicatat.')).toBeVisible();

  // Penarikan kas
  await page.getByRole('button', { name: 'Penarikan Kas', exact: true }).click();
  await page.getByLabel('Nominal (Rp)').fill('11000000');
  await page.getByRole('button', { name: 'Simpan Catatan' }).click();
  await expect(page.getByText('Penarikan Kas dicatat.')).toBeVisible();

  // PPOB: penjualan Sift 1 & isi saldo
  await page.getByRole('button', { name: 'PPOB', exact: true }).click();
  await page.getByLabel('Shift').selectOption('Sift 1');
  await page.getByLabel('Nominal (Rp)').fill('120500');
  await page.getByRole('button', { name: 'Simpan Catatan' }).click();
  await page.getByLabel('Jenis catatan PPOB').selectOption('ppob_topup');
  await page.getByLabel('Nominal (Rp)').fill('4500000');
  await page.getByRole('button', { name: 'Simpan Catatan' }).click();
  await expect(page.getByText(/Penjualan Rp\s*120\.500/)).toBeVisible();

  const expected = [
    'income|sewa_rak|10000|Sewa Rak dari CHAMPION',
    'ppob_sale|Sift 1|120500|Penjualan PPOB',
    'ppob_topup|Sift 1|4500000|Isi Saldo PPOB',
    'withdrawal|-|11000000|Penarikan Kas',
  ];
  await expect.poll(() => entries(page), { timeout: 10_000, message: 'sebelum reload' }).toEqual(expected);
  await page.reload();
  await expect.poll(() => entries(page), { timeout: 15_000 }).toEqual(expected);

  // Kasir: boleh mencatat kas masuk, tidak boleh penarikan kas
  await addEmployee(page, { name: 'Siti Kasir', role: 'cashier', pin: '4826' });
  await lockAndLogin(page, 'Siti Kasir', '4826');
  const reports = page.locator('#nav-btn-reports');
  if (await reports.isVisible().catch(() => false)) {
    await reports.click().catch(() => {});
    if (await page.locator('#btn-open-cash-book').isVisible().catch(() => false)) {
      await page.locator('#btn-open-cash-book').click();
      await page.getByRole('button', { name: 'Penarikan Kas', exact: true }).click();
      await page.getByLabel('Nominal (Rp)').fill('50000');
      await expect(page.getByRole('button', { name: 'Simpan Catatan' })).toBeDisabled();
    }
  }
  expect((await readStored(page, 'pos_cash_entries')).filter((c: any) => c.kind === 'withdrawal').length).toBe(1);
});

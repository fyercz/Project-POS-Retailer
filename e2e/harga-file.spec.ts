/**
 * Perbarui harga dari file (CSV/Excel) dengan pratinjau & centang, dan impor produk dari .xlsx.
 * Diperiksa dua tahap: tertulis, lalu bertahan setelah reload.
 */
import { test, expect, type Page } from '@playwright/test';
import { zipSync, strToU8 } from 'fflate';
import { registerOwner, addProduct, addEmployee, lockAndLogin, readStored } from './helpers';

const priceOf = async (page: Page) => Object.fromEntries((await readStored(page, 'pos_retail_products_v3')).map((p: any) => [p.name, p.price]));

function makeXlsx(rows: string[][]): Buffer {
  const strings: string[] = [];
  const idx = (s: string) => (strings.includes(s) ? strings.indexOf(s) : strings.push(s) - 1);
  const col = (i: number) => String.fromCharCode(65 + i);
  const sheet = rows
    .map((r, ri) => `<row r="${ri + 1}">${r.map((v, ci) => (/^\d+$/.test(v) && ci > 1 ? `<c r="${col(ci)}${ri + 1}"><v>${v}</v></c>` : `<c r="${col(ci)}${ri + 1}" t="s"><v>${idx(v)}</v></c>`)).join('')}</row>`)
    .join('');
  return Buffer.from(
    zipSync({
      'xl/workbook.xml': strToU8('<workbook><sheets><sheet name="Produk" sheetId="1" r:id="rId1"/></sheets></workbook>'),
      'xl/_rels/workbook.xml.rels': strToU8('<Relationships><Relationship Id="rId1" Target="worksheets/sheet1.xml"/></Relationships>'),
      'xl/sharedStrings.xml': strToU8(`<sst>${strings.map((s) => `<si><t>${s}</t></si>`).join('')}</sst>`),
      'xl/worksheets/sheet1.xml': strToU8(`<worksheet><sheetData>${sheet}</sheetData></worksheet>`),
    })
  );
}

test.beforeEach(async ({ page }) => {
  page.on('dialog', (d) => d.accept().catch(() => {}));
});

test('perbarui harga dari file: pratinjau, centang, terapkan, riwayat harga; kasir tidak bisa', async ({ page }) => {
  test.setTimeout(180_000);
  await registerOwner(page, { store: 'Toko Harga' });
  await addProduct(page, { name: 'Merica Bubuk 4G', sku: 'MRC-4', barcode: '2000000004001', cost: 450, price: 500, stock: 50 });
  await addProduct(page, { name: 'Air Botol 330ml', sku: 'AIR-330', barcode: '2000000004002', cost: 1400, price: 1500, stock: 30 });
  await addProduct(page, { name: 'Permen Mint', sku: 'PRM-1', barcode: '2000000004003', cost: 400, price: 500, stock: 100 });

  await page.locator('#nav-btn-inventory').click();
  await page.locator('#btn-dropdown-audit').click();
  await page.locator('#btn-price-update-file').click();
  const csv = ['Barcode;Nama Produk;Harga Jual Sekarang;Usulan Harga;Harga Dipakai', '2000000004001;Merica;500;1000;1000', '2000000004002;Air;1500;1700;1700', '2000000004003;Permen;500;600;600', '9999999999999;Tidak ada;1;1;1'].join('\n');
  await page.getByLabel('Berkas harga').setInputFiles({ name: 'harga.csv', mimeType: 'text/csv', buffer: Buffer.from(csv) });
  await expect(page.getByRole('status').filter({ hasText: 'Harga Dipakai' })).toContainText('3 harga berubah');
  await expect(page.getByRole('status').filter({ hasText: 'Harga Dipakai' })).toContainText('1 tidak ditemukan');
  await expect(page.getByText('berubah lebih dari 50%')).toBeVisible(); // Merica 500 -> 1000
  await page.getByRole('checkbox', { name: 'Terapkan harga Permen Mint' }).uncheck(); // tidak jadi
  await page.getByRole('button', { name: 'Terapkan 2 Perubahan Harga' }).click();
  await expect(page.getByText('2 harga diperbarui')).toBeVisible();

  const expected = { 'Merica Bubuk 4G': 1000, 'Air Botol 330ml': 1700, 'Permen Mint': 500 };
  await expect.poll(() => priceOf(page), { timeout: 10_000, message: 'sebelum reload' }).toEqual(expected);
  await page.reload();
  await expect.poll(() => priceOf(page), { timeout: 15_000 }).toEqual(expected);
  const merica = (await readStored(page, 'pos_retail_products_v3')).find((p: any) => p.name === 'Merica Bubuk 4G');
  expect(merica.priceHistory.some((h: any) => h.sellingPrice === 1000 && h.previousSellingPrice === 500 && /harga\.csv/.test(h.sourceReference))).toBe(true);

  // Kasir tidak melihat menu perbarui harga
  await addEmployee(page, { name: 'Siti Kasir', role: 'cashier', pin: '4826' });
  await lockAndLogin(page, 'Siti Kasir', '4826');
  // Tombol Katalog tetap tampil (bertanda kunci), tetapi Kasir tidak bisa sampai ke menu perbarui harga
  await page.locator('#nav-btn-inventory').click().catch(() => {});
  const audit = page.locator('#btn-dropdown-audit');
  if (await audit.isVisible().catch(() => false)) await audit.click();
  await expect(page.locator('#btn-price-update-file')).toHaveCount(0);
});

test('impor produk dari file Excel (.xlsx) lewat Impor File Langsung', async ({ page }) => {
  test.setTimeout(180_000);
  await registerOwner(page, { store: 'Toko Excel' });
  const xlsx = makeXlsx([
    ['barcode', 'nama_produk', 'harga_beli', 'harga_jual', 'stok', 'kategori'],
    ['8999909096004', 'A MILD 16', '35425', '44000', '7', 'tobacco'],
    ['8997225560568', 'ABAH NAGET AYAM 250G', '10500', '13000', '3', 'fresh'],
  ]);
  await page.locator('#nav-btn-inventory').click();
  const item = page.locator('#btn-import-direct-file').first();
  if (!(await item.isVisible().catch(() => false))) await page.locator('#btn-dropdown-audit').click();
  await item.click();
  const dlg = page.locator('[role="dialog"]', { hasText: 'Impor File Produk Langsung' }).last();
  await dlg.locator('input[type="file"]').setInputFiles({ name: 'produk.xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', buffer: xlsx });
  await expect(dlg.locator('textarea').first()).toHaveValue(/A MILD 16/, { timeout: 10_000 });
  await page.getByRole('button', { name: /Impor 2 Produk Langsung/ }).click();
  const stock = async () => Object.fromEntries((await readStored(page, 'pos_retail_products_v3')).map((p: any) => [p.name, `${p.price}/${p.stock}`]));
  await expect.poll(stock, { timeout: 10_000, message: 'sebelum reload' }).toEqual({ 'A MILD 16': '44000/7', 'ABAH NAGET AYAM 250G': '13000/3' });
  await page.reload();
  await expect.poll(stock, { timeout: 15_000 }).toEqual({ 'A MILD 16': '44000/7', 'ABAH NAGET AYAM 250G': '13000/3' });
});

test('formulir produk menerima harga bukan kelipatan 100 (mis. modal impor Rp 35.425)', async ({ page }) => {
  test.setTimeout(120_000);
  await registerOwner(page, { store: 'Toko Harga Ganjil' });
  // Dulu kolom harga berkelipatan Rp 100: browser diam-diam menolak Simpan untuk modal seperti 35.425
  await addProduct(page, { name: 'A MILD 16', sku: 'AMILD-16', barcode: '8999909096004', cost: 35425, price: 44000, stock: 7 });
  await page.locator('tr', { hasText: 'A MILD 16' }).first().getByRole('button', { name: 'Edit Data Item Barang' }).click();
  await page.getByTestId('product-name').fill('A MILD 16 BTG');
  await page.getByTestId('product-price').fill('44150');
  await page.getByTestId('product-submit').click();
  await expect(page.getByTestId('product-submit')).toBeHidden();
  const p = async () => {
    const x = (await readStored(page, 'pos_retail_products_v3'))[0];
    return x ? `${x.name}|${x.costPrice}|${x.price}` : '';
  };
  await expect.poll(p, { timeout: 10_000 }).toBe('A MILD 16 BTG|35425|44150');
});

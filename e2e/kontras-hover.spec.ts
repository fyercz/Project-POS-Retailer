/**
 * Kontras tombol SAAT DISOROT (hover). Pemeriksaan axe biasa hanya melihat keadaan diam; audit
 * desain 2026-10-26 menemukan 53 tombol bertulisan putih yang menyala ke emerald-500 saat disorot
 * (2,5:1). Tes ini menyorot setiap tombol hijau yang terlihat lalu memeriksa kontrasnya dengan axe.
 */
import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { registerOwner, addProduct, hoverContrastFailures } from './helpers';

async function checkHoverContrast(page: Page, scope: string) {
  const count = await page.evaluate((sel) => {
    const root = document.querySelector(sel) || document.body;
    const buttons = Array.from(root.querySelectorAll<HTMLButtonElement>('button')).filter(
      (b) => /\bbg-(?:emerald|rose|blue)-\d{3}\b/.test(b.className) && !b.disabled && b.getClientRects().length > 0 && (b.textContent || '').trim().length > 0
    );
    buttons.forEach((b, i) => b.setAttribute('data-hovercheck', String(i)));
    return buttons.length;
  }, scope);
  const failures: string[] = [];
  for (let i = 0; i < Math.min(count, 25); i++) {
    const btn = page.locator(`[data-hovercheck="${i}"]`);
    if (!(await btn.isVisible().catch(() => false))) continue;
    await btn.hover();
    await page.waitForTimeout(250); // transisi warna selesai
    const r = await new AxeBuilder({ page: page as any }).include(`[data-hovercheck="${i}"]`).withRules(['color-contrast']).analyze();
    for (const v of r.violations) for (const n of v.nodes) failures.push(`${(await btn.innerText()).slice(0, 40)}: ${n.any.map((a) => a.message).join('; ').slice(0, 160)}`);
  }
  await page.mouse.move(0, 0);
  return { count, failures };
}

test('tombol berwarna tetap terbaca saat disorot (kasir, pengaturan, formulir produk)', async ({ page }) => {
  test.setTimeout(180_000);
  await registerOwner(page, { store: 'Toko Kontras' });
  await addProduct(page, { name: 'Kopi Kontras', sku: 'KOP-K', barcode: '2000000008001', cost: 1100, price: 1500, stock: 20 });

  // Kasir: tombol Bayar & konfirmasi pembayaran
  await page.locator('#nav-btn-pos').click();
  await page.locator('[id^="product-card-"]', { hasText: 'Kopi Kontras' }).first().click();
  const pos = await checkHoverContrast(page, '#pos-cart-panel');
  await page.locator('#btn-checkout-pay').click();
  await page.getByTestId('payment-cash-input').fill('2000');
  const pay = await checkHoverContrast(page, '[role="dialog"]');
  await page.keyboard.press('Escape');

  // Pengaturan
  await page.locator('#btn-employee-menu').click();
  await page.locator('#menu-item-settings').click();
  const settings = await checkHoverContrast(page, '[role="dialog"]');
  await page.keyboard.press('Escape');

  // Formulir tambah produk
  await page.locator('#nav-btn-inventory').click();
  await page.locator('#btn-add-product').click();
  const form = await checkHoverContrast(page, '[role="dialog"]');

  const all = [...pos.failures, ...pay.failures, ...settings.failures, ...form.failures];
  expect(pos.count + pay.count + settings.count + form.count, 'ada tombol berwarna yang diperiksa').toBeGreaterThan(3);
  expect(all, all.join('\n')).toEqual([]);
});

test('pemeriksa kontras ringan (dipakai penjelajah) benar-benar menangkap tombol bermasalah', async ({ page }) => {
  test.setTimeout(120_000);
  await registerOwner(page, { store: 'Toko Kontrol' });
  // Kontrol negatif: tombol bertulisan putih di atas hijau terang (emerald-400, ~2:1)
  await page.evaluate(() => {
    const box = document.createElement('div');
    box.id = 'kontrol-kontras';
    box.innerHTML =
      '<button class="bg-emerald-700 text-white px-3 py-2" style="background-color:#34d399">Tombol Buruk</button>' +
      '<button class="bg-emerald-700 hover:bg-emerald-800 text-white px-3 py-2">Tombol Baik</button>';
    document.body.appendChild(box);
  });
  const found = await hoverContrastFailures(page, '#kontrol-kontras', 'kontrol');
  expect(found.some((f) => f.includes('Tombol Buruk')), found.join('\n')).toBe(true);
  expect(found.some((f) => f.includes('Tombol Baik')), found.join('\n')).toBe(false);
  // Dan pada layar kasir sungguhan: tidak ada temuan
  expect(await hoverContrastFailures(page, 'body', 'kasir')).toEqual([]);
});

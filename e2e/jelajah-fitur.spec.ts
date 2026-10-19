/**
 * Penjelajah fitur: membuka SETIAP halaman, tab/filter, dan jendela aplikasi di browser
 * sungguhan. Gagal bila ada error JavaScript (pageerror) atau layar "mengalami error"
 * (ErrorBoundary). Temuan lain (tombol tidak ditemukan, jendela tidak tertutup dengan Escape,
 * error konsol) dicatat sebagai anotasi.
 */
import { test, expect, type Page } from '@playwright/test';
import { registerOwner, addProduct, sellProductByName } from './helpers';

const VIEWS = ['pos', 'transactions', 'inventory', 'customers', 'reports'];
const OPENERS = [
  'btn-open-barcode-scanner', 'btn-open-held-orders', 'btn-open-sync-modal', 'btn-open-user-manual',
  'btn-open-gemini-copilot', 'btn-open-dynamic-pricing', 'btn-open-marketing-promo', 'btn-open-price-history-picker',
  'btn-open-qr-shelf-labels', 'btn-open-receiving-tab', 'btn-open-return-tab',
  'menu-item-shift-report', 'menu-item-manage-employees', 'menu-item-settings', 'menu-item-ready-to-launch',
  'menu-item-backup-restore', 'menu-item-gemini-ai', 'menu-item-user-manual', 'menu-item-toggle-theme',
];
// Tombol yang hanya ada di tab tertentu halaman Katalog & Stok
const NEEDS_TAB: Record<string, RegExp> = {
  'btn-open-receiving-tab': /Faktur Masuk/,
  'btn-open-return-tab': /Retur Supplier/,
  'btn-open-price-history-picker': /Riwayat Harga/,
};
// Menu khusus layar HP (md:hidden), diuji di putaran layar HP
const MOBILE_MENU = ['menu-item-lan-server', 'menu-item-desktop-hub', 'menu-item-autoupdate-hub', 'menu-item-verify-hub'];

test('jelajah semua halaman, tab, dan jendela tanpa error', async ({ page }) => {
  test.setTimeout(600_000);
  const fatal: string[] = [];
  const notes: string[] = [];
  const consoleErrors: string[] = [];
  page.on('pageerror', (e) => fatal.push(`Error JavaScript: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error' && !/Failed to load resource|503|net::ERR/.test(m.text())) consoleErrors.push(m.text().slice(0, 160));
  });
  page.on('dialog', (d) => d.dismiss().catch(() => {}));
  await page.addInitScript(() => {
    window.print = () => {};
  });

  // Data awal supaya laporan, riwayat, dan member punya isi
  await registerOwner(page, { store: 'Toko Jelajah' });
  await addProduct(page, { name: 'Kopi Jelajah 20g', sku: 'KOPI-J', barcode: '2000000000077', cost: 1000, price: 1500, stock: 40 });
  await sellProductByName(page, 'Kopi Jelajah 20g', 2000);

  const where: string[] = [];
  const checkErrors = async (label: string) => {
    await page.waitForTimeout(250);
    if ((await page.getByText(/mengalami error/).count()) > 0) fatal.push(`Layar error setelah: ${label}`);
    where.push(label);
  };
  const dialogs = () => page.locator('[role="dialog"][aria-modal="true"]:not([data-no-escape])');
  const closeAll = async (label: string) => {
    for (let i = 0; i < 4 && (await dialogs().count()) > 0; i++) {
      await page.keyboard.press('Escape');
      await page.waitForTimeout(150);
    }
    if ((await dialogs().count()) > 0) {
      const d = dialogs().last();
      const name = (await d.getAttribute('aria-labelledby').then((id) => (id ? page.locator(`#${id}`).innerText() : '')).catch(() => '')) || '';
      const closers = await d.locator('button[aria-label^="Tutup"], button').evaluateAll((bs) =>
        bs.slice(0, 40).map((b) => b.getAttribute('aria-label') || (b.textContent || '').trim()).filter((t) => /tutup|batal|kembali|close/i.test(t)).slice(0, 4)
      );
      notes.push(`Tidak tertutup dengan Escape: ${label} [judul: ${name.slice(0, 50)}; tombol tutup: ${JSON.stringify(closers)}; fokus: ${await page.evaluate(() => document.activeElement?.tagName + '#' + (document.activeElement?.id || ''))}]`);
      await page.reload();
      await page.waitForTimeout(800);
    }
  };
  const clickTabsIn = async (scope: ReturnType<Page['locator']>, label: string, max = 40) => {
    const tabs = scope.locator('button[aria-pressed]');
    const n = Math.min(await tabs.count(), max);
    for (let i = 0; i < n; i++) {
      const b = tabs.nth(i);
      if (!(await b.isVisible().catch(() => false))) continue;
      const name = ((await b.innerText().catch(() => '')) || (await b.getAttribute('aria-label')) || `#${i}`).trim().replace(/\s+/g, ' ').slice(0, 40);
      await b.click({ timeout: 3000 }).catch(() => notes.push(`Tidak bisa diklik: ${label} › ${name}`));
      await checkErrors(`${label} › ${name}`);
    }
  };

  // 1. Setiap halaman & setiap tab/filter di dalamnya
  for (const v of VIEWS) {
    await page.locator(`#nav-btn-${v}`).click();
    await checkErrors(`Halaman ${v}`);
    await clickTabsIn(page.locator('main'), `Halaman ${v}`);
    await closeAll(`Halaman ${v}`);
  }

  // 2. Setiap jendela: cari tombolnya di halaman saat ini, menu akun, menu alat, lalu halaman lain
  const tryOpen = async (id: string): Promise<boolean> => {
    const el = page.locator(`#${id}`).first();
    if (NEEDS_TAB[id]) {
      await page.locator('#nav-btn-inventory').click();
      await page.getByRole('button', { name: NEEDS_TAB[id] }).first().click({ timeout: 3000 });
    }
    if (await el.isVisible().catch(() => false)) {
      await el.click({ timeout: 3000 });
      return true;
    }
    for (const menu of ['#btn-employee-menu', '#btn-tools-menu']) {
      await page.locator(menu).click({ timeout: 3000 }).catch(() => {});
      if (await el.isVisible().catch(() => false)) {
        await el.click({ timeout: 3000 });
        return true;
      }
      await page.keyboard.press('Escape');
    }
    for (const v of VIEWS) {
      await page.locator(`#nav-btn-${v}`).click();
      if (await el.isVisible().catch(() => false)) {
        await el.click({ timeout: 3000 });
        return true;
      }
    }
    return false;
  };
  for (const id of OPENERS) {
    await closeAll('sebelum ' + id);
    let reason = '';
    const opened = await tryOpen(id).catch((e: Error) => {
      // Sertakan baris 'intercepts pointer events' (elemen yang menghalangi klik)
      const lines = e.message.split('\n');
      const blocker = lines.find((l) => /intercepts pointer events|not enabled|not visible|not stable/.test(l)) || '';
      reason = `${lines[0]!.slice(0, 100)} ${blocker.trim().slice(0, 220)}`;
      return false;
    });
    if (!opened) {
      notes.push(`Tidak bisa dibuka: #${id}${reason ? ` (${reason})` : ' (tombol tidak terlihat di mana pun)'}`);
      continue;
    }
    await checkErrors(`Jendela #${id}`);
    const dlg = dialogs().last();
    if ((await dlg.count()) > 0) await clickTabsIn(dlg, `Jendela #${id}`, 15);
    await closeAll(`#${id}`);
  }

  // 3. Putaran layar HP: navigasi bawah & menu khusus HP
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await page.waitForTimeout(800);
  await checkErrors('Layar HP');
  for (const id of MOBILE_MENU) {
    await closeAll('sebelum ' + id);
    await page.locator('#btn-employee-menu').click({ timeout: 3000 }).catch(() => {});
    const el = page.locator(`#${id}`).first();
    if (!(await el.isVisible().catch(() => false))) {
      notes.push(`Tidak terlihat di menu HP: #${id}`);
      await page.keyboard.press('Escape');
      continue;
    }
    await el.click({ timeout: 3000 }).catch((e: Error) => notes.push(`Gagal klik #${id}: ${e.message.split('\n')[0]}`));
    await checkErrors(`Layar HP › #${id}`);
    await closeAll(`Layar HP › #${id}`);
  }

  test.info().annotations.push({ type: 'dijelajahi', description: `${where.length} langkah` });
  for (const n of notes) test.info().annotations.push({ type: 'temuan', description: n });
  for (const c of [...new Set(consoleErrors)].slice(0, 15)) test.info().annotations.push({ type: 'console.error', description: c });
  // Ringkasan temuan ditulis juga ke pesan kegagalan agar terbaca di CI
  expect(fatal, `FATAL:\n${fatal.join('\n')}\n\nTEMUAN:\n${notes.join('\n')}`).toEqual([]);
  // Catat temuan non-fatal sebagai kegagalan lunak agar terlihat di ringkasan CI
  expect.soft(notes, `TEMUAN (non-fatal):\n${notes.join('\n')}\n\nconsole.error:\n${[...new Set(consoleErrors)].slice(0, 15).join('\n')}`).toEqual([]);
});

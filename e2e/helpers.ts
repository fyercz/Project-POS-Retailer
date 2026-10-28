import { expect, type Page } from '@playwright/test';

/** Isi layar "Selamat datang" (instalasi baru) dan masuk sebagai Owner. */
export async function registerOwner(page: Page, opts: { owner?: string; pin?: string; store?: string } = {}) {
  await page.goto('/');
  await expect(page.getByTestId('first-run-setup')).toBeVisible();
  await page.getByTestId('setup-store').fill(opts.store ?? 'Toko Uji');
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
  // Bila ditolak, tampilkan pesan galat formulir agar penyebabnya terlihat
  const closed = await page.getByTestId('product-submit').waitFor({ state: 'hidden', timeout: 15_000 }).then(() => true).catch(() => false);
  if (!closed) {
    const errors: string[] = await page
      .locator('[role="dialog"] [role="alert"], [role="dialog"] [id$="-error"]')
      .allInnerTexts()
      .catch(() => []);
    // Validasi bawaan browser (mis. step/min) tidak tampil sebagai teks: ambil pesannya langsung
    const native = await page.evaluate(() =>
      Array.from(document.querySelectorAll('[role="dialog"] input, [role="dialog"] select'))
        .filter((el) => !(el as HTMLInputElement).checkValidity())
        .map((el) => `${(el as HTMLElement).dataset.testid || (el as HTMLInputElement).name}: ${(el as HTMLInputElement).validationMessage}`)
    );
    errors.push(...native);
    const category = await page.getByTestId('product-category').inputValue().catch(() => '?');
    throw new Error(`Produk "${p.name}" tidak tersimpan. Kategori="${category}". Pesan formulir: ${JSON.stringify(errors.filter(Boolean))}`);
  }
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

/** Baca isi sebuah daftar (array) yang tersimpan di IndexedDB aplikasi. */
export async function readStored<T = any>(page: Page, key: string): Promise<T[]> {
  return page.evaluate(
    (k) =>
      new Promise<any[]>((resolve) => {
        const open = indexedDB.open('ulilmart_pos_main_db', 1);
        open.onerror = () => resolve([]);
        open.onsuccess = () => {
          try {
            const req = open.result.transaction('pos_state_store', 'readonly').objectStore('pos_state_store').get(k);
            req.onsuccess = () => resolve(Array.isArray(req.result) ? req.result : []);
            req.onerror = () => resolve([]);
          } catch {
            resolve([]);
          }
        };
      }),
    key
  );
}

/** Baca satu nilai (objek) yang tersimpan di IndexedDB aplikasi. */
export async function readStoredValue<T = any>(page: Page, key: string): Promise<T | null> {
  return page.evaluate(
    (k) =>
      new Promise<any>((resolve) => {
        const open = indexedDB.open('ulilmart_pos_main_db', 1);
        open.onerror = () => resolve(null);
        open.onsuccess = () => {
          try {
            const req = open.result.transaction('pos_state_store', 'readonly').objectStore('pos_state_store').get(k);
            req.onsuccess = () => resolve(req.result ?? null);
            req.onerror = () => resolve(null);
          } catch {
            resolve(null);
          }
        };
      }),
    key
  );
}

/**
 * Kontras SAAT DISOROT untuk semua tombol berlatar warna & bertulisan putih di dalam `scope`.
 * Cepat (tanpa axe): sorot tombol, baca warna yang benar-benar dirender (via kanvas 1x1, karena
 * Tailwind v4 memakai oklch), hitung rasio kontras WCAG. Kombinasi kelas yang sama diperiksa sekali.
 */
export async function hoverContrastFailures(page: Page, scope: string, label: string, max = 12): Promise<string[]> {
  const ids = await page.evaluate(
    ({ sel, max }) => {
      const root = document.querySelector(sel);
      if (!root) return [] as string[];
      const seen = new Set<string>();
      const out: string[] = [];
      for (const b of Array.from(root.querySelectorAll<HTMLButtonElement>('button'))) {
        if (out.length >= max) break;
        if (b.disabled || b.getClientRects().length === 0 || !(b.textContent || '').trim()) continue;
        if (!/(?:^|\s)bg-(?:emerald|blue|rose|indigo|amber|slate)-\d{3}\b/.test(b.className) || !/(?:^|\s)text-white\b/.test(b.className)) continue;
        if (seen.has(b.className)) continue;
        seen.add(b.className);
        const id = `hc-${Math.random().toString(36).slice(2, 8)}`;
        b.setAttribute('data-hc', id);
        out.push(id);
      }
      return out;
    },
    { sel: scope, max }
  );
  const failures: string[] = [];
  for (const id of ids) {
    const btn = page.locator(`[data-hc="${id}"]`);
    if (!(await btn.isVisible().catch(() => false))) continue;
    await btn.hover({ timeout: 2000 }).catch(() => {});
    await page.waitForTimeout(200);
    const r = await btn
      .evaluate((el) => {
        const cv = document.createElement('canvas');
        cv.width = cv.height = 1;
        const ctx = cv.getContext('2d')!;
        const rgb = (c: string) => {
          ctx.clearRect(0, 0, 1, 1);
          ctx.fillStyle = '#000';
          ctx.fillStyle = c;
          ctx.fillRect(0, 0, 1, 1);
          const d = ctx.getImageData(0, 0, 1, 1).data;
          return [d[0]!, d[1]!, d[2]!, d[3]!];
        };
        const lum = ([r, g, b]: number[]) =>
          [r!, g!, b!].map((v) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)).reduce((a, v, i) => a + v * [0.2126, 0.7152, 0.0722][i]!, 0);
        const cs = getComputedStyle(el);
        const bg = rgb(cs.backgroundColor);
        if (bg[3]! < 200) return null; // latar transparan: tidak dinilai di sini
        const fg = rgb(cs.color);
        const [a, b] = [lum(fg), lum(bg)].sort((x, y) => y - x);
        return { ratio: (a! + 0.05) / (b! + 0.05), text: (el.textContent || '').trim().slice(0, 40) };
      })
      .catch(() => null);
    if (r && r.ratio < 4.5) failures.push(`Kontras saat disorot ${r.ratio.toFixed(2)}:1 < 4,5 — "${r.text}" (${label})`);
  }
  await page.mouse.move(0, 0);
  return failures;
}

/**
 * Simulasi toko tanpa internet tetapi LAN tetap jalan: setiap permintaan ke luar alamat lokal
 * diblokir & dicatat. Kembalikan daftar alamat internet yang dicoba aplikasi.
 */
export async function blockInternet(context: import('@playwright/test').BrowserContext): Promise<string[]> {
  const attempted: string[] = [];
  await context.route('**/*', (route) => {
    const url = route.request().url();
    let local = false;
    try {
      const u = new URL(url);
      local = ['data:', 'blob:'].includes(u.protocol) || /^(localhost|127\.\d+\.\d+\.\d+|\[::1\]|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)$/.test(u.hostname);
    } catch {
      local = true;
    }
    if (local) return route.continue();
    attempted.push(url.slice(0, 120));
    return route.abort('internetdisconnected');
  });
  return attempted;
}

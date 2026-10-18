/**
 * Hak akses & keamanan PIN. Mengunci bug yang pernah ditemukan saat review:
 * PIN tampil di menu, Owner tidak bisa membuka layar yang dikunci kasir, tanpa batas salah PIN,
 * kasir bisa membuka Backup & Restore, Supervisor bisa mengubah akun Owner.
 */
import { test, expect } from '@playwright/test';
import { registerOwner, addEmployee, lockAndLogin } from './helpers';

const OWNER = { name: 'Pak Owner', pin: '2580' };
const KASIR = { name: 'Siti Kasir', pin: '4826' };
const SPV = { name: 'Budi Spv', pin: '3691' };

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.print = () => {};
  });
  await registerOwner(page, { owner: OWNER.name, pin: OWNER.pin });
  await addEmployee(page, { name: KASIR.name, role: 'cashier', pin: KASIR.pin });
});

test('PIN tidak pernah tampil di daftar karyawan maupun menu ganti akun', async ({ page }) => {
  await page.locator('#btn-employee-menu').click();
  await page.locator('#menu-item-manage-employees').click();
  const modalText = await page.locator('body').innerText();
  expect(modalText).not.toContain(KASIR.pin);
  expect(modalText).not.toContain(OWNER.pin);
  await page.locator('#btn-close-employee-modal').click();

  await page.locator('#btn-employee-menu').click();
  const menuText = await page.locator('body').innerText();
  expect(menuText).not.toContain(KASIR.pin);
  expect(menuText).not.toContain(OWNER.pin);
});

test('Owner bisa membuka layar yang dikunci kasir (regresi)', async ({ page }) => {
  await lockAndLogin(page, KASIR.name, KASIR.pin);
  await lockAndLogin(page, OWNER.name, OWNER.pin);
});

test('5 kali PIN salah: dikunci sementara, PIN benar pun ditolak selama jeda', async ({ page }) => {
  await page.locator('#btn-header-quick-lock').click();
  await page.getByRole('button', { name: `Pilih ${OWNER.name}` }).click();
  for (let i = 0; i < 5; i++) {
    await page.keyboard.type('1111');
    await expect(page.getByTestId('lock-error')).toBeVisible();
    // Layar kunci memproses PIN 150 ms setelah digit ke-4; beri jeda seperti ketikan manusia
    await page.waitForTimeout(500);
  }
  await expect(page.getByTestId('lock-error')).toContainText('Terlalu banyak PIN salah');
  await page.keyboard.type(OWNER.pin);
  await page.waitForTimeout(500);
  await expect(page.getByTestId('lock-error')).toContainText('Terlalu banyak PIN salah');
  await expect(page.locator('#employee-lock-screen')).toBeVisible();
});

test('kasir tidak bisa membuka Backup & Restore dari layar kasir', async ({ page }) => {
  await lockAndLogin(page, KASIR.name, KASIR.pin);
  await page.locator('#nav-btn-pos').click();
  // Ada dua tombol (layar lebar & kecil); pilih yang terlihat
  await page.locator('#btn-catalog-backup-restore:visible').first().click();
  await expect(page.getByRole('alertdialog')).toContainText('Akses Dibatasi');
});

test('Supervisor tidak bisa mengubah akun Owner', async ({ page }) => {
  await addEmployee(page, { name: SPV.name, role: 'supervisor', pin: SPV.pin });
  await lockAndLogin(page, SPV.name, SPV.pin);
  await page.locator('#btn-employee-menu').click();
  await page.locator('#menu-item-manage-employees').click();
  await page.getByRole('button', { name: `Edit ${OWNER.name}` }).click();
  await page.locator('#btn-save-employee').click();
  await expect(page.getByTestId('employee-notification')).toContainText('Hanya Owner');
});

import { test, expect } from '@playwright/test';
import { registerOwner } from './helpers';

/**
 * Regresi bug kritis: data dulu hanya dimuat dari localStorage (kuota ~5 MB). Setelah penuh,
 * salinan basi di localStorage menimpa data yang benar di IndexedDB setiap kali aplikasi dibuka.
 */
test('muat ulang memakai data IndexedDB, bukan salinan basi di localStorage', async ({ page }) => {
  await page.addInitScript(() => {
    window.print = () => {};
  });
  await registerOwner(page);

  const TOTAL = 2000;
  await page.evaluate(async (total) => {
    const txs = Array.from({ length: total }, (_, i) => ({
      id: `tx-e2e-${i}`,
      invoiceNumber: `INV-E2E-${i}`,
      items: [],
      subtotal: 10000,
      discountAmount: 0,
      taxAmount: 0,
      serviceChargeAmount: 0,
      finalTotal: 10000,
      payment: { method: 'cash', amountTendered: 10000, change: 0 },
      cashierName: 'Pak Uji',
      createdAt: new Date(Date.now() - i * 60000).toISOString(),
      status: 'completed',
    }));
    await new Promise<void>((resolve, reject) => {
      const open = indexedDB.open('ulilmart_pos_main_db', 1);
      open.onerror = () => reject(open.error);
      open.onsuccess = () => {
        const db = open.result;
        const tx = db.transaction('pos_state_store', 'readwrite');
        tx.objectStore('pos_state_store').put(txs, 'pos_retail_tx_v3');
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      };
    });
    // Salinan basi (seolah localStorage penuh dan berhenti diperbarui)
    localStorage.setItem('pos_retail_tx_v3', JSON.stringify(txs.slice(0, 3)));
  }, TOTAL);

  await page.reload();
  await page.locator('#btn-employee-menu').click();
  await page.locator('#menu-item-ready-to-launch').click();
  await expect(page.locator('#btn-clear-trial-transactions')).toHaveText(`Hapus ${TOTAL} Transaksi Uji Coba`);
});

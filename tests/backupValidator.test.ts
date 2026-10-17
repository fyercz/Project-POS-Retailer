import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateBackupFile } from '../src/utils/backupValidator.ts';
import { DEFAULT_STORE_SETTINGS } from '../src/data/mockData.ts';

const tx = { id: 'tx-1', invoiceNumber: 'INV-1', items: [], subtotal: 1000, finalTotal: 1000, createdAt: '2026-10-01T03:00:00.000Z', status: 'completed', payment: { method: 'cash' } };

test('restore: bagian yang tidak ada di berkas dilewati, bukan dikosongkan', () => {
  // Berkas hanya berisi transaksi (tanpa produk, voucher, retur)
  const text = JSON.stringify({ version: '1.1.0', app: 'Ulilmart SmartPOS Retail Pro', data: { transactions: [tx] } });
  const report = validateBackupFile(text, DEFAULT_STORE_SETTINGS as any, 'cadangan.json', '1 KB');
  assert.equal(report.canRestore, true);
  const d = report.sanitizedPayload!.data as any;
  assert.equal(d.transactions.length, 1);
  assert.equal(d.products, undefined, 'katalog tidak boleh dikosongkan');
  assert.equal(d.vouchers, undefined);
  assert.equal(d.salesReturns, undefined);
});

test('restore: pengeluaran & riwayat shift ikut terbawa', () => {
  const text = JSON.stringify({
    version: '1.1.0',
    app: 'Ulilmart SmartPOS Retail Pro',
    data: {
      products: [{ id: 'p1', name: 'Gula', price: 15000, costPrice: 13000, stock: 5, barcode: '123', categoryId: 'groceries', unit: 'pcs' }],
      expenses: [{ id: 'e1', amount: 50000, paymentSource: 'cash_drawer', description: 'Listrik', category: 'utilities', date: '2026-10-01', recordedBy: 'Owner' }],
      pastShifts: [{ id: 's1', startingCash: 0, cashSales: 0, status: 'closed' }],
    },
  });
  const d = validateBackupFile(text, DEFAULT_STORE_SETTINGS as any, 'cadangan.json', '1 KB').sanitizedPayload!.data as any;
  assert.equal(d.expenses.length, 1);
  assert.equal(d.pastShifts.length, 1);
  assert.equal(d.products.length, 1);
});

import React, { useState } from 'react';
import { FileSpreadsheet } from 'lucide-react';
import { usePOS } from '../context/POSContext';
import { Button, Field, ModalShell, StatusText, inputClass } from './ui';
import { buildKasBulanan } from '../domain/kasReport';
import { summarizeCashBook, OTHER_INCOME_LABELS, type OtherIncomeCategory } from '../domain/cashBook';
import { computeIncomeStatement, EXPENSE_CATEGORY_LABELS } from '../utils/accountingLedger';

/**
 * Ekspor Laporan Kas Bulanan ke Excel dengan format laporan manual toko (LAP.HARI / LAP.BLN / PPOB
 * / LABA), terisi otomatis dari data aplikasi.
 */
const BULAN = ['JANUARI', 'FEBRUARI', 'MARET', 'APRIL', 'MEI', 'JUNI', 'JULI', 'AGUSTUS', 'SEPTEMBER', 'OKTOBER', 'NOVEMBER', 'DESEMBER'];

export const KasExportModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const pos = usePOS();
  const now = new Date();
  const [month, setMonth] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
  const [opening, setOpening] = useState('');
  const [ppobOpening, setPpobOpening] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: 'success' | 'danger'; text: string } | null>(null);

  if (!isOpen) return null;

  const exportNow = async () => {
    setBusy(true);
    setMessage(null);
    try {
      const [y, m] = month.split('-').map(Number);
      const start = new Date(y!, m! - 1, 1);
      const end = new Date(y!, m!, 1, 0, 0, 0, -1);
      const report = buildKasBulanan({
        year: y!,
        month: m!,
        openingBalance: Number(opening) || 0,
        ppobOpeningBalance: Number(ppobOpening) || 0,
        shifts: (pos.allShifts || []) as never,
        transactions: (pos.transactions || []) as never,
        supplierPurchases: (pos.supplierPurchases || []) as never,
        suppliers: pos.suppliers || [],
        expenses: (pos.expenses || []) as never,
        cashEntries: pos.cashEntries || [],
        expenseLabel: (c) => (EXPENSE_CATEGORY_LABELS as Record<string, string>)[c] || c,
      });
      const pl = computeIncomeStatement({
        transactions: pos.transactions,
        salesReturns: pos.salesReturns,
        shifts: pos.allShifts,
        expenses: pos.expenses,
        stockAdjustments: pos.stockAdjustments,
        cashEntries: pos.cashEntries,
        pointRedemptionRate: pos.settings.pointRedemptionRate || 100,
        startDate: start.toISOString(),
        endDate: end.toISOString(),
      });
      const cb = summarizeCashBook(pos.cashEntries || [], start.getTime(), end.getTime());
      const otherIncome: Record<string, number> = {};
      (Object.keys(OTHER_INCOME_LABELS) as OtherIncomeCategory[]).forEach((k) => cb.income[k] > 0 && (otherIncome[OTHER_INCOME_LABELS[k]] = cb.income[k]));
      const expenses: Record<string, number> = {};
      for (const e of pos.expenses || []) {
        const t = new Date(e.date).getTime();
        if (t < start.getTime() || t > end.getTime()) continue;
        const label = (EXPENSE_CATEGORY_LABELS as Record<string, string>)[e.category] || e.category;
        expenses[label] = (expenses[label] || 0) + (Number(e.amount) || 0);
      }
      const { buildKasWorkbook } = await import('../utils/kasReportXlsx');
      const wb = await buildKasWorkbook(report, {
        storeName: (pos.settings.storeName || 'TOKO').toUpperCase(),
        storeAddress: pos.settings.address,
        managerName: pos.activeEmployee?.role === 'owner' ? pos.activeEmployee.name.toUpperCase() : undefined,
        salesSystem: Math.round(pl.netSales),
        grossProfit: Math.round(pl.grossProfit),
        otherIncome,
        expenses,
      });
      const buf = await wb.xlsx.writeBuffer();
      const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `LAPORAN_BULAN_${BULAN[m! - 1]}_${y}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      setMessage({ tone: 'success', text: `${report.days.length} hari diekspor. Saldo kas akhir bulan: Rp ${report.closingBalance.toLocaleString('id-ID')}.` });
    } catch (err) {
      setMessage({ tone: 'danger', text: `Gagal membuat laporan: ${err instanceof Error ? err.message : String(err)}` });
    } finally {
      setBusy(false);
    }
  };

  return (
    <ModalShell
      title="Ekspor Laporan Kas Bulanan"
      icon={<FileSpreadsheet className="w-5 h-5 text-emerald-700" />}
      onClose={onClose}
      size="md"
      description="File Excel dengan format laporan kas toko (LAP.HARI, LAP.BLN, PPOB, LABA), terisi otomatis dari aplikasi. Total & saldo memakai rumus."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Tutup
          </Button>
          <Button variant="primary" onClick={exportNow} disabled={busy || !month}>
            {busy ? 'Menyusun laporan...' : 'Unduh Laporan Excel'}
          </Button>
        </>
      }
    >
      <Field label="Bulan laporan">
        <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className={inputClass} />
      </Field>
      <Field label="Sisa saldo kas bulan lalu (Rp)" hint="Baris pertama LAP.HARI: 'Sisa Saldo Bulan ...'">
        <input type="number" min={0} step={1} value={opening} onChange={(e) => setOpening(e.target.value)} className={inputClass} />
      </Field>
      <Field label="Saldo awal PPOB (Rp)" hint="Sisa saldo PPOB bulan lalu (lembar PPOB)">
        <input type="number" min={0} step={1} value={ppobOpening} onChange={(e) => setPpobOpening(e.target.value)} className={inputClass} />
      </Field>
      {message && <StatusText tone={message.tone}>{message.text}</StatusText>}
    </ModalShell>
  );
};

import React, { useState, useMemo } from 'react';
import {
  History,
  Search,
  ArrowDownLeft,
  ArrowUpRight,
  Download,
  Filter,
  Clock,
  User,
  Receipt,
  Award,
  Coins,
  Tag,
  CheckCircle2,
} from 'lucide-react';
import { usePOS } from '../../../context/POSContext';
import { formatCurrency } from '../../../utils/formatters';
import { Customer } from '../../../types';

interface LedgerRow {
  id: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerTier: string;
  type: 'earned' | 'redeemed' | 'adjusted' | 'bonus';
  points: number;
  balanceAfter: number;
  description: string;
  date: string;
  invoiceNumber?: string;
  operatorName?: string;
}

export const LoyaltyLedger: React.FC = () => {
  const { customers, settings, transactions } = usePOS();
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'earned' | 'redeemed' | 'adjusted' | 'bonus'>('all');
  const [customerFilter, setCustomerFilter] = useState<string>('all');

  const redemptionRate = settings.pointRedemptionRate || 100;

  // Aggregate all points history rows across all customers
  const allLedgerRows = useMemo(() => {
    const rows: LedgerRow[] = [];

    customers.forEach((cust) => {
      if (cust.pointsHistory && cust.pointsHistory.length > 0) {
        cust.pointsHistory.forEach((entry) => {
          rows.push({
            id: entry.id,
            customerId: cust.id,
            customerName: cust.name,
            customerPhone: cust.phone,
            customerTier: cust.tier || 'Bronze',
            type: entry.type,
            points: entry.points,
            balanceAfter: entry.balanceAfter,
            description: entry.description,
            date: entry.date,
            invoiceNumber: entry.invoiceNumber || entry.transactionId,
            operatorName: entry.operatorName,
          });
        });
      }
    });

    // Also include transactions from POS transactions if not already recorded in customer history
    transactions.forEach((tx) => {
      if (tx.customer && (tx.pointsEarned > 0 || (tx.pointsUsed && tx.pointsUsed > 0))) {
        // Check if an entry with this invoice already exists
        const exists = rows.some((r) => r.invoiceNumber === tx.invoiceNumber);
        if (!exists) {
          if (tx.pointsUsed && tx.pointsUsed > 0) {
            rows.push({
              id: `tx-red-${tx.id}`,
              customerId: tx.customer.id,
              customerName: tx.customer.name,
              customerPhone: tx.customer.phone,
              customerTier: tx.customer.tier || 'Bronze',
              type: 'redeemed',
              points: -tx.pointsUsed,
              balanceAfter: tx.customer.points,
              description: `Tukar ${tx.pointsUsed} Poin Diskon Rp ${(tx.pointsDiscount || 0).toLocaleString('id-ID')}`,
              date: tx.createdAt,
              invoiceNumber: tx.invoiceNumber,
              operatorName: tx.cashierName,
            });
          }
          if (tx.pointsEarned > 0) {
            rows.push({
              id: `tx-earn-${tx.id}`,
              customerId: tx.customer.id,
              customerName: tx.customer.name,
              customerPhone: tx.customer.phone,
              customerTier: tx.customer.tier || 'Bronze',
              type: 'earned',
              points: tx.pointsEarned,
              balanceAfter: tx.customer.points,
              description: `Perolehan Transaksi Belanja ${formatCurrency(tx.finalTotal, settings.currency)}`,
              date: tx.createdAt,
              invoiceNumber: tx.invoiceNumber,
              operatorName: tx.cashierName,
            });
          }
        }
      }
    });

    // Sort descending by date
    return rows.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [customers, transactions, settings]);

  // Filtered rows
  const filteredRows = useMemo(() => {
    return allLedgerRows.filter((row) => {
      const q = searchTerm.toLowerCase();
      const matchQuery =
        !q ||
        row.customerName.toLowerCase().includes(q) ||
        row.customerPhone.includes(q) ||
        (row.invoiceNumber && row.invoiceNumber.toLowerCase().includes(q)) ||
        row.description.toLowerCase().includes(q);

      const matchType = typeFilter === 'all' || row.type === typeFilter;
      const matchCustomer = customerFilter === 'all' || row.customerId === customerFilter;

      return matchQuery && matchType && matchCustomer;
    });
  }, [allLedgerRows, searchTerm, typeFilter, customerFilter]);

  // Summary statistics
  const totalEarnedPoints = useMemo(() => {
    return allLedgerRows
      .filter((r) => r.points > 0)
      .reduce((sum, r) => sum + r.points, 0);
  }, [allLedgerRows]);

  const totalRedeemedPoints = useMemo(() => {
    return allLedgerRows
      .filter((r) => r.points < 0)
      .reduce((sum, r) => sum + Math.abs(r.points), 0);
  }, [allLedgerRows]);

  const totalDiscountRupiah = totalRedeemedPoints * redemptionRate;

  // CSV Export
  const handleExportCSV = () => {
    if (filteredRows.length === 0) {
      alert('Tidak ada data buku besar poin untuk diekspor.');
      return;
    }

    const headers = [
      'ID Mutasi',
      'Tanggal & Waktu',
      'Nama Member',
      'No. WhatsApp',
      'Tier',
      'Tipe Mutasi',
      'Poin (+/-)',
      'Nilai Diskon (Rp)',
      'Saldo Akhir',
      'No. Faktur',
      'Keterangan',
      'Operator',
    ];

    const csvLines = [
      headers.join(','),
      ...filteredRows.map((r) =>
        [
          `"${r.id}"`,
          `"${r.date}"`,
          `"${r.customerName.replace(/"/g, '""')}"`,
          `"${r.customerPhone}"`,
          `"${r.customerTier}"`,
          `"${r.type}"`,
          r.points,
          r.points < 0 ? Math.abs(r.points) * redemptionRate : 0,
          r.balanceAfter,
          `"${r.invoiceNumber || '-'}"`,
          `"${r.description.replace(/"/g, '""')}"`,
          `"${r.operatorName || '-'}"`,
        ].join(',')
      ),
    ];

    const blob = new Blob([csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `buku_poin_loyalitas_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4">
      {/* Ledger Stats Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
            Total Poin Diperoleh
          </span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-black font-mono text-emerald-600 dark:text-emerald-400">
              +{totalEarnedPoints.toLocaleString()}
            </span>
            <span className="text-xs text-slate-400 font-bold">Pts</span>
          </div>
          <span className="text-[10px] text-slate-500">Dari belanja transaksi member</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
            Total Poin Ditukarkan
          </span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-black font-mono text-amber-600 dark:text-amber-400">
              -{totalRedeemedPoints.toLocaleString()}
            </span>
            <span className="text-xs text-slate-400 font-bold">Pts</span>
          </div>
          <span className="text-[10px] text-slate-500">Telah ditukar potongan diskon</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
            Total Diskon Diberikan
          </span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-black font-mono text-slate-900 dark:text-white">
              {formatCurrency(totalDiscountRupiah, settings.currency)}
            </span>
          </div>
          <span className="text-[10px] text-slate-500">Hemat belanja yang dinikmati pembeli</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
            Poin Beredar Saat Ini
          </span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-black font-mono text-purple-600 dark:text-purple-400">
              {customers.reduce((sum, c) => sum + (c.points || 0), 0).toLocaleString()}
            </span>
            <span className="text-xs text-slate-400 font-bold">Pts</span>
          </div>
          <span className="text-[10px] text-slate-500">
            Setara {formatCurrency(customers.reduce((sum, c) => sum + (c.points || 0), 0) * redemptionRate, settings.currency)} diskon
          </span>
        </div>
      </div>

      {/* Filter and Export Bar */}
      <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-center gap-2 flex-1 min-w-[240px] max-w-md">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari member, no. faktur, telepon, atau keterangan..."
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap text-xs">
          {/* Filter Type */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as any)}
            className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-medium cursor-pointer"
          >
            <option value="all">Semua Jenis Mutasi</option>
            <option value="earned">Perolehan Transaksi (+)</option>
            <option value="redeemed">Penukaran Diskon (-)</option>
            <option value="bonus">Bonus Loyalitas (+)</option>
            <option value="adjusted">Penyesuaian Manual</option>
          </select>

          {/* Filter Customer */}
          <select
            value={customerFilter}
            onChange={(e) => setCustomerFilter(e.target.value)}
            className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-medium cursor-pointer max-w-[160px]"
          >
            <option value="all">Semua Member</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Export CSV */}
          <button
            type="button"
            onClick={handleExportCSV}
            className="px-3 py-1.5 rounded-xl border border-emerald-300 dark:border-emerald-700 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 font-bold flex items-center gap-1.5 cursor-pointer transition shadow-2xs"
          >
            <Download className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Ekspor CSV</span>
          </button>
        </div>
      </div>

      {/* Ledger Table */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                <th className="p-3">Waktu & Tanggal</th>
                <th className="p-3">Member</th>
                <th className="p-3">No. Faktur / Ref</th>
                <th className="p-3">Keterangan Mutasi</th>
                <th className="p-3 text-right">Mutasi Poin</th>
                <th className="p-3 text-right">Nilai Diskon</th>
                <th className="p-3 text-right">Saldo Akhir</th>
                <th className="p-3">Kasir / Operator</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400 text-xs">
                    Belum ada riwayat mutasi poin yang cocok dengan kriteria pencarian.
                  </td>
                </tr>
              ) : (
                filteredRows.map((row) => {
                  const isPositive = row.points > 0;
                  const discountVal = !isPositive ? Math.abs(row.points) * redemptionRate : 0;

                  return (
                    <tr
                      key={row.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="p-3 font-mono text-slate-500 dark:text-slate-400 text-[11px] whitespace-nowrap">
                        {row.date ? row.date.slice(0, 16).replace('T', ' ') : '-'}
                      </td>

                      <td className="p-3">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-900 dark:text-white">
                            {row.customerName}
                          </span>
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full border bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300">
                            {row.customerTier}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {row.customerPhone}
                        </span>
                      </td>

                      <td className="p-3 font-mono text-xs font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                        {row.invoiceNumber || '-'}
                      </td>

                      <td className="p-3 text-slate-600 dark:text-slate-300 max-w-xs">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`p-1 rounded-md shrink-0 ${
                              isPositive
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400'
                                : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400'
                            }`}
                          >
                            {isPositive ? (
                              <ArrowDownLeft className="w-3 h-3" />
                            ) : (
                              <ArrowUpRight className="w-3 h-3" />
                            )}
                          </span>
                          <span className="truncate">{row.description}</span>
                        </div>
                      </td>

                      <td className="p-3 text-right font-mono font-bold whitespace-nowrap">
                        <span
                          className={
                            isPositive
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-amber-600 dark:text-amber-400'
                          }
                        >
                          {isPositive ? `+${row.points}` : row.points} Pts
                        </span>
                      </td>

                      <td className="p-3 text-right font-mono text-slate-600 dark:text-slate-300 whitespace-nowrap">
                        {discountVal > 0 ? (
                          <span className="font-bold text-amber-600 dark:text-amber-400">
                            {formatCurrency(discountVal, settings.currency)}
                          </span>
                        ) : (
                          '-'
                        )}
                      </td>

                      <td className="p-3 text-right font-mono font-bold text-slate-900 dark:text-white whitespace-nowrap">
                        {row.balanceAfter.toLocaleString()} Pts
                      </td>

                      <td className="p-3 text-slate-500 dark:text-slate-400 text-[11px] whitespace-nowrap">
                        {row.operatorName || 'Sistem POS'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

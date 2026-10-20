import React from 'react';
import { Plus } from 'lucide-react';
import { formatCurrency } from '../../../utils/formatters';
import type { ExpenseCategory, SalesReturn, StoreSettings } from '../../../types';
import { EXPENSE_CATEGORY_LABELS, type computeIncomeStatement } from '../../../utils/accountingLedger';
import { formatPeriodLabel, type DateFilterPreset } from '../../../utils/dateFilters';

/** Dipisah dari ReportsView agar file lebih kecil & mudah dirawat. */
interface IncomeStatementPanelProps {
  dateFilteredIncome: ReturnType<typeof computeIncomeStatement>;
  datePreset: DateFilterPreset;
  startDate: string;
  endDate: string;
  salesReturns: SalesReturn[];
  setIsExpenseModalOpen: (open: boolean) => void;
  settings: StoreSettings;
}

export const IncomeStatementPanel: React.FC<IncomeStatementPanelProps> = ({ dateFilteredIncome, datePreset, startDate, endDate, salesReturns, setIsExpenseModalOpen, settings }) => (
            <div className="space-y-4">
              {/* Income Statement 4-KPIs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                    Penjualan Bersih (Net Sales)
                  </span>
                  <div className="text-xl font-black font-mono text-slate-900 dark:text-white mt-1">
                    {formatCurrency(dateFilteredIncome.netSales, settings.currency)}
                  </div>
                  <span className="text-[11px] text-slate-500 mt-1 block">
                    Omzet Kotor {formatCurrency(dateFilteredIncome.grossSales)} - Diskon {formatCurrency(dateFilteredIncome.salesDiscounts)}
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                    Harga Pokok Penjualan (HPP)
                  </span>
                  <div className="text-xl font-black font-mono text-amber-700 dark:text-amber-400 mt-1">
                    {formatCurrency(dateFilteredIncome.costOfGoodsSold, settings.currency)}
                  </div>
                  <span className="text-[11px] text-slate-500 mt-1 block">
                    Modal barang yang terjual pada periode ini
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                      Laba Kotor (Gross Profit)
                    </span>
                    <span className="px-1.5 py-0.2 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-mono text-[11px] font-bold">
                      {dateFilteredIncome.grossProfitMarginPercent.toFixed(1)}% Margin
                    </span>
                  </div>
                  <div className="text-xl font-black font-mono text-emerald-600 dark:text-emerald-400 mt-1">
                    {formatCurrency(dateFilteredIncome.grossProfit, settings.currency)}
                  </div>
                  <span className="text-[11px] text-slate-500 mt-1 block">
                    Penjualan Bersih dikurangi HPP Barang
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300">
                      Laba Bersih Operasional
                    </span>
                    <span className="px-1.5 py-0.2 rounded-md bg-emerald-200/80 dark:bg-emerald-900 text-emerald-900 dark:text-emerald-100 font-mono text-[11px] font-bold">
                      {dateFilteredIncome.netProfitMarginPercent.toFixed(1)}% Net
                    </span>
                  </div>
                  <div className="text-2xl font-black font-mono text-emerald-700 dark:text-emerald-400 mt-1">
                    {formatCurrency(dateFilteredIncome.netOperatingProfit, settings.currency)}
                  </div>
                  <span className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-1 block">
                    Setelah dikurangi seluruh beban operasional
                  </span>
                </div>
              </div>

              {/* Comprehensive Financial Statement Table */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                <div className="p-4 bg-slate-100/70 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                      Rincian Laporan Laba Rugi Komprehensif
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Periode: {formatPeriodLabel(datePreset, startDate, endDate)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsExpenseModalOpen(true)}
                    className="px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Catat Biaya Toko</span>
                  </button>
                </div>

                <div className="p-4 space-y-4 text-xs font-mono">
                  {/* I. PENDAPATAN */}
                  <div>
                    <div className="font-bold text-slate-800 dark:text-slate-200 text-xs font-sans border-b border-slate-200 dark:border-slate-800 pb-1 mb-2">
                      I. PENDAPATAN PENJUALAN RITEL (REVENUE)
                    </div>
                    <div className="space-y-1 pl-3">
                      <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800/40">
                        <span className="font-sans text-slate-700 dark:text-slate-300">4010 • Penjualan Kotor (sebelum diskon)</span>
                        <span>{formatCurrency(dateFilteredIncome.grossSales, settings.currency)}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800/40 text-rose-600 dark:text-rose-400">
                        <span className="font-sans">4020 • Potongan Diskon, Voucher &amp; Member (-)</span>
                        <span>-{formatCurrency(dateFilteredIncome.salesDiscounts, settings.currency)}</span>
                      </div>
                      {dateFilteredIncome.salesReturns > 0 && (
                        <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800/40 text-rose-600 dark:text-rose-400">
                          <span className="font-sans">6030 • Retur Penjualan Konsumen (-)</span>
                          <span>-{formatCurrency(dateFilteredIncome.salesReturns, settings.currency)}</span>
                        </div>
                      )}
                      <div className="flex justify-between py-1.5 font-bold text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-800/50 px-2 rounded-xl">
                        <span className="font-sans">TOTAL PENJUALAN BERSIH (NET SALES)</span>
                        <span>{formatCurrency(dateFilteredIncome.netSales, settings.currency)}</span>
                      </div>
                    </div>
                  </div>

                  {/* II. HPP */}
                  <div>
                    <div className="font-bold text-slate-800 dark:text-slate-200 text-xs font-sans border-b border-slate-200 dark:border-slate-800 pb-1 mb-2">
                      II. HARGA POKOK PENJUALAN (HPP / COGS)
                    </div>
                    <div className="space-y-1 pl-3">
                      <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800/40 text-amber-700 dark:text-amber-400">
                        <span className="font-sans">5010 • Beban Pokok Penjualan (Modal Barang Terjual) (-)</span>
                        <span>-{formatCurrency(dateFilteredIncome.costOfGoodsSold, settings.currency)}</span>
                      </div>
                      <div className="flex justify-between py-1.5 font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-2 rounded-xl">
                        <span className="font-sans">LABA KOTOR TOKO (GROSS PROFIT)</span>
                        <span>{formatCurrency(dateFilteredIncome.grossProfit, settings.currency)} ({dateFilteredIncome.grossProfitMarginPercent.toFixed(1)}%)</span>
                      </div>
                    </div>
                  </div>

                  {/* III. BEBAN OPERASIONAL */}
                  <div>
                    <div className="font-bold text-slate-800 dark:text-slate-200 text-xs font-sans border-b border-slate-200 dark:border-slate-800 pb-1 mb-2">
                      III. BEBAN OPERASIONAL TOKO (OPEX)
                    </div>
                    <div className="space-y-1 pl-3">
                      {Object.entries(dateFilteredIncome.operatingExpenses.byCategory).map(([catKey, amount]) => {
                        if (amount <= 0) return null;
                        const label = EXPENSE_CATEGORY_LABELS[catKey as ExpenseCategory] || catKey;
                        return (
                          <div key={catKey} className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800/40 text-slate-700 dark:text-slate-300">
                            <span className="font-sans">6010 • Beban {label}</span>
                            <span>-{formatCurrency(amount, settings.currency)}</span>
                          </div>
                        );
                      })}

                      {dateFilteredIncome.operatingExpenses.cashShortExpense > 0 && (
                        <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800/40 text-rose-600 dark:text-rose-400">
                          <span className="font-sans">6020 • Beban Selisih Kurang Kas Tutup Shift Kasir</span>
                          <span>-{formatCurrency(dateFilteredIncome.operatingExpenses.cashShortExpense, settings.currency)}</span>
                        </div>
                      )}

                      <div className="flex justify-between py-1.5 font-bold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 px-2 rounded-xl">
                        <span className="font-sans">TOTAL BEBAN OPERASIONAL TOKO</span>
                        <span>-{formatCurrency(dateFilteredIncome.operatingExpenses.totalOperatingExpenses, settings.currency)}</span>
                      </div>
                    </div>
                  </div>

                  {/* IV. LABA BERSIH OPERASIONAL */}
                  <div className="pt-2">
                    <div className="flex justify-between py-3 px-4 font-black text-sm text-emerald-950 dark:text-emerald-100 bg-gradient-to-r from-emerald-100 via-emerald-100 to-emerald-100 dark:from-emerald-900/60 dark:via-emerald-900/40 dark:to-emerald-900/60 rounded-xl border border-emerald-300 dark:border-emerald-700">
                      <span className="font-sans">LABA BERSIH OPERASIONAL BERJALAN (NET PROFIT)</span>
                      <span className="text-base">{formatCurrency(dateFilteredIncome.netOperatingProfit, settings.currency)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          
);

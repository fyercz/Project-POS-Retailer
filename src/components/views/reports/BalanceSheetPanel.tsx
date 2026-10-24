import React from 'react';
import { Building2, Coins, Scale, ShieldCheck, ShoppingBag, Wallet } from 'lucide-react';
import { formatCurrency } from '../../../utils/formatters';
import type { StoreSettings } from '../../../types';
import type { computeBalanceSheet } from '../../../utils/accountingLedger';

/** Dipisah dari ReportsView agar file lebih kecil & mudah dirawat. */
interface BalanceSheetPanelProps {
  balanceSheet: ReturnType<typeof computeBalanceSheet>;
  settings: StoreSettings;
}

export const BalanceSheetPanel: React.FC<BalanceSheetPanelProps> = ({ balanceSheet, settings }) => (
            <div className="space-y-4">
              {/* Top KPI Cards for Balance Sheet */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 dark:from-emerald-950/40 dark:to-slate-900 border border-emerald-200 dark:border-emerald-800 shadow-sm">
                  <div className="flex items-center justify-between text-emerald-700 dark:text-emerald-400 text-xs font-bold">
                    <span className="flex items-center gap-1.5">
                      <Building2 className="w-4 h-4" />
                      <span>Total Aset (Aktiva)</span>
                    </span>
                    <span className="text-[11px] px-1.5 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200">
                      Riil Toko
                    </span>
                  </div>
                  <div className="text-2xl font-black font-mono text-slate-900 dark:text-white mt-1.5">
                    {formatCurrency(balanceSheet.assets.totalAssets, settings.currency)}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    Kas + Bank + EDC + Valuasi Stok Fisik Toko
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
                  <div className="flex items-center justify-between text-slate-600 dark:text-slate-400 text-xs font-bold">
                    <span className="flex items-center gap-1.5">
                      <Coins className="w-4 h-4 text-rose-600" />
                      <span>Total Kewajiban (Utang)</span>
                    </span>
                  </div>
                  <div className="text-2xl font-black font-mono text-rose-600 dark:text-rose-400 mt-1.5">
                    {formatCurrency(balanceSheet.liabilities.totalLiabilities, settings.currency)}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    Utang Supplier Tempo ({formatCurrency(balanceSheet.liabilities.accountsPayable)}) + Poin Member
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
                  <div className="flex items-center justify-between text-slate-600 dark:text-slate-400 text-xs font-bold">
                    <span className="flex items-center gap-1.5">
                      <Wallet className="w-4 h-4 text-blue-500" />
                      <span>Total Ekuitas Bersih</span>
                    </span>
                  </div>
                  <div className="text-2xl font-black font-mono text-blue-600 dark:text-blue-400 mt-1.5">
                    {formatCurrency(balanceSheet.equity.totalEquity, settings.currency)}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    Modal Pemilik + Laba Berjalan + Laba Ditahan
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
                  <div className="flex items-center justify-between text-slate-600 dark:text-slate-400 text-xs font-bold">
                    <span className="flex items-center gap-1.5">
                      <ShoppingBag className="w-4 h-4 text-indigo-500" />
                      <span>Valuasi Stok Fisik</span>
                    </span>
                  </div>
                  <div className="text-2xl font-black font-mono text-indigo-600 dark:text-indigo-400 mt-1.5">
                    {formatCurrency(balanceSheet.assets.merchandiseInventory, settings.currency)}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    Nilai modal modal HPP persediaan barang
                  </p>
                </div>
              </div>

              {/* Dual-Column Balance Sheet Statement Table */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* AKTIVA (ASSETS) */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                  <div className="p-3.5 bg-slate-100/80 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="p-1 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                        <Building2 className="w-4 h-4" />
                      </span>
                      <h3 className="font-bold text-sm text-slate-900 dark:text-white">ASET / AKTIVA</h3>
                    </div>
                    <span className="text-xs font-mono font-bold text-emerald-700 dark:text-emerald-400">
                      {formatCurrency(balanceSheet.assets.totalAssets, settings.currency)}
                    </span>
                  </div>

                  <div className="p-4 space-y-3 text-xs">
                    <div className="border-b border-slate-100 dark:border-slate-800 pb-2">
                      <span className="font-bold text-slate-700 dark:text-slate-300 tracking-wide text-[11px] uppercase">
                        Aset Lancar (Current Assets)
                      </span>
                    </div>

                    <div className="space-y-2">
                      {(balanceSheet.assets.supplierReturnReceivable ?? 0) > 0 && (
                        <div className="flex justify-between items-center py-1 border-b border-slate-100 dark:border-slate-800/60">
                          <div>
                            <span className="font-medium text-slate-800 dark:text-slate-200">1060 • Piutang Retur Supplier</span>
                            <p className="text-[11px] text-slate-500">Barang diretur ke supplier yang belum diganti uang/potongan hutang</p>
                          </div>
                          <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                            {formatCurrency(balanceSheet.assets.supplierReturnReceivable ?? 0, settings.currency)}
                          </span>
                        </div>
                      )}
                      {(balanceSheet.assets.openingFunds ?? 0) > 0 && (
                        <div className="flex justify-between items-center py-1 border-b border-slate-100 dark:border-slate-800/60">
                          <div>
                            <span className="font-medium text-slate-800 dark:text-slate-200">1005 • Dana Awal Lainnya</span>
                            <p className="text-[11px] text-slate-500">Bagian Modal Awal yang tidak dirinci sebagai uang di laci/bank (mis. stok awal) - Pengaturan</p>
                          </div>
                          <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                            {formatCurrency(balanceSheet.assets.openingFunds ?? 0, settings.currency)}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between items-center py-1 border-b border-slate-100 dark:border-slate-800/60">
                        <div>
                          <span className="font-medium text-slate-800 dark:text-slate-200">1010 • Kas di Laci Kasir (Cash on Hand)</span>
                          <p className="text-[11px] text-slate-500">Uang tunai fisik siap edar di laci</p>
                        </div>
                        <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                          {formatCurrency(balanceSheet.assets.cashOnHand, settings.currency)}
                        </span>
                      </div>

                      <div className="flex justify-between items-center py-1 border-b border-slate-100 dark:border-slate-800/60">
                        <div>
                          <span className="font-medium text-slate-800 dark:text-slate-200">1020 • Bank &amp; Rekening QRIS</span>
                          <p className="text-[11px] text-slate-500">Saldo dana kliring QRIS &amp; transfer bank</p>
                        </div>
                        <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                          {formatCurrency(balanceSheet.assets.bankAndQris, settings.currency)}
                        </span>
                      </div>

                      <div className="flex justify-between items-center py-1 border-b border-slate-100 dark:border-slate-800/60">
                        <div>
                          <span className="font-medium text-slate-800 dark:text-slate-200">1030 • Piutang Kliring EDC Kartu</span>
                          <p className="text-[11px] text-slate-500">Settlement kartu debit/kredit mesin EDC</p>
                        </div>
                        <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                          {formatCurrency(balanceSheet.assets.edcCardReceivables, settings.currency)}
                        </span>
                      </div>

                      <div className="flex justify-between items-center py-1 border-b border-slate-100 dark:border-slate-800/60">
                        <div>
                          <span className="font-medium text-slate-800 dark:text-slate-200">1050 • Persediaan Barang Dagang</span>
                          <p className="text-[11px] text-slate-500">Total nilai modal stok barang di rak &amp; gudang</p>
                        </div>
                        <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                          {formatCurrency(balanceSheet.assets.merchandiseInventory, settings.currency)}
                        </span>
                      </div>
                    </div>

                    <div className="p-3 bg-emerald-50/70 dark:bg-emerald-950/30 rounded-xl border border-emerald-200/80 dark:border-emerald-800/60 flex justify-between items-center mt-4">
                      <span className="font-bold text-emerald-900 dark:text-emerald-200">TOTAL AKTIVA (ASET)</span>
                      <span className="font-black font-mono text-emerald-700 dark:text-emerald-300 text-sm">
                        {formatCurrency(balanceSheet.assets.totalAssets, settings.currency)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* PASIVA & EKUITAS (LIABILITIES & EQUITY) */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                  <div className="p-3.5 bg-slate-100/80 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="p-1 rounded-xl bg-blue-500/20 text-blue-600 dark:text-blue-400">
                        <Scale className="w-4 h-4" />
                      </span>
                      <h3 className="font-bold text-sm text-slate-900 dark:text-white">KEWAJIBAN &amp; EKUITAS (PASIVA)</h3>
                    </div>
                    <span className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400">
                      {formatCurrency(balanceSheet.totalLiabilitiesAndEquity, settings.currency)}
                    </span>
                  </div>

                  <div className="p-4 space-y-4 text-xs">
                    {/* Liabilities Section */}
                    <div>
                      <div className="border-b border-slate-100 dark:border-slate-800 pb-1 mb-2">
                        <span className="font-bold text-rose-600 dark:text-rose-400 tracking-wide text-[11px] uppercase">
                          Kewajiban Jangka Pendek (Liabilitas)
                        </span>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between items-center py-1 border-b border-slate-100 dark:border-slate-800/60">
                          <div>
                            <span className="font-medium text-slate-800 dark:text-slate-200">2010 • Utang Dagang Supplier</span>
                            <p className="text-[11px] text-slate-500">Faktur pembelian PO tempo distributor belum lunas</p>
                          </div>
                          <span className="font-mono font-bold text-rose-600 dark:text-rose-400">
                            {formatCurrency(balanceSheet.liabilities.accountsPayable, settings.currency)}
                          </span>
                        </div>

                        {Boolean(balanceSheet.liabilities.consignmentPayable && balanceSheet.liabilities.consignmentPayable > 0) && (
                          <div className="flex justify-between items-center py-1 border-b border-slate-100 dark:border-slate-800/60">
                            <div>
                              <span className="font-medium text-slate-800 dark:text-slate-200">2030 • Utang Titipan / Konsinyasi</span>
                              <p className="text-[11px] text-slate-500">Titipan barang konsinyasi supplier menunggu rekonsiliasi</p>
                            </div>
                            <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                              {formatCurrency(balanceSheet.liabilities.consignmentPayable || 0, settings.currency)}
                            </span>
                          </div>
                        )}

                        <div className="flex justify-between items-center py-1 border-b border-slate-100 dark:border-slate-800/60">
                          <div>
                            <span className="font-medium text-slate-800 dark:text-slate-200">2020 • Liabilitas Poin Member</span>
                            <p className="text-[11px] text-slate-500">Titipan nilai poin beredar pelanggan</p>
                          </div>
                          <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                            {formatCurrency(balanceSheet.liabilities.pointsLiability, settings.currency)}
                          </span>
                        </div>

                        {(balanceSheet.liabilities.storeCreditLiability ?? 0) > 0 && (
                        <div className="flex justify-between items-center py-1 border-b border-slate-100 dark:border-slate-800/60">
                          <div>
                            <span className="font-medium text-slate-800 dark:text-slate-200">2040 • Saldo Toko Pelanggan (Retur)</span>
                            <p className="text-[11px] text-slate-500">Retur yang dibayar dengan saldo toko dan belum dibelanjakan pelanggan</p>
                          </div>
                          <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                            {formatCurrency(balanceSheet.liabilities.storeCreditLiability ?? 0, settings.currency)}
                          </span>
                        </div>
                        )}

                        <div className="flex justify-between text-[11px] font-bold text-rose-700 dark:text-rose-300 pt-1">
                          <span>Total Kewajiban</span>
                          <span className="font-mono">{formatCurrency(balanceSheet.liabilities.totalLiabilities, settings.currency)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Equity Section */}
                    <div>
                      <div className="border-b border-slate-100 dark:border-slate-800 pb-1 mb-2">
                        <span className="font-bold text-blue-600 dark:text-blue-400 tracking-wide text-[11px] uppercase">
                          Ekuitas Pemilik Toko (Modal)
                        </span>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between items-center py-1 border-b border-slate-100 dark:border-slate-800/60">
                          <div>
                            <span className="font-medium text-slate-800 dark:text-slate-200">3010 • Modal Awal Pemilik Toko</span>
                            <p className="text-[11px] text-slate-500">Diisi Owner di Pengaturan</p>
                          </div>
                          <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                            {formatCurrency(balanceSheet.equity.ownerInitialCapital, settings.currency)}
                          </span>
                        </div>

                        <div className="flex justify-between items-center py-1 border-b border-slate-100 dark:border-slate-800/60">
                          <div>
                            <span className="font-medium text-slate-800 dark:text-slate-200">Laba (Rugi) Tercatat</span>
                            <p className="text-[11px] text-slate-500">Akumulasi laba bersih dari Laporan Laba Rugi (termasuk retur)</p>
                          </div>
                          <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400">
                            {formatCurrency(balanceSheet.equity.currentPeriodNetIncome, settings.currency)}
                          </span>
                        </div>

                        {/* Dulu: "Laba ditahan" = SISA agar neraca selalu seimbang. Kini sisa ditampilkan terang-terangan. */}
                        <div className={`py-1.5 px-2 rounded-lg border ${balanceSheet.isReconciled ? 'border-slate-100 dark:border-slate-800/60' : 'border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30'}`}>
                          <div className="flex justify-between items-center gap-2">
                            <span className="font-medium text-slate-800 dark:text-slate-200">Modal Persediaan Awal &amp; Selisih Belum Tercatat</span>
                            <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                              {formatCurrency(balanceSheet.equity.unrecordedCapital ?? 0, settings.currency)}
                            </span>
                          </div>
                          {!balanceSheet.isReconciled && (
                            <p className="text-[11px] text-amber-800 dark:text-amber-300 mt-1">
                              Nilai yang tidak dijelaskan oleh transaksi tercatat. Biasanya: stok awal/impor yang diinput tanpa faktur
                              pembelian, hasil stock opname/koreksi, atau kas awal yang belum diisi di Modal Awal. Bila nilainya jauh
                              dari perkiraan Anda, periksa data stok & harga modal.
                            </p>
                          )}
                        </div>

                        <div className="flex justify-between text-[11px] font-bold text-blue-700 dark:text-blue-300 pt-1">
                          <span>Total Ekuitas</span>
                          <span className="font-mono">{formatCurrency(balanceSheet.equity.totalEquity, settings.currency)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="p-3 bg-blue-50/70 dark:bg-blue-950/30 rounded-xl border border-blue-200/80 dark:border-blue-800/60 flex justify-between items-center mt-4">
                      <span className="font-bold text-blue-900 dark:text-blue-200">TOTAL PASIVA (KEWAJIBAN + EKUITAS)</span>
                      <span className="font-black font-mono text-blue-700 dark:text-blue-300 text-sm">
                        {formatCurrency(balanceSheet.totalLiabilitiesAndEquity, settings.currency)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Accounting Equation Summary Bar */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-50 via-emerald-50 to-blue-50 dark:from-slate-900 dark:via-emerald-950/20 dark:to-slate-900 border border-emerald-300 dark:border-emerald-800 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2.5">
                  <ShieldCheck className="w-5 h-5 text-emerald-700 dark:text-emerald-400 shrink-0" />
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-white">
                      Persamaan Dasar Akuntansi: Aktiva = Pasiva + Ekuitas
                    </h4>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400">
                      Total Aset ({formatCurrency(balanceSheet.assets.totalAssets)}) = Kewajiban ({formatCurrency(balanceSheet.liabilities.totalLiabilities)}) + Ekuitas ({formatCurrency(balanceSheet.equity.totalEquity)}).
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 self-start md:self-auto font-mono text-xs">
                  <span className="px-2.5 py-1 rounded-xl bg-emerald-700 text-white font-bold">
                    SEIMBANG (Diff: {formatCurrency(balanceSheet.difference)})
                  </span>
                </div>
              </div>
            </div>
          
);

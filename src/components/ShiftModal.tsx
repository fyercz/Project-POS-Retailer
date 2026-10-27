import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Clock,
  DollarSign,
  Receipt,
  CreditCard,
  Banknote,
  CheckCircle,
  AlertTriangle,
  FileSpreadsheet,
  Printer,
  Calendar,
  User,
  Sparkles,
} from 'lucide-react';
import { usePOS } from '../context/POSContext';
import { formatRupiah, formatDate } from '../utils/formatters';
import { printViaIframe } from '../utils/printHelper';
import { escapeHtml } from '../utils/escapeHtml';
import { expectedCashOf, canEditStartingCash as canEditStartingCashFor } from '../domain/shiftCash';

export interface ShiftModalProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export const ShiftModal: React.FC<ShiftModalProps> = ({ isOpen, onClose }) => {
  const {
    isShiftModalOpen: contextIsOpen,
    setIsShiftModalOpen,
    activeEmployee,
    currentShift,
    closeCurrentShift,
    startNewShift,
    updateShiftStartingCash,
    settings,
  } = usePOS();

  const isModalVisible = isOpen !== undefined ? isOpen : contextIsOpen;
  const handleCloseModal = onClose || (() => setIsShiftModalOpen(false));

  const [actualCash, setActualCash] = useState<string>('');
  const [isEditingStartingCash, setIsEditingStartingCash] = useState(false);
  const [startingCashInput, setStartingCashInput] = useState<string>('');
  const [startingCashError, setStartingCashError] = useState('');
  const canEditStartingCash = canEditStartingCashFor(activeEmployee?.role, currentShift);
  const [notes, setNotes] = useState<string>('');
  const [shiftClosedResult, setShiftClosedResult] = useState<any>(null);
  const [closeError, setCloseError] = useState('');

  if (!isModalVisible) return null;

  // Kas yang seharusnya ada = modal + penjualan tunai - uang keluar (retur/void tunai, pengeluaran dari laci)
  const cashOut = currentShift?.cashOut || 0;
  const expectedCash = expectedCashOf(currentShift);
  const enteredCashNum = parseFloat(actualCash.replace(/\D/g, '')) || 0;
  const difference = enteredCashNum - expectedCash;

  const handleCloseShift = (e: React.FormEvent) => {
    e.preventDefault();
    // Uang fisik wajib diisi (boleh 0). Dulu kolom kosong dianggap Rp 0 dan tercatat sebagai kekurangan kas.
    if (actualCash.trim() === '') {
      setCloseError('Isi jumlah uang fisik di laci hasil hitungan (boleh 0).');
      return;
    }
    setCloseError('');

    const result = closeCurrentShift(enteredCashNum, notes);
    setShiftClosedResult(result);
  };

  const handleStartFresh = () => {
    setShiftClosedResult(null);
    setActualCash('');
    setNotes('');
    handleCloseModal();
  };

  const handlePrintShiftReceipt = () => {
    if (!shiftClosedResult) return;
    const printedAt = new Date().toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
    // Angka struk diambil dari shift yang BARU DITUTUP (bukan shift berikutnya yang sudah dimulai)
    const closedCashOut = Number(shiftClosedResult.cashOut) || 0;
    const closedExpected = expectedCashOf(shiftClosedResult);
    const shiftHtml = `
      <div style="font-family: monospace; font-size: 11px; line-height: 1.35; color: #000;">
        <div style="text-align: center; border-bottom: 1px dashed #000; padding-bottom: 6px; margin-bottom: 6px;">
          <div style="font-size: 13px; font-weight: bold; text-transform: uppercase;">${escapeHtml(settings.storeName)}</div>
          <div>${escapeHtml(settings.branchName)}</div>
          <div style="font-size: 9px;">${escapeHtml(settings.address)}</div>
          <div style="font-size: 9px;">Telp: ${escapeHtml(settings.phone)}</div>
        </div>

        <div style="text-align: center; font-weight: bold; margin: 6px 0; font-size: 12px;">
          REKAPITULASI PENUTUPAN SHIFT
        </div>

        <div style="border-bottom: 1px dashed #000; padding-bottom: 4px; margin-bottom: 6px; font-size: 10px;">
          <div style="display: flex; justify-content: space-between;">
            <span>Petugas Kasir:</span>
            <span style="font-weight: bold;">${escapeHtml(shiftClosedResult.employeeName)}</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span>Waktu Tutup:</span>
            <span>${printedAt}</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span>Catatan:</span>
            <span>${escapeHtml(shiftClosedResult.notes || '-')}</span>
          </div>
        </div>

        <div style="border-bottom: 1px dashed #000; padding-bottom: 6px; margin-bottom: 6px;">
          <div style="display: flex; justify-content: space-between;">
            <span>Modal Kas Awal:</span>
            <span>${formatRupiah(shiftClosedResult.startingCash)}</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span>Penjualan Tunai:</span>
            <span>+${formatRupiah(shiftClosedResult.cashSales)}</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span>Uang Keluar (Retur/Void/Biaya):</span>
            <span>-${formatRupiah(closedCashOut)}</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span>Penjualan Non-Tunai:</span>
            <span>+${formatRupiah(shiftClosedResult.nonCashSales)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-weight: bold; border-top: 1px dotted #000; margin-top: 3px; padding-top: 3px;">
            <span>Ekspektasi Kas Laci:</span>
            <span>${formatRupiah(closedExpected)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-weight: bold;">
            <span>Fisik Kasir Dihitung:</span>
            <span>${formatRupiah(shiftClosedResult.actualCashEnding || 0)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-weight: bold; margin-top: 2px;">
            <span>Selisih Rekonsiliasi:</span>
            <span>${(shiftClosedResult.difference || 0) === 0 ? 'Rp 0 (PAS/SESUAI)' : formatRupiah(shiftClosedResult.difference || 0)}</span>
          </div>
        </div>

        <div style="margin-top: 20px; display: flex; justify-content: space-between; text-align: center; font-size: 9px;">
          <div style="width: 45%;">
            <div>Petugas Kasir</div>
            <div style="margin-top: 35px; border-bottom: 1px solid #000;"></div>
            <div style="margin-top: 2px;">(${escapeHtml(shiftClosedResult.employeeName)})</div>
          </div>
          <div style="width: 45%;">
            <div>Supervisor / Manager</div>
            <div style="margin-top: 35px; border-bottom: 1px solid #000;"></div>
            <div style="margin-top: 2px;">(........................)</div>
          </div>
        </div>
      </div>
    `;

    printViaIframe(shiftHtml, `Rekap_Shift_${shiftClosedResult.employeeName}`, '80mm');
  };

  return (
    <div
      id="shift-summary-modal"
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-700 text-white flex items-center justify-center shadow-md shadow-emerald-500/20">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Rekap & Tutup Shift Kasir
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Serah terima laci kasir (*Cash Drawer Reconciliation*) & audit penjualan shift.
              </p>
            </div>
          </div>

          <button aria-label="Tutup"
            id="btn-close-shift-modal"
            onClick={handleCloseModal}
            className="p-2 text-slate-500 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {shiftClosedResult ? (
            /* Shift Closed Result View */
            <div className="space-y-4 text-center py-4">
              <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                Shift Berhasil Ditutup & Direkap!
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Laporan shift kasir telah tersimpan. Laci kasir telah disesuaikan untuk shift berikutnya.
              </p>

              {/* Summary Receipt Box */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-left text-xs space-y-2 max-w-md mx-auto">
                <div className="flex justify-between py-1 border-b border-slate-200 dark:border-slate-700 font-medium">
                  <span className="text-slate-500">Kasir Bertugas:</span>
                  <span className="text-slate-900 dark:text-white font-bold">
                    {shiftClosedResult.employeeName}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200 dark:border-slate-700 font-medium">
                  <span className="text-slate-500">Modal Kas Awal:</span>
                  <span className="text-slate-900 dark:text-white font-mono">
                    {formatRupiah(shiftClosedResult.startingCash)}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200 dark:border-slate-700 font-medium">
                  <span className="text-slate-500">Penjualan Tunai (Cash):</span>
                  <span className="text-emerald-700 dark:text-emerald-400 font-mono font-bold">
                    +{formatRupiah(shiftClosedResult.cashSales)}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200 dark:border-slate-700 font-medium">
                  <span className="text-slate-500">Penjualan Non-Tunai (QRIS/Card):</span>
                  <span className="text-blue-600 dark:text-blue-400 font-mono font-bold">
                    +{formatRupiah(shiftClosedResult.nonCashSales)}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200 dark:border-slate-700 font-medium">
                  <span className="text-slate-500">Uang Fisik Kasir (Dihitung):</span>
                  <span className="text-slate-900 dark:text-white font-mono font-bold">
                    {formatRupiah(shiftClosedResult.actualCashEnding || 0)}
                  </span>
                </div>
                <div className="flex justify-between py-1 font-bold">
                  <span className="text-slate-700 dark:text-slate-300">Selisih Kas Laci:</span>
                  <span
                    className={
                      (shiftClosedResult.difference || 0) === 0
                        ? 'text-emerald-700'
                        : (shiftClosedResult.difference || 0) > 0
                        ? 'text-blue-600'
                        : 'text-rose-600'
                    }
                    data-testid="shift-difference"
                  >
                    {(shiftClosedResult.difference || 0) === 0
                      ? 'Sesuai (Rp 0)'
                      : formatRupiah(shiftClosedResult.difference || 0)}
                  </span>
                </div>
              </div>

              <div className="pt-4 flex items-center justify-center gap-3">
                <button
                  onClick={handlePrintShiftReceipt}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 hover:bg-slate-200 cursor-pointer"
                >
                  <Printer className="w-4 h-4 text-emerald-500" /> Cetak Rekap Shift
                </button>
                <button
                  onClick={handleStartFresh}
                  className="px-5 py-2 bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-500/20 hover:bg-emerald-800 cursor-pointer"
                >
                  Selesai & Buka Shift Baru
                </button>
              </div>
            </div>
          ) : (
            /* Active Shift Overview & Reconciliation Form */
            <div className="space-y-5">
              {/* Cashier Info Card */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-11 h-11 rounded-xl ${
                      activeEmployee?.avatarColor || 'bg-emerald-700'
                    } text-white font-bold flex items-center justify-center text-sm shadow-sm`}
                  >
                    {activeEmployee?.avatar || 'KR'}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                      {activeEmployee?.name || 'Kasir Bertugas'}
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {activeEmployee?.roleTitle || 'Kasir'} • {activeEmployee?.employeeCode || 'EMP-01'}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">Mulai Shift</span>
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    {currentShift?.startTime
                      ? new Date(currentShift.startTime).toLocaleTimeString('id-ID', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : '07:00'}
                  </p>
                </div>
              </div>

              {/* 4 Metric Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/40">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
                      Modal Kas Awal
                    </span>
                    {canEditStartingCash && !isEditingStartingCash && (
                      <button
                        type="button"
                        onClick={() => {
                          setStartingCashInput(currentShift?.startingCash ? String(currentShift.startingCash) : '');
                          setStartingCashError('');
                          setIsEditingStartingCash(true);
                        }}
                        className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer"
                      >
                        Ubah
                      </button>
                    )}
                  </div>
                  {isEditingStartingCash ? (
                    <div className="mt-1 space-y-1">
                      <input aria-label="Uang di laci saat shift dimulai"
                        type="number"
                        min={0}
                        step={1000}
                        autoFocus
                        value={startingCashInput}
                        onChange={(e) => setStartingCashInput(e.target.value)}
                        placeholder="Uang di laci saat shift dimulai"
                        className="w-full px-2 py-1 text-xs font-mono font-bold rounded-xl border border-emerald-300 dark:border-emerald-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                      />
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            const value = Number(startingCashInput);
                            if (startingCashInput.trim() === '' || !Number.isFinite(value) || value < 0) {
                              setStartingCashError('Isi jumlah uang di laci (boleh 0).');
                              return;
                            }
                            if (!updateShiftStartingCash(value)) {
                              setStartingCashError('Modal awal hanya bisa diubah sebelum transaksi pertama, atau oleh Supervisor/Owner.');
                              return;
                            }
                            setIsEditingStartingCash(false);
                          }}
                          className="px-2 py-0.5 rounded-md bg-emerald-700 text-white text-[11px] font-bold cursor-pointer"
                        >
                          Simpan
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsEditingStartingCash(false)}
                          className="px-2 py-0.5 rounded-md border border-slate-300 dark:border-slate-700 text-[11px] font-bold cursor-pointer"
                        >
                          Batal
                        </button>
                      </div>
                      {startingCashError && <p className="text-[11px] text-rose-600 dark:text-rose-400">{startingCashError}</p>}
                    </div>
                  ) : (
                    <div className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white mt-1 font-mono">
                      {formatRupiah(currentShift?.startingCash || 0)}
                    </div>
                  )}
                </div>

                <div className="p-3.5 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/40">
                  <span className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
                    Penjualan Tunai
                  </span>
                  <div className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white mt-1 font-mono">
                    {formatRupiah(currentShift?.cashSales || 0)}
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-900/40">
                  <span className="text-[11px] font-medium text-blue-700 dark:text-blue-400">
                    Non-Tunai (QRIS/Card)
                  </span>
                  <div className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white mt-1 font-mono">
                    {formatRupiah(currentShift?.nonCashSales || 0)}
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-200/60 dark:border-indigo-900/40">
                  <span className="text-[11px] font-medium text-indigo-700 dark:text-indigo-400">
                    Total Transaksi
                  </span>
                  <div className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white mt-1">
                    {currentShift?.totalTransactions || 0} Struk
                  </div>
                </div>
              </div>

              {/* Expected Drawer Total */}
              <div className="p-4 rounded-2xl bg-slate-900 text-white flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-500">Target Uang Kas di Laci (Modal + Tunai − Uang Keluar):</span>
                  <div className="text-xl font-bold font-mono text-emerald-400 mt-0.5">
                    {formatRupiah(expectedCash)}
                  </div>
                  {cashOut > 0 && (
                    <div className="text-[11px] text-amber-300 mt-0.5">
                      Uang keluar dari laci (retur/void tunai, pengeluaran): −{formatRupiah(cashOut)}
                    </div>
                  )}
                </div>
                <div className="text-right text-xs text-slate-500">
                  Total Omzet Shift:{' '}
                  <strong className="text-white block text-sm font-mono">
                    {formatRupiah(currentShift?.totalSales || 0)}
                  </strong>
                </div>
              </div>

              {/* Form Tutup Shift */}
              <form onSubmit={handleCloseShift} className="space-y-4 pt-2 border-t border-slate-200 dark:border-slate-800">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Hitung Uang Fisik Laci (*Cash Count*)
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Uang Fisik Dihitung Kasir (Rp) *
                    </label>
                    <input aria-label="Uang Fisik Dihitung Kasir (Rp)"
                      type="text"
                      required
                      data-testid="shift-actual-cash" value={actualCash}
                      onChange={(e) => {
                        const num = e.target.value.replace(/\D/g, '');
                        setActualCash(num ? parseInt(num, 10).toLocaleString('id-ID') : '');
                      }}
                      placeholder="misal: 1.500.000"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-500 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-bold text-slate-900 dark:text-white font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Status Selisih Kas
                    </label>
                    <div className="px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold flex items-center justify-between border border-slate-200 dark:border-slate-700">
                      <span>Selisih:</span>
                      <span
                        className={`font-mono ${
                          difference === 0
                            ? 'text-emerald-700'
                            : difference > 0
                            ? 'text-blue-600'
                            : 'text-rose-600'
                        }`}
                      >
                        {actualCash ? (difference === 0 ? 'Sesuai (Rp 0)' : formatRupiah(difference)) : '-'}
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Catatan Serah Terima Shift (Opsional)
                  </label>
                  <textarea aria-label="Catatan Serah Terima Shift (Opsional)"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                    placeholder="misal: Uang receh Rp 2.000 dan Rp 5.000 telah disiapkan untuk kasir shift siang..."
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-500 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-3">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
                  >
                    Batal
                  </button>
                  {closeError && <p className="mr-auto text-[11px] text-rose-600 dark:text-rose-400">{closeError}</p>}
                  <button
                    type="submit"
                    id="btn-confirm-close-shift"
                    disabled={!actualCash}
                    className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-500/20 transition flex items-center gap-2"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Tutup Shift & Rekap Kas
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

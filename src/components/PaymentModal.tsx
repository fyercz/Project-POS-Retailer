import React, { useState, useEffect } from 'react';
import {
  X,
  Banknote,
  QrCode,
  CreditCard,
  CheckCircle2,
  Receipt,
  ArrowRight,
  Sparkles,
  Smartphone,
  ShieldCheck,
  CloudOff,
} from 'lucide-react';
import {
  usePOSCart,
  usePOSTransactions,
  usePOSUI,
} from '../context/POSContext';
import { PaymentMethod, PaymentDetails } from '../types';
import { formatCurrency } from '../utils/formatters';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({ isOpen, onClose }) => {
  const { finalTotal, cart, selectedCustomer, pointsEarned } = usePOSCart();
  const { processPayment } = usePOSTransactions();
  const { settings, isOnline } = usePOSUI();

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [cashTendered, setCashTendered] = useState<number>(finalTotal);
  const [cardLast4, setCardLast4] = useState<string>('');
  const [cardBank, setCardBank] = useState<string>('Debit BRI');
  const [cardRefCode, setCardRefCode] = useState<string>('');
  const [cardBatch, setCardBatch] = useState<string>('');
  const [qrisRefCode, setQrisRefCode] = useState<string>('');
  const [qrisBatch, setQrisBatch] = useState<string>('');

  // Reset cash tendered to exact total when opened
  useEffect(() => {
    if (isOpen) {
      setCashTendered(finalTotal);
      setQrisRefCode('');
      setQrisBatch('');
      setCardRefCode('');
      setCardBatch('');
      setCardLast4('');
    }
  }, [isOpen, finalTotal]);

  if (!isOpen) return null;

  const changeDue = Math.max(0, cashTendered - finalTotal);
  const isCashSufficient = cashTendered >= finalTotal;

  // Preset cash buttons
  const generateCashPresets = () => {
    if (settings.currency === 'IDR') {
      const presets = [finalTotal];
      // Next 50,000 ceiling
      const round50k = Math.ceil(finalTotal / 50000) * 50000;
      if (round50k > finalTotal && !presets.includes(round50k)) presets.push(round50k);
      // Next 100,000 ceiling
      const round100k = Math.ceil(finalTotal / 100000) * 100000;
      if (round100k > finalTotal && !presets.includes(round100k)) presets.push(round100k);

      // Other common banknotes
      [50000, 100000, 150000, 200000, 500000].forEach((val) => {
        if (val > finalTotal && !presets.includes(val) && presets.length < 5) {
          presets.push(val);
        }
      });
      return presets;
    } else {
      const presets = [finalTotal];
      const next10 = Math.ceil(finalTotal / 10) * 10;
      const next20 = Math.ceil(finalTotal / 20) * 20;
      const next50 = Math.ceil(finalTotal / 50) * 50;
      if (next10 > finalTotal) presets.push(next10);
      if (next20 > finalTotal && !presets.includes(next20)) presets.push(next20);
      if (next50 > finalTotal && !presets.includes(next50)) presets.push(next50);
      return presets;
    }
  };

  const handleSubmitPayment = () => {
    let paymentDetails: PaymentDetails;

    if (paymentMethod === 'cash') {
      if (!isCashSufficient) return;
      paymentDetails = {
        method: 'cash',
        amountTendered: cashTendered,
        change: changeDue,
      };
    } else if (paymentMethod === 'qris') {
      paymentDetails = {
        method: 'qris',
        amountTendered: finalTotal,
        change: 0,
        bankName: 'EDC BRI (QRIS)',
        referenceCode: qrisRefCode.trim() || `BRI-Q-${Math.floor(100000 + Math.random() * 900000)}`,
        edcBatchNumber: qrisBatch.trim() || undefined,
      };
    } else if (paymentMethod === 'card') {
      paymentDetails = {
        method: 'card',
        amountTendered: finalTotal,
        change: 0,
        cardLast4: cardLast4.slice(-4) || undefined,
        bankName: cardBank ? `EDC BRI (${cardBank})` : 'EDC BRI (KARTU)',
        referenceCode: cardRefCode.trim() || `BRI-C-${Math.floor(100000 + Math.random() * 900000)}`,
        edcBatchNumber: cardBatch.trim() || undefined,
      };
    } else {
      paymentDetails = {
        method: 'cash',
        amountTendered: finalTotal,
        change: 0,
      };
    }

    processPayment(paymentDetails);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        id="payment-modal-dialog"
        className="w-full max-w-2xl rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950">
          <div>
            <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
              Kasir Pembayaran
            </span>
            <h3 className="font-bold text-base text-slate-900 dark:text-white leading-tight">
              Proses Transaksi & Pembayaran
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-12 gap-5">
          {/* Left Column: Payment Method Selection & Method Details */}
          <div className="md:col-span-7 space-y-4">
            {/* Method Tabs - 3 Main Methods: Tunai, QRIS EDC BRI, Kartu EDC BRI */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { method: 'cash' as PaymentMethod, label: 'Tunai (Cash)', icon: Banknote },
                { method: 'qris' as PaymentMethod, label: 'QRIS EDC BRI', icon: QrCode },
                { method: 'card' as PaymentMethod, label: 'Kartu EDC BRI', icon: CreditCard },
              ].map((item) => {
                const Icon = item.icon;
                const isSelected = paymentMethod === item.method;
                return (
                  <button
                    key={item.method}
                    type="button"
                    onClick={() => setPaymentMethod(item.method)}
                    className={`p-3 rounded-xl border text-center flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50 text-blue-900 dark:bg-blue-950/50 dark:border-blue-500 dark:text-blue-300 font-bold ring-2 ring-blue-500/20 shadow-xs'
                        : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 hover:bg-slate-100 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="text-[11px] font-semibold leading-tight">{item.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Method Detail Sub-screens */}
            {paymentMethod === 'cash' && (
              <div className="space-y-3.5 bg-slate-50 dark:bg-slate-950/60 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Uang Diterima dari Pembeli
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={cashTendered || ''}
                      onChange={(e) => setCashTendered(Number(e.target.value))}
                      className="w-full p-2.5 text-base font-bold font-mono rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                {/* Quick Presets */}
                <div>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold block mb-1.5">
                    Pilihan Nominal Cepat
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {generateCashPresets().map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setCashTendered(preset)}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-mono font-semibold border transition-colors cursor-pointer ${
                          cashTendered === preset
                            ? 'bg-emerald-500 text-slate-950 font-bold border-emerald-500'
                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                        }`}
                      >
                        {preset === finalTotal
                          ? `Uang Pas (${formatCurrency(preset, settings.currency)})`
                          : formatCurrency(preset, settings.currency)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Change Calculator */}
                <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-750 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 uppercase font-semibold">
                      Uang Kembalian
                    </span>
                    <div
                      className={`text-lg font-black font-mono ${
                        isCashSufficient
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-rose-500'
                      }`}
                    >
                      {isCashSufficient
                        ? formatCurrency(changeDue, settings.currency)
                        : `Kurang (-${formatCurrency(finalTotal - cashTendered, settings.currency)})`}
                    </div>
                  </div>
                  {isCashSufficient && (
                    <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                  )}
                </div>
              </div>
            )}

            {paymentMethod === 'qris' && (
              <div className="p-4 rounded-xl bg-gradient-to-br from-blue-50/70 to-slate-50 dark:from-blue-950/30 dark:to-slate-950/60 border border-blue-200 dark:border-blue-900/60 space-y-3.5">
                {/* EDC BRI Header Badge */}
                <div className="flex items-center justify-between border-b border-blue-200/80 dark:border-blue-900/60 pb-2.5">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center font-black text-xs shadow-xs">
                      BRI
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-blue-950 dark:text-blue-100 leading-tight">
                        QRIS Mesin EDC BRI
                      </h4>
                      <p className="text-[10px] text-blue-700 dark:text-blue-300">
                        Proses pada mesin EDC BRI & dicatat ke Laporan Pembayaran
                      </p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 dark:bg-blue-900/80 text-blue-800 dark:text-blue-200 border border-blue-300 dark:border-blue-700">
                    EDC Terminal
                  </span>
                </div>

                {/* SOP Kasir Langkah demi langkah */}
                <div className="p-2.5 rounded-lg bg-white/90 dark:bg-slate-900/90 border border-blue-100 dark:border-blue-900/40 text-xs space-y-1.5">
                  <div className="flex items-start gap-2">
                    <span className="w-4 h-4 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                      1
                    </span>
                    <span className="text-slate-700 dark:text-slate-300 text-[11px]">
                      Pilih menu <strong>QRIS</strong> pada mesin EDC BRI.
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-4 h-4 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                      2
                    </span>
                    <span className="text-slate-700 dark:text-slate-300 text-[11px]">
                      Input nominal tagihan:{' '}
                      <strong className="text-blue-700 dark:text-blue-300 font-mono text-xs">
                        {formatCurrency(finalTotal, settings.currency)}
                      </strong>
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-4 h-4 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                      3
                    </span>
                    <span className="text-slate-700 dark:text-slate-300 text-[11px]">
                      Arahkan pembeli scan QRIS di layar EDC (BRImo, BCA, GoPay, OVO, Dana, dll).
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-4 h-4 rounded-full bg-emerald-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                      ✓
                    </span>
                    <span className="text-slate-700 dark:text-slate-300 text-[11px]">
                      Setelah struk EDC keluar <strong>APPROVED</strong>, catat No. Ref / RRN jika perlu.
                    </span>
                  </div>
                </div>

                {/* Input No Referensi / RRN Struk EDC BRI */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      No. Ref / RRN EDC BRI (Opsional)
                    </label>
                    <input
                      type="text"
                      value={qrisRefCode}
                      onChange={(e) => setQrisRefCode(e.target.value)}
                      placeholder="Contoh: 002819 / 82910"
                      className="w-full p-2 text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Batch EDC (Opsional)
                    </label>
                    <input
                      type="text"
                      value={qrisBatch}
                      onChange={(e) => setQrisBatch(e.target.value)}
                      placeholder="Contoh: 0001"
                      className="w-full p-2 text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
                    />
                  </div>
                </div>

                <div className="text-[10px] text-blue-700 dark:text-blue-300 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-blue-600 dark:text-blue-400" />
                  <span>Otomatis masuk Laporan Pembayaran & Rekonsiliasi Settlement EDC BRI.</span>
                </div>
              </div>
            )}

            {paymentMethod === 'card' && (
              <div className="p-4 rounded-xl bg-gradient-to-br from-blue-50/70 to-slate-50 dark:from-blue-950/30 dark:to-slate-950/60 border border-blue-200 dark:border-blue-900/60 space-y-3.5">
                {/* EDC BRI Header Badge */}
                <div className="flex items-center justify-between border-b border-blue-200/80 dark:border-blue-900/60 pb-2.5">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center font-black text-xs shadow-xs">
                      BRI
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-blue-950 dark:text-blue-100 leading-tight">
                        Kartu Debit / Kredit Mesin EDC BRI
                      </h4>
                      <p className="text-[10px] text-blue-700 dark:text-blue-300">
                        Proses pada mesin EDC BRI &amp; dicatat ke Laporan Pembayaran
                      </p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 dark:bg-blue-900/80 text-blue-800 dark:text-blue-200 border border-blue-300 dark:border-blue-700">
                    EDC Terminal
                  </span>
                </div>

                {/* SOP Kasir Langkah demi langkah */}
                <div className="p-2.5 rounded-lg bg-white/90 dark:bg-slate-900/90 border border-blue-100 dark:border-blue-900/40 text-xs space-y-1.5">
                  <div className="flex items-start gap-2">
                    <span className="w-4 h-4 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                      1
                    </span>
                    <span className="text-slate-700 dark:text-slate-300 text-[11px]">
                      Masukkan (Dip Chip), Gesek (Swipe), atau Tap Contactless kartu pada mesin EDC BRI.
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-4 h-4 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                      2
                    </span>
                    <span className="text-slate-700 dark:text-slate-300 text-[11px]">
                      Input nominal tagihan:{' '}
                      <strong className="text-blue-700 dark:text-blue-300 font-mono text-xs">
                        {formatCurrency(finalTotal, settings.currency)}
                      </strong>
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-4 h-4 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                      3
                    </span>
                    <span className="text-slate-700 dark:text-slate-300 text-[11px]">
                      Minta nasabah memasukkan 6 digit PIN kartu pada tombol pinpad mesin EDC BRI.
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-4 h-4 rounded-full bg-emerald-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                      ✓
                    </span>
                    <span className="text-slate-700 dark:text-slate-300 text-[11px]">
                      Setelah struk EDC keluar <strong>APPROVED</strong>, catat No. Ref / Approval / Batch jika perlu.
                    </span>
                  </div>
                </div>

                {/* Bank / Jaringan Kartu */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Jenis Kartu / Bank Penerbit (Opsional)
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {['Debit BRI', 'Kredit BRI', 'Debit GPN', 'BCA / Mandiri / BNI', 'Visa', 'Mastercard'].map((b) => (
                      <button
                        key={b}
                        type="button"
                        onClick={() => setCardBank(b)}
                        className={`p-1.5 text-xs font-semibold rounded-lg border transition-colors cursor-pointer text-center ${
                          cardBank === b
                            ? 'bg-blue-600 text-white font-bold border-blue-600 shadow-xs'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        {b}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Input No Ref, Batch, 4 Digit Terakhir */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      No. Ref / RRN EDC
                    </label>
                    <input
                      type="text"
                      value={cardRefCode}
                      onChange={(e) => setCardRefCode(e.target.value)}
                      placeholder="Contoh: 009214"
                      className="w-full p-2 text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Batch EDC (Opsional)
                    </label>
                    <input
                      type="text"
                      value={cardBatch}
                      onChange={(e) => setCardBatch(e.target.value)}
                      placeholder="Contoh: 0001"
                      className="w-full p-2 text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      4 Digit Terakhir
                    </label>
                    <input
                      type="text"
                      maxLength={4}
                      value={cardLast4}
                      onChange={(e) => setCardLast4(e.target.value.replace(/\D/g, ''))}
                      placeholder="Contoh: 4242"
                      className="w-full p-2 text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
                    />
                  </div>
                </div>

                <div className="text-[10px] text-blue-700 dark:text-blue-300 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-blue-600 dark:text-blue-400" />
                  <span>Otomatis masuk Laporan Pembayaran &amp; Rekonsiliasi Settlement EDC BRI.</span>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Order Bill Summary & Confirm */}
          <div className="md:col-span-5 flex flex-col justify-between space-y-4 bg-slate-50/70 dark:bg-slate-950/70 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
            <div>
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-2">
                Rincian Pesanan ({cart.reduce((s, i) => s + i.quantity, 0)} item)
              </h4>

              <div className="space-y-1.5 max-h-36 overflow-y-auto text-xs pr-1">
                {cart.map((item) => (
                  <div key={item.id} className="flex justify-between text-slate-600 dark:text-slate-400">
                    <span className="truncate max-w-[150px]">
                      {item.quantity}x {item.product.name}
                    </span>
                    <span className="font-mono text-slate-900 dark:text-slate-200">
                      {formatCurrency(item.totalPrice, settings.currency)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Customer Points Reward notification */}
              {selectedCustomer && (
                <div className="mt-3 p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-xs">
                  <div className="flex items-center gap-1.5 font-bold text-amber-900 dark:text-amber-300">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Poin Member Loyalitas</span>
                  </div>
                  <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-0.5">
                    {selectedCustomer.name} akan mendapatkan <strong>+{pointsEarned} poin</strong> dari transaksi ini.
                  </p>
                </div>
              )}
            </div>

            {/* Total Block & Submit Button */}
            <div className="space-y-3 pt-3 border-t border-slate-200 dark:border-slate-800">
              <div className="flex items-baseline justify-between">
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                  Total Tagihan
                </span>
                <span className="text-xl font-black font-mono text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(finalTotal, settings.currency)}
                </span>
              </div>

              {/* Offline Awareness Notice */}
              {!isOnline && (
                <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-[11px] text-amber-800 dark:text-amber-300 flex items-start gap-2">
                  <CloudOff className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                  <span>
                    <strong>Mode Offline:</strong> Transaksi akan dicatat ke IndexedDB lokal kasir dan otomatis diunggah ke cloud saat internet terhubung kembali.
                  </span>
                </div>
              )}

              <button
                type="button"
                id="btn-confirm-complete-payment"
                onClick={handleSubmitPayment}
                disabled={paymentMethod === 'cash' && !isCashSufficient}
                className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all active:scale-95"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Selesaikan & Cetak Nota Struk</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

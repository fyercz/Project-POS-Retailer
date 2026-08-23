import React, { useState, useEffect } from 'react';
import {
  X,
  Banknote,
  QrCode,
  CreditCard,
  Building2,
  CheckCircle2,
  Receipt,
  ArrowRight,
  Sparkles,
  Smartphone,
  ShieldCheck,
} from 'lucide-react';
import { usePOS } from '../context/POSContext';
import { PaymentMethod, PaymentDetails } from '../types';
import { formatCurrency } from '../utils/formatters';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({ isOpen, onClose }) => {
  const {
    finalTotal,
    cart,
    selectedCustomer,
    pointsEarned,
    processPayment,
    settings,
  } = usePOS();

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [cashTendered, setCashTendered] = useState<number>(finalTotal);
  const [cardLast4, setCardLast4] = useState<string>('');
  const [cardBank, setCardBank] = useState<string>('BCA');
  const [qrisStatus, setQrisStatus] = useState<'pending' | 'success'>('pending');

  // Reset cash tendered to exact total when opened
  useEffect(() => {
    if (isOpen) {
      setCashTendered(finalTotal);
      setQrisStatus('pending');
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
        referenceCode: `QRIS-${Math.floor(100000 + Math.random() * 900000)}`,
      };
    } else if (paymentMethod === 'card') {
      paymentDetails = {
        method: 'card',
        amountTendered: finalTotal,
        change: 0,
        cardLast4: cardLast4.slice(-4) || '8899',
        bankName: cardBank,
        referenceCode: `EDC-${Math.floor(100000 + Math.random() * 900000)}`,
      };
    } else {
      paymentDetails = {
        method: 'transfer',
        amountTendered: finalTotal,
        change: 0,
        bankName: 'BCA Virtual Account',
        referenceCode: `VA-${Math.floor(10000000 + Math.random() * 90000000)}`,
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
              Cashier Checkout
            </span>
            <h3 className="font-bold text-base text-slate-900 dark:text-white leading-tight">
              Process Order Payment
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
            {/* Method Tabs */}
            <div className="grid grid-cols-4 gap-2">
              {[
                { method: 'cash' as PaymentMethod, label: 'Cash', icon: Banknote },
                { method: 'qris' as PaymentMethod, label: 'QRIS', icon: QrCode },
                { method: 'card' as PaymentMethod, label: 'Card EDC', icon: CreditCard },
                { method: 'transfer' as PaymentMethod, label: 'Transfer', icon: Building2 },
              ].map((item) => {
                const Icon = item.icon;
                const isSelected = paymentMethod === item.method;
                return (
                  <button
                    key={item.method}
                    type="button"
                    onClick={() => setPaymentMethod(item.method)}
                    className={`p-2.5 rounded-xl border text-center flex flex-col items-center gap-1 transition-all cursor-pointer ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-900 dark:bg-emerald-950/50 dark:border-emerald-500 dark:text-emerald-300 font-bold ring-2 ring-emerald-500/20'
                        : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 hover:bg-slate-100 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="text-[11px]">{item.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Method Detail Sub-screens */}
            {paymentMethod === 'cash' && (
              <div className="space-y-3.5 bg-slate-50 dark:bg-slate-950/60 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Cash Tendered
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
                    Quick Nominal
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
                          ? `Exact (${formatCurrency(preset, settings.currency)})`
                          : formatCurrency(preset, settings.currency)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Change Calculator */}
                <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-750 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 uppercase font-semibold">
                      Change Due (Kembalian)
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
                        : `Insufficient (-${formatCurrency(finalTotal - cashTendered, settings.currency)})`}
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
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 text-center space-y-3">
                <div className="inline-block p-3 rounded-2xl bg-white shadow-md">
                  {/* Authentic looking dynamic QR pattern */}
                  <div className="w-36 h-36 border-4 border-black p-1 flex flex-col justify-between bg-white">
                    <div className="flex justify-between">
                      <div className="w-8 h-8 bg-black"></div>
                      <div className="w-8 h-8 bg-black"></div>
                    </div>
                    <div className="flex items-center justify-center py-2">
                      <div className="text-[9px] font-black tracking-widest text-black uppercase border border-black px-1">
                        QRIS STANDAR
                      </div>
                    </div>
                    <div className="flex justify-between">
                      <div className="w-8 h-8 bg-black"></div>
                      <div className="w-6 h-6 bg-slate-800"></div>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
                    <Smartphone className="w-4 h-4 text-emerald-500" />
                    <span>Scan with GoPay, OVO, Dana, BCA Mobile, ShopeePay</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Dynamic QR code expires in 04:59
                  </p>
                </div>
              </div>
            )}

            {paymentMethod === 'card' && (
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Card Terminal / Bank Network
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {['BCA EDC', 'Mandiri EDC', 'BRI EDC', 'BNI EDC', 'Visa', 'Mastercard'].map((b) => (
                      <button
                        key={b}
                        type="button"
                        onClick={() => setCardBank(b)}
                        className={`p-2 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
                          cardBank === b
                            ? 'bg-emerald-500 text-slate-950 font-bold border-emerald-500'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {b}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Card Last 4 Digits (Optional)
                  </label>
                  <input
                    type="text"
                    maxLength={4}
                    value={cardLast4}
                    onChange={(e) => setCardLast4(e.target.value.replace(/\D/g, ''))}
                    placeholder="e.g. 4242"
                    className="w-full p-2 text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>
            )}

            {paymentMethod === 'transfer' && (
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-2 text-xs text-slate-700 dark:text-slate-300">
                <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <p className="text-[11px] text-slate-400">BCA Virtual Account</p>
                  <p className="text-base font-black font-mono text-slate-900 dark:text-white">
                    8801 9283 0192 3881
                  </p>
                  <p className="text-[11px] text-slate-500">Account Name: APEX COFFEE POS</p>
                </div>
                <p className="text-[11px] text-slate-400">
                  Auto-verification listens to incoming settlement webhook.
                </p>
              </div>
            )}
          </div>

          {/* Right Column: Order Bill Summary & Confirm */}
          <div className="md:col-span-5 flex flex-col justify-between space-y-4 bg-slate-50/70 dark:bg-slate-950/70 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
            <div>
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-2">
                Order Breakdown ({cart.reduce((s, i) => s + i.quantity, 0)} items)
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
                    <span>Loyalty Rewards</span>
                  </div>
                  <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-0.5">
                    {selectedCustomer.name} will earn <strong>+{pointsEarned} points</strong> from this purchase.
                  </p>
                </div>
              )}
            </div>

            {/* Total Block & Submit Button */}
            <div className="space-y-3 pt-3 border-t border-slate-200 dark:border-slate-800">
              <div className="flex items-baseline justify-between">
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                  Total Payable
                </span>
                <span className="text-xl font-black font-mono text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(finalTotal, settings.currency)}
                </span>
              </div>

              <button
                type="button"
                id="btn-confirm-complete-payment"
                onClick={handleSubmitPayment}
                disabled={paymentMethod === 'cash' && !isCashSufficient}
                className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all active:scale-95"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Complete Payment & Print Receipt</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

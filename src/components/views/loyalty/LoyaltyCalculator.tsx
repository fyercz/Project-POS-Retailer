import React, { useState, useMemo } from 'react';
import {
  Calculator,
  Coins,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  ShoppingCart,
  Users,
  Percent,
  Sliders,
  Award,
  Zap,
  Tag,
  TrendingUp,
  Receipt,
  RotateCcw,
  Check,
} from 'lucide-react';
import { usePOS } from '../../../context/POSContext';
import { formatCurrency } from '../../../utils/formatters';
import { Customer, MemberTier } from '../../../types';

interface LoyaltyCalculatorProps {
  initialCustomer?: Customer | null;
  onCustomerSelected?: (customer: Customer) => void;
}

export const LoyaltyCalculator: React.FC<LoyaltyCalculatorProps> = ({
  initialCustomer,
  onCustomerSelected,
}) => {
  const {
    customers,
    settings,
    subtotal: cartSubtotal,
    setSelectedCustomer,
    setPointsToRedeem,
    setUsePoints,
    setActiveView,
    updateCustomer,
    adjustCustomerPoints,
    activeEmployee,
  } = usePOS();

  // Selected customer for calculation
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(
    initialCustomer?.id || (customers.length > 0 ? customers[0].id : '')
  );

  const customer = useMemo(() => {
    return customers.find((c) => c.id === selectedCustomerId) || null;
  }, [customers, selectedCustomerId]);

  // Transaction Total State
  const [transactionTotal, setTransactionTotal] = useState<number>(100000);
  const [eligibleRatioPercent, setEligibleRatioPercent] = useState<number>(100);

  // Points Redemption State
  const [redeemPointsInput, setRedeemPointsInput] = useState<number>(0);
  const [isApplyingDiscount, setIsApplyingDiscount] = useState<boolean>(true);

  // Success Notification state
  const [appliedSuccessMsg, setAppliedSuccessMsg] = useState<string | null>(null);

  // Rules and Rates
  const pointsRatio = settings.pointsRatio || 10000;
  const redemptionRate = settings.pointRedemptionRate || 100;
  const minRedeemPoints = settings.minRedeemPoints || 10;
  const minProfitMargin = settings.minProfitPercentForPoints || 15;

  // Tier multiplier
  const tierMultiplier = useMemo(() => {
    if (!customer) return 1;
    switch (customer.tier) {
      case 'Platinum':
        return 2;
      case 'Gold':
        return 1.5;
      case 'Silver':
        return 1.2;
      default:
        return 1;
    }
  }, [customer]);

  // 1. Calculate Points Earned based on Transaction Total
  const eligibleSpend = Math.max(0, Math.round(transactionTotal * (eligibleRatioPercent / 100)));
  const basePointsEarned = Math.floor(eligibleSpend / pointsRatio);
  const totalPointsEarned = Math.floor(basePointsEarned * tierMultiplier);
  const futureDiscountValue = totalPointsEarned * redemptionRate;

  // 2. Maximum Points Redeemable for this Transaction
  const maxRedeemableByBill = Math.floor(transactionTotal / redemptionRate);
  const maxAvailablePoints = customer ? customer.points || 0 : 0;
  const maxPossibleRedeem = Math.min(maxAvailablePoints, maxRedeemableByBill);

  // Clamped Points to Redeem
  const effectivePointsToRedeem = isApplyingDiscount
    ? Math.min(redeemPointsInput, maxPossibleRedeem)
    : 0;

  // Calculated Discount
  const pointsDiscountAmount = effectivePointsToRedeem * redemptionRate;
  const finalPayableTotal = Math.max(0, transactionTotal - pointsDiscountAmount);

  // Projected Post-Transaction Balance
  const projectedEndingBalance = customer
    ? Math.max(0, customer.points - effectivePointsToRedeem) + totalPointsEarned
    : 0;

  // Tier Progress
  const getTierProgress = (spent: number) => {
    if (spent >= 10000000) {
      return { tier: 'Platinum', nextTier: 'Max Tier', progress: 100, remaining: 0 };
    }
    if (spent >= 5000000) {
      return {
        tier: 'Gold',
        nextTier: 'Platinum',
        progress: Math.min(100, Math.round(((spent - 5000000) / 5000000) * 100)),
        remaining: 10000000 - spent,
      };
    }
    if (spent >= 1000000) {
      return {
        tier: 'Silver',
        nextTier: 'Gold',
        progress: Math.min(100, Math.round(((spent - 1000000) / 4000000) * 100)),
        remaining: 5000000 - spent,
      };
    }
    return {
      tier: 'Bronze',
      nextTier: 'Silver',
      progress: Math.min(100, Math.round((spent / 1000000) * 100)),
      remaining: 1000000 - spent,
    };
  };

  const tierProgress = customer ? getTierProgress(customer.totalSpent || 0) : null;

  // Handle Apply Directly to POS Cart
  const handleApplyToPOS = () => {
    if (!customer) {
      alert('Pilih member terlebih dahulu!');
      return;
    }

    setSelectedCustomer(customer);
    if (onCustomerSelected) onCustomerSelected(customer);

    if (effectivePointsToRedeem > 0) {
      setUsePoints(true);
      setPointsToRedeem(effectivePointsToRedeem);
    } else {
      setUsePoints(false);
      setPointsToRedeem(0);
    }

    setAppliedSuccessMsg(
      `Member "${customer.name}" dan diskon ${effectivePointsToRedeem > 0 ? formatCurrency(pointsDiscountAmount, settings.currency) : 'poin'} berhasil dipasang ke Kasir!`
    );

    setTimeout(() => {
      setActiveView('pos');
    }, 900);
  };

  // Handle Direct Record Transaction to Customer Points Ledger
  const handleRecordDirectTransaction = () => {
    if (!customer) return;
    if (transactionTotal <= 0) {
      alert('Masukkan total transaksi yang valid!');
      return;
    }

    const invoiceNo = `POS-LOY-${Date.now().toString().slice(-6)}`;
    const nowIso = new Date().toISOString();

    // 1. Redeem points if any
    let currentBal = customer.points || 0;
    const historyEntries = [];

    if (effectivePointsToRedeem > 0) {
      currentBal = Math.max(0, currentBal - effectivePointsToRedeem);
      historyEntries.push({
        id: `pth-${Date.now()}-red`,
        type: 'redeemed' as const,
        points: -effectivePointsToRedeem,
        balanceAfter: currentBal,
        description: `Tukar ${effectivePointsToRedeem} Poin untuk Diskon Rp ${pointsDiscountAmount.toLocaleString('id-ID')} (${invoiceNo})`,
        date: nowIso,
        invoiceNumber: invoiceNo,
        operatorName: activeEmployee?.name || 'Kasir Loyalitas',
      });
    }

    // 2. Earn points from transaction
    if (totalPointsEarned > 0) {
      currentBal += totalPointsEarned;
      historyEntries.push({
        id: `pth-${Date.now()}-earn`,
        type: 'earned' as const,
        points: totalPointsEarned,
        balanceAfter: currentBal,
        description: `Perolehan Transaksi Belanja ${formatCurrency(transactionTotal, settings.currency)} (${invoiceNo})`,
        date: nowIso,
        invoiceNumber: invoiceNo,
        operatorName: activeEmployee?.name || 'Kasir Loyalitas',
      });
    }

    // Update customer
    const newTotalSpent = (customer.totalSpent || 0) + transactionTotal;
    const newOrdersCount = (customer.ordersCount || 0) + 1;

    // Recalculate tier based on new total spent
    let newTier: MemberTier = customer.tier || 'Bronze';
    if (newTotalSpent >= 10000000) newTier = 'Platinum';
    else if (newTotalSpent >= 5000000) newTier = 'Gold';
    else if (newTotalSpent >= 1000000) newTier = 'Silver';

    updateCustomer(customer.id, {
      points: currentBal,
      totalSpent: newTotalSpent,
      ordersCount: newOrdersCount,
      tier: newTier,
      pointsHistory: [...historyEntries, ...(customer.pointsHistory || [])],
    });

    setAppliedSuccessMsg(
      `Berhasil mencatat transaksi ${invoiceNo}: Member ${customer.name} memperoleh +${totalPointsEarned} Poin${effectivePointsToRedeem > 0 ? ` dan memakai diskon Rp ${pointsDiscountAmount.toLocaleString('id-ID')}` : ''}!`
    );

    setRedeemPointsInput(0);
    setTimeout(() => setAppliedSuccessMsg(null), 4000);
  };

  return (
    <div className="space-y-6">
      {/* Notification Toast */}
      {appliedSuccessMsg && (
        <div className="p-3.5 rounded-2xl bg-emerald-500 text-slate-950 font-bold text-xs flex items-center justify-between shadow-lg shadow-emerald-500/20 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span>{appliedSuccessMsg}</span>
          </div>
          <button
            onClick={() => setAppliedSuccessMsg(null)}
            className="p-1 hover:bg-emerald-600/30 rounded-lg cursor-pointer"
          >
            ×
          </button>
        </div>
      )}

      {/* Main Grid: 2 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Member Selection & Transaction Input */}
        <div className="lg:col-span-6 space-y-5">
          {/* Card 1: Member Selection & Profile Card */}
          <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                    1. Pilih Member Loyalitas
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Pilih pelanggan terdaftar untuk melacak poin dan menerapkan diskon
                  </p>
                </div>
              </div>

              {customer && (
                <span
                  className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${
                    customer.tier === 'Platinum'
                      ? 'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800'
                      : customer.tier === 'Gold'
                      ? 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800'
                      : customer.tier === 'Silver'
                      ? 'bg-slate-200 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700'
                      : 'bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-950 dark:text-orange-300 dark:border-orange-800'
                  }`}
                >
                  Tier {customer.tier || 'Bronze'} ({tierMultiplier}x Poin)
                </span>
              )}
            </div>

            {/* Select Dropdown */}
            <div>
              <select
                value={selectedCustomerId}
                onChange={(e) => {
                  setSelectedCustomerId(e.target.value);
                  setRedeemPointsInput(0);
                }}
                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none cursor-pointer"
              >
                {customers.length === 0 && <option value="">Belum ada member terdaftar</option>}
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.phone}) • {c.points || 0} Pts • Tier {c.tier || 'Bronze'}
                  </option>
                ))}
              </select>
            </div>

            {/* Selected Member Detail Box */}
            {customer && (
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block mb-0.5">
                      Saldo Poin
                    </span>
                    <span className="text-base font-black font-mono text-amber-600 dark:text-amber-400 block">
                      {(customer.points || 0).toLocaleString()}
                    </span>
                    <span className="text-[9px] text-slate-400 font-mono">
                      ={formatCurrency((customer.points || 0) * redemptionRate, settings.currency)}
                    </span>
                  </div>

                  <div className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block mb-0.5">
                      Total Belanja
                    </span>
                    <span className="text-xs font-bold font-mono text-slate-900 dark:text-white block mt-1">
                      {formatCurrency(customer.totalSpent || 0, settings.currency)}
                    </span>
                    <span className="text-[9px] text-slate-400">
                      {customer.ordersCount || 0}x Order
                    </span>
                  </div>

                  <div className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block mb-0.5">
                      Multiplier Tier
                    </span>
                    <span className="text-base font-black font-mono text-emerald-600 dark:text-emerald-400 block">
                      {tierMultiplier}x
                    </span>
                    <span className="text-[9px] text-slate-400">
                      +{Math.round((tierMultiplier - 1) * 100)}% Bonus Pts
                    </span>
                  </div>
                </div>

                {/* Tier Progress */}
                {tierProgress && (
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-700/80">
                    <div className="flex items-center justify-between text-[11px] mb-1">
                      <span className="text-slate-500 font-medium">
                        Progress Tingkat Member ({tierProgress.tier})
                      </span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">
                        {tierProgress.nextTier === 'Max Tier'
                          ? 'Maksimal (Platinum)'
                          : `Menuju ${tierProgress.nextTier} (${tierProgress.progress}%)`}
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                        style={{ width: `${tierProgress.progress}%` }}
                      />
                    </div>
                    {tierProgress.remaining > 0 && (
                      <span className="text-[10px] text-slate-400 mt-1 block">
                        Belanja {formatCurrency(tierProgress.remaining, settings.currency)} lagi untuk naik tier.
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Card 2: Transaction Total Input */}
          <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400">
                  <Calculator className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                    2. Masukkan Total Nilai Transaksi
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Poin akan dihitung otomatis sesuai rasio belanja toko (1 Poin tiap {formatCurrency(pointsRatio, settings.currency)})
                  </p>
                </div>
              </div>

              {cartSubtotal > 0 && (
                <button
                  type="button"
                  onClick={() => setTransactionTotal(cartSubtotal)}
                  className="px-2.5 py-1 text-[10px] font-bold rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 hover:bg-emerald-100 cursor-pointer flex items-center gap-1 transition"
                  title="Gunakan subtotal keranjang POS saat ini"
                >
                  <ShoppingCart className="w-3 h-3" />
                  <span>Subtotal Kasir: {formatCurrency(cartSubtotal, settings.currency)}</span>
                </button>
              )}
            </div>

            {/* Input Nominal */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Nominal Transaksi Belanja (Rp)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-xs text-slate-400">
                  Rp
                </span>
                <input
                  type="number"
                  min={0}
                  step={1000}
                  value={transactionTotal}
                  onChange={(e) => setTransactionTotal(Math.max(0, Number(e.target.value)))}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-base font-mono font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  placeholder="100000"
                />
              </div>
            </div>

            {/* Quick Increment Buttons */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] text-slate-400 font-medium">Preset Cepat:</span>
              {[25000, 50000, 100000, 250000, 500000].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setTransactionTotal(amt)}
                  className={`px-2 py-1 text-[11px] font-mono rounded-lg border transition cursor-pointer ${
                    transactionTotal === amt
                      ? 'bg-slate-900 text-white dark:bg-emerald-600 dark:text-white border-transparent'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
                  }`}
                >
                  {amt >= 1000000 ? `${amt / 1000000}jt` : `${amt / 1000}rb`}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setTransactionTotal(0)}
                className="px-2 py-1 text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                Reset
              </button>
            </div>

            {/* Profit Margin Eligibility Simulator */}
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-2">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                  <Percent className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Item Memenuhi Syarat Margin (&ge; {minProfitMargin}%)</span>
                </span>
                <span className="font-bold font-mono text-emerald-600 dark:text-emerald-400">
                  {eligibleRatioPercent}% ({formatCurrency(eligibleSpend, settings.currency)})
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={eligibleRatioPercent}
                onChange={(e) => setEligibleRatioPercent(Number(e.target.value))}
                className="w-full accent-emerald-500 cursor-pointer h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg"
              />
              <span className="text-[10px] text-slate-400 block">
                Sesuai aturan ritel pintar, poin hanya diberikan dari produk dengan profit &ge; {minProfitMargin}%.
              </span>
            </div>
          </div>
        </div>

        {/* Right Column: Automated Calculation Breakdown & Discount Applicator */}
        <div className="lg:col-span-6 space-y-5">
          {/* Card 3: Automated Points Calculation Results */}
          <div className="p-5 rounded-3xl bg-gradient-to-br from-emerald-50/50 via-white to-teal-50/50 dark:from-emerald-950/20 dark:via-slate-900 dark:to-teal-950/20 border border-emerald-200 dark:border-emerald-900/60 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-emerald-500 text-slate-950">
                  <Coins className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                    3. Perhitungan Poin Otomatis
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Hasil kalkulasi poin yang diperoleh berdasarkan total transaksi
                  </p>
                </div>
              </div>

              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                Formula Aktif
              </span>
            </div>

            {/* Formula Breakdown */}
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/90 border border-emerald-200/80 dark:border-emerald-800/60 space-y-2.5 text-xs">
              <div className="flex justify-between text-slate-600 dark:text-slate-300">
                <span>Nilai Belanja Memenuhi Syarat:</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">
                  {formatCurrency(eligibleSpend, settings.currency)}
                </span>
              </div>

              <div className="flex justify-between text-slate-600 dark:text-slate-300">
                <span>Rasio Poin Toko (1 Pts / {formatCurrency(pointsRatio, settings.currency)}):</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">
                  {basePointsEarned} Pts Dasar
                </span>
              </div>

              <div className="flex justify-between text-slate-600 dark:text-slate-300">
                <span>Pengali Tier Member ({customer?.tier || 'Bronze'}):</span>
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  {tierMultiplier}x Multiplier
                </span>
              </div>

              <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-900 dark:text-white block">
                    Total Poin Didapat Transaksi Ini:
                  </span>
                  <span className="text-[10px] text-slate-400">
                    Setara potensi diskon masa depan {formatCurrency(futureDiscountValue, settings.currency)}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400 flex items-baseline gap-1">
                    <span>+{totalPointsEarned}</span>
                    <span className="text-xs font-bold">Pts</span>
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Card 4: Apply Points Discount to This Transaction */}
          <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400">
                  <Tag className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                    4. Terapkan Diskon Poin Loyalitas
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Tukar poin aktif pelanggan menjadi potongan diskon langsung pada tagihan
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsApplyingDiscount(!isApplyingDiscount)}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition cursor-pointer ${
                  isApplyingDiscount
                    ? 'bg-amber-500 text-slate-950 shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                {isApplyingDiscount ? 'Diskon Aktif' : 'Nonaktifkan'}
              </button>
            </div>

            {isApplyingDiscount ? (
              <div className="space-y-3.5">
                {/* Points Available & Slider */}
                <div className="p-3.5 rounded-2xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-600 dark:text-slate-300">
                      Saldo Poin Member:{' '}
                      <strong className="font-mono text-amber-600 dark:text-amber-400">
                        {maxAvailablePoints.toLocaleString()} Pts
                      </strong>
                    </span>
                    <span className="text-[11px] font-mono text-slate-500">
                      Maks. Dapat Ditukar:{' '}
                      <strong className="text-slate-800 dark:text-slate-200">
                        {maxPossibleRedeem} Pts
                      </strong>
                    </span>
                  </div>

                  {maxPossibleRedeem > 0 ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          Jumlah Poin yang Ditukar:
                        </span>
                        <div className="flex items-center gap-1.5 font-mono">
                          <input
                            type="number"
                            min={0}
                            max={maxPossibleRedeem}
                            value={effectivePointsToRedeem}
                            onChange={(e) =>
                              setRedeemPointsInput(
                                Math.min(maxPossibleRedeem, Math.max(0, Number(e.target.value)))
                              )
                            }
                            className="w-20 p-1 text-right text-xs font-bold font-mono rounded-lg border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400"
                          />
                          <span className="text-slate-400 text-xs font-bold">Pts</span>
                        </div>
                      </div>

                      <input
                        type="range"
                        min={0}
                        max={maxPossibleRedeem}
                        step={1}
                        value={effectivePointsToRedeem}
                        onChange={(e) => setRedeemPointsInput(Number(e.target.value))}
                        className="w-full accent-amber-500 cursor-pointer h-2 bg-slate-200 dark:bg-slate-700 rounded-lg"
                      />

                      {/* Presets */}
                      <div className="flex items-center gap-1.5 pt-1">
                        <span className="text-[10px] text-slate-400 font-medium">Preset:</span>
                        <button
                          type="button"
                          onClick={() => setRedeemPointsInput(0)}
                          className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-amber-400 cursor-pointer"
                        >
                          0 Pts
                        </button>
                        {maxPossibleRedeem >= 20 && (
                          <button
                            type="button"
                            onClick={() =>
                              setRedeemPointsInput(Math.floor(maxPossibleRedeem * 0.25))
                            }
                            className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-amber-400 cursor-pointer"
                          >
                            25%
                          </button>
                        )}
                        {maxPossibleRedeem >= 10 && (
                          <button
                            type="button"
                            onClick={() =>
                              setRedeemPointsInput(Math.floor(maxPossibleRedeem * 0.5))
                            }
                            className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-amber-400 cursor-pointer"
                          >
                            50%
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setRedeemPointsInput(maxPossibleRedeem)}
                          className="px-2.5 py-0.5 text-[10px] font-bold rounded-md bg-amber-500 text-slate-950 hover:bg-amber-400 cursor-pointer"
                        >
                          Maksimal ({maxPossibleRedeem} Pts)
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 text-center text-xs text-slate-400 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                      {customer
                        ? 'Member ini belum memiliki saldo poin untuk ditukarkan menjadi diskon.'
                        : 'Pilih member terlebih dahulu untuk melihat saldo poin.'}
                    </div>
                  )}
                </div>

                {/* Live Bill Summary */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-2 text-xs">
                  <div className="flex justify-between text-slate-600 dark:text-slate-400">
                    <span>Subtotal Tagihan Awal:</span>
                    <span className="font-mono font-semibold text-slate-900 dark:text-white">
                      {formatCurrency(transactionTotal, settings.currency)}
                    </span>
                  </div>

                  <div className="flex justify-between text-amber-700 dark:text-amber-400 font-medium">
                    <span>
                      Diskon Poin ({effectivePointsToRedeem} Pts &times; Rp {redemptionRate}):
                    </span>
                    <span className="font-mono font-bold">
                      -{formatCurrency(pointsDiscountAmount, settings.currency)}
                    </span>
                  </div>

                  <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between font-bold text-sm">
                    <span className="text-slate-900 dark:text-white">Total Tagihan Bersih:</span>
                    <span className="font-mono text-base text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(finalPayableTotal, settings.currency)}
                    </span>
                  </div>

                  {customer && (
                    <div className="pt-2 border-t border-slate-200 dark:border-slate-700/60 flex items-center justify-between text-[11px] text-slate-500">
                      <span>Proyeksi Saldo Poin Setelah Transaksi:</span>
                      <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                        {projectedEndingBalance.toLocaleString()} Pts ({customer.points} - {effectivePointsToRedeem} + {totalPointsEarned})
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-4 text-center text-xs text-slate-400 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-700">
                Penerapan diskon poin dinonaktifkan. Seluruh poin perolehan (+{totalPointsEarned} Pts) akan ditambahkan ke saldo tanpa potongan tagihan.
              </div>
            )}

            {/* Action Buttons */}
            <div className="pt-2 flex flex-col sm:flex-row items-center gap-2.5">
              <button
                type="button"
                id="btn-apply-points-to-pos"
                onClick={handleApplyToPOS}
                disabled={!customer}
                className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-emerald-500/20 cursor-pointer transition active:scale-98"
              >
                <ShoppingCart className="w-4 h-4" />
                <span>Terapkan Member &amp; Diskon ke Kasir POS</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                id="btn-record-loyalty-transaction"
                onClick={handleRecordDirectTransaction}
                disabled={!customer || transactionTotal <= 0}
                className="w-full sm:w-auto py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-1.5 border border-slate-700 cursor-pointer transition active:scale-98"
                title="Catat transaksi poin langsung ke buku besar member"
              >
                <Receipt className="w-4 h-4 text-emerald-400" />
                <span>Catat ke Buku Member</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

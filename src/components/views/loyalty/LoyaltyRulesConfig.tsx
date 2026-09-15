import React, { useState } from 'react';
import {
  Sliders,
  Award,
  Coins,
  ShieldCheck,
  CheckCircle2,
  Percent,
  TrendingUp,
  Tag,
  Save,
  RotateCcw,
} from 'lucide-react';
import { usePOS } from '../../../context/POSContext';
import { formatCurrency } from '../../../utils/formatters';

export const LoyaltyRulesConfig: React.FC = () => {
  const { settings, updateSettings } = usePOS();

  // Local form states
  const [pointsRatio, setPointsRatio] = useState<number>(settings.pointsRatio || 10000);
  const [pointRedemptionRate, setPointRedemptionRate] = useState<number>(
    settings.pointRedemptionRate || 100
  );
  const [minRedeemPoints, setMinRedeemPoints] = useState<number>(
    settings.minRedeemPoints || 10
  );
  const [minProfitMargin, setMinProfitMargin] = useState<number>(
    settings.minProfitPercentForPoints || 15
  );

  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings({
      pointsRatio: Math.max(1000, pointsRatio),
      pointRedemptionRate: Math.max(1, pointRedemptionRate),
      minRedeemPoints: Math.max(1, minRedeemPoints),
      minProfitPercentForPoints: Math.max(0, minProfitMargin),
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleResetDefaults = () => {
    setPointsRatio(10000);
    setPointRedemptionRate(100);
    setMinRedeemPoints(10);
    setMinProfitMargin(15);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {savedSuccess && (
        <div className="p-3.5 rounded-2xl bg-emerald-500 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-500/20 animate-in fade-in duration-200">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>Pengaturan Rasio Poin Loyalitas &amp; Diskon Berhasil Disimpan ke Sistem!</span>
        </div>
      )}

      {/* Rules Config Form */}
      <form onSubmit={handleSave} className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-6">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                Konfigurasi Rasio Poin &amp; Diskon Loyalitas
              </h3>
              <p className="text-xs text-slate-500">
                Atur formula otomatis perolehan poin transaksi dan nilai konversi diskon kasir
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleResetDefaults}
            className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Standar</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* Points Ratio */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-bold text-xs text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Coins className="w-4 h-4 text-emerald-500" />
                <span>Rasio Belanja per 1 Poin (Rp)</span>
              </label>
              <span className="text-[10px] text-slate-400 font-mono">
                1 Pts / {formatCurrency(pointsRatio, settings.currency)}
              </span>
            </div>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-xs text-slate-400">
                Rp
              </span>
              <input
                type="number"
                min={1000}
                step={1000}
                required
                value={pointsRatio}
                onChange={(e) => setPointsRatio(Number(e.target.value))}
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono font-bold text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
            <p className="text-[11px] text-slate-500">
              Pelanggan mendapatkan 1 poin dasar setiap kelipatan nominal ini dari barang yang memenuhi syarat.
            </p>
          </div>

          {/* Redemption Rate */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-bold text-xs text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Tag className="w-4 h-4 text-amber-500" />
                <span>Nilai Diskon Kasir per 1 Poin (Rp)</span>
              </label>
              <span className="text-[10px] text-slate-400 font-mono">
                1 Pts = {formatCurrency(pointRedemptionRate, settings.currency)}
              </span>
            </div>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-xs text-slate-400">
                Rp
              </span>
              <input
                type="number"
                min={1}
                step={10}
                required
                value={pointRedemptionRate}
                onChange={(e) => setPointRedemptionRate(Number(e.target.value))}
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono font-bold text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
            <p className="text-[11px] text-slate-500">
              Potongan langsung pada total tagihan belanja kasir saat pelanggan menukarkan poinnya.
            </p>
          </div>

          {/* Min Redeem Points */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-bold text-xs text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-purple-500" />
                <span>Minimal Poin untuk Penukaran</span>
              </label>
              <span className="text-[10px] text-slate-400 font-mono">
                Min {minRedeemPoints} Pts
              </span>
            </div>
            <div className="relative">
              <input
                type="number"
                min={1}
                step={1}
                required
                value={minRedeemPoints}
                onChange={(e) => setMinRedeemPoints(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono font-bold text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
            <p className="text-[11px] text-slate-500">
              Batas minimum saldo poin yang harus dimiliki pelanggan sebelum dapat ditukar menjadi diskon belanja.
            </p>
          </div>

          {/* Min Profit Margin */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-bold text-xs text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Percent className="w-4 h-4 text-teal-500" />
                <span>Syarat Margin Profit Barang (&ge; %)</span>
              </label>
              <span className="text-[10px] text-slate-400 font-mono">
                Margin &ge; {minProfitMargin}%
              </span>
            </div>
            <div className="relative">
              <input
                type="number"
                min={0}
                max={100}
                step={1}
                required
                value={minProfitMargin}
                onChange={(e) => setMinProfitMargin(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono font-bold text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
            <p className="text-[11px] text-slate-500">
              Hanya item dengan persentase keuntungan di atas batas ini yang menghasilkan poin, melindungi profit toko.
            </p>
          </div>
        </div>

        {/* Member Tiers Reference Table */}
        <div className="pt-2">
          <h4 className="font-bold text-xs text-slate-800 dark:text-slate-200 mb-2.5 flex items-center gap-2">
            <Award className="w-4 h-4 text-amber-500" />
            <span>Tingkatan Member (Member Tiers) &amp; Pengali Poin Otomatis</span>
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3 rounded-2xl border border-orange-200 dark:border-orange-900/60 bg-orange-50/50 dark:bg-orange-950/20 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-orange-900 dark:text-orange-300">Bronze</span>
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-orange-200 text-orange-800">
                  1.0x Poin
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-mono">Belanja Rp 0 - Rp 999.999</p>
              <p className="text-[10px] text-slate-400">Tingkat dasar semua member terdaftar</p>
            </div>

            <div className="p-3 rounded-2xl border border-slate-300 dark:border-slate-700 bg-slate-100/60 dark:bg-slate-800/40 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800 dark:text-slate-200">Silver</span>
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-200 text-slate-800">
                  1.2x Poin
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-mono">Belanja Rp 1jt - Rp 4.99jt</p>
              <p className="text-[10px] text-slate-400">+20% bonus poin tiap transaksi</p>
            </div>

            <div className="p-3 rounded-2xl border border-amber-300 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-amber-900 dark:text-amber-300">Gold</span>
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-200 text-amber-800">
                  1.5x Poin
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-mono">Belanja Rp 5jt - Rp 9.99jt</p>
              <p className="text-[10px] text-slate-400">+50% bonus poin tiap transaksi</p>
            </div>

            <div className="p-3 rounded-2xl border border-purple-300 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-950/20 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-purple-900 dark:text-purple-300">Platinum</span>
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-purple-200 text-purple-800">
                  2.0x Poin
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-mono">Belanja &ge; Rp 10.000.000</p>
              <p className="text-[10px] text-slate-400">2x lipat poin ganda maksimal</p>
            </div>
          </div>
        </div>

        {/* Submit button */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-md shadow-emerald-500/20 cursor-pointer transition active:scale-98"
          >
            <Save className="w-4 h-4" />
            <span>Simpan Pengaturan Loyalitas</span>
          </button>
        </div>
      </form>
    </div>
  );
};

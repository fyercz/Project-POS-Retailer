import React, { useState } from 'react';
import {
  Users,
  Search,
  UserPlus,
  Award,
  Phone,
  Mail,
  History,
  Clock,
  ArrowDownLeft,
  ArrowUpRight,
  Sparkles,
  Sliders,
  Check,
  X,
  PlusCircle,
  MinusCircle,
  CreditCard,
  Database,
  Calculator,
  Coins,
  Receipt,
  FileText,
  Tag,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import { usePOS } from '../../context/POSContext';
import { formatCurrency } from '../../utils/formatters';
import { CustomerModal } from '../CustomerModal';
import { Customer, MemberTier } from '../../types';
import { LoyaltyCalculator } from './loyalty/LoyaltyCalculator';
import { LoyaltyLedger } from './loyalty/LoyaltyLedger';
import { LoyaltyRulesConfig } from './loyalty/LoyaltyRulesConfig';

export const CustomersView: React.FC = () => {
  const {
    customers,
    settings,
    transactions,
    setSelectedCustomer,
    adjustCustomerPoints,
    updateCustomer,
    activeEmployee,
    setIsBackupRestoreOpen,
    setActiveView,
  } = usePOS();

  // Navigation Sub-Tab in Customers View
  const [activeCustomersTab, setActiveCustomersTab] = useState<
    'members' | 'calculator' | 'ledger' | 'rules'
  >('members');

  const [search, setSearch] = useState('');
  const [selectedTierFilter, setSelectedTierFilter] = useState<'All' | MemberTier>('All');
  const [isNewCustomerModalOpen, setIsNewCustomerModalOpen] = useState(false);
  const [detailCustomer, setDetailCustomer] = useState<Customer | null>(null);
  const [calculatorTargetCustomer, setCalculatorTargetCustomer] = useState<Customer | null>(null);

  // Manual point adjustment form states inside detail modal
  const [isAdjustingPoints, setIsAdjustingPoints] = useState(false);
  const [adjustPointsDelta, setAdjustPointsDelta] = useState<number>(50);
  const [adjustReason, setAdjustReason] = useState<string>('Bonus Loyalitas Khusus');
  const [adjustType, setAdjustType] = useState<'add' | 'subtract'>('add');

  const filteredCustomers = customers.filter((c) => {
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      c.name.toLowerCase().includes(q) ||
      c.phone.includes(q) ||
      (c.email && c.email.toLowerCase().includes(q));

    const matchesTier =
      selectedTierFilter === 'All' || (c.tier || 'Bronze') === selectedTierFilter;

    return matchesSearch && matchesTier;
  });

  const totalPointsInCirculation = customers.reduce((sum, c) => sum + (c.points || 0), 0);
  const redemptionRate = settings.pointRedemptionRate || 100;
  const totalRupiahValue = totalPointsInCirculation * redemptionRate;

  // Calculate total discounts already given from points across transactions
  const totalDiscountsGiven = transactions.reduce(
    (sum, t) => sum + (t.pointsDiscount || 0),
    0
  );

  const getTierBadge = (t?: MemberTier) => {
    switch (t) {
      case 'Platinum':
        return {
          badge: 'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950/70 dark:text-purple-300 dark:border-purple-800',
          mult: '2x Poin',
        };
      case 'Gold':
        return {
          badge: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/70 dark:text-amber-300 dark:border-amber-800',
          mult: '1.5x Poin',
        };
      case 'Silver':
        return {
          badge: 'bg-slate-200 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700',
          mult: '1.2x Poin',
        };
      default:
        return {
          badge: 'bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-950/70 dark:text-orange-300 dark:border-orange-800',
          mult: '1x Poin',
        };
    }
  };

  const handleApplyPointsAdjustment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!detailCustomer || adjustPointsDelta <= 0) return;

    const delta = adjustType === 'add' ? adjustPointsDelta : -adjustPointsDelta;
    adjustCustomerPoints(
      detailCustomer.id,
      delta,
      adjustReason.trim() || (delta > 0 ? 'Penyesuaian Tambah Poin' : 'Penyesuaian Kurang Poin'),
      adjustType === 'add' ? 'bonus' : 'adjusted'
    );

    // Refresh detailCustomer state from updated list
    const updated = customers.find((c) => c.id === detailCustomer.id);
    if (updated) {
      setDetailCustomer(updated);
    }
    setIsAdjustingPoints(false);
  };

  // Tier thresholds for progress bar
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

  // Customer transactions history for modal
  const customerTransactions = detailCustomer
    ? transactions.filter(
        (t) =>
          t.customer?.id === detailCustomer.id ||
          (detailCustomer.phone && t.customer?.phone === detailCustomer.phone)
      )
    : [];

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-100 dark:bg-slate-950 overflow-hidden select-none">
      {/* Top Banner */}
      <div className="p-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4 shadow-2xs">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-emerald-500" />
            <span>Member &amp; Sistem Pelacak Poin Loyalitas</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Kalkulasi otomatis perolehan poin dari transaksi kasir, buku mutasi, dan penukaran diskon belanja
          </p>
        </div>

        {/* Action Button & Stats */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="hidden sm:block px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs">
            <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 block">
              Total Member
            </span>
            <span className="font-bold text-slate-900 dark:text-white font-mono">
              {customers.length} Orang
            </span>
          </div>

          <div className="hidden sm:block px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-300">
            <span className="text-[10px] font-medium block">Poin Beredar</span>
            <span className="font-bold font-mono flex items-center gap-1">
              <Award className="w-3.5 h-3.5 text-amber-500" />
              {totalPointsInCirculation.toLocaleString()} Pts
            </span>
          </div>

          <div className="hidden sm:block px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-xs text-emerald-900 dark:text-emerald-300">
            <span className="text-[10px] font-medium block">Potensi Diskon Aktif</span>
            <span className="font-bold font-mono">
              {formatCurrency(totalRupiahValue, settings.currency)}
            </span>
          </div>

          <button
            onClick={() => setIsNewCustomerModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-500/20 cursor-pointer transition-all active:scale-95"
          >
            <UserPlus className="w-4 h-4" />
            <span>+ Tambah Member</span>
          </button>

          <button
            id="btn-customers-backup-restore"
            onClick={() => setIsBackupRestoreOpen(true)}
            className="hidden md:flex px-3 py-2 rounded-xl border border-emerald-300 dark:border-emerald-700 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 font-bold text-xs items-center gap-1.5 cursor-pointer shadow-xs transition-colors active:scale-95"
            title="Cadangkan Data Member, Poin & Seluruh Database (Backup & Restore - F9)"
          >
            <Database className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Backup &amp; Restore</span>
          </button>
        </div>
      </div>

      {/* Sub-Navigation Tabs Bar */}
      <div className="px-4 py-2 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2 overflow-x-auto whitespace-nowrap">
        <button
          type="button"
          onClick={() => setActiveCustomersTab('members')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer transition-all shrink-0 ${
            activeCustomersTab === 'members'
              ? 'bg-emerald-500 text-slate-950 shadow-xs'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Direktori Member ({customers.length})</span>
        </button>

        <button
          type="button"
          id="tab-loyalty-calculator"
          onClick={() => setActiveCustomersTab('calculator')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer transition-all shrink-0 ${
            activeCustomersTab === 'calculator'
              ? 'bg-emerald-500 text-slate-950 shadow-xs'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Calculator className="w-4 h-4" />
          <span>Kalkulator Poin</span>
          <span className="px-1.5 py-0.2 rounded-full text-[9px] font-extrabold uppercase bg-amber-400 text-slate-950">
            Auto Diskon
          </span>
        </button>

        <button
          type="button"
          id="tab-loyalty-ledger"
          onClick={() => setActiveCustomersTab('ledger')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer transition-all shrink-0 ${
            activeCustomersTab === 'ledger'
              ? 'bg-emerald-500 text-slate-950 shadow-xs'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Riwayat Poin</span>
        </button>

        <button
          type="button"
          id="tab-loyalty-rules"
          onClick={() => setActiveCustomersTab('rules')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer transition-all shrink-0 ${
            activeCustomersTab === 'rules'
              ? 'bg-emerald-500 text-slate-950 shadow-xs'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>Aturan Loyalitas</span>
        </button>
      </div>

      {/* Content Area Based on Active Tab */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* TAB 1: MEMBERS DIRECTORY */}
        {activeCustomersTab === 'members' && (
          <div className="space-y-4">
            {/* Filter and Search */}
            <div className="p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
              <div className="relative flex-1 min-w-[240px] max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Cari nama member, no. WhatsApp, atau email..."
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Tier filter tabs */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {(['All', 'Platinum', 'Gold', 'Silver', 'Bronze'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setSelectedTierFilter(t)}
                    className={`px-3 py-1 text-xs font-semibold rounded-lg transition cursor-pointer ${
                      selectedTierFilter === t
                        ? 'bg-slate-900 text-white dark:bg-emerald-600 dark:text-white shadow-xs'
                        : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    {t === 'All' ? 'Semua Tier' : t}
                  </button>
                ))}
              </div>
            </div>

            {/* Customer Cards Grid */}
            {filteredCustomers.length === 0 ? (
              <div className="text-center py-16 text-slate-400 text-xs bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
                Tidak ada member yang cocok dengan filter atau kata kunci pencarian.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredCustomers.map((cust) => {
                  const tierInfo = getTierBadge(cust.tier);
                  const pointsValue = (cust.points || 0) * redemptionRate;

                  return (
                    <div
                      key={cust.id}
                      className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-emerald-500/80 transition-all flex flex-col justify-between shadow-xs"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center space-x-3 min-w-0">
                            <div className="w-10 h-10 shrink-0 rounded-full bg-gradient-to-br from-emerald-500 to-teal-700 text-white font-bold text-sm flex items-center justify-center shadow-xs">
                              {cust.name.slice(0, 2).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <h4 className="font-bold text-sm text-slate-900 dark:text-white leading-tight truncate">
                                {cust.name}
                              </h4>
                              <span className="text-[11px] text-slate-400 font-mono flex items-center gap-1 mt-0.5">
                                <Phone className="w-3 h-3" />
                                {cust.phone}
                              </span>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${tierInfo.badge} block`}
                            >
                              {cust.tier || 'Bronze'}
                            </span>
                            <span className="text-[9px] text-slate-400 font-mono mt-0.5 block">
                              {tierInfo.mult}
                            </span>
                          </div>
                        </div>

                        {cust.email && (
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 truncate flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {cust.email}
                          </p>
                        )}
                      </div>

                      {/* Stats & Loyalty */}
                      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 grid grid-cols-3 gap-2 text-center text-xs">
                        <div className="bg-slate-100 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 p-2 rounded-xl flex flex-col justify-center">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-0.5">
                            Poin Aktif
                          </span>
                          <span className="font-bold font-mono text-sm text-amber-600 dark:text-amber-400">
                            {(cust.points || 0).toLocaleString()}
                          </span>
                          <span className="text-[9px] text-slate-400 font-mono truncate">
                            ={formatCurrency(pointsValue, settings.currency)}
                          </span>
                        </div>

                        <div className="bg-slate-100 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 p-2 rounded-xl flex flex-col justify-center">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-0.5">
                            Transaksi
                          </span>
                          <span className="font-bold font-mono text-sm text-slate-900 dark:text-white">
                            {cust.ordersCount || 0}x
                          </span>
                        </div>

                        <div className="bg-slate-100 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 p-2 rounded-xl flex flex-col justify-center">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-0.5">
                            Belanja
                          </span>
                          <span className="font-bold font-mono text-xs text-emerald-600 dark:text-emerald-400 truncate block">
                            {formatCurrency(cust.totalSpent || 0, settings.currency)}
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-1.5 text-xs flex-wrap">
                        <button
                          type="button"
                          onClick={() => setDetailCustomer(cust)}
                          className="px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold flex items-center gap-1 cursor-pointer transition text-[11px]"
                          title="Lihat riwayat poin dan transaksi detail"
                        >
                          <History className="w-3.5 h-3.5 text-emerald-500" />
                          <span>Detail</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setCalculatorTargetCustomer(cust);
                            setActiveCustomersTab('calculator');
                          }}
                          className="px-2 py-1.5 rounded-lg border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-300 font-semibold flex items-center gap-1 cursor-pointer transition text-[11px] hover:bg-amber-100"
                          title="Buka kalkulator otomatis untuk hitung poin dan diskon transaksi"
                        >
                          <Calculator className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                          <span>Hitung Poin</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setSelectedCustomer(cust);
                            setActiveView('pos');
                          }}
                          className="px-2.5 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-800 dark:text-emerald-300 font-bold flex items-center gap-1 cursor-pointer transition text-[11px]"
                          title="Pilih member ini untuk transaksi kasir"
                        >
                          <CreditCard className="w-3.5 h-3.5" />
                          <span>Kasir</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: LOYALTY CALCULATOR & AUTOMATED DISCOUNT TRACKING */}
        {activeCustomersTab === 'calculator' && (
          <LoyaltyCalculator
            initialCustomer={calculatorTargetCustomer}
            onCustomerSelected={(c) => setCalculatorTargetCustomer(c)}
          />
        )}

        {/* TAB 3: LOYALTY LEDGER (GLOBAL HISTORY) */}
        {activeCustomersTab === 'ledger' && <LoyaltyLedger />}

        {/* TAB 4: RULES & RATIO CONFIG */}
        {activeCustomersTab === 'rules' && <LoyaltyRulesConfig />}
      </div>

      {/* Customer Detail & Points Ledger Modal */}
      {detailCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-2xl rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-700 text-white font-bold flex items-center justify-center">
                  {detailCustomer.name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white leading-tight">
                    {detailCustomer.name}
                  </h3>
                  <div className="flex items-center gap-2 text-[11px] text-slate-500">
                    <span className="font-mono">{detailCustomer.phone}</span>
                    <span>•</span>
                    <span
                      className={`px-2 py-0.2 rounded-full border text-[10px] font-bold ${
                        getTierBadge(detailCustomer.tier).badge
                      }`}
                    >
                      {detailCustomer.tier || 'Bronze'} Member (
                      {getTierBadge(detailCustomer.tier).mult})
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setDetailCustomer(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 flex-1 overflow-y-auto space-y-4">
              {/* Tier Progress Card */}
              {(() => {
                const progress = getTierProgress(detailCustomer.totalSpent || 0);
                return (
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-850 dark:to-slate-900 border border-slate-200 dark:border-slate-800">
                    <div className="flex items-center justify-between text-xs mb-2">
                      <span className="font-bold text-slate-700 dark:text-slate-300">
                        Akumulasi Belanja: {formatCurrency(detailCustomer.totalSpent || 0, settings.currency)}
                      </span>
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                        {progress.nextTier === 'Max Tier'
                          ? 'Level Tertinggi (Platinum)'
                          : `Menuju ${progress.nextTier} (${progress.progress}%)`}
                      </span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500"
                        style={{ width: `${progress.progress}%` }}
                      />
                    </div>
                    {progress.remaining > 0 && (
                      <span className="text-[10px] text-slate-500 mt-1 block">
                        Belanja {formatCurrency(progress.remaining, settings.currency)} lagi untuk naik ke tingkat tier berikutnya dan raih pengali poin lebih tinggi.
                      </span>
                    )}
                  </div>
                );
              })()}

              {/* Points Summary & Adjustment Action */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 dark:from-amber-950/30 dark:via-slate-900 dark:to-amber-950/30 border border-amber-200 dark:border-amber-900/40 flex items-center justify-between gap-3">
                <div>
                  <span className="text-[11px] font-semibold text-amber-900 dark:text-amber-300 block">
                    Saldo Poin Aktif
                  </span>
                  <div className="text-2xl font-black font-mono text-amber-600 dark:text-amber-400 flex items-baseline gap-1.5">
                    <span>{(detailCustomer.points || 0).toLocaleString()}</span>
                    <span className="text-xs font-semibold">Points</span>
                  </div>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                    Dapat ditukar diskon senilai{' '}
                    {formatCurrency((detailCustomer.points || 0) * redemptionRate, settings.currency)}
                  </span>
                </div>

                <div className="flex flex-col gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setCalculatorTargetCustomer(detailCustomer);
                      setDetailCustomer(null);
                      setActiveCustomersTab('calculator');
                    }}
                    className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition cursor-pointer shadow-xs flex items-center justify-center gap-1"
                  >
                    <Calculator className="w-3.5 h-3.5" />
                    <span>Buka Kalkulator Diskon</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsAdjustingPoints(!isAdjustingPoints)}
                    className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-300 text-xs font-bold hover:bg-amber-100 dark:hover:bg-slate-700 transition cursor-pointer flex items-center justify-center gap-1"
                  >
                    <Sliders className="w-3.5 h-3.5" />
                    <span>{isAdjustingPoints ? 'Tutup Penyesuaian' : 'Sesuaikan Poin'}</span>
                  </button>
                </div>
              </div>

              {/* Adjust Points Form */}
              {isAdjustingPoints && (
                <form
                  onSubmit={handleApplyPointsAdjustment}
                  className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-3 text-xs animate-in fade-in duration-150"
                >
                  <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between">
                    <span>Penyesuaian Manual Poin Member</span>
                    <span className="text-[10px] text-slate-400">
                      Operator: {activeEmployee?.name || 'Kasir'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setAdjustType('add')}
                      className={`p-2 rounded-xl font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                        adjustType === 'add'
                          ? 'bg-emerald-500 text-slate-950 shadow-xs'
                          : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600'
                      }`}
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      <span>Tambah Poin (+)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setAdjustType('subtract')}
                      className={`p-2 rounded-xl font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                        adjustType === 'subtract'
                          ? 'bg-amber-500 text-slate-950 shadow-xs'
                          : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600'
                      }`}
                    >
                      <MinusCircle className="w-3.5 h-3.5" />
                      <span>Kurang Poin (-)</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1">
                        Jumlah Poin
                      </label>
                      <input
                        type="number"
                        min={1}
                        step={1}
                        value={adjustPointsDelta}
                        onChange={(e) => setAdjustPointsDelta(Number(e.target.value))}
                        className="w-full p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono font-bold text-slate-900 dark:text-white"
                        placeholder="50"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1">
                        Alasan / Keterangan
                      </label>
                      <input
                        type="text"
                        required
                        value={adjustReason}
                        onChange={(e) => setAdjustReason(e.target.value)}
                        className="w-full p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                        placeholder="Contoh: Bonus Ulang Tahun"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsAdjustingPoints(false)}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 cursor-pointer"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold cursor-pointer"
                    >
                      Simpan Penyesuaian
                    </button>
                  </div>
                </form>
              )}

              {/* Transactions History from POS */}
              {customerTransactions.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
                    <Receipt className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Riwayat Belanja Kasir Member ({customerTransactions.length} Transaksi)</span>
                  </div>

                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {customerTransactions.map((tx) => (
                      <div
                        key={tx.id}
                        className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 text-xs flex items-center justify-between gap-2"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-slate-900 dark:text-white">
                              {tx.invoiceNumber}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {tx.createdAt ? tx.createdAt.slice(0, 10) : ''}
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-500">
                            {tx.items.length} item • Total: {formatCurrency(tx.finalTotal, settings.currency)}
                          </span>
                        </div>

                        <div className="text-right">
                          {tx.pointsEarned > 0 && (
                            <span className="text-[11px] font-bold font-mono text-emerald-600 dark:text-emerald-400 block">
                              +{tx.pointsEarned} Pts Didapat
                            </span>
                          )}
                          {tx.pointsUsed && tx.pointsUsed > 0 ? (
                            <span className="text-[10px] font-mono text-amber-600 dark:text-amber-400 block">
                              -{tx.pointsUsed} Pts (Diskon {formatCurrency(tx.pointsDiscount || 0, settings.currency)})
                            </span>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Point Ledger History */}
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
                  <History className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Buku Besar &amp; Riwayat Mutasi Poin</span>
                </div>

                {detailCustomer.pointsHistory && detailCustomer.pointsHistory.length > 0 ? (
                  <div className="space-y-2">
                    {detailCustomer.pointsHistory.map((entry) => {
                      const isPositive = entry.points > 0;
                      return (
                        <div
                          key={entry.id}
                          className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-xs flex items-center justify-between gap-2"
                        >
                          <div className="flex items-start gap-2.5">
                            <div
                              className={`p-1.5 rounded-lg mt-0.5 ${
                                isPositive
                                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400'
                                  : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400'
                              }`}
                            >
                              {isPositive ? (
                                <ArrowDownLeft className="w-3.5 h-3.5" />
                              ) : (
                                <ArrowUpRight className="w-3.5 h-3.5" />
                              )}
                            </div>
                            <div>
                              <p className="font-bold text-slate-900 dark:text-slate-100">
                                {entry.description}
                              </p>
                              <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                                <span className="flex items-center gap-1 font-mono">
                                  <Clock className="w-2.5 h-2.5" />
                                  {entry.date ? entry.date.slice(0, 16).replace('T', ' ') : '-'}
                                </span>
                                {entry.operatorName && <span>• Kasir: {entry.operatorName}</span>}
                              </div>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <span
                              className={`font-mono font-bold block ${
                                isPositive
                                  ? 'text-emerald-600 dark:text-emerald-400'
                                  : 'text-amber-600 dark:text-amber-400'
                              }`}
                            >
                              {isPositive ? `+${entry.points}` : entry.points} Pts
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              Saldo: {entry.balanceAfter}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-6 text-center text-slate-400 text-xs rounded-2xl bg-slate-50 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-800">
                    Belum ada riwayat transaksi poin untuk member ini.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Customer Registration Modal */}
      {isNewCustomerModalOpen && (
        <CustomerModal
          isOpen={isNewCustomerModalOpen}
          onClose={() => setIsNewCustomerModalOpen(false)}
        />
      )}
    </div>
  );
};

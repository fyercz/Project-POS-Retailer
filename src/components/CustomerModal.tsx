import React, { useState } from 'react';
import {
  X,
  UserPlus,
  Search,
  Check,
  Award,
  Phone,
  Mail,
  User,
  History,
  Clock,
  ArrowDownLeft,
  ArrowUpRight,
  Sparkles,
} from 'lucide-react';
import { usePOS } from '../context/POSContext';
import { Customer, MemberTier } from '../types';
import { formatCurrency } from '../utils/formatters';

interface CustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CustomerModal: React.FC<CustomerModalProps> = ({ isOpen, onClose }) => {
  const { customers, selectedCustomer, setSelectedCustomer, addCustomer, settings } = usePOS();
  const [activeTab, setActiveTab] = useState<'select' | 'new'>('select');
  const [search, setSearch] = useState('');
  const [viewingCustomerLedger, setViewingCustomerLedger] = useState<Customer | null>(null);

  // New customer form
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [tier, setTier] = useState<MemberTier>('Bronze');
  const [initialPoints, setInitialPoints] = useState<number>(25);

  if (!isOpen) return null;

  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.includes(search) ||
      (c.email && c.email.toLowerCase().includes(search.toLowerCase()))
  );

  const handleCreateCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) return;

    addCustomer({
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim() || undefined,
      tier,
      initialPoints,
    });

    onClose();
  };

  const getTierBadge = (t?: MemberTier) => {
    switch (t) {
      case 'Platinum':
        return 'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950/70 dark:text-purple-300 dark:border-purple-800';
      case 'Gold':
        return 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/70 dark:text-amber-300 dark:border-amber-800';
      case 'Silver':
        return 'bg-slate-200 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700';
      default:
        return 'bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-950/70 dark:text-orange-300 dark:border-orange-800';
    }
  };

  const redemptionRate = settings.pointRedemptionRate || 100;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        id="customer-selection-dialog"
        className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[88vh]"
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 leading-tight">
                Customer & Loyalty CRM
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Pilih member untuk klaim diskon poin atau daftarkan member baru
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Ledger View vs Tabs */}
        {viewingCustomerLedger ? (
          <div className="flex-1 overflow-y-auto flex flex-col">
            {/* Header back */}
            <div className="p-3 bg-slate-100/80 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setViewingCustomerLedger(null)}
                  className="px-2 py-1 rounded-md text-xs font-semibold bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-50 cursor-pointer"
                >
                  &larr; Kembali
                </button>
                <span className="font-bold text-xs text-slate-900 dark:text-white">
                  Buku Poin: {viewingCustomerLedger.name}
                </span>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getTierBadge(viewingCustomerLedger.tier)}`}>
                {viewingCustomerLedger.tier || 'Bronze'}
              </span>
            </div>

            {/* Summary card */}
            <div className="p-4 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-slate-900 border-b border-amber-200 dark:border-amber-900/40 flex items-center justify-between">
              <div>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-medium">Saldo Poin Aktif</span>
                <div className="text-xl font-black font-mono text-amber-600 dark:text-amber-400 flex items-baseline gap-1.5">
                  <span>{viewingCustomerLedger.points.toLocaleString()}</span>
                  <span className="text-xs font-semibold">Pts</span>
                </div>
                <span className="text-[11px] text-slate-500 font-mono">
                  Setara diskon belanja {formatCurrency(viewingCustomerLedger.points * redemptionRate, settings.currency)}
                </span>
              </div>

              <button
                type="button"
                onClick={() => {
                  setSelectedCustomer(viewingCustomerLedger);
                  onClose();
                }}
                className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold shadow-xs cursor-pointer"
              >
                Pilih Untuk Kasir
              </button>
            </div>

            {/* Point History List */}
            <div className="p-4 flex-1 overflow-y-auto space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                <History className="w-3.5 h-3.5 text-emerald-500" />
                <span>Riwayat Perolehan & Penukaran Poin</span>
              </div>

              {viewingCustomerLedger.pointsHistory && viewingCustomerLedger.pointsHistory.length > 0 ? (
                viewingCustomerLedger.pointsHistory.map((item) => {
                  const isPositive = item.points > 0;
                  return (
                    <div
                      key={item.id}
                      className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs flex items-start justify-between gap-2 shadow-2xs"
                    >
                      <div className="flex items-start gap-2">
                        <div
                          className={`p-1.5 rounded-lg mt-0.5 ${
                            isPositive
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400'
                              : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400'
                          }`}
                        >
                          {isPositive ? <ArrowDownLeft className="w-3.5 h-3.5" /> : <ArrowUpRight className="w-3.5 h-3.5" />}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900 dark:text-slate-100 leading-tight">
                            {item.description}
                          </p>
                          <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-1">
                            <span className="flex items-center gap-1 font-mono">
                              <Clock className="w-2.5 h-2.5" />
                              {item.date ? item.date.slice(0, 16).replace('T', ' ') : '-'}
                            </span>
                            {item.operatorName && (
                              <span>• Kasir: {item.operatorName}</span>
                            )}
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
                          {isPositive ? `+${item.points}` : item.points} Pts
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          Saldo: {item.balanceAfter}
                        </span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8 text-slate-400 text-xs">
                  Belum ada catatan riwayat poin untuk member ini.
                </div>
              )}
            </div>
          </div>
        ) : (
          <>
            {/* Tab switcher */}
            <div className="p-3 border-b border-slate-200 dark:border-slate-800 grid grid-cols-2 gap-2 bg-slate-50/50 dark:bg-slate-950">
              <button
                onClick={() => setActiveTab('select')}
                className={`py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                  activeTab === 'select'
                    ? 'bg-slate-900 text-white dark:bg-slate-800 dark:text-emerald-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
                }`}
              >
                Pilih Member Terdaftar
              </button>
              <button
                onClick={() => setActiveTab('new')}
                className={`py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                  activeTab === 'new'
                    ? 'bg-slate-900 text-white dark:bg-slate-800 dark:text-emerald-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
                }`}
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>+ Member Baru</span>
              </button>
            </div>

            {/* Content */}
            {activeTab === 'select' ? (
              <div className="p-4 flex-1 overflow-y-auto space-y-3">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Cari nama member, nomor WhatsApp..."
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                {/* Guest / Walk-in Quick Option */}
                <div
                  onClick={() => {
                    setSelectedCustomer(null);
                    onClose();
                  }}
                  className={`p-3 rounded-xl border text-xs cursor-pointer flex items-center justify-between transition-colors ${
                    selectedCustomer === null
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300 font-semibold'
                      : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div>
                    <p className="font-bold">Pelanggan Umum (Non-Member / Walk-in)</p>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500">
                      Transaksi langsung tanpa pemakaian/perolehan poin
                    </p>
                  </div>
                  {selectedCustomer === null && <Check className="w-4 h-4 text-emerald-600" />}
                </div>

                {/* Member List */}
                <div className="space-y-2 pt-1">
                  {filteredCustomers.map((cust) => {
                    const isSelected = selectedCustomer?.id === cust.id;
                    return (
                      <div
                        key={cust.id}
                        className={`p-3 rounded-xl border text-xs flex items-center justify-between transition-all ${
                          isSelected
                            ? 'border-emerald-500 bg-emerald-50 text-emerald-900 dark:bg-emerald-950/40 dark:border-emerald-500 dark:text-emerald-300 font-semibold ring-1 ring-emerald-500'
                            : 'border-slate-200 dark:border-slate-800 hover:border-emerald-500/50 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200'
                        }`}
                      >
                        <div
                          className="flex-1 cursor-pointer"
                          onClick={() => {
                            setSelectedCustomer(cust);
                            onClose();
                          }}
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-slate-900 dark:text-white">{cust.name}</span>
                            <span className={`text-[10px] font-bold px-2 py-0.2 rounded-full border ${getTierBadge(cust.tier)}`}>
                              {cust.tier || 'Bronze'}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                            <span className="flex items-center gap-1 font-mono">
                              <Phone className="w-3 h-3" />
                              {cust.phone}
                            </span>
                            <span className="flex items-center gap-1 font-semibold text-amber-600 dark:text-amber-400 font-mono">
                              <Award className="w-3 h-3" />
                              {cust.points} Pts ({formatCurrency(cust.points * redemptionRate, settings.currency)})
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setViewingCustomerLedger(cust);
                            }}
                            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:text-emerald-500 text-slate-600 dark:text-slate-300 text-[10px] flex items-center gap-1 cursor-pointer"
                            title="Lihat riwayat transaksi dan perolehan poin"
                          >
                            <History className="w-3.5 h-3.5" />
                            <span>Riwayat</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setSelectedCustomer(cust);
                              onClose();
                            }}
                            className={`px-3 py-1.5 rounded-lg font-bold text-xs cursor-pointer ${
                              isSelected
                                ? 'bg-emerald-600 text-white'
                                : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                            }`}
                          >
                            {isSelected ? 'Dipilih' : 'Pilih'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <form onSubmit={handleCreateCustomer} className="p-4 flex-1 overflow-y-auto space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Nama Lengkap Member *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Contoh: Budi Santoso"
                    className="w-full p-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Nomor Handphone / WhatsApp *
                  </label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Contoh: 0812-3456-7890"
                    className="w-full p-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Email (Opsional)
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="member@email.com"
                    className="w-full p-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Tier Member Awal
                    </label>
                    <select
                      value={tier}
                      onChange={(e) => setTier(e.target.value as MemberTier)}
                      className="w-full p-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="Bronze">Bronze (1x Poin)</option>
                      <option value="Silver">Silver (1.2x Poin)</option>
                      <option value="Gold">Gold (1.5x Poin)</option>
                      <option value="Platinum">Platinum (2x Poin)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Bonus Poin Sambutan
                    </label>
                    <input
                      type="number"
                      min={0}
                      step={5}
                      value={initialPoints}
                      onChange={(e) => setInitialPoints(Number(e.target.value))}
                      className="w-full p-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    className="w-full py-2.5 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 cursor-pointer transition-colors shadow-md shadow-emerald-500/20"
                  >
                    Daftarkan & Pilih Member Ini
                  </button>
                </div>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
};

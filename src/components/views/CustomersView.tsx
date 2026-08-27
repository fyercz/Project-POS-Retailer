import React, { useState } from 'react';
import {
  Users,
  Search,
  UserPlus,
  Award,
  Phone,
  Mail,
  ShoppingBag,
  TrendingUp,
  Sparkles,
} from 'lucide-react';
import { usePOS } from '../../context/POSContext';
import { formatCurrency } from '../../utils/formatters';
import { CustomerModal } from '../CustomerModal';

export const CustomersView: React.FC = () => {
  const { customers, settings } = usePOS();
  const [search, setSearch] = useState('');
  const [isNewCustomerModalOpen, setIsNewCustomerModalOpen] = useState(false);

  const filteredCustomers = customers.filter((c) => {
    const q = search.toLowerCase();
    return (
      !q || c.name.toLowerCase().includes(q) || c.phone.includes(q) || (c.email && c.email.toLowerCase().includes(q))
    );
  });

  const totalPointsInCirculation = customers.reduce((sum, c) => sum + c.points, 0);

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-100 dark:bg-slate-950 overflow-hidden select-none">
      {/* Top Banner */}
      <div className="p-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4 shadow-2xs">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-emerald-500" />
            <span>Member & Poin Reward</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Kelola langganan setia, kumpulin poin reward belanja, dan cek riwayat langganan
          </p>
        </div>

        {/* Action Button & Stats */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs">
            <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 block">Member Terdaftar</span>
            <span className="font-bold text-slate-900 dark:text-white font-mono">
              {customers.length} Orang
            </span>
          </div>

          <div className="px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-300">
            <span className="text-[10px] font-medium block">Poin Beredar</span>
            <span className="font-bold font-mono flex items-center gap-1">
              <Award className="w-3.5 h-3.5 text-amber-500" />
              {totalPointsInCirculation.toLocaleString()} Pts
            </span>
          </div>

          <button
            onClick={() => setIsNewCustomerModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-500/20 cursor-pointer transition-all active:scale-95"
          >
            <UserPlus className="w-4 h-4" />
            <span>+ Tambah Member</span>
          </button>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="px-4 py-2.5 bg-slate-50/80 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama member, no. WhatsApp, atau email..."
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs"
          />
        </div>
      </div>

      {/* Customer CRM Grid / Cards */}
      <div className="flex-1 p-4 overflow-y-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredCustomers.map((cust) => (
            <div
              key={cust.id}
              className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-emerald-500/80 transition-all flex flex-col justify-between shadow-xs"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-700 text-white font-bold text-sm flex items-center justify-center shadow-xs">
                      {cust.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white leading-tight">
                        {cust.name}
                      </h4>
                      <span className="text-[11px] text-slate-400 font-mono flex items-center gap-1 mt-0.5">
                        <Phone className="w-3 h-3" />
                        {cust.phone}
                      </span>
                    </div>
                  </div>

                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full border bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800">
                    Regular Member
                  </span>
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
                <div className="bg-slate-100 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 p-2.5 rounded-xl flex flex-col justify-center">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-0.5">Poin</span>
                  <span className="font-bold font-mono text-sm text-amber-600 dark:text-amber-400">
                    {cust.points}
                  </span>
                </div>

                <div className="bg-slate-100 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 p-2.5 rounded-xl flex flex-col justify-center">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-0.5">Transaksi</span>
                  <span className="font-bold font-mono text-sm text-slate-900 dark:text-white">
                    {cust.ordersCount}
                  </span>
                </div>

                <div className="bg-slate-100 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 p-2.5 rounded-xl flex flex-col justify-center">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-0.5">Belanja</span>
                  <span className="font-bold font-mono text-xs text-emerald-600 dark:text-emerald-400 truncate block">
                    {formatCurrency(cust.totalSpent, settings.currency)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

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

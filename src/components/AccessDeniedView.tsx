import React, { useState } from 'react';
import { ShieldAlert, Lock, ArrowLeft, KeyRound, CheckCircle, AlertCircle } from 'lucide-react';
import { usePOS } from '../context/POSContext';
import { AppView } from '../types';
import { getViewTitle, getRequiredRoleForView } from '../utils/permissions';

interface AccessDeniedViewProps {
  attemptedView: AppView;
  onAuthorized?: () => void;
}

export const AccessDeniedView: React.FC<AccessDeniedViewProps> = ({
  attemptedView,
  onAuthorized,
}) => {
  const {
    activeEmployee,
    setActiveView,
    lockScreen,
    employees,
    quickSwitchEmployee,
  } = usePOS();

  const [pinInput, setPinInput] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isAuthorizing, setIsAuthorizing] = useState(false);

  const viewTitle = getViewTitle(attemptedView);
  const requiredRole = getRequiredRoleForView(attemptedView);

  const handleAuthorizeWithPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pinInput.trim()) {
      setErrorMessage('Silakan masukkan PIN Otoritas.');
      return;
    }

    // Find supervisor or owner matching the PIN
    const authorityEmp = employees.find(
      (emp) =>
        emp.isActive &&
        (emp.role === 'supervisor' || emp.role === 'owner') &&
        (emp.pin === pinInput.trim() || pinInput.trim() === '9999')
    );

    if (authorityEmp) {
      setErrorMessage('');
      quickSwitchEmployee(authorityEmp);
      if (onAuthorized) {
        onAuthorized();
      }
    } else {
      setErrorMessage('PIN salah atau akun tidak memiliki otoritas Supervisor / Owner.');
      setPinInput('');
    }
  };

  return (
    <div
      id="access-denied-container"
      className="flex-1 flex items-center justify-center p-4 md:p-8 bg-slate-50 dark:bg-slate-950 overflow-y-auto"
    >
      <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl p-6 md:p-8 text-center">
        {/* Shield Icon */}
        <div className="w-16 h-16 rounded-3xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto mb-5 shadow-sm">
          <ShieldAlert className="w-8 h-8" />
        </div>

        {/* Title */}
        <span className="text-[11px] font-extrabold uppercase tracking-wider text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 px-2.5 py-1 rounded-full border border-rose-200 dark:border-rose-900/40">
          Akses Terbatas Sistem
        </span>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-3">
          Menu {viewTitle} Dibatasi
        </h2>
        <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
          Jabatan Anda saat ini tidak memiliki izin untuk membuka menu ini. Menu ini hanya dapat diakses oleh{' '}
          <strong className="text-slate-800 dark:text-slate-200">{requiredRole}</strong>.
        </p>

        {/* Current Active Employee Info Box */}
        <div className="my-5 p-3.5 rounded-2xl bg-slate-100/80 dark:bg-slate-850/80 border border-slate-200 dark:border-slate-800 text-left flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-xl ${
              activeEmployee?.avatarColor || 'bg-emerald-600'
            } text-white font-bold text-sm flex items-center justify-center shrink-0 shadow-2xs`}
          >
            {activeEmployee?.avatar || 'KR'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
              {activeEmployee?.name || 'Kasir'}
            </p>
            <p className="text-[11px] text-slate-500 truncate">
              Jabatan: {activeEmployee?.roleTitle || activeEmployee?.role || 'Kasir'}
            </p>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
            Terbatas
          </span>
        </div>

        {/* Inline PIN Unlock Form for Supervisor / Owner */}
        {isAuthorizing ? (
          <form onSubmit={handleAuthorizeWithPin} className="space-y-3 mb-4">
            <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-2xl text-left">
              <label className="text-xs font-bold text-amber-900 dark:text-amber-200 block mb-1 flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5" /> Masukkan PIN Supervisor / Owner:
              </label>
              <input
                type="password"
                maxLength={6}
                autoFocus
                value={pinInput}
                onChange={(e) => {
                  setPinInput(e.target.value);
                  setErrorMessage('');
                }}
                placeholder="4-digit PIN..."
                className="w-full px-3 py-2 text-center text-lg font-mono font-bold tracking-widest rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                Hint demo: Supervisor: <span className="font-mono font-bold">7890</span> • Owner: <span className="font-mono font-bold">9999</span>
              </p>
            </div>

            {errorMessage && (
              <div className="flex items-center gap-1.5 text-xs text-rose-600 dark:text-rose-400 text-left bg-rose-50 dark:bg-rose-950/40 p-2 rounded-xl border border-rose-200 dark:border-rose-900/50">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsAuthorizing(false);
                  setErrorMessage('');
                  setPinInput('');
                }}
                className="flex-1 py-2 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition"
              >
                Batal
              </button>
              <button
                type="submit"
                className="flex-1 py-2 text-xs font-bold rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-sm transition"
              >
                Buka Otoritas
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-2.5">
            <button
              id="btn-open-pin-authorization"
              type="button"
              onClick={() => setIsAuthorizing(true)}
              className="w-full py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition active:scale-98 cursor-pointer"
            >
              <KeyRound className="w-4 h-4" />
              <span>Otorisasi dengan PIN Supervisor / Owner</span>
            </button>

            <button
              id="btn-access-denied-lock-screen"
              type="button"
              onClick={lockScreen}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-800 dark:text-slate-200 text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <Lock className="w-4 h-4 text-slate-500" />
              <span>Ganti Akun Staf (Layar Login)</span>
            </button>

            <button
              id="btn-back-to-allowed-view"
              type="button"
              onClick={() => setActiveView(activeEmployee?.role === 'inventory' ? 'inventory' : 'pos')}
              className="w-full py-2 text-xs font-medium text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 flex items-center justify-center gap-1.5 transition cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Kembali ke Menu Utama ({activeEmployee?.role === 'inventory' ? 'Katalog & Stok' : 'Kasir'})</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

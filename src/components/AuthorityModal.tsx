import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ShieldCheck, Lock, X, AlertCircle, KeyRound } from 'lucide-react';
import { usePOS } from '../context/POSContext';
import { Employee } from '../types';

interface AuthorityModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description: string;
  requiredRole?: 'supervisor' | 'owner';
  onSuccess: (authorizedEmp: Employee) => void;
}

export const AuthorityModal: React.FC<AuthorityModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  requiredRole = 'supervisor',
  onSuccess,
}) => {
  const { employees } = usePOS();
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin.trim()) {
      setError('Masukkan PIN otoritas.');
      return;
    }

    const matched = employees.find((emp) => {
      if (!emp.isActive) return false;
      const isAuthorizedRole =
        requiredRole === 'owner'
          ? emp.role === 'owner'
          : emp.role === 'supervisor' || emp.role === 'owner';

      const isPinCorrect = emp.pin === pin.trim() || pin.trim() === '9999';
      return isAuthorizedRole && isPinCorrect;
    });

    if (matched) {
      setError('');
      setPin('');
      onSuccess(matched);
      onClose();
    } else {
      setError(
        requiredRole === 'owner'
          ? 'PIN salah atau akun bukan Pemilik (Owner).'
          : 'PIN salah atau akun tidak memiliki otoritas Supervisor / Owner.'
      );
      setPin('');
    }
  };

  return (
    <div
      id="authority-pin-modal"
      className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto select-none"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
      >
        {/* Modal Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-amber-500/10 dark:bg-amber-500/5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold shadow-sm">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Otoritas Diperlukan
              </h3>
              <p className="text-[10px] text-amber-700 dark:text-amber-400 font-semibold">
                Perlu Izin {requiredRole === 'owner' ? 'Owner' : 'Supervisor / Owner'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
              {title}
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {description}
            </p>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5 flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-amber-500" />
              PIN Otoritas:
            </label>
            <input
              type="password"
              maxLength={6}
              autoFocus
              value={pin}
              onChange={(e) => {
                setPin(e.target.value);
                setError('');
              }}
              placeholder="Masukkan 4 digit PIN..."
              className="w-full px-3 py-2 text-center text-xl font-mono font-bold tracking-widest rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
            <div className="text-[10px] text-slate-400 text-center mt-1.5 font-mono">
              PIN Supervisor: <strong>7890</strong> • Owner: <strong>9999</strong>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-1.5 text-xs text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 p-2 rounded-xl border border-rose-200 dark:border-rose-900/50">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition"
            >
              Batal
            </button>
            <button
              type="submit"
              className="flex-1 py-2 text-xs font-bold rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-sm transition"
            >
              Verifikasi Otoritas
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

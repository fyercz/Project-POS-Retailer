import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Lock,
  Unlock,
  Users,
  ShieldCheck,
  Store,
  Clock,
  KeyRound,
  Delete,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ArrowRight,
  UserCheck,
} from 'lucide-react';
import { usePOS } from '../context/POSContext';
import { Employee } from '../types';

export const EmployeeLockScreen: React.FC = () => {
  const {
    isLocked,
    employees,
    activeEmployee,
    loginWithPin,
    unlockScreen,
    quickSwitchEmployee,
    settings,
  } = usePOS();

  const [selectedEmp, setSelectedEmp] = useState<Employee | null>(() => activeEmployee || employees[0] || null);
  const [pinInput, setPinInput] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');

  // Update clock every second
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
      setCurrentDate(
        now.toLocaleDateString('id-ID', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Sync selected employee when activeEmployee changes
  useEffect(() => {
    if (activeEmployee) {
      setSelectedEmp(activeEmployee);
    }
  }, [activeEmployee]);

  // Handle keyboard PIN entry
  useEffect(() => {
    if (!isLocked) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        if (pinInput.length < 6) {
          handleDigit(e.key);
        }
      } else if (e.key === 'Backspace') {
        handleBackspace();
      } else if (e.key === 'Enter') {
        handleUnlock();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isLocked, pinInput, selectedEmp]);

  if (!isLocked) return null;

  const handleDigit = (digit: string) => {
    if (pinInput.length >= 6) return;
    setErrorMessage('');
    const newPin = pinInput + digit;
    setPinInput(newPin);

    // Auto submit on 4-digit PIN for selected employee
    if (newPin.length === 4 && selectedEmp) {
      if (selectedEmp.pin === newPin || newPin === '9999') {
        setTimeout(() => {
          quickSwitchEmployee(selectedEmp);
          setPinInput('');
          setErrorMessage('');
        }, 150);
      }
    }
  };

  const handleBackspace = () => {
    setErrorMessage('');
    setPinInput((prev) => prev.slice(0, -1));
  };

  const handleClear = () => {
    setErrorMessage('');
    setPinInput('');
  };

  const handleUnlock = () => {
    if (!pinInput) {
      setErrorMessage('Silakan masukkan PIN 4 digit.');
      return;
    }

    if (selectedEmp) {
      if (selectedEmp.pin === pinInput || pinInput === '9999') {
        quickSwitchEmployee(selectedEmp);
        setPinInput('');
        setErrorMessage('');
      } else {
        setErrorMessage('PIN salah untuk ' + selectedEmp.name + '. Silakan coba lagi.');
        setPinInput('');
      }
    } else {
      const res = loginWithPin(pinInput);
      if (res.success) {
        setPinInput('');
        setErrorMessage('');
      } else {
        setErrorMessage(res.message);
        setPinInput('');
      }
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'owner':
        return { label: 'Owner / Pemilik', bg: 'bg-indigo-100 text-indigo-800 border-indigo-200' };
      case 'supervisor':
        return { label: 'Supervisor / SPV', bg: 'bg-purple-100 text-purple-800 border-purple-200' };
      case 'inventory':
        return { label: 'Admin Gudang', bg: 'bg-amber-100 text-amber-800 border-amber-200' };
      case 'cashier':
      default:
        return { label: 'Kasir Frontliner', bg: 'bg-emerald-100 text-emerald-800 border-emerald-200' };
    }
  };

  return (
    <div
      id="employee-lock-screen"
      className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-4xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col md:flex-row"
      >
        {/* Left Side: Store Info & Employee Selector */}
        <div className="w-full md:w-5/12 bg-slate-50 dark:bg-slate-900/50 p-6 md:p-8 border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-800 flex flex-col justify-between">
          <div>
            {/* Store Brand */}
            <div className="flex items-center gap-3 mb-6">
              <div className="w-11 h-11 rounded-2xl bg-emerald-600 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
                <Store className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white leading-tight">
                  {settings.storeName}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  {settings.branchName}
                </p>
              </div>
            </div>

            {/* Live Clock Card */}
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 shadow-sm mb-6">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
                <span className="flex items-center gap-1.5 font-medium">
                  <Clock className="w-3.5 h-3.5 text-emerald-600" /> Waktu Sistem POS
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                  Online
                </span>
              </div>
              <div className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight font-mono">
                {currentTime || '00:00:00'}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 capitalize">
                {currentDate}
              </p>
            </div>

            {/* Select Employee Title */}
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" /> Pilih Akun Karyawan
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                {employees.filter((e) => e.isActive).length} Staf Aktif
              </span>
            </div>

            {/* Employee List */}
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {employees
                .filter((e) => e.isActive)
                .map((emp) => {
                  const isSelected = selectedEmp?.id === emp.id;
                  const badge = getRoleBadge(emp.role);
                  return (
                    <button
                      key={emp.id}
                      id={`lock-select-emp-${emp.id}`}
                      onClick={() => {
                        setSelectedEmp(emp);
                        setPinInput('');
                        setErrorMessage('');
                      }}
                      className={`w-full p-3 rounded-2xl flex items-center gap-3 text-left transition-all border ${
                        isSelected
                          ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-500 dark:border-emerald-500 shadow-sm ring-1 ring-emerald-500'
                          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                      }`}
                    >
                      <div
                        className={`w-10 h-10 rounded-xl ${emp.avatarColor} text-white font-bold flex items-center justify-center text-sm shadow-sm flex-shrink-0`}
                      >
                        {emp.avatar}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                            {emp.name}
                          </p>
                          <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                            {emp.employeeCode}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded font-medium border ${badge.bg}`}
                          >
                            {badge.label}
                          </span>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                            {emp.assignedShift || 'Shift Normal'}
                          </span>
                        </div>
                      </div>
                      {isSelected && (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                      )}
                    </button>
                  );
                })}
            </div>
          </div>

          {/* Quick Demo PIN Helper */}
          <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700/60">
            <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 font-medium">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              PIN Demo Cepat:
            </p>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {employees.slice(0, 4).map((emp) => (
                <button
                  key={emp.id}
                  id={`demo-pin-btn-${emp.id}`}
                  onClick={() => {
                    setSelectedEmp(emp);
                    setPinInput(emp.pin);
                    setTimeout(() => {
                      quickSwitchEmployee(emp);
                      setPinInput('');
                    }, 100);
                  }}
                  className="px-2 py-1 bg-white dark:bg-slate-800 text-[10px] font-mono text-slate-700 dark:text-slate-300 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700"
                >
                  {emp.name.split(' ')[0]}: <span className="font-bold text-emerald-600">{emp.pin}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Side: Keypad & PIN Input */}
        <div className="w-full md:w-7/12 p-6 md:p-8 flex flex-col items-center justify-between">
          <div className="w-full max-w-xs flex flex-col items-center">
            {/* Header Icon */}
            <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-200 mb-3 shadow-inner">
              <Lock className="w-7 h-7 text-emerald-600" />
            </div>

            <h3 className="text-xl font-bold text-slate-900 dark:text-white">
              {selectedEmp ? `Buka Layar - ${selectedEmp.name}` : 'Masukkan PIN Karyawan'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 text-center">
              Masukkan 4 digit PIN keamanan kasir untuk melanjutkan transaksi.
            </p>

            {/* Selected User Pill */}
            {selectedEmp && (
              <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-300 font-medium">
                <span className={`w-2 h-2 rounded-full ${selectedEmp.avatarColor}`} />
                <span>{selectedEmp.roleTitle || selectedEmp.role}</span>
                <span className="text-slate-500">•</span>
                <span className="text-slate-500 font-mono">{selectedEmp.employeeCode}</span>
              </div>
            )}

            {/* PIN Dots Display */}
            <div className="flex items-center justify-center gap-4 my-6">
              {[0, 1, 2, 3].map((index) => {
                const filled = pinInput.length > index;
                return (
                  <div
                    key={index}
                    className={`w-4 h-4 rounded-full transition-all duration-200 ${
                      filled
                        ? 'bg-emerald-600 scale-125 shadow-md shadow-emerald-500/30'
                        : 'bg-slate-200 dark:bg-slate-700 border-2 border-slate-300 dark:border-slate-600'
                    }`}
                  />
                );
              })}
            </div>

            {/* Error Message */}
            <AnimatePresence>
              {errorMessage && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="w-full p-2.5 mb-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 flex items-center gap-2 text-rose-700 dark:text-rose-300 text-xs"
                >
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span className="flex-1">{errorMessage}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Numeric Keypad */}
            <div className="grid grid-cols-3 gap-2.5 w-full">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                <button
                  key={digit}
                  id={`keypad-${digit}`}
                  onClick={() => handleDigit(digit)}
                  className="h-12 rounded-2xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 active:scale-95 text-slate-800 dark:text-slate-100 text-lg font-bold shadow-sm border border-slate-200 dark:border-slate-700 transition flex items-center justify-center"
                >
                  {digit}
                </button>
              ))}

              <button
                id="keypad-clear"
                onClick={handleClear}
                className="h-12 rounded-2xl bg-slate-100 dark:bg-slate-800/60 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95 text-slate-600 dark:text-slate-400 text-xs font-bold border border-slate-200 dark:border-slate-700 transition flex items-center justify-center uppercase tracking-wider"
              >
                Reset
              </button>

              <button
                id="keypad-0"
                onClick={() => handleDigit('0')}
                className="h-12 rounded-2xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 active:scale-95 text-slate-800 dark:text-slate-100 text-lg font-bold shadow-sm border border-slate-200 dark:border-slate-700 transition flex items-center justify-center"
              >
                0
              </button>

              <button
                id="keypad-backspace"
                onClick={handleBackspace}
                className="h-12 rounded-2xl bg-slate-100 dark:bg-slate-800/60 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 transition flex items-center justify-center"
              >
                <Delete className="w-5 h-5" />
              </button>
            </div>

            {/* Unlock Button */}
            <button
              id="btn-unlock-pos"
              onClick={handleUnlock}
              disabled={pinInput.length === 0}
              className="w-full mt-4 h-12 rounded-2xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm shadow-md shadow-emerald-500/20 transition flex items-center justify-center gap-2"
            >
              <Unlock className="w-4 h-4" /> Masuk ke POS
            </button>
          </div>

          <div className="w-full max-w-xs text-center mt-4">
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Butuh bantuan akses? Hubungi Supervisor atau gunakan Master PIN (9999).
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

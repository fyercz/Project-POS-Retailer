import React, { useState, useEffect, useRef } from 'react';
import {
  ScanBarcode,
  ShieldAlert,
  ShieldCheck,
  Lock,
  UserCheck,
  Plus,
  X,
  KeyRound,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Eye,
  EyeOff,
  UserX,
} from 'lucide-react';
import { usePOS } from '../context/POSContext';
import { Employee, EmployeeRole } from '../types';

interface UnregisteredBarcodeModalProps {
  isOpen: boolean;
  barcode: string;
  onClose: () => void;
  onAuthorizeSuccess: (
    barcode: string,
    authorizer: {
      authorizedBy: string;
      authorizerRole: string;
    }
  ) => void;
}

export const UnregisteredBarcodeModal: React.FC<UnregisteredBarcodeModalProps> = ({
  isOpen,
  barcode,
  onClose,
  onAuthorizeSuccess,
}) => {
  const { activeEmployee, employees } = usePOS();

  const [pinInput, setPinInput] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [selectedAuthorizerId, setSelectedAuthorizerId] = useState<string>('');

  const pinInputRef = useRef<HTMLInputElement | null>(null);

  // List of staff who have authority above cashier (supervisor, owner, inventory)
  const authorityEmployees = employees.filter(
    (emp) => emp.isActive && (emp.role === 'supervisor' || emp.role === 'owner' || emp.role === 'inventory')
  );

  // Check if active employee ALREADY has higher authority
  const hasDirectAuthority =
    activeEmployee &&
    (activeEmployee.role === 'supervisor' ||
      activeEmployee.role === 'owner' ||
      activeEmployee.role === 'inventory');

  useEffect(() => {
    if (isOpen) {
      setPinInput('');
      setErrorMessage('');
      setSuccessMessage('');
      if (authorityEmployees.length > 0 && !selectedAuthorizerId) {
        // Preselect supervisor or owner
        const defaultAuth =
          authorityEmployees.find((e) => e.role === 'supervisor') ||
          authorityEmployees.find((e) => e.role === 'owner') ||
          authorityEmployees[0];
        if (defaultAuth) {
          setSelectedAuthorizerId(defaultAuth.id);
        }
      }
      setTimeout(() => {
        if (!hasDirectAuthority && pinInputRef.current) {
          pinInputRef.current.focus();
        }
      }, 100);
    }
  }, [isOpen, hasDirectAuthority]);

  if (!isOpen) return null;

  // Direct approval if active user is already supervisor/owner/inventory
  const handleDirectAddProduct = () => {
    if (!activeEmployee) return;
    onAuthorizeSuccess(barcode, {
      authorizedBy: activeEmployee.name,
      authorizerRole: activeEmployee.roleTitle || activeEmployee.role,
    });
  };

  // Verify PIN for supervisor/owner authorization
  const handleVerifyPin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const pin = pinInput.trim();

    if (!pin) {
      setErrorMessage('Silakan masukkan PIN Otoritas Supervisor / Owner.');
      return;
    }

    // Emergency master PIN 9999 or match selected/any authority employee PIN
    let matchedAuthorizer: Employee | undefined;

    if (pin === '9999') {
      matchedAuthorizer =
        authorityEmployees.find((e) => e.role === 'owner') ||
        authorityEmployees[0] || {
          id: 'master-owner',
          employeeCode: 'OWNER-01',
          name: 'Pemilik Toko (Master Owner)',
          role: 'owner' as EmployeeRole,
          roleTitle: 'Pemilik Toko (Master Owner)',
          pin: '9999',
          avatar: 'OW',
          avatarColor: 'bg-indigo-600',
          isActive: true,
          assignedShift: 'Master Access',
          registeredAt: new Date().toISOString(),
        };
    } else if (selectedAuthorizerId) {
      const selected = authorityEmployees.find((e) => e.id === selectedAuthorizerId);
      if (selected && selected.pin === pin) {
        matchedAuthorizer = selected;
      } else {
        // Check if entered PIN matches any other authority employee
        const otherMatch = authorityEmployees.find((e) => e.pin === pin);
        if (otherMatch) {
          matchedAuthorizer = otherMatch;
        }
      }
    } else {
      matchedAuthorizer = authorityEmployees.find((e) => e.pin === pin);
    }

    if (matchedAuthorizer) {
      setErrorMessage('');
      setSuccessMessage(`Otorisasi Berhasil! Disetujui oleh ${matchedAuthorizer.name} (${matchedAuthorizer.roleTitle || matchedAuthorizer.role}).`);
      setTimeout(() => {
        onAuthorizeSuccess(barcode, {
          authorizedBy: matchedAuthorizer!.name,
          authorizerRole: matchedAuthorizer!.roleTitle || matchedAuthorizer!.role,
        });
      }, 350);
    } else {
      // Check if this PIN belongs to a regular cashier
      const cashierMatch = employees.find((e) => e.role === 'cashier' && e.pin === pin);
      if (cashierMatch) {
        setErrorMessage(
          `PIN milik "${cashierMatch.name}" (Kasir). Kasir tidak memiliki wewenang untuk otorisasi tambah produk baru!`
        );
      } else {
        setErrorMessage('PIN salah atau akun tidak memiliki wewenang Supervisor / Owner.');
      }
      setPinInput('');
    }
  };

  const handleKeypadPress = (digit: string) => {
    if (pinInput.length >= 6) return;
    setPinInput((prev) => prev + digit);
    setErrorMessage('');
  };

  const handleKeypadBackspace = () => {
    setPinInput((prev) => prev.slice(0, -1));
    setErrorMessage('');
  };

  const handleKeypadClear = () => {
    setPinInput('');
    setErrorMessage('');
  };

  return (
    <div
      id="unregistered-barcode-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="unregistered-barcode-modal-container"
        className="relative w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-amber-500/10 dark:bg-amber-950/30">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20">
              <ScanBarcode className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Barcode Belum Terdaftar
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-amber-200 dark:bg-amber-900/60 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-700/50">
                  Tidak Ada di Master
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Barang belum tercatat di database master produk toko
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4">
          {/* Scanned Barcode Display Card */}
          <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                Kode Barcode Yang Dipindai
              </span>
              <span className="font-mono font-black text-lg text-slate-900 dark:text-emerald-400 tracking-wider">
                {barcode || '-'}
              </span>
            </div>
            <div className="text-right">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block">Status Pencarian</span>
              <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-600 dark:text-rose-400">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>0 Hasil</span>
              </span>
            </div>
          </div>

          {/* AUTHORITY SECTION */}
          {hasDirectAuthority ? (
            /* Scenario A: User ALREADY has higher authority (Supervisor, Owner, or Inventory) */
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-emerald-600 text-white shrink-0 mt-0.5">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-emerald-900 dark:text-emerald-300 flex items-center gap-2">
                      <span>Otoritas Dikonfirmasi: Akses Penuh</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-200 dark:bg-emerald-900 text-emerald-900 dark:text-emerald-200 font-extrabold uppercase">
                        {activeEmployee?.roleTitle || activeEmployee?.role}
                      </span>
                    </h4>
                    <p className="text-xs text-emerald-800 dark:text-emerald-400 mt-1 leading-relaxed">
                      Anda sedang aktif login sebagai <strong>{activeEmployee?.name}</strong>. Anda memiliki wewenang untuk langsung mendaftarkan produk ini ke katalog toko tanpa perlu otorisasi tambahan.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-2.5 px-4 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-xs"
                >
                  Batalkan
                </button>
                <button
                  type="button"
                  id="btn-confirm-add-unregistered-product"
                  onClick={handleDirectAddProduct}
                  className="flex-2 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-all shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 text-xs"
                >
                  <Plus className="w-4 h-4" />
                  <span>Tambah Produk Sekarang</span>
                </button>
              </div>
            </div>
          ) : (
            /* Scenario B: User is CASHIER -> Require Supervisor/Owner authorization */
            <div className="space-y-4 animate-in fade-in duration-200">
              {/* Cashier Notice Banner */}
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 flex items-start gap-2.5">
                <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div className="text-xs leading-relaxed">
                  <span className="font-bold">Wewenang Kasir Terbatas:</span> Kasir frontliner tidak dapat mendaftarkan produk baru secara mandiri. Mintalah <strong>Supervisor</strong>, <strong>Kepala Toko</strong>, atau <strong>Owner</strong> untuk memasukkan PIN otorisasi di bawah ini.
                </div>
              </div>

              {/* Authorizer Select Box */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Pilih Pejabat yang Memberi Otorisasi:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {authorityEmployees.map((authEmp) => {
                    const isSelected = selectedAuthorizerId === authEmp.id;
                    return (
                      <button
                        key={authEmp.id}
                        type="button"
                        onClick={() => {
                          setSelectedAuthorizerId(authEmp.id);
                          setErrorMessage('');
                        }}
                        className={`p-2.5 rounded-xl border text-left flex items-center gap-2.5 transition-all ${
                          isSelected
                            ? 'border-purple-500 bg-purple-500/10 text-purple-900 dark:text-purple-200 shadow-sm'
                            : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <div
                          className={`w-7 h-7 rounded-lg ${authEmp.avatarColor || 'bg-purple-600'} text-white flex items-center justify-center font-bold text-xs shrink-0`}
                        >
                          {authEmp.avatar}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-bold text-xs truncate">{authEmp.name}</div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                            {authEmp.roleTitle}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* PIN Input Form */}
              <form onSubmit={handleVerifyPin} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Masukkan PIN Otoritas (4-Digit):
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <KeyRound className="w-4 h-4" />
                    </div>
                    <input
                      ref={pinInputRef}
                      type={showPin ? 'text' : 'password'}
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={6}
                      value={pinInput}
                      onChange={(e) => {
                        setPinInput(e.target.value.replace(/\D/g, ''));
                        setErrorMessage('');
                      }}
                      placeholder="••••"
                      className="w-full pl-9 pr-10 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-mono text-center tracking-[0.4em] font-black text-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPin(!showPin)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Quick Keypad for Touch Screen POS */}
                <div className="grid grid-cols-3 gap-1.5 pt-1">
                  {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '⌫'].map((k) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => {
                        if (k === 'C') handleKeypadClear();
                        else if (k === '⌫') handleKeypadBackspace();
                        else handleKeypadPress(k);
                      }}
                      className="py-2.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 font-bold text-sm text-slate-800 dark:text-slate-200 transition-colors active:scale-95"
                    >
                      {k}
                    </button>
                  ))}
                </div>

                {/* Error Message */}
                {errorMessage && (
                  <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-400 text-xs flex items-center gap-2 animate-in fade-in">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                {/* Success Message */}
                {successMessage && (
                  <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 text-xs flex items-center gap-2 animate-in fade-in">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span className="font-bold">{successMessage}</span>
                  </div>
                )}


                {/* Action Buttons */}
                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 py-2.5 px-4 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-xs"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    id="btn-verify-supervisor-pin"
                    className="flex-2 py-2.5 px-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold transition-all shadow-lg shadow-purple-600/25 flex items-center justify-center gap-2 text-xs"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>Verifikasi &amp; Tambah Produk</span>
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

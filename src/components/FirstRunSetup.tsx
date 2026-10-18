import React, { useState } from 'react';
import { usePOS } from '../context/POSContext';

/**
 * Layar pendaftaran pertama. Muncul pada instalasi baru (belum ada karyawan):
 * Owner mengisi namanya sendiri dan PIN pilihannya, tanpa akun contoh atau PIN bawaan.
 */
export const FirstRunSetup: React.FC = () => {
  const { completeFirstRunSetup } = usePOS();
  const [storeName, setStoreName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [pin, setPin] = useState('');
  const [pinConfirm, setPinConfirm] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin !== pinConfirm) {
      setError('Konfirmasi PIN tidak sama.');
      return;
    }
    const res = completeFirstRunSetup({ ownerName, pin, storeName, address, phone });
    if (!res.success) setError(res.message);
  };

  const inputClass =
    'w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500';

  return (
    <div data-no-escape aria-label="Pendaftaran Owner" className="fixed inset-0 z-[200] bg-slate-100 dark:bg-slate-950 flex items-center justify-center p-4 overflow-y-auto">
      <form
        data-testid="first-run-setup"
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl p-6 space-y-4"
      >
        <div>
          <h1 className="text-lg font-bold text-slate-900 dark:text-white">Selamat datang di aplikasi kasir</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Isi data toko dan buat akun Pemilik Toko (Owner). Data toko tampil di struk dan bisa diubah kapan saja di
            Pengaturan. Karyawan lain ditambahkan setelah ini lewat menu Kelola Karyawan.
          </p>
        </div>

        <label className="block space-y-1">
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Nama Toko</span>
          <input
            className={inputClass}
            required
            autoFocus
            data-testid="setup-store" value={storeName}
            onChange={(e) => setStoreName(e.target.value)}
            placeholder="Mis. Toko Berkah Jaya"
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="block space-y-1">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Alamat (opsional)</span>
            <input className={inputClass} data-testid="setup-address" value={address} onChange={(e) => setAddress(e.target.value)} />
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Telepon (opsional)</span>
            <input className={inputClass} data-testid="setup-phone" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </label>
        </div>

        <label className="block space-y-1">
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Nama Owner</span>
          <input
            className={inputClass}
            required
            data-testid="setup-owner" value={ownerName}
            onChange={(e) => setOwnerName(e.target.value)}
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="block space-y-1">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">PIN (4-6 angka)</span>
            <input
              className={`${inputClass} font-mono tracking-widest`}
              type="password"
              inputMode="numeric"
              autoComplete="new-password"
              maxLength={6}
              required
              data-testid="setup-pin" value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
            />
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Ulangi PIN</span>
            <input
              className={`${inputClass} font-mono tracking-widest`}
              type="password"
              inputMode="numeric"
              autoComplete="new-password"
              maxLength={6}
              required
              data-testid="setup-pin-confirm" value={pinConfirm}
              onChange={(e) => setPinConfirm(e.target.value.replace(/\D/g, ''))}
            />
          </label>
        </div>
        <p className="text-[11px] text-slate-500 dark:text-slate-400">
          Jangan pakai PIN yang mudah ditebak (1234, 0000, tanggal lahir). PIN ini dibutuhkan untuk fitur khusus Owner.
        </p>

        {error && (
          <p role="alert" className="text-xs font-semibold text-rose-600 dark:text-rose-400">
            {error}
          </p>
        )}

        <button
          type="submit"
          data-testid="setup-submit"
          className="w-full py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-bold cursor-pointer"
        >
          Buat Akun Owner &amp; Mulai
        </button>
      </form>
    </div>
  );
};

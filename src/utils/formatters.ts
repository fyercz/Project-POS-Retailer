import { CurrencyType } from '../types';

export const formatCurrency = (amount: number, _currency: string = 'IDR'): string => {
  return `Rp ${Math.round(amount).toLocaleString('id-ID')}`;
};

/** Sama dengan formatCurrency (dipertahankan agar pemanggil lama tetap jalan) */
export const formatRupiah = (amount: number): string => formatCurrency(amount);

export const formatNumber = (val: number): string => {
  return new Intl.NumberFormat().format(val);
};

/**
 * Nomor invoice: INV-<tanggal lokal>-<jam:menit:detik>-<5 karakter acak>, mis. INV-20261018-143205-K7QX9.
 * Versi lama memakai tanggal UTC (salah tanggal pukul 00.00-06.59 WIB) dan hanya 9.000 angka acak
 * per hari, sehingga nomor kembar sangat mungkin terjadi di toko yang ramai.
 */
export const generateInvoiceNumber = (): string => {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const dateStr = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
  const timeStr = `${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // tanpa 0/O dan 1/I agar mudah dibaca
  let rand = '';
  const bytes = new Uint32Array(5);
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') crypto.getRandomValues(bytes);
  else for (let i = 0; i < 5; i++) bytes[i] = Math.floor(Math.random() * 2 ** 32);
  for (let i = 0; i < 5; i++) rand += alphabet[bytes[i] % alphabet.length];
  return `INV-${dateStr}-${timeStr}-${rand}`;
};

/** Tanggal lokal YYYY-MM-DD (bukan UTC). Untuk Indonesia, toISOString() salah tanggal sebelum pukul 07.00 WIB. */
export const toLocalDateString = (d: Date = new Date()): string => {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export const formatDate = (dateString?: string): string => {
  if (!dateString) return '-';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleString('id-ID', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateString || '-';
  }
};

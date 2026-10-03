import { CurrencyType } from '../types';

export const formatCurrency = (amount: number, _currency: string = 'IDR'): string => {
  return `Rp ${Math.round(amount).toLocaleString('id-ID')}`;
};

export const formatRupiah = (amount: number): string => {
  return `Rp ${Math.round(amount).toLocaleString('id-ID')}`;
};

export const formatNumber = (val: number): string => {
  return new Intl.NumberFormat().format(val);
};

export const generateInvoiceNumber = (): string => {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `INV-${dateStr}-${randomSuffix}`;
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

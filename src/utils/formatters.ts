import { CurrencyType } from '../types';

export const formatCurrency = (amount: number, currency: CurrencyType = 'IDR'): string => {
  if (currency === 'IDR') {
    return `Rp ${Math.round(amount).toLocaleString('id-ID')}`;
  }
  return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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
  const d = dateString ? new Date(dateString) : new Date();
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
};

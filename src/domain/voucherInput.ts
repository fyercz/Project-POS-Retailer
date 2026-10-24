/**
 * Validasi voucher yang dibuat manual oleh Owner/Supervisor (murni, teruji).
 * Dulu voucher hanya bisa dibuat lewat Promo AI: tanpa API key Gemini, toko tidak bisa membuat
 * voucher sama sekali.
 */
import type { Voucher } from '../types';

export interface VoucherInput {
  code: string;
  discountType: 'percentage' | 'fixed';
  value: number;
  minSpend: number;
  maxDiscount?: number;
  expiresAt?: string; // YYYY-MM-DD (berlaku sampai akhir hari itu)
  description?: string;
}

export function buildVoucher(input: VoucherInput, todayYmd: string): { ok: true; voucher: Voucher } | { ok: false; message: string } {
  const code = (input.code || '').toUpperCase().replace(/\s+/g, '');
  if (!/^[A-Z0-9_-]{3,20}$/.test(code)) return { ok: false, message: 'Kode voucher 3-20 karakter: huruf, angka, - atau _.' };
  const value = Math.round(Number(input.value) || 0);
  const minSpend = Math.max(0, Math.round(Number(input.minSpend) || 0));
  if (input.discountType === 'percentage') {
    if (value < 1 || value > 90) return { ok: false, message: 'Diskon persen harus 1-90%.' };
  } else if (input.discountType === 'fixed') {
    if (value < 100) return { ok: false, message: 'Potongan nominal minimal Rp 100.' };
    if (minSpend > 0 && value >= minSpend) return { ok: false, message: 'Potongan harus lebih kecil dari minimal belanja.' };
  } else {
    return { ok: false, message: 'Jenis potongan tidak valid.' };
  }
  const maxDiscount = input.discountType === 'percentage' && Number(input.maxDiscount) > 0 ? Math.round(Number(input.maxDiscount)) : undefined;
  let expiresAt: string | undefined;
  if (input.expiresAt) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(input.expiresAt)) return { ok: false, message: 'Tanggal berlaku tidak valid.' };
    if (input.expiresAt < todayYmd) return { ok: false, message: 'Tanggal berlaku sudah lewat.' };
    expiresAt = `${input.expiresAt}T23:59:59`;
  }
  const auto =
    input.discountType === 'percentage'
      ? `Diskon ${value}%${maxDiscount ? ` (maks. Rp ${maxDiscount.toLocaleString('id-ID')})` : ''}`
      : `Potongan Rp ${value.toLocaleString('id-ID')}`;
  return {
    ok: true,
    voucher: {
      code,
      discountType: input.discountType,
      value,
      minSpend,
      ...(maxDiscount ? { maxDiscount } : {}),
      ...(expiresAt ? { expiresAt } : {}),
      description: (input.description || '').trim() || `${auto}${minSpend ? `, min. belanja Rp ${minSpend.toLocaleString('id-ID')}` : ''}`,
    },
  };
}

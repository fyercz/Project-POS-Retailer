/**
 * Perhitungan total belanja di kasir (murni, tanpa React). Dipakai POSContext.
 * Urutan potongan: voucher -> diskon member -> penukaran poin. Total tidak pernah negatif.
 */
import type { CustomerDiscount, Voucher, MemberTier } from '../types';

export interface TotalsCartLine {
  product: { id: string };
  totalPrice: number;
  isPointsEligible?: boolean;
}

export function calcSubtotal(cart: TotalsCartLine[]): number {
  return cart.reduce((sum, item) => sum + item.totalPrice, 0);
}

/** Potongan voucher; 0 bila belum memenuhi minimal belanja. Persentase dibatasi maxDiscount. */
export function calcVoucherDiscount(voucher: Voucher | null | undefined, subtotal: number): number {
  if (!voucher || subtotal < voucher.minSpend) return 0;
  if (voucher.discountType === 'percentage') {
    const disc = (subtotal * voucher.value) / 100;
    return voucher.maxDiscount && disc > voucher.maxDiscount ? voucher.maxDiscount : disc;
  }
  return voucher.value;
}

/** Diskon khusus member: per item (persen dari baris barang) atau per keranjang. */
export function calcCustomerDiscount(
  discount: CustomerDiscount | null | undefined,
  cart: TotalsCartLine[],
  subtotal: number
): number {
  if (!discount) return 0;
  if (discount.targetType === 'item' && discount.targetProductId) {
    const targetItem = cart.find((i) => i.product.id === discount.targetProductId);
    if (!targetItem) return 0;
    return Math.round((targetItem.totalPrice * discount.value) / 100);
  }
  if (discount.minSpend && subtotal < discount.minSpend) return 0;
  if (discount.type === 'percentage') return Math.round((subtotal * discount.value) / 100);
  return Math.min(discount.value, subtotal);
}

/** Sisa tagihan setelah voucher & diskon member (dasar penukaran poin). */
export function calcRemainingBill(subtotal: number, voucherDiscount: number, customerDiscount: number): number {
  return Math.max(0, subtotal - voucherDiscount - customerDiscount);
}

/** Poin maksimal yang boleh ditukar: dibatasi saldo poin member DAN sisa tagihan. */
export function calcMaxRedeemablePoints(
  hasCustomer: boolean,
  customerPoints: number,
  remainingBill: number,
  pointRedemptionRate: number
): number {
  if (!hasCustomer || customerPoints <= 0) return 0;
  return Math.min(customerPoints, Math.floor(remainingBill / pointRedemptionRate));
}

export function calcPointsDiscount(
  hasCustomer: boolean,
  effectivePointsToRedeem: number,
  pointRedemptionRate: number,
  remainingBill: number
): number {
  if (!hasCustomer || effectivePointsToRedeem <= 0) return 0;
  return Math.min(effectivePointsToRedeem * pointRedemptionRate, remainingBill);
}

export function calcFinalTotal(subtotal: number, totalDiscount: number): number {
  return Math.max(0, Math.round(subtotal - totalDiscount));
}

/** Nilai belanja barang berpoin (margin cukup), sebelum potongan. */
export function calcPointsEligibleSpend(cart: TotalsCartLine[]): number {
  return cart.filter((item) => item.isPointsEligible).reduce((sum, item) => sum + item.totalPrice, 0);
}

/** Porsi barang berpoin setelah potongan (proporsional terhadap total akhir). */
export function calcEffectiveEligibleSpend(pointsEligibleSpend: number, subtotal: number, finalTotal: number): number {
  return subtotal > 0 ? Math.max(0, (pointsEligibleSpend / subtotal) * finalTotal) : 0;
}

export function tierPointsMultiplier(tier: MemberTier | string | undefined | null): number {
  switch (tier) {
    case 'Platinum':
      return 2;
    case 'Gold':
      return 1.5;
    case 'Silver':
      return 1.2;
    default:
      return 1;
  }
}

/** Poin yang didapat: 1 poin per pointsRatio dari belanja berpoin, dikali pengali tier. */
export function calcPointsEarned(effectiveEligibleSpend: number, pointsRatio: number, multiplier: number): number {
  const base = Math.floor(effectiveEligibleSpend / (pointsRatio || 10000));
  return Math.floor(base * multiplier);
}

export interface CartTotalsInput {
  cart: TotalsCartLine[];
  voucher?: Voucher | null;
  customerDiscount?: CustomerDiscount | null;
  customer?: { points: number; tier?: MemberTier | string } | null;
  pointsToRedeem?: number;
  pointRedemptionRate?: number;
  pointsRatio?: number;
}

/** Semua angka di atas sekaligus (untuk tes & ringkasan). */
export function computeCartTotals(input: CartTotalsInput) {
  const rate = input.pointRedemptionRate || 100;
  const hasCustomer = Boolean(input.customer);
  const subtotal = calcSubtotal(input.cart);
  const voucherDiscount = calcVoucherDiscount(input.voucher, subtotal);
  const customerDiscountAmount = calcCustomerDiscount(input.customerDiscount, input.cart, subtotal);
  const remainingBill = calcRemainingBill(subtotal, voucherDiscount, customerDiscountAmount);
  const maxRedeemablePoints = calcMaxRedeemablePoints(hasCustomer, input.customer?.points || 0, remainingBill, rate);
  const effectivePointsToRedeem = Math.min(input.pointsToRedeem || 0, maxRedeemablePoints);
  const pointsDiscount = calcPointsDiscount(hasCustomer, effectivePointsToRedeem, rate, remainingBill);
  const totalDiscount = voucherDiscount + pointsDiscount + customerDiscountAmount;
  const finalTotal = calcFinalTotal(subtotal, totalDiscount);
  const pointsEligibleSpend = calcPointsEligibleSpend(input.cart);
  const effectiveEligibleSpend = calcEffectiveEligibleSpend(pointsEligibleSpend, subtotal, finalTotal);
  const pointsEarned = calcPointsEarned(
    effectiveEligibleSpend,
    input.pointsRatio || 10000,
    hasCustomer ? tierPointsMultiplier(input.customer?.tier) : 1
  );
  return {
    subtotal,
    voucherDiscount,
    customerDiscountAmount,
    maxRedeemablePoints,
    effectivePointsToRedeem,
    pointsDiscount,
    totalDiscount,
    finalTotal,
    pointsEligibleSpend,
    effectiveEligibleSpend,
    pointsEarned,
  };
}

/**
 * Buku kas toko di luar penjualan (murni, teruji) — mengikuti laporan kas manual toko
 * (LAP.HARI / LAP.BLN / PPOB / LABA):
 * - Kas masuk lain-lain: sewa rak, sewa tempat, jual kardus, laba PPOB -> PENDAPATAN LAIN (laba rugi)
 * - Penarikan kas oleh pemilik -> PRIVE (mengurangi kas & modal, BUKAN beban; laba tidak berubah)
 * - PPOB (pulsa/token): buku kas TERPISAH per shift (penjualan, isi saldo); hanya laba PPOB yang
 *   dicatat sebagai pendapatan lain toko.
 */
export type CashEntryKind = 'income' | 'withdrawal' | 'ppob_sale' | 'ppob_topup';
export type OtherIncomeCategory = 'sewa_rak' | 'sewa_tempat' | 'jual_kardus' | 'laba_ppob' | 'lainnya';

export interface CashEntry {
  id: string;
  date: string; // ISO
  kind: CashEntryKind;
  category?: OtherIncomeCategory; // untuk kind 'income'
  description: string;
  amount: number;
  /** Nama pihak (mis. supplier penyewa rak) */
  counterparty?: string;
  /** 'Sift 1' / 'Sift 2' (PPOB per shift) */
  shiftLabel?: string;
  recordedBy?: string;
}

export const OTHER_INCOME_LABELS: Record<OtherIncomeCategory, string> = {
  sewa_rak: 'Sewa Rak',
  sewa_tempat: 'Sewa Tempat',
  jual_kardus: 'Hasil Jual Kardus',
  laba_ppob: 'Laba PPOB',
  lainnya: 'Lain-lain',
};

export const CASH_KIND_LABELS: Record<CashEntryKind, string> = {
  income: 'Kas Masuk Lain-lain',
  withdrawal: 'Penarikan Kas',
  ppob_sale: 'Penjualan PPOB',
  ppob_topup: 'Isi Saldo PPOB',
};

export function validateCashEntry(input: Partial<CashEntry>): { ok: true; entry: Omit<CashEntry, 'id'> } | { ok: false; message: string } {
  const amount = Math.round(Number(input.amount) || 0);
  if (!input.kind || !(input.kind in CASH_KIND_LABELS)) return { ok: false, message: 'Jenis catatan tidak valid.' };
  if (amount <= 0) return { ok: false, message: 'Nominal harus lebih dari 0.' };
  if (input.kind === 'income' && !(input.category && input.category in OTHER_INCOME_LABELS)) return { ok: false, message: 'Pilih jenis kas masuk.' };
  const date = input.date && !Number.isNaN(new Date(input.date).getTime()) ? new Date(input.date).toISOString() : new Date().toISOString();
  const description =
    (input.description || '').replace(/\s+/g, ' ').trim() ||
    (input.kind === 'income' ? `${OTHER_INCOME_LABELS[input.category!]}${input.counterparty ? ` dari ${input.counterparty}` : ''}` : CASH_KIND_LABELS[input.kind]);
  return {
    ok: true,
    entry: {
      date,
      kind: input.kind,
      ...(input.kind === 'income' ? { category: input.category } : {}),
      description,
      amount,
      ...(input.counterparty?.trim() ? { counterparty: input.counterparty.trim() } : {}),
      ...(input.shiftLabel ? { shiftLabel: input.shiftLabel } : {}),
      ...(input.recordedBy ? { recordedBy: input.recordedBy } : {}),
    },
  };
}

/** Ringkasan dalam rentang waktu: pendapatan lain per jenis, penarikan, & buku PPOB. */
export function summarizeCashBook(entries: CashEntry[], startMs = 0, endMs = Number.MAX_SAFE_INTEGER) {
  const income: Record<OtherIncomeCategory, number> = { sewa_rak: 0, sewa_tempat: 0, jual_kardus: 0, laba_ppob: 0, lainnya: 0 };
  let withdrawals = 0;
  let ppobSales = 0;
  let ppobTopups = 0;
  for (const e of entries || []) {
    const t = new Date(e.date).getTime();
    if (t < startMs || t > endMs) continue;
    const a = Math.max(0, Number(e.amount) || 0);
    if (e.kind === 'income') income[e.category || 'lainnya'] += a;
    else if (e.kind === 'withdrawal') withdrawals += a;
    else if (e.kind === 'ppob_sale') ppobSales += a;
    else if (e.kind === 'ppob_topup') ppobTopups += a;
  }
  const otherIncome = Object.values(income).reduce((x, y) => x + y, 0);
  return { income, otherIncome, withdrawals, ppobSales, ppobTopups };
}

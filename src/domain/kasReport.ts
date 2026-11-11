/**
 * Laporan Kas Bulanan format toko (LAP.HARI / LAP.BLN / PPOB / LABA) dari data aplikasi (murni,
 * teruji). Mengikuti cara toko mencatat di Excel:
 * - Penjualan per shift: shift ke-1 sehari = "Sift 1" (dicatat hari itu), shift ke-2 = "Sift 2"
 *   (disetor & dicatat BESOK: "Penjualan Kasir Sift 2 Tgl 1 Oktober"). Nominal = setoran kasir
 *   (uang di laci saat tutup shift - modal awal).
 * - Pembelian tunai: "Pembelian Barang dari CHAMPION (043)"; bayar tagihan dari laci:
 *   "Bayar tagihan kpd WINGS (064)"; beban dari laci; kas masuk lain-lain; penarikan kas.
 * - Penjualan non-tunai (debit/QRIS) sebulan: satu baris "DEBIT" di hari terakhir.
 * - PPOB: buku terpisah.
 */
import type { CashEntry } from './cashBook';
import { OTHER_INCOME_LABELS } from './cashBook';

export type KasJenis =
  | 'saldo_awal'
  | 'penjualan'
  | 'pembelian'
  | 'tagihan'
  | 'beban'
  | 'kas_masuk'
  | 'penarikan'
  | 'debit';

export interface KasRow {
  uraian: string;
  debet: number;
  kredit: number;
  jenis: KasJenis;
  /** Rincian jenis (kategori beban / kas masuk) untuk rekap */
  sub?: string;
}

export interface KasDay {
  date: string; // YYYY-MM-DD
  rows: KasRow[];
}

const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const HARI = ['MINGGU', 'SENIN', 'SELASA', 'RABU', 'KAMIS', "JUM'AT", 'SABTU'];

export const ymdLocal = (iso: string | Date) => {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const dayTitle = (ymd: string) => {
  const [y, m, d] = ymd.split('-').map(Number);
  const dt = new Date(y!, m! - 1, d!);
  return `${HARI[dt.getDay()]}, ${String(d).padStart(2, '0')} ${BULAN[m! - 1]!.toUpperCase()} ${y}`;
};
const shortDate = (ymd: string) => {
  const [, m, d] = ymd.split('-').map(Number);
  return `${d} ${BULAN[m! - 1]}`;
};
const addDays = (ymd: string, n: number) => {
  const [y, m, d] = ymd.split('-').map(Number);
  return ymdLocal(new Date(y!, m! - 1, d! + n));
};

export interface KasInput {
  year: number;
  month: number; // 1-12
  openingBalance: number; // sisa saldo kas bulan lalu
  ppobOpeningBalance?: number;
  shifts: Array<{ id: string; startTime: string; endTime?: string; status?: string; startingCash?: number; cashSales?: number; cashOut?: number; actualCashEnding?: number }>;
  transactions: Array<{ status?: string; createdAt?: string; date?: string; finalTotal?: number; payment?: { method?: string }; storeCreditUsed?: number }>;
  supplierPurchases: Array<{ supplierName: string; createdAt: string; finalTotal?: number; totalAmount?: number; paymentTerms?: string; payments?: Array<{ amount: number; date: string; source?: string }> }>;
  suppliers: Array<{ name: string; code?: string }>;
  expenses: Array<{ date: string; amount: number; description: string; category: string; paymentSource?: string }>;
  cashEntries: CashEntry[];
  expenseLabel?: (category: string) => string;
}

export function buildKasBulanan(input: KasInput) {
  const prefix = `${input.year}-${String(input.month).padStart(2, '0')}`;
  const inMonth = (ymd: string) => ymd.startsWith(prefix);
  const byDay = new Map<string, KasRow[]>();
  const push = (ymd: string, row: KasRow) => {
    if (!inMonth(ymd)) return;
    if (!byDay.has(ymd)) byDay.set(ymd, []);
    byDay.get(ymd)!.push(row);
  };
  const codeOf = (name: string) => {
    const s = input.suppliers.find((x) => x.name.trim().toLowerCase() === name.trim().toLowerCase());
    return s?.code ? ` (${s.code})` : '';
  };

  // Shift: nomor per hari (urut waktu buka); Sift >= 2 dicatat esok hari
  const closed = input.shifts.filter((s) => s.status !== 'active' && (s.endTime || s.actualCashEnding !== undefined));
  const shiftsByDay = new Map<string, typeof closed>();
  for (const s of closed) {
    const d = ymdLocal(s.startTime);
    if (!shiftsByDay.has(d)) shiftsByDay.set(d, []);
    shiftsByDay.get(d)!.push(s);
  }
  for (const [d, list] of shiftsByDay) {
    list.sort((a, b) => a.startTime.localeCompare(b.startTime));
    list.forEach((s, i) => {
      const n = i + 1;
      const start = Number(s.startingCash) || 0;
      const ending = s.actualCashEnding !== undefined ? Number(s.actualCashEnding) : start + (Number(s.cashSales) || 0) - (Number(s.cashOut) || 0);
      const setoran = Math.round(ending - start);
      if (setoran === 0) return;
      if (n === 1) push(d, { uraian: `Penjualan Kasir Sift 1`, debet: setoran, kredit: 0, jenis: 'penjualan' });
      else push(addDays(d, 1), { uraian: `Penjualan Kasir Sift ${n} Tgl ${shortDate(d)}`, debet: setoran, kredit: 0, jenis: 'penjualan' });
    });
  }

  for (const po of input.supplierPurchases) {
    const total = Math.round(Number(po.finalTotal ?? po.totalAmount) || 0);
    if (/tunai|cash/i.test(po.paymentTerms || 'tunai') && total > 0)
      push(ymdLocal(po.createdAt), { uraian: `Pembelian Barang dari ${po.supplierName}${codeOf(po.supplierName)}`, debet: 0, kredit: total, jenis: 'pembelian' });
    for (const p of po.payments || []) {
      if (p.source && p.source !== 'cash_drawer') continue; // transfer bank tidak keluar dari kas toko
      push(ymdLocal(p.date), { uraian: `Bayar tagihan kpd ${po.supplierName}${codeOf(po.supplierName)}`, debet: 0, kredit: Math.round(Number(p.amount) || 0), jenis: 'tagihan' });
    }
  }

  for (const e of input.expenses) {
    if (e.paymentSource && e.paymentSource !== 'cash_drawer') continue;
    const label = input.expenseLabel ? input.expenseLabel(e.category) : e.category;
    push(ymdLocal(e.date), { uraian: e.description || label, debet: 0, kredit: Math.round(Number(e.amount) || 0), jenis: 'beban', sub: label });
  }

  for (const c of input.cashEntries) {
    if (c.kind === 'income') {
      const label = OTHER_INCOME_LABELS[c.category || 'lainnya'];
      const uraian = c.category === 'sewa_rak' ? `Terima Sewa Rak Dari ${c.counterparty || '-'}` : c.description || label;
      push(ymdLocal(c.date), { uraian, debet: Math.round(c.amount), kredit: 0, jenis: 'kas_masuk', sub: label });
    } else if (c.kind === 'withdrawal') push(ymdLocal(c.date), { uraian: c.description || 'PENARIKAN KAS', debet: 0, kredit: Math.round(c.amount), jenis: 'penarikan' });
  }

  // Penjualan non-tunai sebulan: satu baris DEBIT di hari terakhir yang ada aktivitas
  const nonCash = input.transactions
    .filter((t) => t.status !== 'void' && t.payment?.method && t.payment.method !== 'cash' && inMonth(ymdLocal(t.createdAt || t.date || '')))
    .reduce((a, t) => a + (Number(t.finalTotal) || 0) - (Number(t.storeCreditUsed) || 0), 0);
  const daysSorted = [...byDay.keys()].sort();
  if (nonCash > 0) {
    const last = daysSorted[daysSorted.length - 1] || `${prefix}-01`;
    push(last, { uraian: 'DEBIT (penjualan non-tunai bulan ini)', debet: Math.round(nonCash), kredit: 0, jenis: 'debit' });
  }

  const order: Record<KasJenis, number> = { saldo_awal: 0, penjualan: 1, pembelian: 2, tagihan: 3, beban: 4, kas_masuk: 5, penarikan: 6, debit: 7 };
  let saldo = Math.round(Number(input.openingBalance) || 0);
  const days: Array<KasDay & { title: string; opening: number; closing: number }> = [];
  [...byDay.keys()].sort().forEach((d, idx) => {
    const rows = byDay.get(d)!.sort((a, b) => order[a.jenis] - order[b.jenis]);
    const opening = saldo;
    const prev = idx === 0 ? `Sisa Saldo Bulan ${BULAN[(input.month + 10) % 12]}` : `Sisa Saldo Tgl ${shortDate(addDays(d, -1))}`;
    const all: KasRow[] = [{ uraian: prev, debet: opening, kredit: 0, jenis: 'saldo_awal' }, ...rows];
    saldo = opening + rows.reduce((a, r) => a + r.debet - r.kredit, 0);
    days.push({ date: d, title: `LAPORAN KAS HARI ${dayTitle(d)}`, rows: all, opening, closing: saldo });
  });

  // PPOB: buku terpisah
  let ppobSaldo = Math.round(Number(input.ppobOpeningBalance) || 0);
  const ppobRows = input.cashEntries
    .filter((c) => (c.kind === 'ppob_sale' || c.kind === 'ppob_topup') && inMonth(ymdLocal(c.date)))
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((c) => {
      const debet = c.kind === 'ppob_sale' ? Math.round(c.amount) : 0;
      const kredit = c.kind === 'ppob_topup' ? Math.round(c.amount) : 0;
      ppobSaldo += debet - kredit;
      return { date: ymdLocal(c.date), uraian: c.kind === 'ppob_sale' ? `Penjualan ${c.shiftLabel || ''}`.trim() : 'SALDO (isi saldo PPOB)', debet, kredit, saldo: ppobSaldo };
    });

  return { days, ppobRows, closingBalance: saldo, monthName: BULAN[input.month - 1]!, nonCash: Math.round(nonCash) };
}

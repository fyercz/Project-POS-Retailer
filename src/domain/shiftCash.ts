/**
 * Logika kas shift (murni, tanpa React). Dipakai POSContext & layar Shift.
 * Kas yang seharusnya ada di laci = modal awal + penjualan tunai - uang keluar
 * (retur tunai, void tunai, pengeluaran dari laci, pembayaran supplier dari laci).
 */
import type { EmployeeRole, ShiftSummary } from '../types';

export interface ShiftOwner {
  id: string;
  name: string;
  role: EmployeeRole;
}

export function newShift(owner: ShiftOwner | null | undefined, startingCash = 0, now: Date = new Date()): ShiftSummary {
  return {
    id: `shift-${now.getTime()}`,
    employeeId: owner?.id || '',
    employeeName: owner?.name || 'Kasir',
    role: owner?.role || 'cashier',
    startTime: now.toISOString(),
    startingCash: Math.max(0, Math.round(startingCash) || 0),
    cashOut: 0,
    totalSales: 0,
    totalTransactions: 0,
    cashSales: 0,
    nonCashSales: 0,
    status: 'active',
  };
}

export function expectedCashOf(shift: Pick<ShiftSummary, 'startingCash' | 'cashSales' | 'cashOut'> | null | undefined): number {
  if (!shift) return 0;
  return (Number(shift.startingCash) || 0) + (Number(shift.cashSales) || 0) - (Number(shift.cashOut) || 0);
}

/** Catat penjualan ke shift. */
export function applySaleToShift(shift: ShiftSummary, finalTotal: number, isCash: boolean): ShiftSummary {
  return {
    ...shift,
    totalSales: shift.totalSales + finalTotal,
    totalTransactions: shift.totalTransactions + 1,
    cashSales: isCash ? shift.cashSales + finalTotal : shift.cashSales,
    nonCashSales: !isCash ? shift.nonCashSales + finalTotal : shift.nonCashSales,
  };
}

/** Catat uang keluar dari laci (negatif = pembatalan uang keluar). Tidak pernah di bawah 0. */
export function applyCashOut(shift: ShiftSummary, amount: number): ShiftSummary {
  if (!Number.isFinite(amount) || amount === 0) return shift;
  return { ...shift, cashOut: Math.max(0, (shift.cashOut || 0) + amount) };
}

/**
 * Siapa yang boleh mengubah modal awal: Supervisor/Owner kapan saja; kasir hanya sebelum
 * transaksi pertama (mengecilkan modal di tengah shift bisa menyembunyikan kekurangan kas).
 */
export function canEditStartingCash(role: EmployeeRole | undefined, shift: ShiftSummary | null | undefined): boolean {
  if (!shift) return false;
  if (role === 'owner' || role === 'supervisor') return true;
  return (shift.totalTransactions || 0) === 0;
}

/** Tutup shift: hitung selisih terhadap kas yang seharusnya ada. */
export function closeShift(
  current: ShiftSummary,
  actualCashEnding: number,
  notes?: string,
  now: Date = new Date()
): ShiftSummary {
  const difference = actualCashEnding - expectedCashOf(current);
  return {
    ...current,
    endTime: now.toISOString(),
    actualCashEnding,
    difference,
    status: 'closed',
    notes,
  };
}

/**
 * Sisa hari sampai tanggal kedaluwarsa (murni). Satu aturan untuk seluruh aplikasi.
 * - Tanggal "YYYY-MM-DD" diartikan sebagai tanggal KALENDER LOKAL (bukan tengah malam UTC;
 *   new Date("2026-10-18") di WIB = 07.00, sehingga hitungan bisa selisih sehari).
 * - Dibandingkan per hari kalender: hari ini = 0, besok = 1, kemarin = -1.
 */
export function parseLocalDate(dateStr: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateStr.trim());
  const d = m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
}

export function daysUntil(dateStr: string | undefined | null, now: Date = new Date()): number | null {
  if (!dateStr) return null;
  const target = parseLocalDate(dateStr);
  if (!target) return null;
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const day = new Date(target.getFullYear(), target.getMonth(), target.getDate());
  return Math.round((day.getTime() - today.getTime()) / 86400000);
}

export type DateFilterPreset = 'all' | 'today' | 'yesterday' | 'last7days' | 'thismonth' | 'custom';

export interface DateRangeState {
  preset: DateFilterPreset;
  startDate: string; // YYYY-MM-DD or empty
  endDate: string;   // YYYY-MM-DD or empty
}

/**
 * Format a Date object to YYYY-MM-DD in local time
 */
export function toLocalYMD(d: Date = new Date()): string {
  if (!d || isNaN(d.getTime())) return '';
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Get start and end date for a preset in local time
 */
export function getPresetDateRange(preset: DateFilterPreset): { startDate: string; endDate: string } {
  const now = new Date();
  const todayStr = toLocalYMD(now);

  switch (preset) {
    case 'today':
      return { startDate: todayStr, endDate: todayStr };

    case 'yesterday': {
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      const yStr = toLocalYMD(yesterday);
      return { startDate: yStr, endDate: yStr };
    }

    case 'last7days': {
      const start = new Date(now);
      start.setDate(start.getDate() - 6);
      return { startDate: toLocalYMD(start), endDate: todayStr };
    }

    case 'thismonth': {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      return { startDate: toLocalYMD(start), endDate: todayStr };
    }

    case 'all':
    default:
      return { startDate: '', endDate: '' };
  }
}

/**
 * Check whether an item date string falls within [startDate, endDate] (inclusive).
 * Compares year, month, and day in local time.
 */
export function isDateWithinFilter(
  itemDateStr?: string,
  startDate?: string,
  endDate?: string
): boolean {
  if (!itemDateStr) return true;
  if (!startDate && !endDate) return true;

  const d = new Date(itemDateStr);
  if (isNaN(d.getTime())) return true;

  // Local calendar midnight of item
  const itemYear = d.getFullYear();
  const itemMonth = d.getMonth();
  const itemDay = d.getDate();
  const itemMidnight = new Date(itemYear, itemMonth, itemDay, 0, 0, 0, 0).getTime();

  if (startDate) {
    const parts = startDate.split('-').map(Number);
    if (parts.length === 3 && !parts.some(isNaN)) {
      const [sy, sm, sd] = parts;
      const startMidnight = new Date(sy, sm - 1, sd, 0, 0, 0, 0).getTime();
      if (itemMidnight < startMidnight) return false;
    }
  }

  if (endDate) {
    const parts = endDate.split('-').map(Number);
    if (parts.length === 3 && !parts.some(isNaN)) {
      const [ey, em, ed] = parts;
      const endMidnight = new Date(ey, em - 1, ed, 0, 0, 0, 0).getTime();
      if (itemMidnight > endMidnight) return false;
    }
  }

  return true;
}

/**
 * Format a readable period label for display
 */
export function formatPeriodLabel(preset: DateFilterPreset, startDate: string, endDate: string): string {
  try {
    const todayStr = toLocalYMD(new Date());

    if (preset === 'today' || (startDate === todayStr && endDate === todayStr)) {
      const d = new Date();
      return `Hari Ini (${d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })})`;
    }

    if (preset === 'yesterday') {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      return `Kemarin (${yesterday.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })})`;
    }

    if (preset === 'last7days') {
      return '7 Hari Terakhir';
    }

    if (preset === 'thismonth') {
      const now = new Date();
      return `Bulan Ini (${now.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })})`;
    }

    if (startDate && endDate) {
      if (startDate === endDate) {
        const parts = startDate.split('-').map(Number);
        if (parts.length === 3 && !parts.some(isNaN)) {
          const [y, m, d] = parts;
          const dt = new Date(y, m - 1, d);
          if (!isNaN(dt.getTime())) {
            return dt.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
          }
        }
        return startDate;
      }
      const sParts = startDate.split('-').map(Number);
      const eParts = endDate.split('-').map(Number);
      if (sParts.length === 3 && !sParts.some(isNaN) && eParts.length === 3 && !eParts.some(isNaN)) {
        const [sy, sm, sd] = sParts;
        const [ey, em, ed] = eParts;
        const sDt = new Date(sy, sm - 1, sd);
        const eDt = new Date(ey, em - 1, ed);
        if (!isNaN(sDt.getTime()) && !isNaN(eDt.getTime())) {
          return `${sDt.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} - ${eDt.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}`;
        }
      }
      return `${startDate} - ${endDate}`;
    }

    if (startDate) {
      return `Mulai ${startDate}`;
    }

    if (endDate) {
      return `Sampai ${endDate}`;
    }

    return 'Semua Waktu';
  } catch {
    return 'Semua Waktu';
  }
}

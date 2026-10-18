/**
 * Tanggal hari raya yang BERGESER setiap tahun (kalender Hijriah, ~11 hari lebih awal per tahun).
 * Dulu kalender memakai tanggal tetap (Idul Fitri 20/21 Maret, Idul Adha 27 Mei) yang hanya benar
 * untuk 2026.
 *
 * official: true  = ditetapkan pemerintah (sidang isbat / SKB 3 Menteri)
 * official: false = PERKIRAAN astronomis (+/- 1 hari); tampil berlabel "perkiraan" di aplikasi.
 * Perbarui tabel ini setiap SKB libur nasional tahun berikutnya terbit (biasanya September).
 */
export type MovableHoliday = 'idul_fitri' | 'idul_adha';

export interface MovableHolidayDate {
  date: string; // YYYY-MM-DD
  official: boolean;
}

export const MOVABLE_HOLIDAYS: Record<MovableHoliday, Record<number, MovableHolidayDate>> = {
  idul_fitri: {
    2025: { date: '2025-03-31', official: true },
    2026: { date: '2026-03-21', official: true }, // Kemenag: Sabtu, 21 Maret 2026
    2027: { date: '2027-03-10', official: true }, // SKB 3 Menteri 2027: 10-11 Maret
    2028: { date: '2028-02-27', official: false },
    2029: { date: '2029-02-15', official: false },
    2030: { date: '2030-02-05', official: false },
  },
  idul_adha: {
    2025: { date: '2025-06-06', official: true },
    2026: { date: '2026-05-27', official: true }, // Sidang isbat: Rabu, 27 Mei 2026
    2027: { date: '2027-05-17', official: true }, // SKB 3 Menteri 2027
    2028: { date: '2028-05-05', official: false },
    2029: { date: '2029-04-24', official: false },
    2030: { date: '2030-04-13', official: false },
  },
};

const toYMD = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const parseYMD = (s: string): Date => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y!, m! - 1, d!);
};

/** Tanggal hari raya (+ geser hari, mis. -1 = H-1) untuk tahun tertentu; null bila belum ada data. */
export function movableDateFor(holiday: MovableHoliday, year: number, offsetDays = 0): MovableHolidayDate | null {
  const entry = MOVABLE_HOLIDAYS[holiday][year];
  if (!entry) return null;
  const d = parseYMD(entry.date);
  d.setDate(d.getDate() + offsetDays);
  return { date: toYMD(d), official: entry.official };
}

/** Kejadian berikutnya (>= tanggal acuan) beserta tahunnya; null bila di luar tabel. */
export function nextMovableDate(holiday: MovableHoliday, from: Date, offsetDays = 0): (MovableHolidayDate & { year: number }) | null {
  const fromYmd = toYMD(from);
  const years = Object.keys(MOVABLE_HOLIDAYS[holiday]).map(Number).sort((a, b) => a - b);
  for (const y of years) {
    const hit = movableDateFor(holiday, y, offsetDays);
    if (hit && hit.date >= fromYmd) return { ...hit, year: y };
  }
  return null;
}

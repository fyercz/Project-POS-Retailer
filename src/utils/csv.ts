/**
 * Satu sel CSV yang aman:
 * - diberi tanda kutip bila berisi koma, kutip, atau baris baru;
 * - teks yang diawali = + - @ (atau tab/CR) diberi awalan ' agar Excel/Sheets tidak
 *   menjalankannya sebagai RUMUS (CSV/formula injection). Nama produk atau member bisa
 *   berasal dari impor, perangkat LAN, atau pencarian online.
 * Angka (tipe number) dibiarkan apa adanya, termasuk angka negatif.
 */
export function csvCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : '';
  let str = String(value);
  if (/^[=+\-@\t\r]/.test(str)) str = `'${str}`;
  if (/[",\r\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

export function csvRow(values: unknown[]): string {
  return values.map(csvCell).join(',');
}

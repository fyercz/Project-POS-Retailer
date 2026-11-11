/**
 * Kode supplier dibuat & dikelola APLIKASI (murni, teruji): nomor urut 3 digit (001, 002, ...).
 * Laporan kas memakai kode ini ('Pembelian Barang dari CHAMPION (043)'). Kode tidak bisa diubah
 * manual agar tidak ganda / tidak konsisten.
 */
export function nextSupplierCode(list: Array<{ code?: string }>): string {
  const max = list.reduce((m, s) => (/^\d+$/.test(s.code || '') ? Math.max(m, Number(s.code)) : m), 0);
  return String(max + 1).padStart(3, '0');
}

/** Beri kode ke supplier lama yang belum punya, urut waktu dibuat, dilanjutkan dari kode terbesar. */
export function assignMissingSupplierCodes<T extends { code?: string; createdAt?: string }>(list: T[]): T[] {
  if (list.every((s) => s.code)) return list;
  const order = list
    .map((s, i) => ({ s, i }))
    .filter(({ s }) => !s.code)
    // array disimpan terbaru-dulu: urutkan menurut createdAt lalu posisi (lebih akhir = lebih lama)
    .sort((a, b) => String(a.s.createdAt || '').localeCompare(String(b.s.createdAt || '')) || b.i - a.i);
  let max = list.reduce((m, s) => (/^\d+$/.test(s.code || '') ? Math.max(m, Number(s.code)) : m), 0);
  const codes = new Map<number, string>();
  for (const { i } of order) codes.set(i, String(++max).padStart(3, '0'));
  return list.map((s, i) => (codes.has(i) ? { ...s, code: codes.get(i)! } : s));
}

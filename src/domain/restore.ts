/**
 * Aturan pemulihan data dari berkas cadangan (murni, tanpa React). Dipakai POSContext.
 * - Mode 'timpa': data diganti, KECUALI karyawan & PIN (dipertahankan) dan pengaturan (digabung).
 * - Mode 'gabung': hanya menambah data yang belum ada; data yang sudah ada tidak diubah.
 */

/** Bersihkan produk dari berkas: buang yang rusak, angka tidak valid -> 0. */
export function sanitizeRestoredProducts<P extends { id: string; name: string }>(list: any[]): P[] {
  return list
    .filter((p) => p && typeof p === 'object' && typeof p.id === 'string' && p.name)
    .map((p) => {
      const rawPrice = Number(p.price ?? p.sellingPrice);
      const rawCost = Number(p.costPrice);
      const rawStock = Number(p.stock);
      return {
        ...p,
        price: isNaN(rawPrice) || rawPrice < 0 ? 0 : rawPrice,
        costPrice: isNaN(rawCost) || rawCost < 0 ? 0 : rawCost,
        stock: isNaN(rawStock) ? 0 : rawStock,
        categoryId: typeof p.categoryId === 'string' ? p.categoryId : typeof p.category === 'string' ? p.category : 'cat_all',
        unit: typeof p.unit === 'string' ? p.unit : 'Pcs',
        barcode: typeof p.barcode === 'string' ? p.barcode : '',
      } as P;
    });
}

export function sanitizeRestoredTransactions<T extends { id: string }>(list: any[], nowIso: string = new Date().toISOString()): T[] {
  return list
    .filter((t) => t && typeof t === 'object' && typeof t.id === 'string')
    .map((t) => {
      const rawFinal = Number(t.finalTotal ?? t.total);
      return {
        ...t,
        finalTotal: isNaN(rawFinal) || rawFinal < 0 ? 0 : rawFinal,
        items: Array.isArray(t.items) ? t.items : [],
        createdAt: typeof t.createdAt === 'string' ? t.createdAt : nowIso,
      } as T;
    });
}

/**
 * Karyawan & PIN yang sekarang TIDAK ditimpa (backup lama bisa mengembalikan PIN bawaan atau akun
 * mantan karyawan). Karyawan dari berkas yang belum ada ditambahkan sebagai NONAKTIF.
 */
export function mergeRestoredEmployees<E extends { id: string; name: string; isActive: boolean }>(current: E[], incoming: any[]): E[] {
  const ids = new Set(current.map((e) => e.id));
  const added = incoming.filter((e) => e && e.id && e.name && !ids.has(e.id)).map((e) => ({ ...e, isActive: false }) as E);
  return [...current, ...added];
}

/** Pengaturan digabung: backup versi lama tidak mengosongkan pengaturan baru. */
export function mergeRestoredSettings<S extends object>(current: S, incoming: unknown): S {
  return incoming && typeof incoming === 'object' && !Array.isArray(incoming) ? { ...current, ...(incoming as object) } : current;
}

/** Tambahkan item yang id-nya belum ada. */
export function addMissingById<T extends { id: string }>(current: T[], incoming: any[]): T[] {
  const ids = new Set(current.map((x) => x.id));
  return [...current, ...incoming.filter((x) => x && x.id && !ids.has(x.id))];
}

/** Gabung produk: lewati yang id ATAU barcode-nya sudah ada. */
export function mergeProductsKeepExisting<P extends { id: string; barcode?: string }>(current: P[], incoming: P[]): P[] {
  const ids = new Set(current.map((p) => p.id));
  const barcodes = new Set(current.map((p) => p.barcode).filter(Boolean));
  return [...current, ...incoming.filter((p) => !ids.has(p.id) && !(p.barcode && barcodes.has(p.barcode)))];
}

/** Gabung supplier: lewati yang id ATAU namanya (tanpa beda huruf besar/kecil) sudah ada. */
export function mergeSuppliersKeepExisting<S extends { id: string; name: string }>(current: S[], incoming: any[]): S[] {
  const ids = new Set(current.map((s) => s.id));
  const names = new Set(current.map((s) => s.name.toLowerCase().trim()));
  return [...current, ...incoming.filter((s) => s && s.id && s.name && !ids.has(s.id) && !names.has(String(s.name).toLowerCase().trim()))];
}

/** Gabung member: lewati yang id ATAU nomor HP-nya sudah ada. */
export function mergeCustomersKeepExisting<C extends { id: string; name: string; phone?: string }>(current: C[], incoming: any[]): C[] {
  const ids = new Set(current.map((c) => c.id));
  const phones = new Set(current.map((c) => c.phone?.trim()).filter(Boolean));
  return [...current, ...incoming.filter((c) => c && c.id && c.name && !ids.has(c.id) && (!c.phone || !phones.has(String(c.phone).trim())))];
}

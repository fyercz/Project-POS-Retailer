/**
 * Kategori produk (murni, teruji): bawaan + buatan toko (Pengaturan) + yang dipakai produk.
 * Kategori buatan toko disimpan di Pengaturan (ikut backup). Pengaturan tidak tersinkron lewat
 * LAN, jadi kategori yang hanya dikenal dari produk (mis. dibuat di kasir lain) tetap ditampilkan
 * dengan nama dari id-nya, agar produk tidak "hilang" dari filter kategori.
 */
import type { ProductCategory } from '../types';

export interface CustomCategory {
  id: string;
  name: string;
}

const titleCase = (s: string) => s.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim().replace(/\b\w/g, (c) => c.toUpperCase());

export function mergeCategories(
  base: ProductCategory[],
  custom: CustomCategory[] | undefined,
  products: Array<{ categoryId?: string }>
): ProductCategory[] {
  const out = [...base];
  const ids = new Set(out.map((c) => c.id));
  for (const c of custom || []) {
    if (!c?.id || ids.has(c.id)) continue;
    out.push({ id: c.id, name: c.name, iconName: 'Tag', description: 'Kategori buatan toko' });
    ids.add(c.id);
  }
  for (const p of products) {
    const id = (p.categoryId || '').trim();
    if (!id || ids.has(id)) continue;
    out.push({ id, name: titleCase(id.replace(/^c_/, '')), iconName: 'Tag', description: 'Kategori dari data produk' });
    ids.add(id);
  }
  return out;
}

export function validateNewCategory(
  name: string,
  existing: ProductCategory[]
): { ok: true; category: CustomCategory } | { ok: false; message: string } {
  const clean = name.replace(/\s+/g, ' ').trim();
  if (clean.length < 2) return { ok: false, message: 'Nama kategori minimal 2 huruf.' };
  if (clean.length > 40) return { ok: false, message: 'Nama kategori maksimal 40 huruf.' };
  if (existing.some((c) => c.name.toLowerCase() === clean.toLowerCase())) return { ok: false, message: `Kategori "${clean}" sudah ada.` };
  const slug = clean.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'kategori';
  let id = `c_${slug}`;
  for (let i = 2; existing.some((c) => c.id === id); i++) id = `c_${slug}_${i}`;
  return { ok: true, category: { id, name: clean } };
}

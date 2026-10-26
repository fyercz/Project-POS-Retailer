/**
 * Rencana perbarui harga dari file (murni, teruji). Baris dicocokkan ke produk lewat barcode
 * (cadangan SKU). Kolom harga dikenali otomatis; peringatan untuk harga di bawah modal / perubahan
 * besar. Tidak ada yang diterapkan sebelum pengguna meninjau pratinjau.
 */
export interface PlannedChange {
  productId: string;
  name: string;
  barcode: string;
  oldPrice: number;
  newPrice: number;
  costPrice: number;
  warnings: string[];
}

export interface PriceUpdatePlan {
  changes: PlannedChange[];
  unchanged: number;
  unmatched: Array<{ row: number; key: string }>;
  invalid: Array<{ row: number; key: string; reason: string }>;
  priceColumn: string;
  keyColumn: string;
}

const norm = (s: string) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
// Prioritas kolom harga: hasil file kerja dulu ("Harga Dipakai"), lalu isian, lalu nama umum
const PRICE_COLUMNS = ['hargadipakai', 'hargabaruisi', 'hargabaru', 'hargajualbaru', 'hargajual', 'price', 'sellingprice'];
const KEY_COLUMNS = ['barcode', 'barcodesekarang', 'kodebarang', 'sku'];

export function parsePriceValue(v: string): number | null {
  const s = (v || '').replace(/rp/i, '').replace(/\s/g, '');
  if (!s) return null;
  // "15.500" / "15,500" (ribuan) / "15500.0" (angka dari Excel)
  const n = /^\d{1,3}([.,]\d{3})+$/.test(s) ? Number(s.replace(/[.,]/g, '')) : Number(s.replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
}

export function planPriceUpdates(
  rows: string[][],
  products: Array<{ id: string; name: string; barcode?: string; sku?: string; price: number; costPrice: number }>
): PriceUpdatePlan | { error: string } {
  const headerIdx = rows.findIndex((r) => r.some((c) => KEY_COLUMNS.includes(norm(c))) && r.some((c) => PRICE_COLUMNS.includes(norm(c))));
  if (headerIdx < 0) return { error: 'Tidak menemukan kolom barcode dan kolom harga (mis. "Barcode" & "Harga Dipakai" atau "barcode" & "harga_jual").' };
  const header = rows[headerIdx]!.map(norm);
  const priceCol = PRICE_COLUMNS.map((c) => header.indexOf(c)).find((i) => i >= 0)!;
  const keyCol = KEY_COLUMNS.map((c) => header.indexOf(c)).find((i) => i >= 0)!;
  const isSku = header[keyCol] === 'sku';
  const byBarcode = new Map(products.filter((p) => p.barcode).map((p) => [String(p.barcode).trim(), p]));
  const bySku = new Map(products.filter((p) => p.sku).map((p) => [String(p.sku).trim().toLowerCase(), p]));

  const plan: PriceUpdatePlan = { changes: [], unchanged: 0, unmatched: [], invalid: [], priceColumn: rows[headerIdx]![priceCol]!, keyColumn: rows[headerIdx]![keyCol]! };
  const seen = new Set<string>();
  rows.slice(headerIdx + 1).forEach((r, i) => {
    const rowNo = headerIdx + i + 2;
    const key = String(r[keyCol] ?? '').trim();
    if (!key) return;
    const p = isSku ? bySku.get(key.toLowerCase()) : byBarcode.get(key) || bySku.get(key.toLowerCase());
    if (!p) return void plan.unmatched.push({ row: rowNo, key });
    const price = parsePriceValue(String(r[priceCol] ?? ''));
    if (price === null) return void plan.invalid.push({ row: rowNo, key, reason: 'harga kosong / tidak valid' });
    if (seen.has(p.id)) return void plan.invalid.push({ row: rowNo, key, reason: 'produk muncul lebih dari sekali' });
    seen.add(p.id);
    if (price === p.price) return void plan.unchanged++;
    const warnings: string[] = [];
    if (p.costPrice > 0 && price < p.costPrice) warnings.push('di bawah harga modal');
    if (p.price > 0 && Math.abs(price - p.price) / p.price > 0.5) warnings.push('berubah lebih dari 50%');
    plan.changes.push({ productId: p.id, name: p.name, barcode: p.barcode || '', oldPrice: p.price, newPrice: price, costPrice: p.costPrice, warnings });
  });
  return plan;
}

/** Teks CSV/TSV -> baris sel. Pemisah dikenali otomatis (; , atau tab); mendukung tanda kutip. */
export function parseDelimitedText(text: string): string[][] {
  const first = (text.split(/\r?\n/).find((l) => l.trim()) || '');
  const sep = [';', '\t', ','].map((s) => [s, first.split(s).length] as const).sort((a, b) => b[1] - a[1])[0]![0];
  const rows: string[][] = [];
  let row: string[] = [], cell = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!;
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === sep) { row.push(cell); cell = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(cell); rows.push(row); row = []; cell = '';
    } else cell += ch;
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((c) => c.trim() !== ''));
}

/**
 * Validasi harga yang ditemukan AI di web (murni, teruji).
 * Aturan utama: harga HANYA diterima bila situs sumbernya benar-benar muncul di hasil pencarian
 * Google yang dipakai AI (grounding). Sumber yang disebut AI tanpa bukti pencarian dibuang,
 * agar AI tidak bisa "mengarang" harga beserta sumbernya.
 */
export type PriceSearchMode = 'competitor' | 'official';

export interface GroundingSource {
  uri: string;
  title: string;
}

export interface RawAiPrice {
  source?: string; // nama/situs sumber menurut AI
  price?: number | string;
  url?: string;
  date?: string;
  unit?: string; // mis. 'kg', 'liter', 'pcs'
  region?: string;
  note?: string;
}

export interface ValidatedPrice {
  sourceName: string;
  domain: string;
  price: number;
  unit: string;
  observedAt: string; // YYYY-MM-DD
  url: string;
  region?: string;
  note?: string;
}

const hostOf = (s: string): string => {
  const t = (s || '').trim().toLowerCase();
  try {
    return new URL(t.includes('://') ? t : `https://${t}`).hostname.replace(/^www\./, '');
  } catch {
    return t.replace(/^www\./, '');
  }
};

/** Domain situs asli dari sumber grounding (uri sering berupa tautan pengalihan Google). */
export function groundingDomains(sources: GroundingSource[]): Map<string, string> {
  const map = new Map<string, string>(); // domain -> uri
  for (const s of sources) {
    for (const cand of [s.title, s.uri]) {
      const h = hostOf(cand);
      if (h && h.includes('.') && !h.endsWith('vertexaisearch.cloud.google.com') && !map.has(h)) map.set(h, s.uri);
    }
  }
  return map;
}

const sameSite = (a: string, b: string) => a === b || a.endsWith(`.${b}`) || b.endsWith(`.${a}`);

export function parsePrice(v: unknown): number | null {
  if (typeof v === 'number') return Number.isFinite(v) && v > 0 ? Math.round(v) : null;
  if (typeof v !== 'string') return null;
  // "Rp 15.500", "15500", "Rp15.500,00"
  const cleaned = v.replace(/rp/i, '').replace(/\s/g, '').replace(/,\d{1,2}$/, '').replace(/[.,]/g, '');
  const n = Number(cleaned);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
}

const isoDate = (s: string | undefined, today: string): string => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec((s || '').trim());
  if (!m) return today;
  return `${m[1]}-${m[2]}-${m[3]}` > today ? today : `${m[1]}-${m[2]}-${m[3]}`;
};

export function validateAiPrices(
  raw: RawAiPrice[],
  sources: GroundingSource[],
  mode: PriceSearchMode,
  today: string = new Date().toISOString().slice(0, 10)
): ValidatedPrice[] {
  const domains = groundingDomains(sources);
  const out: ValidatedPrice[] = [];
  const seen = new Set<string>();
  for (const r of Array.isArray(raw) ? raw : []) {
    const price = parsePrice(r.price);
    if (!price) continue;
    const claimed = hostOf(r.url || '') || hostOf(r.source || '');
    // Cocokkan dengan situs yang benar-benar ditemukan pencarian
    let matched: [string, string] | undefined;
    for (const [d, uri] of domains) if (claimed && sameSite(claimed, d)) matched = [d, uri];
    if (!matched) {
      // AI menyebut nama (mis. "KlikIndomaret") tanpa domain: cocokkan nama ke domain grounding
      const name = (r.source || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      for (const [d, uri] of domains) if (name && d.replace(/[^a-z0-9]/g, '').includes(name)) matched = [d, uri];
    }
    if (!matched) continue; // sumber tidak terbukti -> buang
    const [domain, uri] = matched;
    if (mode === 'official' && !domain.endsWith('.go.id')) continue; // acuan pemerintah: hanya .go.id
    const key = `${domain}|${price}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      sourceName: (r.source || domain).trim() || domain,
      domain,
      price,
      unit: (r.unit || 'pcs').toLowerCase(),
      observedAt: isoDate(r.date, today),
      url: r.url && hostOf(r.url) === domain ? r.url : uri,
      ...(r.region ? { region: r.region } : {}),
      ...(r.note ? { note: r.note } : {}),
    });
  }
  return out;
}

// ---------------------------------------------------------------------------------------------
// Komoditas pokok (acuan pemerintah): kenali dari nama produk & konversi harga per kg/liter
// ---------------------------------------------------------------------------------------------
export interface StapleCommodity {
  id: string;
  label: string; // nama komoditas seperti di Panel Harga Pangan
  unit: 'kg' | 'liter';
}

const STAPLES: Array<{ re: RegExp; c: StapleCommodity }> = [
  { re: /minyak\s*goreng.*curah|curah.*minyak/i, c: { id: 'minyak_curah', label: 'Minyak Goreng Curah', unit: 'liter' } },
  { re: /minyak\s*goreng|minyakita/i, c: { id: 'minyak_kemasan', label: 'Minyak Goreng Kemasan', unit: 'liter' } },
  { re: /\bberas\b.*premium|premium.*\bberas\b/i, c: { id: 'beras_premium', label: 'Beras Premium', unit: 'kg' } },
  { re: /\bberas\b/i, c: { id: 'beras_medium', label: 'Beras Medium', unit: 'kg' } },
  { re: /\bgula\b(?!.*(aren|merah|jawa|batu|cair))/i, c: { id: 'gula', label: 'Gula Konsumsi', unit: 'kg' } },
  { re: /\btelur\b(?!.*(puyuh|bebek|asin))/i, c: { id: 'telur', label: 'Telur Ayam Ras', unit: 'kg' } },
  { re: /tepung\s*terigu|\bterigu\b/i, c: { id: 'terigu_kemasan', label: 'Tepung Terigu Kemasan', unit: 'kg' } },
  { re: /bawang\s*merah/i, c: { id: 'bawang_merah', label: 'Bawang Merah', unit: 'kg' } },
  { re: /bawang\s*putih/i, c: { id: 'bawang_putih', label: 'Bawang Putih Bonggol', unit: 'kg' } },
];

export function stapleCommodityOf(productName: string): StapleCommodity | null {
  for (const s of STAPLES) if (s.re.test(productName)) return s.c;
  return null;
}

/** Ukuran kemasan dari nama produk, dalam kg atau liter (null bila tidak terbaca). */
export function packSizeOf(productName: string, unit: 'kg' | 'liter'): number | null {
  const m = /(\d+(?:[.,]\d+)?)\s*(kg|kilo|gr|gram|g|ml|lt|ltr|liter|litre|l)\b/i.exec(productName);
  if (!m) return null;
  const n = Number(m[1]!.replace(',', '.'));
  const u = m[2]!.toLowerCase();
  if (unit === 'kg') {
    if (u === 'kg' || u === 'kilo') return n;
    if (u === 'g' || u === 'gr' || u === 'gram') return n / 1000;
    return null;
  }
  if (['l', 'lt', 'ltr', 'liter', 'litre'].includes(u)) return n;
  if (u === 'ml') return n / 1000;
  return null;
}

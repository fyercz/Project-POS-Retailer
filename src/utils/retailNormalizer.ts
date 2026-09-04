import { WholesaleUnit } from '../types';
import { mapCategory } from '../data/importHelpers';

export interface ParsedItem {
  id: string;
  originalText: string;
  name: string;
  brand: string;
  gramasi: string;
  categoryId: string;
  unit: string;
  costPrice: number;
  price: number;
  stock: number;
  sku: string;
  barcode: string;
  aisle?: string;
  wholesaleUnits: WholesaleUnit[];
  corrections: string[];
  profitMarginPercent: number;
  isPointsEligible: boolean;
  selected: boolean;
}

// ==========================================
// 1. Damerau-Levenshtein Distance & Fuzzy Matcher Engine
// ==========================================

export function calculateLevenshteinDistance(a: string, b: string): number {
  const al = a.length;
  const bl = b.length;
  if (al === 0) return bl;
  if (bl === 0) return al;

  const matrix: number[][] = [];
  for (let i = 0; i <= al; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= bl; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= al; i++) {
    for (let j = 1; j <= bl; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let minVal = Math.min(
        matrix[i - 1][j] + 1, // deletion
        matrix[i][j - 1] + 1, // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );

      // Transposition check (Damerau)
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        minVal = Math.min(minVal, matrix[i - 2][j - 2] + 1);
      }

      matrix[i][j] = minVal;
    }
  }

  return matrix[al][bl];
}

export function calculateSimilarity(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1.0;
  const distance = calculateLevenshteinDistance(a.toLowerCase(), b.toLowerCase());
  return (maxLen - distance) / maxLen;
}

// Master Indonesian FMCG Target Vocabulary List for Typo Auto-Correction
const KNOWN_FMCG_TERMS: Array<{ canonical: string; categoryHint?: string }> = [
  // Brands
  { canonical: 'Zinc', categoryHint: 'personal_care' },
  { canonical: 'Zwitsal', categoryHint: 'personal_care' },
  { canonical: 'Bango', categoryHint: 'groceries' },
  { canonical: 'Indomie', categoryHint: 'instant' },
  { canonical: 'Mie Sedaap', categoryHint: 'instant' },
  { canonical: 'Sarimi', categoryHint: 'instant' },
  { canonical: 'Supermi', categoryHint: 'instant' },
  { canonical: 'Bimoli', categoryHint: 'groceries' },
  { canonical: 'Sania', categoryHint: 'groceries' },
  { canonical: 'Filma', categoryHint: 'groceries' },
  { canonical: 'SunCo', categoryHint: 'groceries' },
  { canonical: 'Tropical', categoryHint: 'groceries' },
  { canonical: 'Fortune', categoryHint: 'groceries' },
  { canonical: 'Kapal Api', categoryHint: 'beverages' },
  { canonical: 'Luwak', categoryHint: 'beverages' },
  { canonical: 'Torabika', categoryHint: 'beverages' },
  { canonical: 'Good Day', categoryHint: 'beverages' },
  { canonical: 'Nescafe', categoryHint: 'beverages' },
  { canonical: 'Ultra Milk', categoryHint: 'beverages' },
  { canonical: 'Bear Brand', categoryHint: 'beverages' },
  { canonical: 'Indomilk', categoryHint: 'beverages' },
  { canonical: 'Frisian Flag', categoryHint: 'beverages' },
  { canonical: 'Lifebuoy', categoryHint: 'personal_care' },
  { canonical: 'Pepsodent', categoryHint: 'personal_care' },
  { canonical: 'Ciptadent', categoryHint: 'personal_care' },
  { canonical: 'Sensodyne', categoryHint: 'personal_care' },
  { canonical: 'Sunsilk', categoryHint: 'personal_care' },
  { canonical: 'Pantene', categoryHint: 'personal_care' },
  { canonical: 'Clear', categoryHint: 'personal_care' },
  { canonical: 'Dettol', categoryHint: 'personal_care' },
  { canonical: 'Cussons', categoryHint: 'personal_care' },
  { canonical: 'My Baby', categoryHint: 'personal_care' },
  { canonical: 'MamyPoko', categoryHint: 'personal_care' },
  { canonical: 'Sweety', categoryHint: 'personal_care' },
  { canonical: 'Mitu', categoryHint: 'personal_care' },
  { canonical: 'Pigeon', categoryHint: 'personal_care' },
  { canonical: 'Rinso', categoryHint: 'home_care' },
  { canonical: 'Daia', categoryHint: 'home_care' },
  { canonical: 'So Klin', categoryHint: 'home_care' },
  { canonical: 'Attack', categoryHint: 'home_care' },
  { canonical: 'Molto', categoryHint: 'home_care' },
  { canonical: 'Downy', categoryHint: 'home_care' },
  { canonical: 'Sunlight', categoryHint: 'home_care' },
  { canonical: 'Mama Lemon', categoryHint: 'home_care' },
  { canonical: 'Bayclin', categoryHint: 'home_care' },
  { canonical: 'Sampoerna', categoryHint: 'tobacco' },
  { canonical: 'Djarum', categoryHint: 'tobacco' },
  { canonical: 'Gudang Garam', categoryHint: 'tobacco' },
  { canonical: 'Marlboro', categoryHint: 'tobacco' },
  { canonical: 'Chitato', categoryHint: 'snacks' },
  { canonical: 'Oreo', categoryHint: 'snacks' },
  { canonical: 'Tango', categoryHint: 'snacks' },
  { canonical: 'Khong Guan', categoryHint: 'snacks' },
  { canonical: 'Roma', categoryHint: 'snacks' },
  { canonical: 'Nabati', categoryHint: 'snacks' },
  { canonical: 'SilverQueen', categoryHint: 'snacks' },
  { canonical: 'Royco', categoryHint: 'groceries' },
  { canonical: 'Masako', categoryHint: 'groceries' },
  { canonical: 'Saori', categoryHint: 'groceries' },
  { canonical: 'Sajiku', categoryHint: 'groceries' },
  { canonical: 'Sasa', categoryHint: 'groceries' },
  { canonical: 'Ladaku', categoryHint: 'groceries' },
  { canonical: 'ABC', categoryHint: 'groceries' },

  // Key Product Terms & Descriptors
  { canonical: 'Kecap' },
  { canonical: 'Asin' },
  { canonical: 'Manis' },
  { canonical: 'Pedas' },
  { canonical: 'Saus' },
  { canonical: 'Sambal' },
  { canonical: 'Tomat' },
  { canonical: 'Tiram' },
  { canonical: 'Minyak' },
  { canonical: 'Goreng' },
  { canonical: 'Beras' },
  { canonical: 'Gula' },
  { canonical: 'Pasir' },
  { canonical: 'Tepung' },
  { canonical: 'Terigu' },
  { canonical: 'Garam' },
  { canonical: 'Dapur' },
  { canonical: 'Susu' },
  { canonical: 'Kopi' },
  { canonical: 'Teh' },
  { canonical: 'Air' },
  { canonical: 'Mineral' },
  { canonical: 'Sabun' },
  { canonical: 'Mandi' },
  { canonical: 'Cuci' },
  { canonical: 'Piring' },
  { canonical: 'Pakaian' },
  { canonical: 'Pasta' },
  { canonical: 'Gigi' },
  { canonical: 'Sikat' },
  { canonical: 'Shampoo' },
  { canonical: 'Deterjen' },
  { canonical: 'Pewangi' },
  { canonical: 'Biskuit' },
  { canonical: 'Wafer' },
  { canonical: 'Keripik' },
  { canonical: 'Cokelat' },
  { canonical: 'Permen' },
  { canonical: 'Rokok' },
  { canonical: 'Filter' },
  { canonical: 'Kretek' },
  { canonical: 'Mild' },
  { canonical: 'Spesial' },
  { canonical: 'Super' },
  { canonical: 'Original' },
  { canonical: 'Baby' },
  { canonical: 'Bayi' },
  { canonical: 'Popok' },
  { canonical: 'Telon' },
  { canonical: 'Pouch' },
  { canonical: 'Botol' },
  { canonical: 'Kaleng' },
  { canonical: 'Kotak' },
  { canonical: 'Sachet' },
  { canonical: 'Renceng' },
  { canonical: 'Bungkus' },
  { canonical: 'Karton' },
  { canonical: 'Slop' },
];

// ==========================================
// 2. Master Indonesian Retail FMCG Dictionary
// ==========================================

// 2.1 Multi-Word Phrase Replacements
const PHRASE_REPLACEMENTS: Array<{ regex: RegExp; target: string; reason: string }> = [
  // Condiments & Kecap
  { regex: /\bkecap\s+asyn\b/gi, target: 'Kecap Asin', reason: 'Typo: kecap asyn ➔ Kecap Asin' },
  { regex: /\bkcap\s+asyn\b/gi, target: 'Kecap Asin', reason: 'Typo: kcap asyn ➔ Kecap Asin' },
  { regex: /\bkcp\s+asyn\b/gi, target: 'Kecap Asin', reason: 'Singkatan/Typo: kcp asyn ➔ Kecap Asin' },
  { regex: /\bkcap\s+asin\b/gi, target: 'Kecap Asin', reason: 'Typo: kcap ➔ Kecap Asin' },
  { regex: /\bkcp\s+asin\b/gi, target: 'Kecap Asin', reason: 'Singkatan: kcp asin ➔ Kecap Asin' },
  { regex: /\bkecap\s+mns\b/gi, target: 'Kecap Manis', reason: 'Singkatan: mns ➔ Manis' },
  { regex: /\bkcap\s+mns\b/gi, target: 'Kecap Manis', reason: 'Singkatan: kcap mns ➔ Kecap Manis' },
  { regex: /\bkcp\s+mns\b/gi, target: 'Kecap Manis', reason: 'Singkatan: kcp mns ➔ Kecap Manis' },
  { regex: /\bkcp\s+manis\b/gi, target: 'Kecap Manis', reason: 'Singkatan: kcp ➔ Kecap Manis' },
  { regex: /\bbango\s+mns\b/gi, target: 'Bango Kecap Manis', reason: 'Ejaan: Bango Kecap Manis' },
  { regex: /\bbngo\s+mns\b/gi, target: 'Bango Kecap Manis', reason: 'Singkatan: bngo mns ➔ Bango Kecap Manis' },
  { regex: /\bbango\s+manis\b/gi, target: 'Bango Kecap Manis', reason: 'Standar: Bango Kecap Manis' },
  { regex: /\bsaus\s+smbl\b/gi, target: 'Saus Sambal', reason: 'Singkatan: smbl ➔ Sambal' },
  { regex: /\bsos\s+sambal\b/gi, target: 'Saus Sambal', reason: 'Singkatan: sos ➔ Saus Sambal' },
  { regex: /\bsaus\s+tmt\b/gi, target: 'Saus Tomat', reason: 'Singkatan: tmt ➔ Tomat' },

  // Baby Care
  { regex: /\bzwitsyal\s+baby\b/gi, target: 'Zwitsal Baby', reason: 'Typo: zwitsyal ➔ Zwitsal Baby' },
  { regex: /\bzwitsyal\b/gi, target: 'Zwitsal', reason: 'Typo: zwitsyal ➔ Zwitsal' },
  { regex: /\bzwitsl\s+bby\b/gi, target: 'Zwitsal Baby', reason: 'Singkatan: zwitsl bby ➔ Zwitsal Baby' },
  { regex: /\bzwtsl\s+baby\b/gi, target: 'Zwitsal Baby', reason: 'Singkatan: zwtsl ➔ Zwitsal Baby' },
  { regex: /\bmy\s+bby\b/gi, target: 'My Baby', reason: 'Singkatan: bby ➔ Baby' },
  { regex: /\bmyk\s+telon\b/gi, target: 'Minyak Telon', reason: 'Singkatan: myk telon ➔ Minyak Telon' },
  { regex: /\bmnyk\s+telon\b/gi, target: 'Minyak Telon', reason: 'Singkatan: mnyk ➔ Minyak Telon' },

  // Noodles
  { regex: /\bindomi\s+grg\b/gi, target: 'Indomie Goreng', reason: 'Ejaan Merk: indomi grg ➔ Indomie Goreng' },
  { regex: /\bindomi\s+kuah\b/gi, target: 'Indomie Kuah', reason: 'Ejaan: indomi ➔ Indomie' },
  { regex: /\bindomi\s+soto\b/gi, target: 'Indomie Rasa Soto', reason: 'Ejaan: indomi ➔ Indomie' },
  { regex: /\bindomi\s+aym\s*bwg\b/gi, target: 'Indomie Ayam Bawang', reason: 'Singkatan: indomi aym bwg ➔ Indomie Ayam Bawang' },
  { regex: /\bmie\s+sdp\b/gi, target: 'Mie Sedaap', reason: 'Singkatan: mie sdp ➔ Mie Sedaap' },
  { regex: /\bmie\s+sedap\b/gi, target: 'Mie Sedaap', reason: 'Ejaan: mie sedap ➔ Mie Sedaap' },

  // Cooking & Groceries
  { regex: /\bmyk\s+grg\b/gi, target: 'Minyak Goreng', reason: 'Singkatan: myk grg ➔ Minyak Goreng' },
  { regex: /\bminyak\s+grg\b/gi, target: 'Minyak Goreng', reason: 'Singkatan: grg ➔ Goreng' },
  { regex: /\bmyk\s+goreng\b/gi, target: 'Minyak Goreng', reason: 'Singkatan: myk ➔ Minyak' },
  { regex: /\bmnyk\s+grg\b/gi, target: 'Minyak Goreng', reason: 'Singkatan: mnyk ➔ Minyak Goreng' },
  { regex: /\bgula\s+psr\b/gi, target: 'Gula Pasir', reason: 'Singkatan: psr ➔ Pasir' },
  { regex: /\btpg\s+trg\b/gi, target: 'Tepung Terigu', reason: 'Singkatan: tpg trg ➔ Tepung Terigu' },
  { regex: /\btepung\s+trg\b/gi, target: 'Tepung Terigu', reason: 'Singkatan: trg ➔ Terigu' },
  { regex: /\bgrm\s+dpr\b/gi, target: 'Garam Dapur', reason: 'Singkatan: grm dpr ➔ Garam Dapur' },
  { regex: /\bpdn\s+wngi\b/gi, target: 'Pandan Wangi', reason: 'Singkatan: pdn wngi ➔ Pandan Wangi' },
  { regex: /\bpandn\s+wngi\b/gi, target: 'Pandan Wangi', reason: 'Typo: pandn wngi ➔ Pandan Wangi' },

  // Beverages
  { regex: /\bkpl\s+api\b/gi, target: 'Kapal Api', reason: 'Singkatan: kpl api ➔ Kapal Api' },
  { regex: /\bluwak\s+wite\b/gi, target: 'Luwak White', reason: 'Typo: wite ➔ White' },
  { regex: /\bluwak\s+wite\s+koffie\b/gi, target: 'Luwak White Koffie', reason: 'Ejaan Merk: Luwak White Koffie' },
  { regex: /\bair\s+min\b/gi, target: 'Air Mineral', reason: 'Singkatan: air min ➔ Air Mineral' },
  { regex: /\ble\s+mineral\b/gi, target: 'Le Minerale', reason: 'Ejaan Merk: le mineral ➔ Le Minerale' },
  { regex: /\bth\s+btl\b/gi, target: 'Teh Botol', reason: 'Singkatan: th btl ➔ Teh Botol' },
  { regex: /\bteh\s+pucuk\b/gi, target: 'Teh Pucuk Harum', reason: 'Ejaan Merk: Teh Pucuk Harum' },
  { regex: /\bultr\s+milk\b/gi, target: 'Ultra Milk', reason: 'Ejaan Merk: ultr milk ➔ Ultra Milk' },
  { regex: /\bsusu\s+ultr\b/gi, target: 'Susu Ultra Milk', reason: 'Ejaan: ultr ➔ Ultra Milk' },

  // Personal & Home Care
  { regex: /\bzink\s+shampo(?:o)?\b/gi, target: 'Zinc Shampoo', reason: 'Ejaan Merk: zink ➔ Zinc Shampoo' },
  { regex: /\bshampo(?:o)?\s+zink\b/gi, target: 'Zinc Shampoo', reason: 'Ejaan Merk: shampo zink ➔ Zinc Shampoo' },
  { regex: /\bshampo(?:o)?\s+zinc\b/gi, target: 'Zinc Shampoo', reason: 'Standar: Zinc Shampoo' },
  { regex: /\bzink\s+men\b/gi, target: 'Zinc Men', reason: 'Ejaan Merk: zink men ➔ Zinc Men' },
  { regex: /\bzink\s+anti\s*(?:ketombe|dandruff)\b/gi, target: 'Zinc Anti Dandruff', reason: 'Ejaan Merk: zink ➔ Zinc Anti Dandruff' },
  { regex: /\bzinc\s+anti\s*ketombe\b/gi, target: 'Zinc Anti Dandruff', reason: 'Standar: Zinc Anti Dandruff' },
  { regex: /\bzink\b/gi, target: 'Zinc', reason: 'Typo Merk: zink ➔ Zinc' },
  { regex: /\bpst\s+gg\b/gi, target: 'Pasta Gigi', reason: 'Singkatan: pst gg ➔ Pasta Gigi' },
  { regex: /\bskt\s+gg\b/gi, target: 'Sikat Gigi', reason: 'Singkatan: skt gg ➔ Sikat Gigi' },
  { regex: /\bsbun\s+mnd\b/gi, target: 'Sabun Mandi', reason: 'Singkatan: sbun mnd ➔ Sabun Mandi' },
  { regex: /\bsbun\s+cair\b/gi, target: 'Sabun Cair', reason: 'Singkatan: sbun ➔ Sabun Cair' },
  { regex: /\bcuci\s+prg\b/gi, target: 'Cuci Piring', reason: 'Singkatan: cuci prg ➔ Cuci Piring' },
  { regex: /\bcuci\s+pkn\b/gi, target: 'Cuci Pakaian', reason: 'Singkatan: cuci pkn ➔ Cuci Pakaian' },

  // Tobacco
  { regex: /\brokok\s+samporna\b/gi, target: 'Rokok Sampoerna', reason: 'Ejaan Merk: samporna ➔ Sampoerna' },
  { regex: /\bgg\s+surya\b/gi, target: 'Gudang Garam Surya', reason: 'Singkatan: gg ➔ Gudang Garam' },
];

// 2.2 Individual Word / Token Corrections
const WORD_REPLACEMENTS: { [key: string]: { target: string; reason: string } } = {
  // Condiments & Kecap Typos
  asyn: { target: 'Asin', reason: 'Typo: asyn ➔ Asin' },
  asin: { target: 'Asin', reason: '' },
  asinn: { target: 'Asin', reason: 'Typo: asinn ➔ Asin' },
  kcap: { target: 'Kecap', reason: 'Typo: kcap ➔ Kecap' },
  kcp: { target: 'Kecap', reason: 'Singkatan: kcp ➔ Kecap' },
  kicap: { target: 'Kecap', reason: 'Typo: kicap ➔ Kecap' },
  kecapp: { target: 'Kecap', reason: 'Typo: kecapp ➔ Kecap' },
  kecap: { target: 'Kecap', reason: '' },
  bngo: { target: 'Bango', reason: 'Singkatan: bngo ➔ Bango' },
  bango: { target: 'Bango', reason: '' },
  bangoo: { target: 'Bango', reason: 'Typo: bangoo ➔ Bango' },
  bangu: { target: 'Bango', reason: 'Typo: bangu ➔ Bango' },
  royco: { target: 'Royco', reason: '' },
  ryco: { target: 'Royco', reason: 'Singkatan: ryco ➔ Royco' },
  royko: { target: 'Royco', reason: 'Typo: royko ➔ Royco' },
  masako: { target: 'Masako', reason: '' },
  msko: { target: 'Masako', reason: 'Singkatan: msko ➔ Masako' },
  masko: { target: 'Masako', reason: 'Typo: masko ➔ Masako' },
  saori: { target: 'Saori', reason: '' },
  saory: { target: 'Saori', reason: 'Typo: saory ➔ Saori' },
  sajiku: { target: 'Sajiku', reason: '' },
  sjku: { target: 'Sajiku', reason: 'Singkatan: sjku ➔ Sajiku' },
  sasa: { target: 'Sasa', reason: '' },
  ladaku: { target: 'Ladaku', reason: '' },
  ldku: { target: 'Ladaku', reason: 'Singkatan: ldku ➔ Ladaku' },
  tomat: { target: 'Tomat', reason: '' },
  tmt: { target: 'Tomat', reason: 'Singkatan: tmt ➔ Tomat' },
  sambal: { target: 'Sambal', reason: '' },
  smbl: { target: 'Sambal', reason: 'Singkatan: smbl ➔ Sambal' },
  sambel: { target: 'Sambal', reason: 'Dialek/Typo: sambel ➔ Sambal' },
  saus: { target: 'Saus', reason: '' },
  sos: { target: 'Saus', reason: 'Singkatan: sos ➔ Saus' },
  sosu: { target: 'Saus', reason: 'Typo: sosu ➔ Saus' },

  // Baby Care Typos & Brands
  zwitsyal: { target: 'Zwitsal', reason: 'Typo: zwitsyal ➔ Zwitsal' },
  zwitsal: { target: 'Zwitsal', reason: '' },
  zwitsall: { target: 'Zwitsal', reason: 'Typo: zwitsall ➔ Zwitsal' },
  zwitsl: { target: 'Zwitsal', reason: 'Typo/Singkatan: zwitsl ➔ Zwitsal' },
  zwtsl: { target: 'Zwitsal', reason: 'Singkatan: zwtsl ➔ Zwitsal' },
  zwisal: { target: 'Zwitsal', reason: 'Typo: zwisal ➔ Zwitsal' },
  zwtisal: { target: 'Zwitsal', reason: 'Typo: zwtisal ➔ Zwitsal' },
  cussons: { target: 'Cussons', reason: '' },
  cuson: { target: 'Cussons', reason: 'Typo: cuson ➔ Cussons' },
  cussn: { target: 'Cussons', reason: 'Singkatan: cussn ➔ Cussons' },
  mamypoko: { target: 'MamyPoko', reason: '' },
  mampoko: { target: 'MamyPoko', reason: 'Typo: mampoko ➔ MamyPoko' },
  sweety: { target: 'Sweety', reason: '' },
  swety: { target: 'Sweety', reason: 'Typo: swety ➔ Sweety' },
  swty: { target: 'Sweety', reason: 'Singkatan: swty ➔ Sweety' },
  telon: { target: 'Telon', reason: '' },
  teln: { target: 'Telon', reason: 'Singkatan: teln ➔ Telon' },
  bby: { target: 'Baby', reason: 'Singkatan: bby ➔ Baby' },
  baby: { target: 'Baby', reason: '' },
  bayi: { target: 'Bayi', reason: '' },
  byi: { target: 'Bayi', reason: 'Singkatan: byi ➔ Bayi' },
  popok: { target: 'Popok', reason: '' },
  ppk: { target: 'Popok', reason: 'Singkatan: ppk ➔ Popok' },

  // FMCG Brands
  indomi: { target: 'Indomie', reason: 'Ejaan Merk: indomi ➔ Indomie' },
  indomiee: { target: 'Indomie', reason: 'Typo: indomiee ➔ Indomie' },
  sedap: { target: 'Sedaap', reason: 'Ejaan Merk: sedap ➔ Sedaap' },
  sedaap: { target: 'Sedaap', reason: '' },
  bmol: { target: 'Bimoli', reason: 'Ejaan Merk: bmol ➔ Bimoli' },
  bimoly: { target: 'Bimoli', reason: 'Typo: bimoly ➔ Bimoli' },
  snia: { target: 'Sania', reason: 'Ejaan Merk: snia ➔ Sania' },
  filma: { target: 'Filma', reason: '' },
  flma: { target: 'Filma', reason: 'Singkatan: flma ➔ Filma' },
  snco: { target: 'SunCo', reason: 'Singkatan: snco ➔ SunCo' },
  sunco: { target: 'SunCo', reason: '' },
  tropical: { target: 'Tropical', reason: '' },
  trpcl: { target: 'Tropical', reason: 'Singkatan: trpcl ➔ Tropical' },
  samporna: { target: 'Sampoerna', reason: 'Ejaan Merk: samporna ➔ Sampoerna' },
  sampoerna: { target: 'Sampoerna', reason: '' },
  djarum: { target: 'Djarum', reason: '' },
  djrum: { target: 'Djarum', reason: 'Singkatan: djrum ➔ Djarum' },
  marlboro: { target: 'Marlboro', reason: '' },
  mrlboro: { target: 'Marlboro', reason: 'Singkatan: mrlboro ➔ Marlboro' },
  lifbouy: { target: 'Lifebuoy', reason: 'Typo: lifbouy ➔ Lifebuoy' },
  lifeboy: { target: 'Lifebuoy', reason: 'Typo: lifeboy ➔ Lifebuoy' },
  lfbouy: { target: 'Lifebuoy', reason: 'Singkatan: lfbouy ➔ Lifebuoy' },
  lifebuoy: { target: 'Lifebuoy', reason: '' },
  pepsoden: { target: 'Pepsodent', reason: 'Typo: pepsoden ➔ Pepsodent' },
  pepsodentt: { target: 'Pepsodent', reason: 'Typo: pepsodentt ➔ Pepsodent' },
  pepsodent: { target: 'Pepsodent', reason: '' },
  sunslk: { target: 'Sunsilk', reason: 'Typo: sunslk ➔ Sunsilk' },
  sunsilk: { target: 'Sunsilk', reason: '' },
  zink: { target: 'Zinc', reason: 'Typo Merk: zink ➔ Zinc' },
  zinc: { target: 'Zinc', reason: '' },
  zinck: { target: 'Zinc', reason: 'Typo Merk: zinck ➔ Zinc' },
  znc: { target: 'Zinc', reason: 'Singkatan: znc ➔ Zinc' },
  znck: { target: 'Zinc', reason: 'Typo: znck ➔ Zinc' },
  pntn: { target: 'Pantene', reason: 'Singkatan: pntn ➔ Pantene' },
  pantene: { target: 'Pantene', reason: '' },
  rnso: { target: 'Rinso', reason: 'Singkatan: rnso ➔ Rinso' },
  rinso: { target: 'Rinso', reason: '' },
  dia: { target: 'Daia', reason: 'Singkatan: dia ➔ Daia' },
  daia: { target: 'Daia', reason: '' },
  mlto: { target: 'Molto', reason: 'Singkatan: mlto ➔ Molto' },
  molto: { target: 'Molto', reason: '' },
  snlght: { target: 'Sunlight', reason: 'Singkatan: snlght ➔ Sunlight' },
  sunlight: { target: 'Sunlight', reason: '' },
  mmlmn: { target: 'Mama Lemon', reason: 'Singkatan: mmlmn ➔ Mama Lemon' },
  aqa: { target: 'AQUA', reason: 'Singkatan: aqa ➔ AQUA' },
  aqua: { target: 'AQUA', reason: '' },
  lmnrl: { target: 'Le Minerale', reason: 'Singkatan: lmnrl ➔ Le Minerale' },
  ultr: { target: 'Ultra Milk', reason: 'Singkatan: ultr ➔ Ultra Milk' },
  dncw: { target: 'Dancow', reason: 'Singkatan: dncw ➔ Dancow' },
  dancow: { target: 'Dancow', reason: '' },
  biskut: { target: 'Biskuit', reason: 'Typo: biskut ➔ Biskuit' },
  biskuit: { target: 'Biskuit', reason: '' },
  bskt: { target: 'Biskuit', reason: 'Singkatan: bskt ➔ Biskuit' },
  chtato: { target: 'Chitato', reason: 'Singkatan: chtato ➔ Chitato' },
  chitato: { target: 'Chitato', reason: '' },

  // General Grocery Abbreviations & Typos
  grg: { target: 'Goreng', reason: 'Singkatan: grg ➔ Goreng' },
  gorengg: { target: 'Goreng', reason: 'Typo: gorengg ➔ Goreng' },
  spsial: { target: 'Spesial', reason: 'Typo: spsial ➔ Spesial' },
  spc: { target: 'Spesial', reason: 'Singkatan: spc ➔ Spesial' },
  sps: { target: 'Spesial', reason: 'Singkatan: sps ➔ Spesial' },
  spcl: { target: 'Spesial', reason: 'Singkatan: spcl ➔ Spesial' },
  supr: { target: 'Super', reason: 'Typo: supr ➔ Super' },
  kuh: { target: 'Kuah', reason: 'Singkatan: kuh ➔ Kuah' },
  aym: { target: 'Ayam', reason: 'Singkatan: aym ➔ Ayam' },
  bwg: { target: 'Bawang', reason: 'Singkatan: bwg ➔ Bawang' },
  kpi: { target: 'Kopi', reason: 'Singkatan: kpi ➔ Kopi' },
  wite: { target: 'White', reason: 'Typo: wite ➔ White' },
  koffie: { target: 'Koffie', reason: '' },
  sbun: { target: 'Sabun', reason: 'Singkatan: sbun ➔ Sabun' },
  sbn: { target: 'Sabun', reason: 'Singkatan: sbn ➔ Sabun' },
  shampo: { target: 'Shampoo', reason: 'Ejaan: shampo ➔ Shampoo' },
  smpo: { target: 'Shampoo', reason: 'Singkatan: smpo ➔ Shampoo' },
  btl: { target: 'Botol', reason: 'Singkatan: btl ➔ Botol' },
  btol: { target: 'Botol', reason: 'Singkatan: btol ➔ Botol' },
  kalg: { target: 'Kaleng', reason: 'Singkatan: kalg ➔ Kaleng' },
  klng: { target: 'Kaleng', reason: 'Singkatan: klng ➔ Kaleng' },
  krtn: { target: 'Karton', reason: 'Singkatan: krtn ➔ Karton' },
  rcg: { target: 'Renceng', reason: 'Singkatan: rcg ➔ Renceng' },
  rcng: { target: 'Renceng', reason: 'Singkatan: rcng ➔ Renceng' },
  sct: { target: 'Sachet', reason: 'Singkatan: sct ➔ Sachet' },
  sch: { target: 'Sachet', reason: 'Singkatan: sch ➔ Sachet' },
  bks: { target: 'Bungkus', reason: 'Singkatan: bks ➔ Bungkus' },
  bgks: { target: 'Bungkus', reason: 'Singkatan: bgks ➔ Bungkus' },
  pck: { target: 'Pack', reason: 'Singkatan: pck ➔ Pack' },
  pch: { target: 'Pouch', reason: 'Singkatan: pch ➔ Pouch' },
  cklt: { target: 'Cokelat', reason: 'Singkatan: cklt ➔ Cokelat' },
  cklat: { target: 'Cokelat', reason: 'Typo: cklat ➔ Cokelat' },
  vnl: { target: 'Vanila', reason: 'Singkatan: vnl ➔ Vanila' },
  pandn: { target: 'Pandan', reason: 'Typo: pandn ➔ Pandan' },
  wngi: { target: 'Wangi', reason: 'Typo: wngi ➔ Wangi' },
  pedas: { target: 'Pedas', reason: '' },
  pedes: { target: 'Pedas', reason: 'Dialek: pedes ➔ Pedas' },
  pds: { target: 'Pedas', reason: 'Singkatan: pds ➔ Pedas' },
  manis: { target: 'Manis', reason: '' },
  mns: { target: 'Manis', reason: 'Singkatan: mns ➔ Manis' },
};

// Helper: Phonetic & Vowel Transliteration Check (e.g. asyn -> asin, krym -> krim)
function normalizeIndonesianPhonetics(word: string): string {
  let w = word.toLowerCase();
  // 'y' between consonants or before consonant -> 'i' (asyn -> asin, mysel -> misel)
  w = w.replace(/([^aeiou])y([^aeiou]|$)/gi, '$1i$2');
  return w;
}

// Helper: Smart Fuzzy Word Matcher against Master FMCG Vocabulary
function smartFuzzyMatchWord(word: string): { matched: string; reason: string } | null {
  const clean = word.toLowerCase();
  if (clean.length < 3) return null;

  // 1. Check phonetic normalized form first
  const phonetic = normalizeIndonesianPhonetics(clean);
  if (phonetic !== clean && WORD_REPLACEMENTS[phonetic]) {
    const rep = WORD_REPLACEMENTS[phonetic];
    return {
      matched: rep.target,
      reason: `Auto-Koreksi Fonetik: ${word} ➔ ${rep.target}`,
    };
  }

  // 2. Iterate known FMCG vocabulary using Damerau-Levenshtein
  let bestCandidate: string | null = null;
  let bestDist = Infinity;
  let bestSim = 0;

  for (const item of KNOWN_FMCG_TERMS) {
    const target = item.canonical;
    const targetLower = target.toLowerCase();

    // Distance against actual word
    const dist = calculateLevenshteinDistance(clean, targetLower);
    const sim = calculateSimilarity(clean, targetLower);

    // Also compare phonetic form
    const distPhone = calculateLevenshteinDistance(phonetic, targetLower);
    const simPhone = calculateSimilarity(phonetic, targetLower);

    const minDist = Math.min(dist, distPhone);
    const maxSim = Math.max(sim, simPhone);

    const maxAllowedDist = clean.length <= 4 ? 1 : clean.length <= 7 ? 2 : 3;

    if (minDist <= maxAllowedDist && maxSim >= 0.70) {
      if (minDist < bestDist || (minDist === bestDist && maxSim > bestSim)) {
        bestDist = minDist;
        bestSim = maxSim;
        bestCandidate = target;
      }
    }
  }

  if (bestCandidate && bestSim >= 0.70) {
    return {
      matched: bestCandidate,
      reason: `Auto-Koreksi AI Typo: ${word} ➔ ${bestCandidate}`,
    };
  }

  return null;
}

// ==========================================
// 3. Price & Multi-Unit Wholesale Helper
// ==========================================

export function parsePriceNumber(val: string | undefined, defaultVal = 0): number {
  if (!val) return defaultVal;
  let str = val.replace(/Rp|IDR|\s/gi, '').trim();
  // Check if it's a decimal number like 4499.93 or 0.11
  if (/^\d+\.\d{1,2}$/.test(str)) {
    const flt = parseFloat(str);
    return isNaN(flt) ? defaultVal : Math.round(flt);
  }
  // Check Indonesian thousands with comma decimal: e.g. 4.499,93 or 4499,93
  if (/^\d+(\.\d{3})*,\d{1,2}$/.test(str)) {
    const cleaned = str.replace(/\./g, '').replace(',', '.');
    const flt = parseFloat(cleaned);
    return isNaN(flt) ? defaultVal : Math.round(flt);
  }
  if (/^\d{1,3}(\.\d{3})+$/.test(str)) {
    str = str.replace(/\./g, '');
  } else if (/^\d{1,3}(,\d{3})+$/.test(str)) {
    str = str.replace(/,/g, '');
  } else {
    str = str.replace(/[^0-9]/g, '');
  }
  const num = parseInt(str, 10);
  return isNaN(num) ? defaultVal : num;
}

export function generateWholesaleUnits(
  categoryId: string,
  productName: string,
  unit: string,
  price: number,
  costPrice: number,
  index: number
): WholesaleUnit[] {
  const units: WholesaleUnit[] = [];
  const lower = productName.toLowerCase();

  if (categoryId === 'instant' || lower.includes('mie') || lower.includes('indomie') || lower.includes('sedaap') || lower.includes('sarimi')) {
    // Standar Grosir Mie Instan: 1 Dus = 40 Bungkus, 1 Pak = 5 Bungkus
    units.push({
      id: `wh-dus-${index}-${Date.now()}`,
      name: 'Dus (40 Bungkus)',
      multiplier: 40,
      price: Math.round((price * 40 * 0.94) / 500) * 500,
      costPrice: costPrice * 40,
    });
    units.push({
      id: `wh-pak-${index}-${Date.now()}`,
      name: 'Pak (5 Bungkus)',
      multiplier: 5,
      price: Math.round((price * 5 * 0.98) / 500) * 500,
      costPrice: costPrice * 5,
    });
  } else if (lower.includes('kecap') || lower.includes('bango') || lower.includes('saus') || lower.includes('sambal')) {
    // Standar Grosir Kecap & Bumbu Masak
    if (unit === 'sachet' || lower.includes('sachet') || lower.includes('renceng')) {
      units.push({
        id: `wh-rcg-kcp-${index}`,
        name: 'Renceng (12 Sachet)',
        multiplier: 12,
        price: Math.round((price * 12 * 0.93) / 500) * 500,
        costPrice: costPrice * 12,
      });
    } else {
      units.push({
        id: `wh-dus-kcp-${index}`,
        name: 'Karton (12 Pouch / Botol)',
        multiplier: 12,
        price: Math.round((price * 12 * 0.94) / 500) * 500,
        costPrice: costPrice * 12,
      });
      units.push({
        id: `wh-dus-kcp2-${index}`,
        name: 'Dus Besar (24 Pouch / Botol)',
        multiplier: 24,
        price: Math.round((price * 24 * 0.90) / 1000) * 1000,
        costPrice: costPrice * 24,
      });
    }
  } else if (lower.includes('zwitsal') || lower.includes('baby') || lower.includes('cussons') || lower.includes('my baby') || lower.includes('telon')) {
    // Standar Grosir Perlengkapan Bayi
    units.push({
      id: `wh-lsn-bby-${index}`,
      name: `Lusin (12 ${unit})`,
      multiplier: 12,
      price: Math.round((price * 12 * 0.94) / 500) * 500,
      costPrice: costPrice * 12,
    });
    units.push({
      id: `wh-ktn-bby-${index}`,
      name: `Karton (36 ${unit} / 3 Lusin)`,
      multiplier: 36,
      price: Math.round((price * 36 * 0.90) / 1000) * 1000,
      costPrice: costPrice * 36,
    });
  } else if (lower.includes('zinc') || lower.includes('zink') || lower.includes('shampoo') || lower.includes('sunsilk') || lower.includes('pantene') || lower.includes('clear')) {
    // Standar Grosir Shampoo & Perawatan Rambut
    if (unit === 'sachet' || lower.includes('sachet') || lower.includes('renceng') || lower.includes('sct')) {
      units.push({
        id: `wh-rcg-shamp-${index}`,
        name: 'Renceng (12 Sachet)',
        multiplier: 12,
        price: Math.round((price * 12 * 0.93) / 500) * 500,
        costPrice: costPrice * 12,
      });
      units.push({
        id: `wh-dus-shamp-${index}`,
        name: 'Dus (288 Sachet / 24 Renceng)',
        multiplier: 288,
        price: Math.round((price * 288 * 0.88) / 1000) * 1000,
        costPrice: costPrice * 288,
      });
    } else {
      units.push({
        id: `wh-lsn-shamp-${index}`,
        name: 'Lusin (12 Botol)',
        multiplier: 12,
        price: Math.round((price * 12 * 0.94) / 500) * 500,
        costPrice: costPrice * 12,
      });
      units.push({
        id: `wh-ktn-shamp-${index}`,
        name: 'Karton (36 Botol / 3 Lusin)',
        multiplier: 36,
        price: Math.round((price * 36 * 0.90) / 1000) * 1000,
        costPrice: costPrice * 36,
      });
    }
  } else if (categoryId === 'groceries' && (lower.includes('minyak') || lower.includes('bimoli') || lower.includes('sania') || lower.includes('filma') || lower.includes('sunco'))) {
    if (lower.includes('2l') || lower.includes('2 liter') || lower.includes('2 l')) {
      units.push({
        id: `wh-myk2-${index}`,
        name: 'Karton (6 Pouch / 2L)',
        multiplier: 6,
        price: Math.round((price * 6 * 0.96) / 500) * 500,
        costPrice: costPrice * 6,
      });
    } else {
      units.push({
        id: `wh-myk1-${index}`,
        name: 'Karton (12 Pouch / 1L)',
        multiplier: 12,
        price: Math.round((price * 12 * 0.96) / 500) * 500,
        costPrice: costPrice * 12,
      });
    }
  } else if (categoryId === 'tobacco' || lower.includes('rokok') || lower.includes('sampoerna') || lower.includes('djarum') || lower.includes('surya') || lower.includes('marlboro')) {
    // Standar Grosir Rokok: 1 Slop = 10 Bungkus, 1 Bal = 200 Bungkus
    units.push({
      id: `wh-slop-${index}`,
      name: 'Slop (10 Bungkus)',
      multiplier: 10,
      price: Math.round((price * 10 * 0.97) / 1000) * 1000,
      costPrice: costPrice * 10,
    });
    units.push({
      id: `wh-bal-${index}`,
      name: 'Bal (200 Bungkus / 20 Slop)',
      multiplier: 200,
      price: Math.round((price * 200 * 0.95) / 5000) * 5000,
      costPrice: costPrice * 200,
    });
  } else if (categoryId === 'beverages') {
    if (lower.includes('kopi') || unit === 'sachet' || lower.includes('renceng') || lower.includes('sct')) {
      units.push({
        id: `wh-rcg-${index}`,
        name: 'Renceng (10 Sachet)',
        multiplier: 10,
        price: Math.round((price * 10 * 0.93) / 500) * 500,
        costPrice: costPrice * 10,
      });
      units.push({
        id: `wh-dus-kopi-${index}`,
        name: 'Dus (120 Sachet / 12 Renceng)',
        multiplier: 120,
        price: Math.round((price * 120 * 0.90) / 1000) * 1000,
        costPrice: costPrice * 120,
      });
    } else {
      const mult = lower.includes('aqua') || lower.includes('minerale') ? 24 : 12;
      units.push({
        id: `wh-dus-minum-${index}`,
        name: `Dus / Karton (${mult} ${unit})`,
        multiplier: mult,
        price: Math.round((price * mult * 0.93) / 500) * 500,
        costPrice: costPrice * mult,
      });
    }
  } else if (categoryId === 'personal_care' || categoryId === 'home_care') {
    units.push({
      id: `wh-lsn-${index}`,
      name: `Lusin (12 ${unit})`,
      multiplier: 12,
      price: Math.round((price * 12 * 0.94) / 500) * 500,
      costPrice: costPrice * 12,
    });
    units.push({
      id: `wh-ktn-${index}`,
      name: `Karton (72 ${unit} / 6 Lusin)`,
      multiplier: 72,
      price: Math.round((price * 72 * 0.90) / 1000) * 1000,
      costPrice: costPrice * 72,
    });
  } else if (categoryId === 'groceries' && lower.includes('beras')) {
    units.push({
      id: `wh-bal-beras-${index}`,
      name: 'Bal / Karung (5 Sak / 25kg)',
      multiplier: 5,
      price: Math.round((price * 5 * 0.96) / 1000) * 1000,
      costPrice: costPrice * 5,
    });
  } else if (costPrice > 0 && price > 0) {
    units.push({
      id: `wh-pak-gen-${index}`,
      name: `Pak / Karton (12 ${unit})`,
      multiplier: 12,
      price: Math.round((price * 12 * 0.95) / 500) * 500,
      costPrice: costPrice * 12,
    });
  }

  return units;
}

// ==========================================
// 3.5 Alphanumeric Barcode Detection & Parser
// ==========================================

/**
 * Detect if a token/string looks like a barcode or product code (alphanumeric or numeric).
 * Supports standard numeric EAN/UPC (e.g. 8998866200223) as well as alphanumeric codes
 * (e.g. BC-1234, ZN-SHMP-170, BAR1002, EAN992A, SKU-001, ABC899123).
 */
export function isLikelyBarcode(token: string): boolean {
  if (!token) return false;
  const raw = token.trim();

  // Explicit prefix e.g. barcode:XYZ, bc:XYZ, code:XYZ
  if (/^(?:barcode|bc|ean|code|sku)[:=-][a-zA-Z0-9\-_./]+$/i.test(raw)) {
    return true;
  }

  // Pure numeric barcode (4 to 18 digits)
  if (/^\d{4,18}$/.test(raw)) {
    return true;
  }

  // Alphanumeric barcode (letters + numbers, or barcode prefixes, e.g. "BC-10293", "ZN-170ML", "BAR89912", "EAN-13A", "ABC001")
  if (/^[A-Za-z0-9\-_./]{3,32}$/.test(raw)) {
    // Check if it contains both letters and numbers, or explicit uppercase code structure
    const hasLetters = /[A-Za-z]/.test(raw);
    const hasDigits = /\d/.test(raw);
    const hasHyphenOrDot = /[-_./]/.test(raw);

    // If it has both letters and numbers or special separators
    if ((hasLetters && hasDigits) || (hasHyphenOrDot && (hasLetters || hasDigits))) {
      // Exclude pure gramasi patterns like 100ml, 80g, 2L, 5kg, 16btg
      if (/^\d+(?:[.,]\d+)?\s*(?:ml|g|gr|gram|kg|kilo|kilogram|l|ltr|lt|liter|btg|bts|batang|sct|pcs|bks|dus|slop|sak|pouch|botol|kaleng)$/i.test(raw)) {
        return false;
      }
      return true;
    }

    // Common barcode prefixes e.g. "BAR-ZINC", "BC-SHAMPOO", "SKU-ABC"
    if (/^(?:bc|bar|ean|code|sku|kdp)[-_]/i.test(raw)) {
      return true;
    }
  }

  return false;
}

/**
 * Extract clean barcode value from raw token (stripping barcode: / bc: / code: prefix if present)
 */
export function extractCleanBarcode(token: string): string {
  if (!token) return '';
  return token.trim().replace(/^(?:barcode|bc|ean|code|sku)[:=-]\s*/i, '');
}

// ==========================================
// 4. Master Parsing & Smart Normalization
// ==========================================

export function parseRetailLine(
  rawLine: string,
  index: number,
  minProfitPoints = 15
): ParsedItem | null {
  const line = rawLine.trim();
  if (!line) return null;

  const lineLower = line.toLowerCase();

  // Skip header rows
  if (
    (lineLower.includes('barcode') && lineLower.includes('nama')) ||
    (lineLower.includes('kode') && lineLower.includes('nama')) ||
    (lineLower.includes('nama produk') && lineLower.includes('harga')) ||
    (lineLower.includes('harga beli') && lineLower.includes('harga jual')) ||
    (lineLower.includes('display rak') && lineLower.includes('perolehan')) ||
    (lineLower.startsWith('no;') && lineLower.includes('nama')) ||
    (lineLower.startsWith('no,') && lineLower.includes('nama'))
  ) {
    return null;
  }

  // Detect delimiter
  let delimiter: string | null = null;
  if (line.includes('\t')) delimiter = '\t';
  else if (line.includes(';')) delimiter = ';';
  else if (line.includes('|')) delimiter = '|';
  else if (line.includes(',')) delimiter = ',';

  let rawBarcode = '';
  let rawName = '';
  let rawCost = 0;
  let rawPrice = 0;
  let rawStock = 24;
  let rawCategoryHint = '';

  if (delimiter) {
    const rawParts = line.split(delimiter).map((p) => p.replace(/^["']|["']$/g, '').trim());

    if (rawParts.length >= 5) {
      // Check if format is: Kode Barang, Nama Barang, Display Rak, Jumlah, Harga Perolehan
      const col2Val = parsePriceNumber(rawParts[2], -1);
      const col3Val = parsePriceNumber(rawParts[3], -1);
      const col4Val = parsePriceNumber(rawParts[4], -1);

      const isDisplayJumlahPerolehan =
        col4Val >= 0 &&
        col3Val >= 0 &&
        col2Val >= 0 &&
        (col4Val >= 100 || (col4Val === 0 && col3Val <= 1000));

      if (isDisplayJumlahPerolehan) {
        rawBarcode = extractCleanBarcode(rawParts[0]);
        rawName = rawParts[1] || `Produk #${index + 1}`;
        rawCost = Math.round(col4Val * 100) / 100;
        rawStock = Math.max(0, col3Val);
        rawPrice = rawCost > 0 ? Math.ceil((rawCost * 1.25) / 100) * 100 : 5000;
        if (rawParts[5]) rawCategoryHint = rawParts[5];
      } else if (isLikelyBarcode(rawParts[0])) {
        rawBarcode = extractCleanBarcode(rawParts[0]);
        rawName = rawParts[1] || `Produk #${index + 1}`;
        rawCost = parsePriceNumber(rawParts[2], 0);
        rawPrice = parsePriceNumber(rawParts[3], rawCost > 0 ? Math.round(rawCost * 1.25) : 5000);
        rawStock = parsePriceNumber(rawParts[4], 24);
        if (rawParts[5]) rawCategoryHint = rawParts[5];
      } else {
        rawName = rawParts[0];
        rawCost = parsePriceNumber(rawParts[1], 0);
        rawPrice = parsePriceNumber(rawParts[2], rawCost > 0 ? Math.round(rawCost * 1.25) : 5000);
        rawStock = parsePriceNumber(rawParts[3], 24);
        rawBarcode = extractCleanBarcode(rawParts[4] || '');
      }
    } else if (rawParts.length === 4) {
      if (isLikelyBarcode(rawParts[0])) {
        rawBarcode = extractCleanBarcode(rawParts[0]);
        rawName = rawParts[1] || `Produk #${index + 1}`;
        rawCost = parsePriceNumber(rawParts[2], 0);
        rawPrice = parsePriceNumber(rawParts[3], rawCost > 0 ? Math.round(rawCost * 1.25) : 5000);
      } else if (isLikelyBarcode(rawParts[3])) {
        rawName = rawParts[0];
        rawCost = parsePriceNumber(rawParts[1], 0);
        rawPrice = parsePriceNumber(rawParts[2], rawCost > 0 ? Math.round(rawCost * 1.25) : 5000);
        rawBarcode = extractCleanBarcode(rawParts[3]);
      } else {
        rawName = rawParts[0];
        rawCost = parsePriceNumber(rawParts[1], 0);
        rawPrice = parsePriceNumber(rawParts[2], rawCost > 0 ? Math.round(rawCost * 1.25) : 5000);
        rawStock = parsePriceNumber(rawParts[3], 24);
      }
    } else if (rawParts.length === 3) {
      if (isLikelyBarcode(rawParts[0])) {
        rawBarcode = extractCleanBarcode(rawParts[0]);
        rawName = rawParts[1];
        rawPrice = parsePriceNumber(rawParts[2], 5000);
        rawCost = Math.round(rawPrice * 0.8);
      } else {
        rawName = rawParts[0];
        const p1 = parsePriceNumber(rawParts[1], 0);
        const p2 = parsePriceNumber(rawParts[2], 0);
        if (p2 > 1000) {
          rawCost = p1;
          rawPrice = p2;
        } else {
          rawCost = Math.round(p1 * 0.8);
          rawPrice = p1;
          rawStock = p2 || 24;
        }
      }
    } else if (rawParts.length === 2) {
      if (isLikelyBarcode(rawParts[0])) {
        rawBarcode = extractCleanBarcode(rawParts[0]);
        rawName = rawParts[1];
        rawPrice = 5000;
        rawCost = 4000;
      } else {
        rawName = rawParts[0];
        rawPrice = parsePriceNumber(rawParts[1], 5000);
        rawCost = Math.round(rawPrice * 0.8);
      }
    } else {
      rawName = rawParts[0] || `Produk #${index + 1}`;
    }
  } else {
    // Unstructured text parsing
    const tokens = line.split(/\s+/);
    let startIndex = 0;
    if (isLikelyBarcode(tokens[0])) {
      rawBarcode = extractCleanBarcode(tokens[0]);
      startIndex = 1;
    }

    // Helper to test if a token is a size/gramasi indicator (e.g., 100ml, 80g, 5kg, 2L, 16btg)
    const isGramasiToken = (tok: string) =>
      /^\d+(?:[.,]\d+)?\s*(?:ml|g|gr|gram|kg|kilo|kilogram|l|ltr|lt|liter|btg|bts|batang|sct|pcs|bks|dus|slop|sak|pouch|botol|kaleng)$/i.test(tok);

    let stockFound: number | null = null;
    let priceFound: number | null = null;
    let costFound: number | null = null;
    let endIndex = tokens.length;

    for (let i = tokens.length - 1; i >= startIndex; i--) {
      const tok = tokens[i];
      if (isGramasiToken(tok)) {
        // This is part of the product name/gramasi, stop scanning numbers from the right
        break;
      }

      // Check if this token is a standalone unit like "ml", "gr", "kg", "g", etc.
      if (/^(?:ml|g|gr|gram|kg|kilo|kilogram|l|ltr|lt|liter|btg|bts|batang)$/i.test(tok) && i > startIndex) {
        break;
      }

      // Only parse as price/stock if token consists of purely digits or currency format (e.g., "15000", "Rp15.000", "15.000")
      if (!/^(?:rp)?\d{1,3}(?:[.,]\d{3})*(?:[.,]\d+)?$/i.test(tok) && !/^\d+$/.test(tok)) {
        break;
      }

      const cleanNum = parsePriceNumber(tok, -1);
      if (cleanNum >= 0 && cleanNum <= 100000000) {
        if (stockFound === null && cleanNum < 500 && (priceFound !== null || costFound !== null)) {
          stockFound = cleanNum;
          endIndex = i;
        } else if (priceFound === null && cleanNum >= 500) {
          priceFound = cleanNum;
          endIndex = i;
        } else if (costFound === null && cleanNum >= 300) {
          costFound = cleanNum;
          endIndex = i;
        } else if (stockFound === null && cleanNum < 500) {
          stockFound = cleanNum;
          endIndex = i;
        }
      } else {
        break;
      }
    }

    rawName = tokens.slice(startIndex, endIndex).join(' ');
    rawStock = stockFound !== null ? stockFound : 24;
    rawPrice = priceFound !== null ? priceFound : 5000;
    rawCost = costFound !== null ? costFound : Math.round(rawPrice * 0.8);
  }

  // Ensure barcode (support alphanumeric or numeric - only fallback if empty)
  if (!rawBarcode || rawBarcode.trim().length === 0) {
    rawBarcode = `899${Math.floor(100000000 + Math.random() * 900000000)}`;
  }

  const corrections: string[] = [];

  // 1. Gramasi & Ukuran Normalization Engine
  let cleanGramasi = '';
  let normalizedName = rawName;

  // Phrase Replacements First
  for (const phrase of PHRASE_REPLACEMENTS) {
    if (phrase.regex.test(normalizedName)) {
      normalizedName = normalizedName.replace(phrase.regex, phrase.target);
      if (phrase.reason) corrections.push(phrase.reason);
    }
  }

  // Gramasi Gram (e.g. 80 gr, 80gr, 80 gram, 110 gr -> 80g, 110g)
  const gramMatch = normalizedName.match(/(\d+)\s*(?:gr|gram|g)\b/i);
  if (gramMatch) {
    const gNum = gramMatch[1];
    cleanGramasi = `${gNum}g`;
    normalizedName = normalizedName.replace(gramMatch[0], cleanGramasi);
    if (gramMatch[0].trim() !== cleanGramasi) {
      corrections.push(`Gramasi: ${gramMatch[0]} ➔ ${cleanGramasi}`);
    }
  }

  // Gramasi Kg (e.g. 5 kg, 5kg, 5 kilo -> 5kg)
  const kgMatch = normalizedName.match(/(\d+)\s*(?:kg|kilo|kilogram)\b/i);
  if (kgMatch) {
    const kgNum = kgMatch[1];
    cleanGramasi = `${kgNum}kg`;
    normalizedName = normalizedName.replace(kgMatch[0], cleanGramasi);
    if (kgMatch[0].trim() !== cleanGramasi) {
      corrections.push(`Gramasi: ${kgMatch[0]} ➔ ${cleanGramasi}`);
    }
  }

  // Volume Liter (e.g. 2 ltr, 2 liter, 2L, 1.5 ltr -> 2L, 1.5L)
  const literMatch = normalizedName.match(/(\d+(?:[.,]\d+)?)\s*(?:ltr|liter|lt|l)\b/i);
  if (literMatch) {
    const lNum = literMatch[1].replace(',', '.');
    cleanGramasi = `${lNum}L`;
    normalizedName = normalizedName.replace(literMatch[0], cleanGramasi);
    if (literMatch[0].trim() !== cleanGramasi) {
      corrections.push(`Volume: ${literMatch[0]} ➔ ${cleanGramasi}`);
    }
  }

  // Volume ML (e.g. 600 ml, 600ml, 1000 ml -> 600ml, 1000ml)
  const mlMatch = normalizedName.match(/(\d+)\s*(?:ml|mililiter)\b/i);
  if (mlMatch) {
    const mlNum = mlMatch[1];
    cleanGramasi = `${mlNum}ml`;
    normalizedName = normalizedName.replace(mlMatch[0], cleanGramasi);
    if (mlMatch[0].trim() !== cleanGramasi) {
      corrections.push(`Volume: ${mlMatch[0]} ➔ ${cleanGramasi}`);
    }
  }

  // Batang Rokok (e.g. 16 btg, 12 bts, 20 batang -> 16 Batang)
  const btgMatch = normalizedName.match(/(\d+)\s*(?:btg|bts|batang)\b/i);
  if (btgMatch) {
    const btgNum = btgMatch[1];
    cleanGramasi = `${btgNum} Batang`;
    normalizedName = normalizedName.replace(btgMatch[0], cleanGramasi);
    if (btgMatch[0].trim() !== cleanGramasi) {
      corrections.push(`Isi Batang: ${btgMatch[0]} ➔ ${cleanGramasi}`);
    }
  }

  // 2. Word by Word Token Replacement + AI Fuzzy Matcher
  const rawTokens = normalizedName.split(/\s+/);
  const correctedTokens = rawTokens.map((token) => {
    const punctMatch = token.match(/^(.+?)([.,;:!?]+)$/);
    const cleanWord = punctMatch ? punctMatch[1] : token;
    const punct = punctMatch ? punctMatch[2] : '';

    const lower = cleanWord.toLowerCase();

    // Direct dictionary match
    if (WORD_REPLACEMENTS[lower]) {
      const rep = WORD_REPLACEMENTS[lower];
      if (rep.reason && cleanWord.toLowerCase() !== rep.target.toLowerCase()) {
        corrections.push(rep.reason);
      }
      return rep.target + (punct === ',' || punct === '.' ? '' : punct);
    }

    // Only run fuzzy match if word is not already identical to a known canonical term
    const isAlreadyCanonical = KNOWN_FMCG_TERMS.some((t) => t.canonical.toLowerCase() === lower);
    if (!isAlreadyCanonical) {
      const fuzzyResult = smartFuzzyMatchWord(cleanWord);
      if (fuzzyResult && cleanWord.toLowerCase() !== fuzzyResult.matched.toLowerCase()) {
        corrections.push(fuzzyResult.reason);
        return fuzzyResult.matched + (punct === ',' || punct === '.' ? '' : punct);
      }
    }

    // Capitalize first letter if lowercase
    if (cleanWord.length > 0 && cleanWord === cleanWord.toLowerCase()) {
      return cleanWord.charAt(0).toUpperCase() + cleanWord.slice(1) + punct;
    }
    return token;
  });

  let finalName = correctedTokens.join(' ').replace(/\s+/g, ' ').trim();

  // 3. Category, Brand & Unit Determination
  let categoryId = rawCategoryHint ? mapCategory(rawCategoryHint) : mapCategory(finalName);
  let unit = 'pcs';
  let brand = 'Umum';

  const lowerFull = finalName.toLowerCase();

  if (lowerFull.includes('zwitsal') || lowerFull.includes('baby') || lowerFull.includes('cussons') || lowerFull.includes('my baby') || lowerFull.includes('telon') || lowerFull.includes('popok')) {
    categoryId = 'personal_care';
    unit = lowerFull.includes('shampoo') || lowerFull.includes('sabun') || lowerFull.includes('telon') ? 'botol' : lowerFull.includes('popok') ? 'pack' : 'pcs';
    brand = lowerFull.includes('zwitsal') ? 'Zwitsal' : lowerFull.includes('cussons') ? 'Cussons' : lowerFull.includes('my baby') ? 'My Baby' : 'Zwitsal';
  } else if (lowerFull.includes('kecap') || lowerFull.includes('bango') || lowerFull.includes('saus') || lowerFull.includes('sambal') || lowerFull.includes('royco') || lowerFull.includes('masako') || lowerFull.includes('saori') || lowerFull.includes('sajiku') || lowerFull.includes('sasa')) {
    categoryId = 'groceries';
    unit = lowerFull.includes('sachet') ? 'sachet' : lowerFull.includes('botol') ? 'botol' : lowerFull.includes('pouch') ? 'pouch' : 'botol';
    brand = lowerFull.includes('bango') ? 'Bango' : lowerFull.includes('abc') ? 'ABC' : lowerFull.includes('royco') ? 'Royco' : lowerFull.includes('masako') ? 'Masako' : lowerFull.includes('saori') ? 'Saori' : 'Bango';
  } else if (lowerFull.includes('indomie') || lowerFull.includes('mie') || lowerFull.includes('sedaap') || lowerFull.includes('sarimi') || lowerFull.includes('supermi')) {
    categoryId = 'instant';
    unit = 'bungkus';
    brand = lowerFull.includes('indomie') ? 'Indomie' : lowerFull.includes('sedaap') ? 'Wings Food' : 'Indofood';
  } else if (lowerFull.includes('minyak') || lowerFull.includes('bimoli') || lowerFull.includes('sania') || lowerFull.includes('filma') || lowerFull.includes('sunco') || lowerFull.includes('tropical')) {
    categoryId = 'groceries';
    unit = 'pouch';
    brand = lowerFull.includes('bimoli') ? 'Bimoli' : lowerFull.includes('sania') ? 'Sania' : lowerFull.includes('filma') ? 'Filma' : lowerFull.includes('sunco') ? 'SunCo' : 'Tropical';
  } else if (lowerFull.includes('rokok') || lowerFull.includes('sampoerna') || lowerFull.includes('djarum') || lowerFull.includes('surya') || lowerFull.includes('marlboro')) {
    categoryId = 'tobacco';
    unit = 'bungkus';
    brand = lowerFull.includes('sampoerna') ? 'HM Sampoerna' : lowerFull.includes('djarum') ? 'Djarum' : lowerFull.includes('surya') ? 'Gudang Garam' : 'Philip Morris';
  } else if (lowerFull.includes('kopi') || lowerFull.includes('kapal api') || lowerFull.includes('luwak') || lowerFull.includes('torabika') || lowerFull.includes('good day')) {
    categoryId = 'beverages';
    unit = lowerFull.includes('botol') ? 'botol' : 'sachet';
    brand = lowerFull.includes('kapal api') ? 'Kapal Api' : lowerFull.includes('luwak') ? 'Luwak' : lowerFull.includes('torabika') ? 'Torabika' : 'Kapal Api Group';
  } else if (lowerFull.includes('zinc') || lowerFull.includes('zink') || lowerFull.includes('sabun') || lowerFull.includes('lifebuoy') || lowerFull.includes('pepsodent') || lowerFull.includes('sunsilk') || lowerFull.includes('pantene') || lowerFull.includes('clear') || lowerFull.includes('dettol')) {
    categoryId = 'personal_care';
    unit = lowerFull.includes('sachet') || lowerFull.includes('renceng') ? 'sachet' : lowerFull.includes('shampoo') || lowerFull.includes('shampo') || lowerFull.includes('zinc') ? 'botol' : lowerFull.includes('pasta') ? 'tube' : 'pcs';
    brand = lowerFull.includes('zinc') || lowerFull.includes('zink') ? 'Zinc' : lowerFull.includes('lifebuoy') ? 'Lifebuoy' : lowerFull.includes('pepsodent') ? 'Pepsodent' : lowerFull.includes('sunsilk') ? 'Sunsilk' : lowerFull.includes('pantene') ? 'Pantene' : lowerFull.includes('clear') ? 'Clear' : 'Lion Wings';
  } else if (lowerFull.includes('deterjen') || lowerFull.includes('rinso') || lowerFull.includes('daia') || lowerFull.includes('molto') || lowerFull.includes('sunlight') || lowerFull.includes('mama lemon') || lowerFull.includes('b29')) {
    categoryId = 'home_care';
    unit = lowerFull.includes('piring') || lowerFull.includes('sunlight') || lowerFull.includes('mama') ? 'pouch' : 'bungkus';
    brand = lowerFull.includes('rinso') ? 'Rinso' : lowerFull.includes('daia') ? 'Daia' : lowerFull.includes('molto') ? 'Molto' : lowerFull.includes('sunlight') ? 'Sunlight' : 'Wings';
  } else if (lowerFull.includes('beras') || lowerFull.includes('pandan wangi') || lowerFull.includes('rojolele')) {
    categoryId = 'groceries';
    unit = 'sak';
    brand = 'Pandan Wangi';
  } else if (lowerFull.includes('aqua') || lowerFull.includes('minerale') || lowerFull.includes('ultra milk') || lowerFull.includes('bear brand') || lowerFull.includes('teh botol') || lowerFull.includes('pucuk')) {
    categoryId = 'beverages';
    unit = lowerFull.includes('kotak') || lowerFull.includes('ultra') ? 'kotak' : lowerFull.includes('kaleng') || lowerFull.includes('bear') ? 'kaleng' : 'botol';
    brand = lowerFull.includes('aqua') ? 'Danone AQUA' : lowerFull.includes('minerale') ? 'Le Minerale' : lowerFull.includes('ultra') ? 'Ultra Jaya' : lowerFull.includes('bear') ? 'Nestle' : 'Sosro';
  } else if (lowerFull.includes('biskuit') || lowerFull.includes('khong guan') || lowerFull.includes('roma') || lowerFull.includes('tango') || lowerFull.includes('nabati') || lowerFull.includes('oreo') || lowerFull.includes('chitato')) {
    categoryId = 'snacks';
    unit = lowerFull.includes('kaleng') ? 'kaleng' : 'pack';
    brand = lowerFull.includes('khong guan') ? 'Khong Guan' : lowerFull.includes('roma') ? 'Mayora' : lowerFull.includes('chitato') ? 'Indofood' : 'Oreo';
  } else {
    const firstWord = finalName.split(' ')[0];
    if (firstWord && firstWord.length > 2) {
      brand = firstWord;
    }
  }

  // 4. Generate Multi-packaging Wholesale Units
  const wholesaleUnits = generateWholesaleUnits(categoryId, finalName, unit, rawPrice, rawCost, index);

  // 5. Margin & Member Points Calculation
  const marginNominal = Math.max(0, rawPrice - rawCost);
  const profitMarginPercent = rawPrice > 0 ? (marginNominal / rawPrice) * 100 : 0;
  const isPointsEligible = profitMarginPercent >= minProfitPoints;

  const sku = `SKU-${categoryId.slice(0, 3).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;

  // Deduplicate corrections
  const uniqueCorrections = Array.from(new Set(corrections));

  return {
    id: `parsed-${index}-${Date.now()}-${rawBarcode}`,
    originalText: line,
    name: finalName,
    brand,
    gramasi: cleanGramasi,
    categoryId,
    unit,
    costPrice: rawCost,
    price: rawPrice,
    stock: rawStock,
    sku,
    barcode: rawBarcode,
    aisle: 'Lorong Toko',
    wholesaleUnits,
    corrections: uniqueCorrections,
    profitMarginPercent,
    isPointsEligible,
    selected: true,
  };
}

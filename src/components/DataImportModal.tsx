import React, { useState, useMemo } from 'react';
import {
  X,
  Upload,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  ArrowRight,
  Boxes,
  Award,
  Trash2,
  RefreshCw,
  FileText,
  Copy,
  Layers,
  Tag,
  Check,
  Globe,
} from 'lucide-react';
import { Product, WholesaleUnit } from '../types';
import { usePOS } from '../context/POSContext';
import { INITIAL_PRODUCTS } from '../data/mockData';
import { formatCurrency } from '../utils/formatters';
import { mapCategory, getImageForCategory } from '../data/importHelpers';

interface DataImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ParsedItem {
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

const SAMPLE_RAW_DATA = `8999999190112, indomi grg spsial 80 gr, 2700, 3100, 120
8992775211029, myk grg bmol 2 ltr, 33500, 38500, 36
8993175532014, myk grg snia 1 ltr, 16800, 19500, 48
8999909001234, rokok samporna mild 16 btg, 31500, 34000, 80
8998866200112, rokok djarum supr 12 btg, 22000, 24000, 60
8991001100223, kopi kapal api spc mix 24 gr, 1100, 1500, 200
8992745330101, kopi luwak wite koffie 20 gr, 1200, 1600, 150
8999999052212, sbun lifbouy red 110 gr, 3800, 4800, 72
8992741981203, sabun b29 piring 750 ml, 9500, 12500, 40
8999999041121, shampo sunslk black 170 ml, 18500, 23500, 30
8999999031102, pasta gigi pepsoden 190 gr, 12500, 16000, 45
8991234567890, beras pandn wngi 5 kg, 68000, 78000, 25
8992745110021, susu uht ultr coklat 1000 ml, 17500, 21500, 36
8992741910012, air min aqua btl 600 ml, 2800, 3500, 96
8992388011200, biskut khong guan kalg 1600 gr, 85000, 105000, 12`;

export const DataImportModal: React.FC<DataImportModalProps> = ({ isOpen, onClose }) => {
  const { products, addProductsBatch, clearImportedProducts, settings } = usePOS();
  const minProfitPoints = settings.minProfitPercentForPoints ?? 15;

  const [rawInput, setRawInput] = useState(SAMPLE_RAW_DATA);
  const [importedCount, setImportedCount] = useState<number | null>(null);
  const [clearMessage, setClearMessage] = useState<string | null>(null);

  // Check how many imported products exist in system
  const initialProductIds = useMemo(() => new Set(INITIAL_PRODUCTS.map((p) => p.id)), []);
  const currentImportedCount = useMemo(
    () => products.filter((p) => !initialProductIds.has(p.id)).length,
    [products, initialProductIds]
  );

  const handleClearPreviousImported = () => {
    const count = currentImportedCount;
    clearImportedProducts();
    setClearMessage(`Berhasil menghapus ${count} data master produk impor dari katalog.`);
    setTimeout(() => setClearMessage(null), 4000);
  };

  // Helper to parse price/cost/stock numbers formatted as Rp, with dots/commas
  const parsePriceNumber = (val: string | undefined, defaultVal = 0): number => {
    if (!val) return defaultVal;
    let str = val.replace(/Rp|\s/gi, '').trim();
    if (/^\d{1,3}(\.\d{3})+$/.test(str)) {
      str = str.replace(/\./g, '');
    } else if (/^\d{1,3}(,\d{3})+$/.test(str)) {
      str = str.replace(/,/g, '');
    } else {
      str = str.replace(/[^0-9]/g, '');
    }
    const num = parseInt(str, 10);
    return isNaN(num) ? defaultVal : num;
  };

  // Indonesian Retail Text & Gramasi Normalization Engine
  const normalizeIndonesianRetail = (line: string, index: number): ParsedItem | null => {
    if (!line.trim()) return null;

    // Detect delimiter: tab, semicolon, pipe, or comma
    let delimiter = ',';
    if (line.includes('\t')) delimiter = '\t';
    else if (line.includes(';')) delimiter = ';';
    else if (line.includes('|')) delimiter = '|';
    else if (line.includes(',')) delimiter = ',';

    const rawParts = line.split(delimiter).map((p) => p.trim());
    const lineLower = line.toLowerCase();

    // Check if header row
    if (
      (lineLower.includes('barcode') && lineLower.includes('nama')) ||
      (lineLower.includes('nama produk') && lineLower.includes('harga')) ||
      (lineLower.includes('harga beli') && lineLower.includes('harga jual'))
    ) {
      return null; // Skip header row
    }

    // Extended 9+ column CSV format (Barcode;Nama;Terkoreksi;Kategori;Satuan;Modal;Harga;Stok;MinStok;Lokasi)
    if (rawParts.length >= 9 && rawParts[3] && isNaN(Number(rawParts[3]))) {
      const rawBarcode = rawParts[0] || `899${Math.floor(100000000 + Math.random() * 900000000)}`;
      const rawName = rawParts[1] || `Barang #${index + 1}`;
      const wasCorrected = rawParts[2] === 'Ya';
      const catStr = rawParts[3] || 'Sembako & Bumbu Dapur';
      const unit = rawParts[4] || 'pcs';
      const rawCost = parsePriceNumber(rawParts[5], 0);
      const rawPrice = parsePriceNumber(rawParts[6], rawCost > 0 ? Math.round(rawCost * 1.25) : 5000);
      const rawStock = parsePriceNumber(rawParts[7], 10);
      const aisle = rawParts[9] || 'Lorong Toko';

      const categoryId = mapCategory(catStr);
      const brand = rawName.split(' ')[0] || 'Umum';

      const corrections: string[] = [];
      if (wasCorrected) {
        corrections.push('Nama terstandardisasi ritel');
      }

      // Wholesale units generator
      const wholesaleUnits: WholesaleUnit[] = [];
      const lowerFull = rawName.toLowerCase();
      if (categoryId === 'instant' || lowerFull.includes('mie') || lowerFull.includes('indomie')) {
        wholesaleUnits.push({
          id: `wh-dus-${index}`,
          name: 'Dus (40 Bungkus)',
          multiplier: 40,
          price: Math.round((rawPrice * 40 * 0.94) / 1000) * 1000,
          costPrice: rawCost * 40,
        });
      } else if (categoryId === 'beverages' && (unit === 'botol' || unit === 'pcs' || unit === 'kotak')) {
        wholesaleUnits.push({
          id: `wh-dus-${index}`,
          name: 'Dus (24 Pcs)',
          multiplier: 24,
          price: Math.round((rawPrice * 24 * 0.93) / 1000) * 1000,
          costPrice: rawCost * 24,
        });
      } else if (rawCost > 0) {
        wholesaleUnits.push({
          id: `wh-pak-${index}`,
          name: `Pak / Karton (12 ${unit})`,
          multiplier: 12,
          price: Math.round((rawPrice * 12 * 0.95) / 500) * 500,
          costPrice: rawCost * 12,
        });
      }

      const marginNominal = Math.max(0, rawPrice - rawCost);
      const profitMarginPercent = rawPrice > 0 ? (marginNominal / rawPrice) * 100 : 0;
      const isPointsEligible = profitMarginPercent >= minProfitPoints;
      const sku = `SKU-${categoryId.slice(0, 3).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;

      return {
        id: `parsed-csv-${index}-${rawBarcode}`,
        originalText: line,
        name: rawName,
        brand,
        gramasi: '',
        categoryId,
        unit,
        costPrice: rawCost,
        price: rawPrice,
        stock: rawStock,
        sku,
        barcode: rawBarcode,
        aisle,
        wholesaleUnits,
        corrections,
        profitMarginPercent,
        isPointsEligible,
        selected: true,
      };
    }

    // Standard Formula: [0] Barcode, [1] Nama Produk, [2] Harga Beli, [3] Harga Jual, [4] Stok
    let rawBarcode = '';
    let rawName = '';
    let rawCost = 0;
    let rawPrice = 0;
    let rawStock = 0;

    if (rawParts.length >= 5) {
      // 5-Column Standard: Barcode, Nama Produk, Harga Beli, Harga Jual, Stok
      rawBarcode = rawParts[0].trim();
      rawName = rawParts[1].trim() || `Barang #${index + 1}`;
      rawCost = parsePriceNumber(rawParts[2], 0);
      rawPrice = parsePriceNumber(rawParts[3], rawCost > 0 ? Math.round(rawCost * 1.25) : 5000);
      rawStock = parsePriceNumber(rawParts[4], 10);
    } else if (rawParts.length === 4) {
      // 4-Column Fallback: Nama Produk, Harga Beli, Harga Jual, Stok (auto-generated barcode)
      rawName = rawParts[0].trim() || `Barang #${index + 1}`;
      rawCost = parsePriceNumber(rawParts[1], 0);
      rawPrice = parsePriceNumber(rawParts[2], rawCost > 0 ? Math.round(rawCost * 1.25) : 5000);
      rawStock = parsePriceNumber(rawParts[3], 10);
    } else {
      // Shorter line
      rawName = rawParts[0]?.trim() || `Barang #${index + 1}`;
      rawCost = parsePriceNumber(rawParts[1], 0);
      rawPrice = parsePriceNumber(rawParts[2], rawCost > 0 ? Math.round(rawCost * 1.25) : 5000);
      rawStock = 10;
    }

    // Auto-generate valid EAN-13 barcode if missing or invalid
    if (!rawBarcode || rawBarcode.length < 4) {
      rawBarcode = `899${Math.floor(100000000 + Math.random() * 900000000)}`;
    }

    const corrections: string[] = [];

    // 1. Gramasi & Ukuran Normalization
    let cleanGramasi = '';
    let normalizedName = rawName;

    // Gramasi Gram (e.g. 80 gr, 80gr, 80 gram, 110 gr -> 80g, 110g)
    const gramMatch = normalizedName.match(/(\d+)\s*(gr|gram|g)\b/i);
    if (gramMatch) {
      const gNum = gramMatch[1];
      cleanGramasi = `${gNum}g`;
      normalizedName = normalizedName.replace(gramMatch[0], cleanGramasi);
      if (gramMatch[0] !== cleanGramasi) {
        corrections.push(`Gramasi: ${gramMatch[0]} ➔ ${cleanGramasi}`);
      }
    }

    // Gramasi Kg (e.g. 5 kg, 5kg, 5 kilo -> 5kg)
    const kgMatch = normalizedName.match(/(\d+)\s*(kg|kilo|kilogram)\b/i);
    if (kgMatch) {
      const kgNum = kgMatch[1];
      cleanGramasi = `${kgNum}kg`;
      normalizedName = normalizedName.replace(kgMatch[0], cleanGramasi);
      if (kgMatch[0] !== cleanGramasi) {
        corrections.push(`Gramasi: ${kgMatch[0]} ➔ ${cleanGramasi}`);
      }
    }

    // Volume Liter (e.g. 2 ltr, 2 liter, 2 l, 2L -> 2 Liter)
    const literMatch = normalizedName.match(/(\d+)\s*(ltr|liter|lt|l)\b/i);
    if (literMatch) {
      const lNum = literMatch[1];
      cleanGramasi = `${lNum} Liter`;
      normalizedName = normalizedName.replace(literMatch[0], cleanGramasi);
      if (literMatch[0] !== cleanGramasi) {
        corrections.push(`Volume: ${literMatch[0]} ➔ ${cleanGramasi}`);
      }
    }

    // Volume ML (e.g. 600 ml, 600ml, 1000 ml -> 600ml, 1000ml)
    const mlMatch = normalizedName.match(/(\d+)\s*(ml|mililiter)\b/i);
    if (mlMatch) {
      const mlNum = mlMatch[1];
      cleanGramasi = `${mlNum}ml`;
      normalizedName = normalizedName.replace(mlMatch[0], cleanGramasi);
      if (mlMatch[0] !== cleanGramasi) {
        corrections.push(`Volume: ${mlMatch[0]} ➔ ${cleanGramasi}`);
      }
    }

    // Batang Rokok (e.g. 16 btg, 12 btg, 16 bts, 20 btg -> 16 Batang)
    const btgMatch = normalizedName.match(/(\d+)\s*(btg|bts|batang)\b/i);
    if (btgMatch) {
      const btgNum = btgMatch[1];
      cleanGramasi = `${btgNum} Batang`;
      normalizedName = normalizedName.replace(btgMatch[0], cleanGramasi);
      if (btgMatch[0] !== cleanGramasi) {
        corrections.push(`Isi Batang: ${btgMatch[0]} ➔ ${cleanGramasi}`);
      }
    }

    // 2. Indonesian Spelling & Brand Corrections Dictionary
    const wordReplacements: { [key: string]: { target: string; reason: string } } = {
      indomi: { target: 'Indomie', reason: 'Ejaan Merk: indomi ➔ Indomie' },
      grg: { target: 'Goreng', reason: 'Singkatan: grg ➔ Goreng' },
      gorengg: { target: 'Goreng', reason: 'Typo: gorengg ➔ Goreng' },
      spsial: { target: 'Spesial', reason: 'Typo: spsial ➔ Spesial' },
      spc: { target: 'Spesial', reason: 'Singkatan: spc ➔ Spesial' },
      myk: { target: 'Minyak', reason: 'Singkatan: myk ➔ Minyak' },
      minyak: { target: 'Minyak', reason: '' },
      bmol: { target: 'Bimoli', reason: 'Ejaan Merk: bmol ➔ Bimoli' },
      snia: { target: 'Sania', reason: 'Ejaan Merk: snia ➔ Sania' },
      samporna: { target: 'Sampoerna', reason: 'Ejaan Merk: samporna ➔ Sampoerna' },
      djarum: { target: 'Djarum', reason: '' },
      supr: { target: 'Super', reason: 'Typo: supr ➔ Super' },
      lifbouy: { target: 'Lifebuoy', reason: 'Typo Merk: lifbouy ➔ Lifebuoy' },
      lifeboy: { target: 'Lifebuoy', reason: 'Typo Merk: lifeboy ➔ Lifebuoy' },
      pepsoden: { target: 'Pepsodent', reason: 'Typo Merk: pepsoden ➔ Pepsodent' },
      pepsodentt: { target: 'Pepsodent', reason: 'Typo: pepsodentt ➔ Pepsodent' },
      sunslk: { target: 'Sunsilk', reason: 'Typo Merk: sunslk ➔ Sunsilk' },
      biskut: { target: 'Biskuit', reason: 'Typo: biskut ➔ Biskuit' },
      kalg: { target: 'Kaleng', reason: 'Singkatan: kalg ➔ Kaleng' },
      btl: { target: 'Botol', reason: 'Singkatan: btl ➔ Botol' },
      pandn: { target: 'Pandan', reason: 'Typo: pandn ➔ Pandan' },
      wngi: { target: 'Wangi', reason: 'Typo: wngi ➔ Wangi' },
      ultr: { target: 'Ultra Milk', reason: 'Ejaan Merk: ultr ➔ Ultra Milk' },
      wite: { target: 'White', reason: 'Typo: wite ➔ White' },
      sbun: { target: 'Sabun', reason: 'Singkatan: sbun ➔ Sabun' },
      air: { target: 'Air', reason: '' },
      min: { target: 'Mineral', reason: 'Singkatan: min ➔ Mineral' },
      aqua: { target: 'AQUA', reason: '' },
      rokok: { target: 'Rokok', reason: '' },
    };

    const words = normalizedName.split(/\s+/);
    const correctedWords = words.map((w) => {
      const lower = w.toLowerCase();
      if (wordReplacements[lower] && wordReplacements[lower].target) {
        if (wordReplacements[lower].reason) {
          corrections.push(wordReplacements[lower].reason);
        }
        return wordReplacements[lower].target;
      }
      return w.charAt(0).toUpperCase() + w.slice(1);
    });

    let finalName = correctedWords.join(' ');

    // 3. Category & Unit Identification & Wholesale Units Generator
    let categoryId = 'groceries';
    let unit = 'pcs';
    let brand = 'Umum';
    const wholesaleUnits: WholesaleUnit[] = [];

    const lowerFull = finalName.toLowerCase();

    if (lowerFull.includes('indomie') || lowerFull.includes('mie') || lowerFull.includes('sedap')) {
      categoryId = 'food';
      unit = 'bungkus';
      brand = 'Indofood';
      // Standar Grosir Mie Instan: 1 Dus = 40 Pcs, 1 Pak = 5 Pcs
      wholesaleUnits.push({
        id: `wh-mie-dus-${index}`,
        name: 'Dus (40 Bungkus)',
        multiplier: 40,
        price: Math.round((rawPrice * 40 * 0.94) / 500) * 500, // diskon grosir 6%
        costPrice: rawCost * 40,
      });
      wholesaleUnits.push({
        id: `wh-mie-pak-${index}`,
        name: 'Pak (5 Bungkus)',
        multiplier: 5,
        price: Math.round((rawPrice * 5 * 0.98) / 500) * 500,
        costPrice: rawCost * 5,
      });
    } else if (lowerFull.includes('minyak') || lowerFull.includes('bimoli') || lowerFull.includes('sania')) {
      categoryId = 'cooking';
      unit = 'pouch';
      brand = lowerFull.includes('bimoli') ? 'Bimoli' : lowerFull.includes('sania') ? 'Sania' : 'Minyak';
      if (lowerFull.includes('2 liter')) {
        // Standar 1 Dus Minyak 2L = 6 Pouch
        wholesaleUnits.push({
          id: `wh-myk2-dus-${index}`,
          name: 'Dus / Karton (6 Pouch)',
          multiplier: 6,
          price: Math.round((rawPrice * 6 * 0.96) / 500) * 500,
          costPrice: rawCost * 6,
        });
      } else {
        // Standar 1 Dus Minyak 1L = 12 Pouch
        wholesaleUnits.push({
          id: `wh-myk1-dus-${index}`,
          name: 'Dus / Karton (12 Pouch)',
          multiplier: 12,
          price: Math.round((rawPrice * 12 * 0.96) / 500) * 500,
          costPrice: rawCost * 12,
        });
      }
    } else if (lowerFull.includes('rokok') || lowerFull.includes('sampoerna') || lowerFull.includes('djarum')) {
      categoryId = 'tobacco';
      unit = 'bungkus';
      brand = lowerFull.includes('sampoerna') ? 'HM Sampoerna' : 'Djarum';
      // Standar Grosir Rokok: 1 Slop = 10 Bungkus, 1 Bal = 200 Bungkus (20 Slop)
      wholesaleUnits.push({
        id: `wh-rokok-slop-${index}`,
        name: 'Slop (10 Bungkus)',
        multiplier: 10,
        price: Math.round((rawPrice * 10 * 0.97) / 1000) * 1000,
        costPrice: rawCost * 10,
      });
      wholesaleUnits.push({
        id: `wh-rokok-bal-${index}`,
        name: 'Bal (200 Bungkus / 20 Slop)',
        multiplier: 200,
        price: Math.round((rawPrice * 200 * 0.95) / 5000) * 5000,
        costPrice: rawCost * 200,
      });
    } else if (lowerFull.includes('kopi') || lowerFull.includes('kapal api') || lowerFull.includes('luwak')) {
      categoryId = 'beverages';
      unit = 'sachet';
      brand = lowerFull.includes('kapal api') ? 'Kapal Api' : 'Luwak';
      // Standar Kopi Sachet: 1 Renceng = 10 Sachet, 1 Dus = 120 Sachet (12 Renceng)
      wholesaleUnits.push({
        id: `wh-kopi-rcg-${index}`,
        name: 'Renceng (10 Sachet)',
        multiplier: 10,
        price: Math.round((rawPrice * 10 * 0.93) / 500) * 500,
        costPrice: rawCost * 10,
      });
      wholesaleUnits.push({
        id: `wh-kopi-dus-${index}`,
        name: 'Dus (120 Sachet / 12 Renceng)',
        multiplier: 120,
        price: Math.round((rawPrice * 120 * 0.90) / 1000) * 1000,
        costPrice: rawCost * 120,
      });
    } else if (lowerFull.includes('sabun') || lowerFull.includes('lifebuoy') || lowerFull.includes('pepsodent') || lowerFull.includes('sunsilk')) {
      categoryId = 'care';
      unit = lowerFull.includes('shampoo') ? 'botol' : lowerFull.includes('piring') ? 'pouch' : 'pcs';
      brand = lowerFull.includes('lifebuoy')
        ? 'Lifebuoy'
        : lowerFull.includes('pepsodent')
        ? 'Pepsodent'
        : lowerFull.includes('sunsilk')
        ? 'Sunsilk'
        : 'Wings';
      // Standar Sabun: 1 Lusin = 12 Pcs, 1 Karton = 72 Pcs (6 Lusin)
      wholesaleUnits.push({
        id: `wh-care-lsn-${index}`,
        name: 'Lusin (12 Pcs)',
        multiplier: 12,
        price: Math.round((rawPrice * 12 * 0.94) / 500) * 500,
        costPrice: rawCost * 12,
      });
      wholesaleUnits.push({
        id: `wh-care-ktn-${index}`,
        name: 'Karton (72 Pcs / 6 Lusin)',
        multiplier: 72,
        price: Math.round((rawPrice * 72 * 0.90) / 1000) * 1000,
        costPrice: rawCost * 72,
      });
    } else if (lowerFull.includes('beras')) {
      categoryId = 'groceries';
      unit = 'sak';
      brand = 'Pandan Wangi';
      // Standar Beras 5kg: 1 Bal = 5 Sak (25kg)
      wholesaleUnits.push({
        id: `wh-beras-bal-${index}`,
        name: 'Bal / Karung (5 Sak / 25kg)',
        multiplier: 5,
        price: Math.round((rawPrice * 5 * 0.96) / 1000) * 1000,
        costPrice: rawCost * 5,
      });
    } else if (lowerFull.includes('aqua') || lowerFull.includes('ultra milk') || lowerFull.includes('susu')) {
      categoryId = 'beverages';
      unit = lowerFull.includes('aqua') ? 'botol' : 'kotak';
      brand = lowerFull.includes('aqua') ? 'Danone AQUA' : 'Ultra Milk';
      // Standar Minuman: 1 Dus = 24 Botol / 12 Kotak
      const mult = lowerFull.includes('aqua') ? 24 : 12;
      wholesaleUnits.push({
        id: `wh-drink-dus-${index}`,
        name: `Dus / Karton (${mult} ${unit})`,
        multiplier: mult,
        price: Math.round((rawPrice * mult * 0.93) / 500) * 500,
        costPrice: rawCost * mult,
      });
    }

    // 4. Profit Margin & Points Calculation
    const marginNominal = Math.max(0, rawPrice - rawCost);
    const profitMarginPercent = rawPrice > 0 ? (marginNominal / rawPrice) * 100 : 0;
    const isPointsEligible = profitMarginPercent >= minProfitPoints;

    const sku = `SKU-${categoryId.slice(0, 3).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;
    const barcode = rawBarcode;

    return {
      id: `parsed-${index}-${Date.now()}-${barcode}`,
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
      barcode,
      wholesaleUnits,
      corrections,
      profitMarginPercent,
      isPointsEligible,
      selected: true,
    };
  };

  const parsedItems: ParsedItem[] = useMemo(() => {
    if (!rawInput.trim()) return [];
    return rawInput
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0)
      .map((l, idx) => normalizeIndonesianRetail(l, idx))
      .filter((it): it is ParsedItem => it !== null);
  }, [rawInput, minProfitPoints]);

  const [itemsState, setItemsState] = useState<ParsedItem[]>([]);
  const [matchingInternet, setMatchingInternet] = useState(false);
  const [internetSyncStatus, setInternetSyncStatus] = useState<string | null>(null);

  // Sync state when parsed items change
  React.useEffect(() => {
    setItemsState(parsedItems);
  }, [parsedItems]);

  const handleMatchInternetDatabase = async () => {
    if (itemsState.length === 0) return;
    setMatchingInternet(true);
    setInternetSyncStatus('Menghubungi Google Search Grounding & Gemini AI...');

    try {
      const payload = itemsState.map((it) => ({
        id: it.id,
        rawInput: it.originalText,
        name: it.name,
        barcode: it.barcode,
        price: it.price,
        costPrice: it.costPrice,
        stock: it.stock,
      }));

      const res = await fetch('/api/online/match-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: payload }),
      });
      const data = await res.json();

      if (data.success && Array.isArray(data.matchedItems)) {
        const matchedMap = new Map<string, any>();
        data.matchedItems.forEach((m: any) => matchedMap.set(m.id, m));

        setItemsState((prev) =>
          prev.map((it) => {
            const hit = matchedMap.get(it.id);
            if (!hit) return it;

            const marginNominal = Math.max(0, (hit.price || it.price) - (hit.costPrice || it.costPrice));
            const profitMarginPercent = hit.price > 0 ? (marginNominal / hit.price) * 100 : it.profitMarginPercent;

            return {
              ...it,
              name: hit.name || it.name,
              brand: hit.brand || it.brand,
              barcode: hit.barcode || it.barcode,
              categoryId: hit.categoryId || it.categoryId,
              unit: hit.unit || it.unit,
              price: hit.price || it.price,
              costPrice: hit.costPrice || it.costPrice,
              profitMarginPercent,
              isPointsEligible: profitMarginPercent >= minProfitPoints,
              wholesaleUnits:
                hit.wholesaleUnits && hit.wholesaleUnits.length > 0
                  ? hit.wholesaleUnits.map((u: any, idx: number) => ({
                      id: `wh-${it.id}-${idx}`,
                      name: u.name,
                      multiplier: u.multiplier,
                      price: u.price,
                      costPrice: u.costPrice,
                      barcode: `${hit.barcode || it.barcode}-${u.multiplier}`,
                    }))
                  : it.wholesaleUnits,
              corrections: [
                ...it.corrections.filter((c) => !c.includes('Database Internet') && !c.includes('Google Grounding')),
                `🌐 Terverifikasi Google Search Grounding (${hit.matchSource || 'Google Search'})`,
              ],
            };
          })
        );

        setInternetSyncStatus(
          `✅ Berhasil mencocokkan ${data.matchedItems.length} produk dengan Google Search Grounding & Gemini AI!`
        );
        setTimeout(() => setInternetSyncStatus(null), 4000);
      } else {
        setInternetSyncStatus('Gagal menyelaraskan dengan Google Search Grounding.');
        setTimeout(() => setInternetSyncStatus(null), 4000);
      }
    } catch {
      setInternetSyncStatus('⚠️ Gagal terhubung ke Google Grounding. Menggunakan hasil normalizer lokal.');
      setTimeout(() => setInternetSyncStatus(null), 4000);
    } finally {
      setMatchingInternet(false);
    }
  };

  const handleToggleSelect = (id: string) => {
    setItemsState((prev) =>
      prev.map((it) => (it.id === id ? { ...it, selected: !it.selected } : it))
    );
  };

  const handleToggleSelectAll = (checked: boolean) => {
    setItemsState((prev) => prev.map((it) => ({ ...it, selected: checked })));
  };

  const handleDeleteItem = (id: string) => {
    setItemsState((prev) => prev.filter((it) => it.id !== id));
  };

  const handleExecuteImport = () => {
    const selected = itemsState.filter((it) => it.selected);
    if (selected.length === 0) return;

    const payloads: Omit<Product, 'id'>[] = selected.map((it) => ({
      name: it.name,
      brand: it.brand,
      sku: it.sku,
      barcode: it.barcode,
      categoryId: it.categoryId,
      price: it.price,
      costPrice: it.costPrice,
      stock: it.stock,
      minStock: Math.max(2, Math.floor(it.stock * 0.2)),
      unit: it.unit,
      aisle: it.aisle || 'Lorong Toko',
      wholesaleUnits: it.wholesaleUnits.length > 0 ? it.wholesaleUnits : undefined,
      image: getImageForCategory(it.categoryId, it.name),
    }));

    addProductsBatch(payloads);

    setImportedCount(selected.length);
    setTimeout(() => {
      setImportedCount(null);
      onClose();
    }, 1200);
  };

  if (!isOpen) return null;

  const totalSelected = itemsState.filter((it) => it.selected).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-5xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Smart Data Import & Auto-Koreksi Gramasi / Ejaan Retail</span>
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-emerald-500 text-slate-950">
                  AI Retail Engine
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Import data produk mentah, perbaiki ejaan/gramasi otomatis, pasang satuan grosir (dus/slop/lusin), dan kalkulasi poin (margin ≥15%).
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Notification when cleared */}
          {clearMessage && (
            <div className="p-3 rounded-xl bg-amber-500 text-slate-950 text-xs font-bold flex items-center justify-between animate-in fade-in">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4" />
                <span>{clearMessage}</span>
              </div>
              <button
                type="button"
                onClick={() => setClearMessage(null)}
                className="p-1 hover:opacity-80 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Existing Imported Items Info Bar */}
          {currentImportedCount > 0 && (
            <div className="p-3.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3 text-xs flex-wrap">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-500 shrink-0" />
                <span className="text-slate-700 dark:text-slate-300">
                  Saat ini terdapat <strong>{currentImportedCount} produk hasil impor</strong> di dalam master katalog toko.
                </span>
              </div>
              <button
                type="button"
                onClick={handleClearPreviousImported}
                className="px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
                title="Hapus semua produk impor yang pernah dimasukkan sebelumnya"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Hapus Data Impor Sebelumnya ({currentImportedCount})</span>
              </button>
            </div>
          )}

          {/* Section 1: Raw Input Box */}
          <div className="space-y-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-emerald-500" />
                <span>Tempel Data Produk (Format: Barcode, Nama Produk, Harga Beli, Harga Jual, Stok)</span>
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard?.writeText(
                      '8999999190112, indomi grg spsial 80 gr, 2700, 3100, 120\n8992775211029, myk grg bmol 2 ltr, 33500, 38500, 36\n8993175532014, myk grg snia 1 ltr, 16800, 19500, 48'
                    );
                    setClearMessage('Template format disalin ke clipboard!');
                    setTimeout(() => setClearMessage(null), 3000);
                  }}
                  className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white flex items-center gap-1 cursor-pointer"
                >
                  <Copy className="w-3 h-3" /> Salin Template
                </button>
                <span className="text-slate-300 dark:text-slate-700">|</span>
                <button
                  type="button"
                  onClick={() => setRawInput(SAMPLE_RAW_DATA)}
                  className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" /> Muat Contoh Data Retail (15 Produk)
                </button>
              </div>
            </div>

            {/* Visual Column Formula Chips */}
            <div className="flex items-center gap-1.5 flex-wrap text-[11px]">
              <span className="text-slate-400 font-semibold">Urutan Kolom:</span>
              <span className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 font-mono font-bold">
                1. Barcode
              </span>
              <span className="text-slate-400 font-bold">,</span>
              <span className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 font-mono font-bold">
                2. Nama Produk
              </span>
              <span className="text-slate-400 font-bold">,</span>
              <span className="px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 font-mono font-bold">
                3. Harga Beli (HPP)
              </span>
              <span className="text-slate-400 font-bold">,</span>
              <span className="px-2 py-0.5 rounded-md bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 text-teal-700 dark:text-teal-300 font-mono font-bold">
                4. Harga Jual
              </span>
              <span className="text-slate-400 font-bold">,</span>
              <span className="px-2 py-0.5 rounded-md bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300 font-mono font-bold">
                5. Stok
              </span>
            </div>

            <textarea
              rows={5}
              value={rawInput}
              onChange={(e) => setRawInput(e.target.value)}
              placeholder="Contoh: 8999999190112, indomi grg spsial 80 gr, 2700, 3100, 120&#10;8992775211029, myk grg bmol 2 ltr, 33500, 38500, 36..."
              className="w-full p-3 text-xs font-mono rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:outline-none leading-relaxed"
            />
            <div className="flex items-center justify-between text-[10px] text-slate-400">
              <span>*Mendukung pemisah koma (,), titik koma (;), atau tab dari copy-paste Excel / Google Sheets.</span>
              <span>Baris header akan diabaikan otomatis.</span>
            </div>
          </div>

          {/* Section 2: Smart Auto-Correction & Preview Table */}
          <div className="space-y-3">
            {internetSyncStatus && (
              <div className="p-3 rounded-xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 text-xs font-semibold text-teal-800 dark:text-teal-300 flex items-center justify-between animate-in fade-in">
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
                  <span>{internetSyncStatus}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setInternetSyncStatus(null)}
                  className="text-teal-600 hover:text-teal-800 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-3">
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span>Hasil Analisis & Auto-Koreksi ({itemsState.length} Item)</span>
                </h4>
                <label className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={totalSelected === itemsState.length && itemsState.length > 0}
                    onChange={(e) => handleToggleSelectAll(e.target.checked)}
                    className="rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>Pilih Semua</span>
                </label>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleMatchInternetDatabase}
                  disabled={matchingInternet || itemsState.length === 0}
                  className="px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50 transition-all"
                  title="Cocokkan nama singkatan dengan katalog resmi melalui Google Search Grounding & Gemini AI"
                >
                  {matchingInternet ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Globe className="w-3.5 h-3.5" />
                  )}
                  <span>{matchingInternet ? 'Mencari di Google Grounding...' : 'Cocokkan dg Google Grounding & AI'}</span>
                </button>

                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950 px-2.5 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800">
                  {totalSelected} siap diimport
                </span>
              </div>
            </div>

            {/* List of Analyzed and Corrected Items */}
            <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
              {itemsState.map((item, idx) => (
                <div
                  key={item.id}
                  className={`p-3 rounded-xl border transition-all ${
                    item.selected
                      ? 'border-emerald-300 dark:border-emerald-700/80 bg-white dark:bg-slate-900 shadow-2xs'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 opacity-60'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={item.selected}
                      onChange={() => handleToggleSelect(item.id)}
                      className="mt-1 w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                    />

                    <div className="flex-1 min-w-0 space-y-1.5">
                      {/* Name & Diff */}
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                              {item.name}
                            </span>
                            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 border border-slate-200 dark:border-slate-700">
                              📊 {item.barcode}
                            </span>
                            <span className="text-[10px] font-semibold px-2 py-0.2 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                              {item.brand}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              (Stok: {item.stock} {item.unit})
                            </span>
                          </div>

                          <div className="text-[10px] text-slate-400 font-mono mt-0.5 line-through">
                            Asli: {item.originalText}
                          </div>
                        </div>

                        {/* Price, Margin & Points Badge */}
                        <div className="text-right shrink-0">
                          <div className="text-xs font-bold font-mono text-emerald-600 dark:text-emerald-400">
                            {formatCurrency(item.price)}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            HPP: {formatCurrency(item.costPrice)}
                          </div>
                        </div>
                      </div>

                      {/* Corrections & Wholesale Units badges */}
                      <div className="flex items-center gap-1.5 flex-wrap pt-1">
                        {/* Corrections made */}
                        {item.corrections.map((corr, cIdx) => (
                          <span
                            key={cIdx}
                            className="text-[10px] font-medium bg-blue-50 text-blue-800 dark:bg-blue-950/70 dark:text-blue-300 border border-blue-200 dark:border-blue-800 px-1.5 py-0.2 rounded"
                          >
                            ✓ {corr}
                          </span>
                        ))}

                        {/* Profit Margin & Points Badge */}
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.2 rounded flex items-center gap-1 ${
                            item.isPointsEligible
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                          }`}
                        >
                          <Award className="w-2.5 h-2.5" />
                          Margin {(item.profitMarginPercent ?? 0).toFixed(1)}% (
                          {item.isPointsEligible ? 'Dapat Poin Member' : 'Tanpa Poin <15%'})
                        </span>

                        {/* Wholesale Units Tag */}
                        {item.wholesaleUnits.map((wu) => (
                          <span
                            key={wu.id}
                            className="text-[10px] font-medium bg-purple-50 text-purple-800 dark:bg-purple-950/70 dark:text-purple-300 border border-purple-200 dark:border-purple-800 px-1.5 py-0.2 rounded flex items-center gap-1"
                          >
                            <Boxes className="w-2.5 h-2.5 text-purple-500" />
                            {wu.name}: {formatCurrency(wu.price)}
                          </span>
                        ))}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteItem(item.id)}
                      className="p-1 rounded text-slate-400 hover:text-rose-500 cursor-pointer"
                      title="Hapus dari daftar import"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex items-center justify-between">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {importedCount !== null ? (
              <span className="font-bold text-emerald-600 flex items-center gap-1">
                <Check className="w-4 h-4" /> Berhasil mengimport {importedCount} produk ke katalog!
              </span>
            ) : (
              <span>
                *Data yang diimport akan langsung masuk ke inventaris dan katalog kasir dengan kemasan grosir & aturan poin 15%.
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
            >
              Tutup
            </button>
            <button
              type="button"
              onClick={handleExecuteImport}
              disabled={totalSelected === 0}
              className="px-5 py-2 text-xs font-bold text-slate-950 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-lg shadow-emerald-500/20 flex items-center gap-2 cursor-pointer transition-all active:scale-95"
            >
              <Upload className="w-4 h-4" />
              <span>Import {totalSelected} Produk ke Katalog</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

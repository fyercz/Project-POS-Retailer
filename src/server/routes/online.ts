/** Endpoint /api/online/* (cari produk & barcode online). Dipindah dari server.ts tanpa perubahan logika. */
import express from 'express';
import { callGeminiWithSearch, extractJsonFromText, extractTop3GoogleCitations } from '../gemini.ts';
import { INDO_FMCG_OFFLINE_DB } from '../data/indoFmcgCatalog.ts';

export const onlineRouter = express.Router();
const router = onlineRouter;

// ==========================================
// 8. ONLINE PRODUCT & BARCODE LOOKUP (Google Search Grounding + Gemini AI)
// ==========================================

// 8.1 Lookup Product by Barcode (Google Search Grounding + Gemini AI)
router.post('/api/online/lookup-barcode', async (req, res) => {
  const { barcode } = req.body;
  if (!barcode || typeof barcode !== 'string') {
    return res.status(400).json({ success: false, message: 'Barcode tidak valid' });
  }

  const cleanBarcode = barcode.trim();

  // 1. Check local knowledge base first for ultra-fast instant match (support alphanumeric case-insensitive)
  const localMatch = INDO_FMCG_OFFLINE_DB.find(
    (item) => item.barcode.toLowerCase() === cleanBarcode.toLowerCase()
  );

  // 2. Perform live Google Search Grounding with Gemini
  if (process.env.GEMINI_API_KEY) {
    try {
      const prompt = `Gunakan Google Search grounding untuk mencari produk ritel, minimarket, atau FMCG Indonesia yang memiliki Barcode / Kode Produk (bisa berupa kode angka EAN-13 atau alfanumerik huruf & angka): "${cleanBarcode}".
Cari di web Indonesia seperti KlikIndomaret, Alfagift, Tokopedia, Shopee, Blibli, atau database resmi produk barcode Indonesia.

TUGAS:
1. Identifikasi nama resmi produk, nama brand/merk, gramasi kemasan resmi (misal 80g, 600ml, 2L, 500g).
2. Tentukan kategori yang tepat:
   - "cat-staple" (Sembako & Beras & Minyak & Gula)
   - "cat-bev" (Minuman & Kopi & Teh & Susu)
   - "cat-snk" (Makanan Ringan & Biskuit & Snack)
   - "cat-instant" (Mi Instan & Makanan Siap Saji)
   - "cat-pers" (Perawatan Tubuh & Sabun & Shampo & Pasta Gigi)
   - "cat-clean" (Pembersih Rumah & Cuci Piring & Deterjen)
   - "cat-fresh" (Produk Segar & Telur & Buah & Sayur)
   - "cat-bakery" (Roti & Selai)
   - "cat-cig" (Rokok & Tembakau)
   - "cat-other" (Lainnya)
3. Tentukan satuan dasar: "bungkus | pcs | botol | kaleng | pouch | sak | renceng | kotak".
4. Estimasi harga jual eceran (HET Rp) di toko ritel Indonesia dan harga modal HPP (margin 15-25%).
5. Susun opsi grosir standar (Dus, Karton, Slop, Renceng, atau Bal) sesuai standar distributor di Indonesia.

Kembalikan HANYA format JSON valid berikut (tanpa teks pengantar tambahan):
{
  "barcode": "${cleanBarcode}",
  "name": "Nama Resmi Produk Lengkap dengan Gramasi",
  "brand": "Nama Merk / Brand",
  "categoryId": "cat-instant",
  "unit": "bungkus",
  "price": 3500,
  "costPrice": 2850,
  "image": "https://images.unsplash.com/photo-1612927601601-6638404737ce?w=400&auto=format&fit=crop&q=60",
  "description": "Deskripsi singkat spesifikasi produk ritel",
  "wholesaleUnits": [
    {
      "name": "Dus (40 Bks)",
      "multiplier": 40,
      "price": 122000,
      "costPrice": 112000
    }
  ]
}
`;

      const searchResult = await callGeminiWithSearch(prompt, 0.1);
      if (searchResult && searchResult.text) {
        const parsed = extractJsonFromText(searchResult.text);
        if (parsed && parsed.name && parsed.name !== 'Nama Resmi Produk') {
          // If local match exists, preserve high quality local image if AI returned default
          if (localMatch?.image && (!parsed.image || parsed.image.includes('placeholder') || parsed.image.includes('unsplash'))) {
            parsed.image = localMatch.image;
          }

          const top3Sources = extractTop3GoogleCitations(searchResult.sources || [], cleanBarcode, parsed.name);
          return res.json({
            success: true,
            source: 'Google Search Grounding (Live Web)',
            data: {
              ...parsed,
              groundingSources: top3Sources,
            },
            top3GoogleSources: top3Sources,
            groundingSources: top3Sources,
            isAiEnriched: true,
          });
        }
      }
    } catch (err) {
      console.error('Google search grounding barcode lookup error:', err);
    }
  }

  // Fallback to local catalog if search grounding is offline or returned no match
  if (localMatch) {
    const top3Sources = extractTop3GoogleCitations([], cleanBarcode, localMatch.name);
    return res.json({
      success: true,
      source: 'Indonesian Retail FMCG Database',
      data: {
        ...localMatch,
        groundingSources: top3Sources,
      },
      top3GoogleSources: top3Sources,
      groundingSources: top3Sources,
      isAiEnriched: false,
    });
  }

  res.json({
    success: false,
    message: `Barcode ${cleanBarcode} tidak ditemukan di Google Search Grounding atau database lokal.`,
  });
});

// 8.2 Search Products by Keyword (Google Search Grounding + Gemini AI)
router.post('/api/online/search-products', async (req, res) => {
  const { query } = req.body;
  if (!query || typeof query !== 'string') {
    return res.json({ success: true, results: [] });
  }

  const qLower = query.toLowerCase().trim();

  // Local filter
  const localResults = INDO_FMCG_OFFLINE_DB.filter(
    (item) =>
      item.name.toLowerCase().includes(qLower) ||
      item.brand.toLowerCase().includes(qLower) ||
      item.barcode.toLowerCase().includes(qLower)
  );

  // Gemini Google Search Grounding
  if (process.env.GEMINI_API_KEY) {
    try {
      const prompt = `Gunakan Google Search grounding untuk mencari katalog produk ritel/minimarket/supermarket di Indonesia dengan kata kunci: "${query}".
Cari di web e-commerce ritel Indonesia (KlikIndomaret, Alfagift, Tokopedia, Shopee, Blibli, Superindo).

TUGAS:
Cari 3 hingga 6 produk asli yang paling sesuai dengan kata kunci tersebut.
Lengkapi setiap produk dengan Barcode EAN-13 Indonesia resmi (awalan 899... jika produk lokal Indonesia), Brand, Kategori (cat-staple, cat-bev, cat-snk, cat-instant, cat-pers, cat-clean, cat-fresh, cat-bakery, cat-cig, cat-other), Satuan, Harga Jual Eceran (HET Rp), Harga Modal (HPP Rp), dan opsi kemasan grosir (Dus/Karton/Slop/Renceng).

Kembalikan HANYA format JSON valid array:
[
  {
    "barcode": "8998866200223",
    "name": "Indomie Mi Instan Goreng Spesial 80g",
    "brand": "Indomie",
    "categoryId": "cat-instant",
    "unit": "bungkus",
    "price": 3500,
    "costPrice": 2850,
    "image": "https://images.unsplash.com/photo-1612927601601-6638404737ce?w=400&auto=format&fit=crop&q=60",
    "description": "Deskripsi singkat produk",
    "wholesaleUnits": [
      { "name": "Dus (40 Bks)", "multiplier": 40, "price": 122000, "costPrice": 112000 }
    ]
  }
]
`;

      const searchResult = await callGeminiWithSearch(prompt, 0.1);
      if (searchResult && searchResult.text) {
        const parsed = extractJsonFromText(searchResult.text);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const top3Sources = extractTop3GoogleCitations(
            searchResult.sources || [],
            query,
            parsed[0]?.name || query
          );

          // Tag top 3 Google search items
          const enrichedResults = parsed.map((item: any, idx: number) => ({
            ...item,
            isTop3GoogleResult: idx < 3,
            googleRank: idx < 3 ? idx + 1 : undefined,
            groundingSources: top3Sources,
          }));

          return res.json({
            success: true,
            source: 'Google Search Grounding (Live Web)',
            results: enrichedResults,
            top3GoogleSources: top3Sources,
            groundingSources: top3Sources,
          });
        }
      }
    } catch (err) {
      console.error('Google search grounding keyword search error:', err);
    }
  }

  const top3Sources = extractTop3GoogleCitations([], query, localResults[0]?.name || query);
  const enrichedLocal = localResults.map((item, idx) => ({
    ...item,
    isTop3GoogleResult: idx < 3,
    googleRank: idx < 3 ? idx + 1 : undefined,
    groundingSources: top3Sources,
  }));

  res.json({
    success: true,
    source: 'Indonesian FMCG Catalog',
    results: enrichedLocal,
    top3GoogleSources: top3Sources,
    groundingSources: top3Sources,
  });
});

// 8.3 Batch Match and Reconcile Import Data (Google Search Grounding + Gemini AI)
router.post('/api/online/match-batch', async (req, res) => {
  const { items } = req.body;
  if (!Array.isArray(items) || items.length === 0) {
    return res.json({ success: true, matchedItems: [] });
  }

  // Pre-process with local DB
  const localMatched = items.map((it: any) => {
    const raw = (it.rawInput || it.name || '').toLowerCase();
    const bc = (it.barcode || '').trim();

    const byBc = bc ? INDO_FMCG_OFFLINE_DB.find((d) => d.barcode === bc) : null;
    const byName = INDO_FMCG_OFFLINE_DB.find((d) =>
      raw.includes(d.brand.toLowerCase()) && raw.includes(d.name.toLowerCase().slice(0, 8))
    );

    const hit = byBc || byName;
    if (hit) {
      return {
        id: it.id,
        rawInput: it.rawInput || it.name,
        name: hit.name,
        brand: hit.brand,
        barcode: hit.barcode,
        categoryId: hit.categoryId,
        unit: hit.unit,
        price: it.price > 0 ? it.price : hit.price,
        costPrice: it.costPrice > 0 ? it.costPrice : hit.costPrice,
        stock: it.stock > 0 ? it.stock : 24,
        wholesaleUnits: hit.wholesaleUnits,
        image: hit.image,
        matchConfidence: 0.98,
        matchStatus: 'verified' as const,
        matchSource: 'Indonesian FMCG Master Database',
      };
    }
    return null;
  });

  if (process.env.GEMINI_API_KEY) {
    try {
      const prompt = `Gunakan Google Search grounding untuk memverifikasi dan mencocokkan daftar barang ritel Indonesia berikut dengan katalog resmi live web:
${JSON.stringify(items.map((it: any) => ({ id: it.id, input: it.rawInput || it.name, barcode: it.barcode, price: it.price, costPrice: it.costPrice, stock: it.stock })))}

TUGAS:
Cocokkan setiap baris dengan data katalog produk resmi dari Google Search:
1. Perbaiki nama menjadi nama resmi lengkap dengan brand dan gramasi resmi (misal: "indomi grg sps 80g" -> "Indomie Mi Instan Goreng Spesial 80g").
2. Lengkapi Barcode EAN-13 resmi Indonesia jika kosong atau tidak valid (awalan 899...).
3. Tentukan Brand, Kategori (cat-staple, cat-bev, cat-snk, cat-instant, cat-pers, cat-clean, cat-fresh, cat-bakery, cat-cig, cat-other), dan Satuan standar.
4. Tentukan standar kemasan grosir (Dus, Slop, Renceng, Karton, Bal) sesuai kebiasaan distributor FMCG.
5. Estimasi harga jual dan harga modal yang wajar jika belum diisi.

Kembalikan HANYA format JSON valid array objek:
[
  {
    "id": "id_dari_input",
    "rawInput": "input_asli",
    "name": "Nama Resmi Lengkap",
    "brand": "Brand",
    "barcode": "8998866200223",
    "categoryId": "cat-instant",
    "unit": "bungkus",
    "price": 3500,
    "costPrice": 2850,
    "stock": 40,
    "matchConfidence": 0.98,
    "matchStatus": "verified",
    "matchSource": "Google Search Grounding & Gemini",
    "wholesaleUnits": [
      { "name": "Dus (40 Bks)", "multiplier": 40, "price": 122000, "costPrice": 112000 }
    ]
  }
]
`;

      const searchResult = await callGeminiWithSearch(prompt, 0.1);
      if (searchResult && searchResult.text) {
        const parsed = extractJsonFromText(searchResult.text);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const top3Sources = extractTop3GoogleCitations(searchResult.sources || [], 'Batch Verifikasi Barang');
          return res.json({
            success: true,
            matchedItems: parsed,
            top3GoogleSources: top3Sources,
            groundingSources: top3Sources,
            source: 'Google Search Grounding (Live Web)',
          });
        }
      }
    } catch (err) {
      console.error('Google search grounding batch match error:', err);
    }
  }

  const defaultResults = items.map((it: any, idx: number) => {
    if (localMatched[idx]) return localMatched[idx];
    return {
      ...it,
      matchConfidence: 0.7,
      matchStatus: 'suggested' as const,
      matchSource: 'Rule-based Corrector',
    };
  });

  const top3Sources = extractTop3GoogleCitations([], 'Batch Verifikasi Barang');
  res.json({
    success: true,
    matchedItems: defaultResults,
    top3GoogleSources: top3Sources,
    groundingSources: top3Sources,
  });
});


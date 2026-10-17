/** Endpoint /api/ai/* (fitur AI Gemini). Dipindah dari server.ts tanpa perubahan logika. */
import express from 'express';
import { callGeminiSafe, callGeminiVisionSafe, extractJsonFromText } from '../gemini.ts';
import { toLocalDateString } from '../../utils/formatters.ts';

export const aiRouter = express.Router();
const router = aiRouter;

// 6. AI Supplier Purchase Invoice OCR / Image Scanner
router.post('/api/ai/scan-invoice', async (req, res) => {
  const { imageBase64, mimeType, catalogProducts, storeSettings } = req.body;

  // Catatan: faktur karangan ini TIDAK lagi dikirim ke kasir; dibiarkan hanya sebagai referensi bentuk data.
  const generateRuleBasedInvoice = () => {
    const matchedProducts = (catalogProducts || []).slice(0, 3).map((p: any) => ({
      matchedProductId: p.id,
      productName: p.name,
      quantity: 24,
      costPrice: p.costPrice || Math.round(p.price * 0.8),
      subtotal: 24 * (p.costPrice || Math.round(p.price * 0.8)),
      expiryDate: '2027-12-31',
      confidence: 0.95,
    }));

    const gross = matchedProducts.reduce((sum: number, item: any) => sum + item.subtotal, 0);
    const ppn = Math.round(gross * 0.11);

    return {
      supplierName: 'PT Indomarco Adi Prima (Indofood)',
      invoiceNumber: `INV-SCAN-${Date.now().toString().slice(-6)}`,
      date: toLocalDateString(),
      items: matchedProducts,
      grossAmount: gross,
      discountAmount: 0,
      ppnAmount: ppn,
      finalTotal: gross + ppn,
      notes: 'Faktur pembelian berhasil diidentifikasi otomatis oleh AI Scanner.',
      isAiGenerated: false,
    };
  };

  // Tanpa gambar atau AI gagal: jawab error. Dulu dikembalikan faktur KARANGAN (3 produk pertama x 24 unit,
  // supplier 'PT Indomarco', PPN 11%) seolah hasil membaca faktur, yang bisa menambah stok & hutang fiktif.
  if (!imageBase64) {
    return res.status(400).json({ success: false, error: 'Gambar faktur belum dipilih.' });
  }

  try {
    const cleanBase64 = imageBase64.replace(/^data:image\/[a-z]+;base64,/, '');
    const prompt = `Anda adalah Sistem OCR & AI Scanner Faktur Pembelian Supplier Ritel Ritel Modern untuk "${storeSettings?.storeName || 'Ulilmart'}".
Diberikan gambar faktur/nota pembelian kertas/surat jalan dari distributor/supplier.

Katalog Produk yang sudah terdaftar di toko:
${JSON.stringify((catalogProducts || []).map((p: any) => ({
  id: p.id,
  name: p.name,
  sku: p.sku,
  barcode: p.barcode,
  costPrice: p.costPrice,
  unit: p.unit,
})))}

TUGAS:
1. Ekstrak data faktur: Nama Supplier/Distributor, Nomor Faktur/Invoice, Tanggal Faktur.
2. Ekstrak setiap baris barang: Nama Barang, Jumlah Kuantitas (Qty), Harga Satuan Beli (Cost Price/HPP), Total Harga, dan Tanggal Kadaluarsa/Expired jika tertera di dokumen.
3. Cocokkan secara cerdas dengan id produk dari katalog jika ada kemiripan nama produk (misal: "Indomie Grg" -> cocokkan ke id "Indomie Goreng Original").
4. Ekstrak Diskon dan PPN/VAT jika ada.
5. Kembalikan HANYA format JSON valid berikut:
{
  "supplierName": "Nama Supplier / PT / Distributor",
  "invoiceNumber": "Nomor Faktur",
  "date": "YYYY-MM-DD",
  "items": [
    {
      "matchedProductId": "id_dari_katalog_jika_cocok_atau_kosong",
      "productName": "Nama Barang Sesuai Faktur",
      "quantity": 24,
      "costPrice": 115000,
      "subtotal": 2760000,
      "expiryDate": "2027-12-31",
      "confidence": 0.98
    }
  ],
  "grossAmount": 2760000,
  "discountAmount": 0,
  "ppnAmount": 303600,
  "finalTotal": 3063600,
  "notes": "Catatan ringkas status faktur"
}
`;

    const rawText = await callGeminiVisionSafe(
      prompt,
      [{ data: cleanBase64, mimeType: mimeType || 'image/jpeg' }],
      0.1
    );

    if (!rawText) {
      return res.status(503).json({ success: false, error: 'AI tidak dapat membaca faktur saat ini (API key kosong, kuota habis, atau gambar tidak terbaca). Coba lagi atau isi penerimaan barang secara manual.' });
    }

    const parsed = JSON.parse(rawText);
    res.json({ ...parsed, isAiGenerated: true });
  } catch (err) {
    console.error('Invoice scan error:', err);
    res.status(503).json({ success: false, error: 'AI tidak dapat membaca faktur saat ini (API key kosong, kuota habis, atau gambar tidak terbaca). Coba lagi atau isi penerimaan barang secara manual.' });
  }
});

// 7. AI Visual & Video Stock Opname (Count Items, Audit Shelves & Discrepancies)
router.post('/api/ai/visual-stock-opname', async (req, res) => {
  const { imagesBase64, mimeType, scannedType, catalogProducts, storeSettings, shelfArea } = req.body;

  // Catatan: hasil karangan ini TIDAK lagi dikirim (dulu hitungan stok acak = stok sistem +/- 1).
  // Dibiarkan hanya sebagai referensi bentuk data.
  const generateRuleBasedOpname = () => {
    const sampleItems = (catalogProducts || []).slice(0, 4).map((p: any) => {
      const detected = Math.max(0, p.stock + Math.floor(Math.random() * 3) - 1);
      return {
        productId: p.id,
        productName: p.name,
        systemStock: p.stock,
        detectedCount: detected,
        difference: detected - p.stock,
        condition: 'Baik / Utuh' as const,
        shelfLocation: p.aisle || 'Rak Utama',
        confidence: 0.94,
      };
    });

    return {
      sessionTitle: `Audit Visual AI - ${shelfArea || 'Area Display Toko'}`,
      scannedType: scannedType || 'shelf_image',
      items: sampleItems,
      totalDiscrepancy: sampleItems.filter((i: any) => i.difference !== 0).length,
      aiObservations: [
        'Kerapian rak display terpantau rapi dengan label harga (price tag) menghadap ke depan.',
        'Ditemukan 1 produk dengan stok fisik lebih sedikit dari sistem kasir (potensi barang belum dipajang dari gudang).',
        'Semua kemasan produk dalam kondisi bersih dan tersegel baik.',
      ],
      suggestedStockUpdates: sampleItems.map((item: any) => ({
        productId: item.productId,
        newStock: item.detectedCount,
        note: `Penyesuaian hasil audit visual kamera (${item.difference >= 0 ? '+' : ''}${item.difference})`,
      })),
      isAiGenerated: false,
    };
  };

  const imagesArray = Array.isArray(imagesBase64) ? imagesBase64 : imagesBase64 ? [imagesBase64] : [];
  if (imagesArray.length === 0) {
    return res.status(503).json({ success: false, error: 'AI tidak dapat menghitung stok dari foto saat ini (API key kosong, kuota habis, atau foto tidak terbaca). Lakukan stock opname manual.' });
  }

  try {
    const formattedImages = imagesArray.map((imgStr: string) => ({
      data: typeof imgStr === 'string' ? imgStr.replace(/^data:[^;]+;base64,/, '') : '',
      mimeType: mimeType || 'image/jpeg',
    }));

    const prompt = `Anda adalah AI Inspector & Visual Stock Opname Auditor untuk supermarket "${storeSettings?.storeName || 'Ulilmart'}".
Area/Rak yang diaudit: ${shelfArea || 'Display Rak Toko'}.
Tipe Scan: ${scannedType === 'video_stream' ? 'Rekaman Video / Frame Berurutan Rak' : 'Foto Rak Fisik'}.

Katalog Produk Terdaftar di Toko & Stok Sistem saat ini:
${JSON.stringify((catalogProducts || []).map((p: any) => ({
  id: p.id,
  name: p.name,
  category: p.categoryId,
  systemStock: p.stock,
  barcode: p.barcode,
  aisle: p.aisle,
})))}

TUGAS:
1. Hitung jumlah unit fisik barang yang terlihat di rak dari gambar/frame foto.
2. Identifikasi produk yang sesuai dengan katalog produk toko.
3. Bandingkan jumlah fisik yang terhitung dengan jumlah systemStock di sistem POS.
4. Periksa kondisi fisik: apakah ada kemasan rusak, penempatan salah rak, atau barang kosong (Out of Stock).
5. Kembalikan JSON dengan format:
{
  "sessionTitle": "Audit Visual Rak ${shelfArea || 'Toko'}",
  "scannedType": "${scannedType || 'shelf_image'}",
  "items": [
    {
      "productId": "id_produk_dari_katalog",
      "productName": "Nama Produk Lengkap",
      "systemStock": 15,
      "detectedCount": 14,
      "difference": -1,
      "condition": "Baik / Utuh" | "Kemasan Rusak" | "Salah Penempatan Rak" | "Kadaluarsa",
      "shelfLocation": "Lorong 2 - Rak B3",
      "confidence": 0.96
    }
  ],
  "totalDiscrepancy": 1,
  "aiObservations": [
    "Observasi 1 mengenai tata letak rak dan visibilitas barang",
    "Observasi 2 mengenai selisih stok fisik vs sistem",
    "Observasi 3 rekomendasi penataan FEFO"
  ],
  "suggestedStockUpdates": [
    {
      "productId": "id_produk",
      "newStock": 14,
      "note": "Koreksi selisih -1 pcs via AI Camera Count"
    }
  ]
}
`;

    const rawText = await callGeminiVisionSafe(prompt, formattedImages, 0.1);
    if (!rawText) {
      return res.status(503).json({ success: false, error: 'AI tidak dapat menghitung stok dari foto saat ini (API key kosong, kuota habis, atau foto tidak terbaca). Lakukan stock opname manual.' });
    }

    const parsed = extractJsonFromText(rawText);
    if (!parsed || !Array.isArray(parsed.items)) {
      return res.status(503).json({ success: false, error: 'AI tidak dapat menghitung stok dari foto saat ini (API key kosong, kuota habis, atau foto tidak terbaca). Lakukan stock opname manual.' });
    }

    res.json({ ...parsed, isAiGenerated: true });
  } catch (err) {
    console.error('Visual stock opname error:', err);
    res.status(503).json({ success: false, error: 'AI tidak dapat menghitung stok dari foto saat ini (API key kosong, kuota habis, atau foto tidak terbaca). Lakukan stock opname manual.' });
  }
});

router.post('/api/ai/upsell-recommendations', async (req, res) => {
  const { cartItems, allProducts, customerTier, storeName } = req.body;

  // Fallback smart rule-based recommendation generator
  const generateRuleBasedUpsell = () => {
    const cartProductIds = new Set((cartItems || []).map((item: any) => item.product?.id || item.id));
    const available = (allProducts || []).filter((p: any) => !cartProductIds.has(p.id) && p.stock > 0);
    
    // Prioritize popular categories like Minuman, Snack, Makanan Instan
    const sorted = [...available].sort((a: any, b: any) => {
      const aPrio = a.categoryId === 'cat-bev' || a.categoryId === 'cat-snk' ? 2 : 1;
      const bPrio = b.categoryId === 'cat-bev' || b.categoryId === 'cat-snk' ? 2 : 1;
      return bPrio - aPrio;
    });

    const suggestions = sorted.slice(0, 3).map((p: any) => ({
      product: p,
      reason: `Produk terlaris yang sangat cocok dipadukan dengan item belanjaan saat ini.`,
      urgency: 'Promo Hari Ini',
      discountOffer: 'Beli Lebih Hemat',
    }));
    return suggestions;
  };

  try {
    const prompt = `Anda adalah Asisten AI Kasir & Merchandising Pintar untuk toko ritel modern "${storeName || 'Ulilmart'}".
Diberikan daftar item dalam keranjang belanja pelanggan saat ini:
Keranjang: ${JSON.stringify(cartItems?.map((i: any) => ({ name: i.product?.name || i.name, qty: i.quantity, price: i.totalPrice })) || [])}
Tier Pelanggan: ${customerTier || 'Reguler'}

Daftar Semua Produk Toko yang Tersedia:
${JSON.stringify((allProducts || []).map((p: any) => ({ id: p.id, name: p.name, category: p.categoryId, price: p.price, stock: p.stock })))}

Tugas:
Analisis pola belanja ritel modern (FMCG, minimarket/supermarket), lalu pilih 2 sampai 4 produk terbaik dari katalog yang belum ada di keranjang untuk direkomendasikan kasir kepada pembeli (cross-sell/upsell/bundling).
Kembalikan format JSON murni dengan format array objek:
[
  {
    "productId": "id_produk_dari_daftar",
    "reason": "Alasan singkat dan persuasif dalam Bahasa Indonesia mengapa produk ini sangat cocok ditawarkan saat ini (misal: 'Beli Mie Instan pas dipadukan dengan Teh Botol dingin')",
    "urgency": "Badge singkat seperti 'Promo Bundling' / 'Beli 2 Lebih Hemat' / 'Favorit Pembeli'",
    "discountOffer": "Tawaran hemat seperti 'Diskon 10%' atau 'Poin 2x lipat'"
  }
]
`;

    const rawText = await callGeminiSafe(prompt, 0.3);
    if (!rawText) {
      return res.json({ suggestions: generateRuleBasedUpsell(), isAiGenerated: false, note: 'Rekomendasi Cerdas Otomatis' });
    }

    let recommendations: any[] = [];
    try {
      recommendations = JSON.parse(rawText);
    } catch {
      recommendations = [];
    }

    // Attach full product objects
    const productMap = new Map((allProducts || []).map((p: any) => [p.id, p]));
    const formattedSuggestions = recommendations
      .filter((r: any) => productMap.has(r.productId))
      .map((r: any) => ({
        product: productMap.get(r.productId),
        reason: r.reason,
        urgency: r.urgency || 'Rekomendasi Pintar',
        discountOffer: r.discountOffer || '',
      }));

    if (formattedSuggestions.length === 0) {
      return res.json({ suggestions: generateRuleBasedUpsell(), isAiGenerated: false });
    }

    res.json({ suggestions: formattedSuggestions, isAiGenerated: true });
  } catch {
    res.json({
      suggestions: generateRuleBasedUpsell(),
      isAiGenerated: false,
      note: 'Rekomendasi Pintar Otomatis',
    });
  }
});

// AI Dynamic Pricing & Margin Optimizer (Competitor Analysis & Inventory Turnover)
router.post('/api/ai/dynamic-pricing', async (req, res) => {
  const {
    products = [],
    turnoverMetrics = [],
    strategy = 'balanced',
    targetCategory = 'all',
  } = req.body;

  try {
    const turnoverMap = new Map((turnoverMetrics || []).map((t: any) => [t.productId, t]));

    // Prepare rich compact dataset for Gemini
    const itemData = products.slice(0, 30).map((p: any) => {
      const tm: any = turnoverMap.get(p.id) || {};
      const competitors = p.competitors || [];
      const compSummary = competitors.map((c: any) => `${c.competitorName}: Rp ${c.price}`).join(', ');
      return {
        id: p.id,
        name: p.name,
        category: p.categoryName || p.categoryId,
        currentPrice: p.price,
        costPrice: p.costPrice,
        stock: p.stock,
        expiryDate: p.expiryDate || 'N/A',
        turnoverSpeed: tm.turnoverSpeed || 'moderate',
        daysOfInventory: tm.daysOfInventory || 30,
        unitsSold30d: tm.unitsSold30d || 0,
        competitors: compSummary || 'N/A',
      };
    });

    const strategyDescriptions: Record<string, string> = {
      balanced: 'Seimbang: Naikkan margin barang laris yang lebih murah dari kompetitor; pangkas harga barang lambat/mati di atas kompetitor untuk cairkan modal.',
      maximize_profit: 'Maksimalkan Laba: Dongkrak harga mendekati batas atas kompetitor untuk barang perputaran cepat & inelastis.',
      accelerate_turnover: 'Percepat Perputaran Stok: Pangkas harga sedikit di bawah kompetitor untuk melikuidasi stok lambat dan mendongkrak cash flow.',
      competitive_match: 'Penyelarasan Kompetitif: Samakan harga secara presisi dengan rata-rata ritel modern sekitar (Indomaret/Alfamart).',
    };

    const prompt = `Anda adalah Direktur Pricing & Merchandising Retail FMCG Senior di Indonesia.
Analisis data produk ritel modern berikut yang mencakup:
1. Harga Jual & HPP (Cost Price)
2. Kecepatan Perputaran Stok (Inventory Turnover Rate / DSI - Days Sales of Inventory)
3. Harga Kompetitor Lokal (Indomaret, Alfamart, Pasar Tradisional, Toko Grosir)

Strategi Terpilih: "${strategy}" (${strategyDescriptions[strategy] || strategyDescriptions.balanced}).

Daftar Produk Toko:
${JSON.stringify(itemData, null, 2)}

Prinsip Retail Wajib:
- Jangan pernah menetapkan harga di bawah HPP (Cost Price) kecuali stok darurat kadaluarsa (<35 hari).
- Bulatkan harga akhir ke angka psikologis Rupiah yang praktis bagi kasir dan pembeli (misal kelipatan Rp 100, Rp 500, atau Rp 1.000; misal Rp 3.500, Rp 14.500, Rp 125.000).
- Jika barang FAST-MOVING dan harga toko lebih murah dari Indomaret/Alfamart: naikkan harga sedikit (Peluang Margin).
- Jika barang SLOW-MOVING / DEAD STOCK dan harga lebih mahal dari kompetitor: turunkan harga (Percepat Stok).
- Berikan alasan strategis dalam Bahasa Indonesia yang tajam dan profesional yang menyebutkan data DSI, selisih kompetitor, dan dampak margin.

Kembalikan format JSON murni array objek:
[
  {
    "productId": "id_produk",
    "suggestedPrice": 3500,
    "strategyTag": "Peluang Margin" | "Percepat Stok" | "Penyelarasan Pasar" | "Cuci Gudang" | "Harga Optimal",
    "aiReasoning": "Penjelasan komprehensif Bahasa Indonesia alasan penyesuaian harga berdasarkan selisih kompetitor dan kecepatan perputaran stok",
    "confidenceScore": 92
  }
]`;

    const rawText = await callGeminiSafe(prompt, 0.2);
    if (!rawText) {
      return res.json({ suggestions: [], isAiGenerated: false, note: 'Menggunakan Mesin Pricing Aturan Baku' });
    }

    let parsed: any[] = [];
    try {
      parsed = JSON.parse(rawText);
    } catch {
      parsed = [];
    }

    if (Array.isArray(parsed) && parsed.length > 0) {
      return res.json({ suggestions: parsed, isAiGenerated: true, modelUsed: 'gemini-3.8-flash' });
    }

    res.json({ suggestions: [], isAiGenerated: false });
  } catch (err: any) {
    console.error('Error in /api/ai/dynamic-pricing:', err);
    res.json({ suggestions: [], isAiGenerated: false });
  }
});

// 2. AI Retail Restock & Inventory Demand Forecasting (Purchase Order Plan)
router.post('/api/ai/inventory-forecast', async (req, res) => {
  const {
    products = [],
    recentTransactions = [],
    salesReturns = [],
    purchaseReturns = [],
    suppliers = [],
    storeSettings = {},
    targetDate,
    deadstockRule = 'eliminate', // 'eliminate' | 'reduce' | 'none'
    returnRule = 'reduce', // 'eliminate' | 'reduce' | 'none'
  } = req.body;

  const now = new Date();
  let projectionDays = 14;
  if (targetDate) {
    const target = new Date(targetDate);
    if (!isNaN(target.getTime())) {
      const diff = Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      projectionDays = Math.max(1, Math.min(60, diff || 7));
    }
  }

  // Helper: Match product to registered supplier
  const matchRegisteredSupplier = (p: any) => {
    if (!suppliers || suppliers.length === 0) {
      return {
        supplierId: 'sup-default',
        supplierName: p.brand ? `Distributor ${p.brand}` : 'Supplier Umum FMCG',
        paymentTerms: 'Tunai',
      };
    }

    if (p.supplierId) {
      const found = suppliers.find((s: any) => s.id === p.supplierId);
      if (found) {
        return {
          supplierId: found.id,
          supplierName: found.name,
          paymentTerms: found.paymentTerms || 'Tunai',
        };
      }
    }

    const pName = (p.name || '').toLowerCase();
    const pCat = (p.categoryId || '').toLowerCase();
    const pBrand = (p.brand || '').toLowerCase();

    for (const sup of suppliers) {
      const sName = (sup.name || '').toLowerCase();
      const sNotes = (sup.notes || '').toLowerCase();
      const sAll = `${sName} ${sNotes}`;

      // Roti & Selai / Bakery / Snack Lokal (Konsinyasi)
      if (
        (pCat.includes('bakery') || pCat.includes('roti') || pName.includes('roti') || pName.includes('selai') || pName.includes('sari roti')) &&
        (sAll.includes('roti') || sAll.includes('snack') || sAll.includes('berkah roti') || sAll.includes('titip') || sAll.includes('konsinyasi'))
      ) {
        return { supplierId: sup.id, supplierName: sup.name, paymentTerms: sup.paymentTerms || 'Konsinyasi (Titip Jual)' };
      }

      // Sembako, Beras, Minyak, Telur, Gula
      if (
        (pCat.includes('staple') || pName.includes('beras') || pName.includes('minyak') || pName.includes('telur') || pName.includes('gula')) &&
        (sAll.includes('sembako') || sAll.includes('beras') || sAll.includes('sumber berkah') || sAll.includes('pangan'))
      ) {
        return { supplierId: sup.id, supplierName: sup.name, paymentTerms: sup.paymentTerms || 'Tempo 14 Hari' };
      }

      // Brand exact or partial match with supplier name/notes
      if (pBrand && (sName.includes(pBrand) || sNotes.includes(pBrand))) {
        return { supplierId: sup.id, supplierName: sup.name, paymentTerms: sup.paymentTerms || 'Tempo 30 Hari' };
      }

      // Unilever / Personal Care / Home Care
      if (
        (pCat.includes('personal') || pCat.includes('home') || pName.includes('lifebuoy') || pName.includes('sunlight') || pName.includes('pepsodent') || pName.includes('rinso')) &&
        (sAll.includes('unilever') || sAll.includes('wings') || sAll.includes('personal') || sAll.includes('home care'))
      ) {
        return { supplierId: sup.id, supplierName: sup.name, paymentTerms: sup.paymentTerms || 'Tempo 30 Hari' };
      }

      // FMCG / Indomie / Aqua / Minuman / Makanan
      if (
        (pCat.includes('beverage') || pCat.includes('instant') || pCat.includes('snack') || pName.includes('indomie') || pName.includes('aqua')) &&
        (sAll.includes('indomarco') || sAll.includes('fmcg') || sAll.includes('distributor'))
      ) {
        return { supplierId: sup.id, supplierName: sup.name, paymentTerms: sup.paymentTerms || 'Tempo 30 Hari' };
      }
    }

    // Default to first supplier
    const first = suppliers[0];
    return {
      supplierId: first.id,
      supplierName: first.name,
      paymentTerms: first.paymentTerms || 'Tunai',
    };
  };

  // Build 14-day history date map for charting
  const last14Dates: string[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 86400000);
    last14Dates.push(toLocalDateString(d));
  }

  // Aggregate sales & returns per product
  const productStats = new Map<string, {
    totalSold: number;
    totalReturned: number;
    dailyHistory: Map<string, { sold: number; ret: number }>;
  }>();

  (products || []).forEach((p: any) => {
    const daily = new Map<string, { sold: number; ret: number }>();
    last14Dates.forEach((dt) => daily.set(dt, { sold: 0, ret: 0 }));
    productStats.set(p.id, { totalSold: 0, totalReturned: 0, dailyHistory: daily });
  });

  (recentTransactions || []).forEach((t: any) => {
    const txDate = t.createdAt ? toLocalDateString(new Date(t.createdAt)) : '';
    (t.items || []).forEach((item: any) => {
      const pId = item.product?.id || item.productId;
      const stat = pId ? productStats.get(pId) : null;
      const qty = Number(item.quantity) || 1;
      if (stat) {
        stat.totalSold += qty;
        if (stat.dailyHistory.has(txDate)) {
          const entry = stat.dailyHistory.get(txDate)!;
          entry.sold += qty;
        }
      }
    });
  });

  (salesReturns || []).forEach((ret: any) => {
    const retDate = ret.createdAt ? toLocalDateString(new Date(ret.createdAt)) : '';
    (ret.items || []).forEach((item: any) => {
      const pId = item.productId;
      const stat = pId ? productStats.get(pId) : null;
      const qty = Number(item.quantity) || 1;
      if (stat) {
        stat.totalReturned += qty;
        if (stat.dailyHistory.has(retDate)) {
          const entry = stat.dailyHistory.get(retDate)!;
          entry.ret += qty;
        }
      }
    });
  });

  const generateRuleBasedForecast = () => {
    const lowItems = (products || []).filter((p: any) => p.stock <= (p.minStock || 10));
    const candidateItems = lowItems.length > 0 ? lowItems : (products || []).slice(0, 6);

    let totalBudget = 0;
    let deadstockCount = 0;
    let returnedItemsCount = 0;

    const suggestions = candidateItems.map((p: any) => {
      const stat = productStats.get(p.id) || {
        totalSold: 0,
        totalReturned: 0,
        dailyHistory: new Map(),
      };
      const isZero = p.stock === 0;
      const isDeadstock = stat.totalSold === 0 && p.stock > 0;
      const hasRetur = stat.totalReturned > 0;
      if (isDeadstock) deadstockCount++;
      if (hasRetur) returnedItemsCount++;

      const dailyVelocity = Math.round((stat.totalSold / 14) * 100) / 100;
      const projectedDemand = Math.ceil(dailyVelocity * projectionDays);
      const deficit = Math.max(0, (p.minStock || 10) + projectedDemand - p.stock);
      const rawOrderQty = Math.max(12, Math.ceil(deficit / 6) * 6);

      let orderQty = rawOrderQty;
      let quotaAdjustment: 'eliminated' | 'reduced' | 'normal' = 'normal';
      let quotaAdjustmentReason: string | undefined = undefined;

      if (isDeadstock) {
        if (deadstockRule === 'eliminate') {
          orderQty = 0;
          quotaAdjustment = 'eliminated';
          quotaAdjustmentReason = `Barang Deadstock (0 penjualan 14 hari). Kuota order dieliminasi (0) agar modal tidak macet.`;
        } else if (deadstockRule === 'reduce') {
          orderQty = Math.max(1, Math.floor(rawOrderQty * 0.5));
          quotaAdjustment = 'reduced';
          quotaAdjustmentReason = `Barang Deadstock/Slow-Moving. Kuota order dipangkas 50% (${orderQty} unit) sebagai penyangga minimal.`;
        }
      } else if (hasRetur) {
        if (returnRule === 'eliminate') {
          orderQty = 0;
          quotaAdjustment = 'eliminated';
          quotaAdjustmentReason = `Terdeteksi riwayat retur (${stat.totalReturned} unit). Kuota order dieliminasi untuk evaluasi supplier/mutu.`;
        } else if (returnRule === 'reduce') {
          orderQty = Math.max(1, Math.floor(rawOrderQty * 0.5));
          quotaAdjustment = 'reduced';
          quotaAdjustmentReason = `Ada riwayat retur (${stat.totalReturned} unit). Kuota order dipangkas 50% (${orderQty} unit) untuk mencegah kerugian.`;
        }
      }

      const cost = Number(p.costPrice) || 0;
      const subtotal = orderQty * cost;
      totalBudget += subtotal;

      let urgency = 'SEDANG';
      if (quotaAdjustment === 'eliminated') urgency = 'OPTIMAL';
      else if (isZero) urgency = 'KRITIS';
      else if (p.stock <= (p.minStock || 5)) urgency = 'TINGGI';

      const estimatedDays = isZero ? 0 : dailyVelocity > 0 ? Math.max(1, Math.floor(p.stock / dailyVelocity)) : 30;

      const salesHistoryByDate = last14Dates.map((dt) => {
        const hist = stat.dailyHistory.get(dt) || { sold: 0, ret: 0 };
        return {
          date: dt.slice(5),
          soldQty: hist.sold,
          returnQty: hist.ret,
        };
      });

      const matchedSup = matchRegisteredSupplier(p);

      return {
        productId: p.id,
        productName: p.name,
        sku: p.sku || `SKU-${p.id.slice(-4)}`,
        barcode: p.barcode || '',
        unit: p.unit || 'pcs',
        category: p.categoryId || 'General',
        currentStock: p.stock,
        minStock: p.minStock || 10,
        recommendedOrderQty: orderQty,
        originalOrderQty: rawOrderQty,
        quotaAdjustment,
        quotaAdjustmentReason,
        returnCount: stat.totalReturned,
        returnRate: stat.totalSold > 0 ? Math.round((stat.totalReturned / stat.totalSold) * 100) : 0,
        isDeadstock,
        totalSoldPeriod: stat.totalSold,
        dailySalesVelocity: dailyVelocity,
        salesHistoryByDate,
        costPrice: cost,
        estimatedSubtotal: subtotal,
        suggestedSupplier: matchedSup.supplierName,
        supplierId: matchedSup.supplierId,
        supplierTerms: matchedSup.paymentTerms,
        urgency,
        estimatedDaysLeft: estimatedDays,
        actionAdvice: quotaAdjustment === 'eliminated'
          ? (quotaAdjustmentReason || 'Kuota dieliminasi berdasarkan aturan retur & deadstock.')
          : isZero
          ? `Stok habis! Prioritaskan pemesanan untuk mencukupi horizon ${projectionDays} hari ke depan.`
          : `Sisa stok ${p.stock} ${p.unit || 'pcs'}. Pesan ${orderQty} ${p.unit || 'pcs'} untuk target pemenuhan ${projectionDays} hari.`,
      };
    });

    return {
      summary: `Rencana Restock terencana untuk target kebutuhan ${projectionDays} hari ke depan${targetDate ? ` (Target: ${targetDate})` : ''}. Dikelompokkan berdasarkan distributor/supplier terdaftar dan diterapkan aturan eliminasi/pemangkasan kuota untuk ${deadstockCount} barang deadstock dan ${returnedItemsCount} barang dengan riwayat retur.`,
      healthScore: lowItems.length === 0 ? 95 : Math.max(45, 100 - (lowItems.length * 8)),
      totalEstimatedBudget: totalBudget,
      totalItemsToRestock: suggestions.filter((s) => s.recommendedOrderQty > 0).length,
      targetDate: targetDate || toLocalDateString(now),
      projectionDays,
      deadstockRule,
      returnRule,
      deadstockCount,
      returnedItemsCount,
      forecasts: suggestions,
      deadstockOrExpiryAlerts: (products || [])
        .filter((p: any) => p.expiryDate && new Date(p.expiryDate).getTime() - Date.now() < 60 * 86400000)
        .slice(0, 3)
        .map((p: any) => ({
          productName: p.name,
          issue: 'Mendekati Tanggal Kadaluarsa (FEFO)',
          suggestedPromotion: 'Tempatkan di rak depan kasir dan berikan potongan tebus murah / diskon bundel.',
        })),
      isAiGenerated: false,
      generatedAt: new Date().toISOString(),
    };
  };

  try {
    const prompt = `Anda adalah AI Supply Chain & Inventory Strategist untuk toko ritel modern "${storeSettings?.storeName || 'Ulilmart'}".
Target Tanggal Restock: ${targetDate || 'Hari Ini'} (Horizon Proyeksi: ${projectionDays} hari ke depan).
Kebijakan Aturan Retur: "${returnRule}" (eliminate = eliminasi jadi 0; reduce = pangkas kuota 50%; none = normal).
Kebijakan Aturan Deadstock: "${deadstockRule}" (eliminate = eliminasi jadi 0; reduce = pangkas kuota 50%; none = normal).

DAFTAR SUPPLIER / DISTRIBUTOR TERDAFTAR DI SISTEM:
${JSON.stringify((suppliers || []).map((s: any) => ({
  id: s.id,
  name: s.name,
  paymentTerms: s.paymentTerms,
  contactPerson: s.contactPerson,
  phone: s.phone,
  notes: s.notes,
})))}

Data Produk Toko:
${JSON.stringify((products || []).map((p: any) => {
  const stat = productStats.get(p.id) || { totalSold: 0, totalReturned: 0 };
  return {
    id: p.id,
    name: p.name,
    sku: p.sku,
    barcode: p.barcode,
    category: p.categoryId,
    brand: p.brand,
    stock: p.stock,
    minStock: p.minStock,
    unit: p.unit,
    costPrice: p.costPrice,
    price: p.price,
    expiryDate: p.expiryDate,
    totalSoldLast14Days: stat.totalSold,
    totalReturned: stat.totalReturned,
    isDeadstock: stat.totalSold === 0 && p.stock > 0,
  };
}))}

Data Transaksi Terakhir (${recentTransactions?.length || 0} transaksi) & Retur (${salesReturns?.length || 0} retur).

TUGAS UTAMA:
1. Lakukan analisis stok untuk horizon target ${projectionDays} hari ke depan (berdasarkan run-rate penjualan).
2. KATEGORISASI KE SUPPLIER TERDAFTAR (WAJIB):
   - Setiap item rekomendasi restock HARUS dikaitkan ke salah satu Supplier yang TERDAFTAR di atas!
   - Contoh: produk roti/snack/selai ke supplier roti/konsinyasi; sembako/beras/gula ke supplier sembako; FMCG/Indomie/minuman ke distributor FMCG resmi.
   - Isi "suggestedSupplier" dengan NAMA supplier terdaftar, dan "supplierId" dengan ID supplier terdaftar (misal "sup-001").
   - Sertakan "supplierTerms" dengan syarat pembayaran supplier tersebut (misal "Tempo 14 Hari", "Konsinyasi (Titip Jual)", atau "Tunai").
3. ATURAN RETUR & DEADSTOCK:
   - Jika produk DEADSTOCK (0 penjualan): terapkan aturan "${deadstockRule}". Jika 'eliminate', set recommendedOrderQty = 0 dan quotaAdjustment = 'eliminated'. Jika 'reduce', pangkas kuota 50% dan quotaAdjustment = 'reduced'.
   - Jika produk memiliki RIWAYAT RETUR (totalReturned > 0): terapkan aturan "${returnRule}". Jika 'eliminate', set recommendedOrderQty = 0 dan quotaAdjustment = 'eliminated'. Jika 'reduce', pangkas kuota 50% dan quotaAdjustment = 'reduced'.
4. Sertakan alasan kuota yang jelas pada "quotaAdjustmentReason".
5. Kembalikan JSON valid:
{
  "summary": "Ringkasan eksekutif 2 kalimat mencakup target tanggal, kondisi stok per distributor supplier terdaftar, dan penanganan retur/deadstock.",
  "healthScore": 88,
  "totalEstimatedBudget": 1850000,
  "targetDate": "${targetDate || toLocalDateString(now)}",
  "projectionDays": ${projectionDays},
  "deadstockRule": "${deadstockRule}",
  "returnRule": "${returnRule}",
  "forecasts": [
    {
      "productId": "id_produk",
      "productName": "Nama Produk",
      "sku": "SKU...",
      "barcode": "Barcode...",
      "unit": "pcs",
      "category": "Kategori",
      "currentStock": 2,
      "minStock": 10,
      "recommendedOrderQty": 24,
      "originalOrderQty": 24,
      "quotaAdjustment": "normal" | "eliminated" | "reduced",
      "quotaAdjustmentReason": "Alasan penyesuaian kuota jika tereliminasi atau dipangkas",
      "returnCount": 0,
      "isDeadstock": false,
      "dailySalesVelocity": 1.5,
      "costPrice": 15000,
      "estimatedSubtotal": 360000,
      "suggestedSupplier": "Nama Supplier Terdaftar",
      "supplierId": "sup-001",
      "supplierTerms": "Tempo 14 Hari",
      "urgency": "KRITIS" | "TINGGI" | "SEDANG" | "OPTIMAL",
      "estimatedDaysLeft": 2,
      "actionAdvice": "Saran pemesanan spesifik dan run-rate"
    }
  ],
  "deadstockOrExpiryAlerts": [
    {
      "productName": "Nama Produk",
      "issue": "Mendekati Kadaluarsa / Deadstock",
      "suggestedPromotion": "Saran penanganan stok"
    }
  ]
}
`;

    const rawText = await callGeminiSafe(prompt, 0.2);
    if (!rawText) {
      return res.json(generateRuleBasedForecast());
    }

    const parsed = extractJsonFromText(rawText) || JSON.parse(rawText);
    
    // Ensure estimatedSubtotal and totals are populated correctly and inject history array
    if (parsed && Array.isArray(parsed.forecasts)) {
      let calculatedTotal = 0;
      let dCount = 0;
      let rCount = 0;

      parsed.forecasts = parsed.forecasts.map((fc: any) => {
        const prod = (products || []).find((p: any) => p.id === fc.productId || p.name === fc.productName);
        const pId = fc.productId || prod?.id || '';
        const stat = productStats.get(pId) || { totalSold: 0, totalReturned: 0, dailyHistory: new Map() };
        
        const isDeadstock = fc.isDeadstock !== undefined ? fc.isDeadstock : (stat.totalSold === 0 && (prod?.stock || 0) > 0);
        const returnCount = fc.returnCount !== undefined ? fc.returnCount : stat.totalReturned;
        if (isDeadstock) dCount++;
        if (returnCount > 0) rCount++;

        const cost = Number(fc.costPrice) || (prod ? Number(prod.costPrice) : 0);
        const qty = Number(fc.recommendedOrderQty) || 0;
        const subtotal = Number(fc.estimatedSubtotal) || (cost * qty);
        calculatedTotal += subtotal;

        const salesHistoryByDate = last14Dates.map((dt) => {
          const hist = stat.dailyHistory.get(dt) || { sold: 0, ret: 0 };
          return {
            date: dt.slice(5),
            soldQty: hist.sold,
            returnQty: hist.ret,
          };
        });

        const fallbackSup = matchRegisteredSupplier(prod || { name: fc.productName });
        const finalSupplierName = fc.suggestedSupplier || fallbackSup.supplierName;
        const matchedSupFromList = (suppliers || []).find(
          (s: any) => s.id === fc.supplierId || s.name === finalSupplierName || s.name.toLowerCase().includes(finalSupplierName.toLowerCase())
        );

        return {
          ...fc,
          productId: pId,
          sku: fc.sku || prod?.sku || '',
          barcode: fc.barcode || prod?.barcode || '',
          unit: fc.unit || prod?.unit || 'pcs',
          costPrice: cost,
          recommendedOrderQty: qty,
          estimatedSubtotal: subtotal,
          isDeadstock,
          returnCount,
          totalSoldPeriod: stat.totalSold,
          dailySalesVelocity: fc.dailySalesVelocity || Math.round((stat.totalSold / 14) * 100) / 100,
          salesHistoryByDate,
          suggestedSupplier: matchedSupFromList ? matchedSupFromList.name : finalSupplierName,
          supplierId: matchedSupFromList ? matchedSupFromList.id : (fc.supplierId || fallbackSup.supplierId),
          supplierTerms: matchedSupFromList ? (matchedSupFromList.paymentTerms || 'Tunai') : (fc.supplierTerms || fallbackSup.paymentTerms),
        };
      });

      parsed.totalEstimatedBudget = parsed.totalEstimatedBudget || calculatedTotal;
      parsed.totalItemsToRestock = parsed.forecasts.filter((f: any) => f.recommendedOrderQty > 0).length;
      parsed.targetDate = parsed.targetDate || targetDate || toLocalDateString(now);
      parsed.projectionDays = parsed.projectionDays || projectionDays;
      parsed.deadstockRule = deadstockRule;
      parsed.returnRule = returnRule;
      parsed.deadstockCount = dCount;
      parsed.returnedItemsCount = rCount;
    }

    res.json({
      ...parsed,
      isAiGenerated: true,
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Error generating AI restock forecast:', err);
    res.json(generateRuleBasedForecast());
  }
});

// 3. AI Retail Business & Sales Intelligence (Z-Report Executive Insights)
router.post('/api/ai/daily-insights', async (req, res) => {
  const { transactions, products, settings } = req.body;

  const totalRev = (transactions || []).reduce((s: number, t: any) => s + (t.finalTotal || 0), 0);
  const completedTx = (transactions || []).filter((t: any) => t.status === 'completed');

  const generateRuleBasedInsights = () => {
    return {
      executiveSummary: `Performa toko stabil dengan total omzet ${totalRev > 0 ? `Rp ${totalRev.toLocaleString('id-ID')}` : 'Rp 0'} dari ${completedTx.length} transaksi. Kategori kebutuhan pokok dan minuman mendominasi penjualan.`,
      peakPerformanceTime: '11:00 - 13:30 (Makan Siang) & 17:30 - 20:00 (Jam Pulang Kerja)',
      topGrowthCategory: 'Sembako & Kebutuhan Rumah Tangga',
      marginAnalysis: 'Margin kotor rata-rata berada pada tingkat optimal 18-25% untuk kategori FMCG.',
      actionableTips: [
        'Pastikan stok minuman dingin dan produk display kasir terisi penuh sebelum jam ramai siang hari.',
        'Tawarkan paket hemat bundling atau tebus murah untuk pembelanjaan di atas Rp 50.000.',
        'Periksa kembali stok barang yang menipis untuk persiapan pemesanan ke distributor.'
      ],
      isAiGenerated: false,
    };
  };

  try {
    const prompt = `Anda adalah Direktur Operasional & Konsultan AI Ritel Modern untuk "${settings?.storeName || 'Ulilmart'}".
Ringkasan Data Penjualan Hari Ini:
- Total Omzet: Rp ${totalRev.toLocaleString('id-ID')}
- Jumlah Transaksi Sukses: ${completedTx.length}
- Cabang: ${settings?.branchName || 'Cabang Utama'}
- Sampel Transaksi:
${JSON.stringify(completedTx.slice(0, 15).map((t: any) => ({
  inv: t.invoiceNumber,
  total: t.finalTotal,
  method: t.payment?.method,
  items: t.items?.map((i: any) => `${i.product.name} (x${i.quantity})`),
  date: t.createdAt,
})))}

Tugas:
Analisis performa penjualan ritel secara tajam, berikan insight eksekutif yang aplikatif untuk Store Manager dan Kasir.
Kembalikan JSON:
{
  "executiveSummary": "Analisis tajam performa hari ini dalam 2-3 kalimat formal & actionable.",
  "peakPerformanceTime": "Perkiraan jam ramai pembeli (e.g. '11:30 - 13:30 (Makan Siang) & 17:30 - 19:30')",
  "topGrowthCategory": "Kategori yang paling laris / berpotensi tumbuh tinggi",
  "marginAnalysis": "Ulasan singkat margin laba kotor & efisiensi diskon voucher",
  "actionableTips": [
    "Saran taktis 1 untuk operasional kasir & penataan lorong",
    "Saran taktis 2 untuk promosi member & loyalty",
    "Saran taktis 3 untuk antisipasi stok besok"
  ]
}
`;

    const rawText = await callGeminiSafe(prompt, 0.3);
    if (!rawText) {
      return res.json(generateRuleBasedInsights());
    }

    const parsed = JSON.parse(rawText);
    res.json({ ...parsed, isAiGenerated: true });
  } catch {
    res.json(generateRuleBasedInsights());
  }
});

// 4. AI Retail Promo & Campaign Creator with Owner Margin Protection (Min. 5% Profit Margin)
router.post('/api/ai/generate-promo', async (req, res) => {
  const { campaignTheme, targetCategory, products, settings, minOwnerMargin = 5 } = req.body;

  // Owner Profit Margin Rule: Guarantee owner earns at least minOwnerMargin% (default >= 5%)
  const safeMinMargin = Math.max(5, Number(minOwnerMargin) || 5);

  // Filter products by category if specified, or analyze catalog
  const validProducts: any[] = Array.isArray(products) && products.length > 0 ? products : [];
  const targetProds = targetCategory && targetCategory !== 'Semua Kategori'
    ? validProducts.filter((p: any) => {
        const catId = (p.categoryId || '').toLowerCase();
        const target = targetCategory.toLowerCase();
        return catId.includes(target) || target.includes(catId) || (p.category && p.category.toLowerCase().includes(target));
      })
    : validProducts;

  const prodsToAnalyze = targetProds.length > 0 ? targetProds : validProducts;

  // Calculate gross margins of items: ((price - costPrice) / price) * 100
  const marginStats = prodsToAnalyze
    .filter((p: any) => p.price > 0 && p.costPrice > 0)
    .map((p: any) => {
      const margin = ((p.price - p.costPrice) / p.price) * 100;
      return {
        name: p.name,
        price: p.price,
        costPrice: p.costPrice,
        marginPercent: margin,
      };
    });

  const avgOriginalMargin = marginStats.length > 0
    ? marginStats.reduce((acc, curr) => acc + curr.marginPercent, 0) / marginStats.length
    : 22; // default retail FMCG margin baseline (~22%)

  const avgPrice = marginStats.length > 0
    ? marginStats.reduce((acc, curr) => acc + curr.price, 0) / marginStats.length
    : 15000;

  const avgCostPrice = marginStats.length > 0
    ? marginStats.reduce((acc, curr) => acc + curr.costPrice, 0) / marginStats.length
    : avgPrice * (1 - avgOriginalMargin / 100);

  // Maximum allowable discount percentage so that (avgOriginalMargin - discount) >= safeMinMargin
  // e.g. If avgOriginalMargin is 22% and safeMinMargin is 5%, max discount is 17%
  const maxAllowableDiscountPercent = Math.max(1, Math.floor(avgOriginalMargin - safeMinMargin));

  const defaultMinSpend = 50000;
  // Maximum allowable fixed discount on default minSpend ensuring profit margin >= safeMinMargin
  const maxAllowableFixedDiscount = Math.max(
    1000,
    Math.floor(defaultMinSpend * ((avgOriginalMargin - safeMinMargin) / 100))
  );

  const generateRuleBasedPromo = () => {
    // Choose a safe discount that strictly preserves owner profit margin >= safeMinMargin
    const safeDiscountPercent = Math.min(10, maxAllowableDiscountPercent);
    const minSpend = 50000;
    const estDiscountVal = (minSpend * safeDiscountPercent) / 100;
    const estHPP = minSpend * (1 - avgOriginalMargin / 100);
    const estNetRevenue = minSpend - estDiscountVal;
    const estNetProfit = estNetRevenue - estHPP;
    const projectedMargin = estNetRevenue > 0 ? (estNetProfit / estNetRevenue) * 100 : safeMinMargin;

    return {
      title: campaignTheme ? `Promo Spesial: ${campaignTheme}` : 'Promo Belanja Super Hemat & Berkah',
      tagline: `Belanja Puas, Tetap Untung & Terjangkau (Margin Owner Aman ≥ ${safeMinMargin}%)`,
      voucherCode: `PROMO${safeDiscountPercent}`,
      discountType: 'percentage' as const,
      value: safeDiscountPercent,
      minSpend,
      bundleItems: (prodsToAnalyze || []).slice(0, 2).map((p: any) => p.name),
      description: `Diskon spesial ${safeDiscountPercent}% untuk pembelanjaan minimal Rp ${minSpend.toLocaleString('id-ID')}. Aturan margin owner dipatuhi dengan keuntungan bersih toko terjamin di atas ${safeMinMargin}%.`,
      isAiGenerated: false,
      originalMarginPercent: Math.round(avgOriginalMargin * 10) / 10,
      projectedMarginPercent: Math.round(projectedMargin * 10) / 10,
      minProfitMargin: safeMinMargin,
      estimatedProfitAmount: Math.round(estNetProfit),
      marginSafetyStatus: 'safe' as const,
      ownerSafetyNote: `Aturan Proteksi Margin Aktif: Diskon dibatasi maksimal ${maxAllowableDiscountPercent}% agar margin keuntungan bersih owner tetap terjaga di atas ${safeMinMargin}% (Est. Laba Bersih: Rp ${Math.round(estNetProfit).toLocaleString('id-ID')} per voucher).`,
    };
  };

  try {
    const prompt = `Anda adalah AI Financial & Marketing Retail Strategist untuk toko/minimarket "${settings?.storeName || 'Ulilmart'}".
Tema Kampanye: ${campaignTheme || 'Promo Spesial Ritel Modern'}
Target Kategori: ${targetCategory || 'Semua Kategori'}
Daftar Produk: ${JSON.stringify(prodsToAnalyze.slice(0, 15).map((p: any) => ({ name: p.name, price: p.price, costPrice: p.costPrice, margin: Math.round(((p.price - p.costPrice)/p.price)*100) + '%' })))}

🚨 ATURAN KETAT OWNER: PROTEKSI MARGIN PROFIT MINIMAL ${safeMinMargin}%:
1. Rata-rata margin keuntungan kotor saat ini untuk produk terpilih adalah ${avgOriginalMargin.toFixed(1)}% (Rata-rata modal HPP: Rp ${Math.round(avgCostPrice).toLocaleString('id-ID')}, Harga Jual: Rp ${Math.round(avgPrice).toLocaleString('id-ID')}).
2. Owner toko mensyaratkan bahwa setiap promo atau voucher belanja WAJIB memberikan margin keuntungan bersih MINIMAL ${safeMinMargin}% setelah diskon dipotong.
3. DILARANG KERAS merugikan toko atau menjual di bawah modal (HPP).
4. BATAS DISKON MAKSIMAL YANG DIIZINKAN: ${maxAllowableDiscountPercent}% (untuk persentase) atau maksimal Rp ${maxAllowableFixedDiscount.toLocaleString('id-ID')} untuk belanja minimal Rp ${defaultMinSpend.toLocaleString('id-ID')}.
5. Jika memilih diskon persentase, nilai 'value' TIDAK BOLEH lebih dari ${maxAllowableDiscountPercent}%.
6. Tentukan nilai 'minSpend' (minimal belanja) yang memadai agar keranjang belanja pelanggan menutupi modal dan memberikan margin keuntungan sehat bagi owner.

Tugas:
Buat ide promo ritel modern yang sangat menarik bagi konsumen (misal Promo JSM, Sarapan Hemat, Bundling Tebus Murah) yang TERBUKTI AMAN DAN MENGUNTUNGKAN OWNER TOKO.

Kembalikan HANYA format JSON valid tanpa markdown:
{
  "title": "Nama Promo yang catchy (misal: 'Promo JSM Kilat: Sarapan Sehat')",
  "tagline": "Slogan promosi menarik untuk banner kasir / struk belanja",
  "voucherCode": "KODE_VOUCHER_KAPITAL",
  "discountType": "percentage", // atau "fixed"
  "value": 10, // angka persentase (maksimal ${maxAllowableDiscountPercent}) atau nominal potongan rupiah
  "minSpend": 50000,
  "bundleItems": ["Nama Produk 1", "Nama Produk 2"],
  "description": "Penjelasan detail mekanisme promo untuk kasir & pembeli",
  "ownerSafetyNote": "Alasan finansial mengapa promo ini aman dan menjamin margin owner >= ${safeMinMargin}%"
}
`;

    const rawText = await callGeminiSafe(prompt, 0.4);
    if (!rawText) {
      return res.json(generateRuleBasedPromo());
    }

    const parsed = JSON.parse(rawText);

    // Strict Enforcement of Owner Profit Margin Rules (Defense-in-depth safety guard)
    let finalDiscountType: 'percentage' | 'fixed' = parsed.discountType === 'fixed' ? 'fixed' : 'percentage';
    let finalValue = Number(parsed.value) || 5;
    let finalMinSpend = Math.max(10000, Number(parsed.minSpend) || defaultMinSpend);
    let marginSafetyStatus: 'safe' | 'capped' | 'warning' = 'safe';
    let safetyNote = parsed.ownerSafetyNote || '';

    if (finalDiscountType === 'percentage') {
      if (finalValue > maxAllowableDiscountPercent) {
        finalValue = maxAllowableDiscountPercent;
        marginSafetyStatus = 'capped';
        safetyNote = `Diskon otomatis disesuaikan dari usulan awal menjadi ${maxAllowableDiscountPercent}% agar margin keuntungan owner tetap terjaga aman di atas batas minimal ${safeMinMargin}%.`;
      }
    } else {
      // Fixed discount validation
      const maxAllowedFixedForThisSpend = Math.floor(
        finalMinSpend * ((avgOriginalMargin - safeMinMargin) / 100)
      );
      if (finalValue > maxAllowedFixedForThisSpend) {
        if (maxAllowedFixedForThisSpend >= 1000) {
          finalValue = maxAllowedFixedForThisSpend;
          marginSafetyStatus = 'capped';
          safetyNote = `Potongan diskon dibatasi maksimal Rp ${maxAllowedFixedForThisSpend.toLocaleString('id-ID')} pada minimal belanja Rp ${finalMinSpend.toLocaleString('id-ID')} untuk memastikan margin owner tetap ≥ ${safeMinMargin}%.`;
        } else {
          // Increase minSpend to accommodate the discount value safely
          finalMinSpend = Math.ceil((finalValue * 100) / Math.max(1, (avgOriginalMargin - safeMinMargin)));
          marginSafetyStatus = 'capped';
          safetyNote = `Minimal belanja dinaikkan menjadi Rp ${finalMinSpend.toLocaleString('id-ID')} agar voucher potongan Rp ${finalValue.toLocaleString('id-ID')} tetap menjamin margin profit owner minimal ${safeMinMargin}%.`;
        }
      }
    }

    // Compute final projected margin & profit for owner transparency
    const estDiscountVal = finalDiscountType === 'percentage'
      ? (finalMinSpend * finalValue) / 100
      : finalValue;
    const estHPP = finalMinSpend * (1 - avgOriginalMargin / 100);
    const estNetRevenue = finalMinSpend - estDiscountVal;
    const estNetProfit = estNetRevenue - estHPP;
    const projectedMarginPercent = estNetRevenue > 0 ? (estNetProfit / estNetRevenue) * 100 : safeMinMargin;

    res.json({
      ...parsed,
      discountType: finalDiscountType,
      value: finalValue,
      minSpend: finalMinSpend,
      originalMarginPercent: Math.round(avgOriginalMargin * 10) / 10,
      projectedMarginPercent: Math.round(projectedMarginPercent * 10) / 10,
      minProfitMargin: safeMinMargin,
      estimatedProfitAmount: Math.round(estNetProfit),
      marginSafetyStatus,
      ownerSafetyNote: safetyNote || `Promo diverifikasi aman: Estimasi margin sisa ${Math.round(projectedMarginPercent * 10) / 10}% (di atas target minimal ${safeMinMargin}%).`,
      isAiGenerated: true,
    });
  } catch {
    res.json(generateRuleBasedPromo());
  }
});

// 4b. AI Segment-Based Branded Promo & Discount Generator
router.post('/api/ai/generate-segment-promo', async (req, res) => {
  const {
    segmentKey,
    segmentLabel,
    segmentStats,
    specificCustomer,
    campaignObjective = 'reengagement',
    brandTone = 'warm_friendly',
    discountTypePreference = 'percentage',
    storeSettings,
    customInstructions,
  } = req.body;

  const storeName = storeSettings?.storeName || 'Ulilmart';
  const branchName = storeSettings?.branchName || 'Cabang Utama';

  const defaultTopProducts = segmentStats?.topProducts?.length
    ? segmentStats.topProducts.map((p: any) => (typeof p === 'string' ? p : p.name)).slice(0, 5)
    : ['Beras Pandan Wangi', 'Minyak Goreng', 'Kopi Kapal Api', 'Gula Pasir', 'Indomie Goreng'];

  const avgSpend = Number(segmentStats?.averageSpend) || 60000;
  const suggestedMinSpend = Math.max(30000, Math.round((avgSpend * 0.9) / 5000) * 5000);

  const generateRuleBasedSegmentPromo = () => {
    let title = `Promo Spesial ${segmentLabel || 'Member Setia'}`;
    let hook = `Belanja hemat produk kebutuhan favoritmu di ${storeName}!`;
    let code = `PROMO${Math.floor(10 + Math.random() * 89)}`;
    const discountType: 'percentage' | 'fixed' = discountTypePreference === 'fixed' ? 'fixed' : 'percentage';
    let value = discountType === 'percentage' ? 12 : 10000;
    let minSpend = suggestedMinSpend;
    let expiryDays = 7;

    const topProdStr = defaultTopProducts.slice(0, 3).join(', ');

    if (segmentKey === 'vip') {
      title = `Apresiasi Eksklusif VIP & Sultan ${storeName} 👑`;
      hook = `Terima kasih atas kesetiaan Anda! Nikmati potongan diskon khusus belanja bulan ini.`;
      code = `VIP${storeName.replace(/\s+/g, '').toUpperCase().slice(0, 6)}15`;
      value = discountType === 'percentage' ? 15 : 25000;
      minSpend = Math.max(100000, Math.round(avgSpend * 0.8));
    } else if (segmentKey === 'dormant') {
      title = `Kami Kangen Kamu di ${storeName}! 💖`;
      hook = `Sudah lama tidak jumpa! Ada voucher spesial menyambut kepulanganmu belanja.`;
      code = `KANGEN${storeName.replace(/\s+/g, '').toUpperCase().slice(0, 6)}10`;
      value = discountType === 'percentage' ? 12 : 15000;
      minSpend = Math.max(40000, Math.round(avgSpend * 0.7));
      expiryDays = 5;
    } else if (segmentKey === 'new_members') {
      title = `Selamat Datang Sahabat Baru ${storeName}! 🎉`;
      hook = `Nikmati diskon belanja berikutnya untuk stok kebutuhan harian rumah tangga.`;
      code = `WELCOME${storeName.replace(/\s+/g, '').toUpperCase().slice(0, 6)}`;
      value = discountType === 'percentage' ? 10 : 10000;
      minSpend = 50000;
    } else if (segmentKey === 'frequent') {
      title = `Gebyaran Belanja Rutin Sembako ${storeName} 🛒`;
      hook = `Belanja makin sering makin untung dengan kupon belanja bertingkat.`;
      code = `RUTINHEMAT`;
      value = discountType === 'percentage' ? 10 : 12000;
      minSpend = Math.max(50000, avgSpend);
    } else if (segmentKey === 'individual' && specificCustomer) {
      title = `Kejutan Spesial untuk Kak ${specificCustomer.name} ✨`;
      hook = `Restock ${topProdStr} favoritmu minggu ini lebih hemat di ${storeName}!`;
      code = `${specificCustomer.name.replace(/[^a-zA-Z]/g, '').slice(0, 5).toUpperCase()}HEMAT`;
      value = discountType === 'percentage' ? 12 : 15000;
      minSpend = Math.max(35000, Math.round((specificCustomer.totalSpent / Math.max(1, specificCustomer.ordersCount)) * 0.85));
    }

    const valueStr = discountType === 'percentage' ? `${value}%` : `Rp ${value.toLocaleString('id-ID')}`;
    const minSpendStr = `Rp ${minSpend.toLocaleString('id-ID')}`;

    const brandMessageWhatsApp = `Halo Kak *{{nama}}*! 👋\n\n${hook}\n\nKabar gembira dari *${storeName}* (${branchName})! Khusus untuk Kakak hari ini, kami siapkan kupon diskon spesial:\n\n🎟️ Kode Voucher: *${code}*\n💰 Potongan: *${valueStr}*\n🛒 Minimal Belanja: *${minSpendStr}*\n📦 Produk Rekomendasi: ${topProdStr}\n⏳ Berlaku hingga: *${expiryDays} hari ke depan*\n\nTunjukkan pesan ini atau sebutkan kode voucher saat pembayaran di kasir kami ya. Sampai jumpa di toko! 🛒✨`;

    const brandMessageSMS = `Halo {{nama}}! Kangen belanja di ${storeName}? Pakai kupon ${code} dpt diskon ${valueStr} (Min. ${minSpendStr}). Berlaku ${expiryDays} hr. S&K berlaku.`;

    const brandMessageSocial = `Promo Spesial untuk Pelanggan Setia ${storeName}! Dapatkan diskon ${valueStr} untuk produk favorit pilihanmu dengan kode voucher *${code}*. Minimal belanja ${minSpendStr}. Berlaku terbatas, yuk merapat ke kasir sekarang! #PromoRitel #${storeName.replace(/\s+/g, '')} #DiskonBelanja`;

    return {
      id: `promo-seg-${Date.now()}`,
      title,
      hook,
      voucherCode: code,
      discountType,
      value,
      minSpend,
      targetSegment: segmentLabel || 'Semua Member',
      targetSegmentKey: segmentKey,
      targetCustomerName: specificCustomer?.name,
      targetCustomerPhone: specificCustomer?.phone,
      recommendedProducts: defaultTopProducts.slice(0, 4),
      brandMessageWhatsApp,
      brandMessageSMS,
      brandMessageSocial,
      copyExplanation: `Draft pesan dirancang dengan gaya ${brandTone || 'ramah'} menonjolkan produk ${topProdStr} dari riwayat belanja segmen ${segmentLabel}.`,
      expiryDays,
      isAiGenerated: false,
      createdAt: new Date().toISOString(),
    };
  };

  try {
    const prompt = `Anda adalah Brand Marketing & Retail Copywriter profesional untuk minimarket/supermarket "${storeName}".

TUGAS:
Rancang pesan promosi dan penawaran diskon (Voucher) yang SANGAT CATCHY, BRANDED, dan PERSUASIF untuk segmen pelanggan berdasarkan riwayat belanja mereka (Purchase History).

DATA SEGMEN PELANGGAN:
- Segmen: ${segmentLabel || 'Pelanggan Setia'} (${segmentKey || 'frequent'})
${specificCustomer ? `- Pelanggan Spesifik: ${specificCustomer.name} (No. HP/WA: ${specificCustomer.phone || '-'}, Tier: ${specificCustomer.tier || 'Gold'}, Total Belanja: Rp ${specificCustomer.totalSpent?.toLocaleString('id-ID')}, Transaksi: ${specificCustomer.ordersCount}x)` : `- Jumlah Pelanggan Terdaftar di Segmen: ${segmentStats?.customerCount || 10} member`}
- Rata-rata Nilai Belanja per Transaksi: Rp ${avgSpend.toLocaleString('id-ID')}
- Produk yang Sering Dibeli Berdasarkan Riwayat Belanja: ${JSON.stringify(defaultTopProducts)}
- Kategori Favorit: ${JSON.stringify(segmentStats?.favoriteCategories || ['Sembako', 'Minuman'])}
${segmentStats?.daysSinceLastVisitAvg ? `- Rata-rata Hari Sejak Kunjungan Terakhir: ~${segmentStats.daysSinceLastVisitAvg} hari` : ''}

KONFIGURASI PROMO:
- Tujuan Kampanye: ${campaignObjective} (misal: Win-back / Kangen Belanja, Reward Loyalitas VIP, Peningkatan Keranjang Belanja, Flash Sale Akhir Pekan)
- Nada Bahasa & Karakter Brand: ${brandTone} (misal: Ramah Hangat & Akrab, Eksklusif VIP, Enerjik & Ceria)
- Preferensi Diskon: ${discountTypePreference} (percentage atau fixed)
- Nama Toko: ${storeName}
- Cabang: ${branchName}
${customInstructions ? `- Permintaan Tambahan Owner: ${customInstructions}` : ''}

PANDUAN COPYWRITING KETAT:
1. Pesan WAJIB menyebutkan / menyinggung 1-2 produk spesifik dari riwayat belanja mereka (${defaultTopProducts.slice(0, 3).join(', ')}) agar terasa personal dan relevan.
2. Buat KODE VOUCHER yang unik, branded, kapital, dan mudah diingat (misal: KANGENULIL, VIPSETIA15, SULTANHEMAT, BELANJAHEMAT).
3. Nilai diskon ('value') harus proporsional (misal 10-18% untuk persentase atau Rp 10.000 - Rp 25.000 untuk fixed) dengan minimal belanja 'minSpend' yang realistis (sekitar Rp ${suggestedMinSpend.toLocaleString('id-ID')}).
4. Siapkan 3 format pesan siap broadcast:
   - "brandMessageWhatsApp": Pesan WA lengkap, hangat, persuasif dengan emoji, format bold (*teks*), placeholder "{{nama}}", rincian kode voucher, syarat minimal belanja, masa berlaku, dan ajakan mampir ke toko (Call to Action).
   - "brandMessageSMS": Pesan pendek padat (maksimal 160 karakter) untuk SMS atau Push Notif.
   - "brandMessageSocial": Caption menarik untuk Instagram Story / WhatsApp Status toko.
5. "copyExplanation": Jelaskan dalam 1-2 kalimat mengapa pesan ini efektif untuk segmen tersebut berdasarkan purchase history mereka.

KEMBALIKAN HANYA FORMAT JSON VALID BERIKUT (TANPA MARKDOWN CODEBLOCK):
{
  "title": "Judul promo catchy",
  "hook": "Kalimat pemikat utama satu baris",
  "voucherCode": "KODE_KAPITAL",
  "discountType": "${discountTypePreference === 'fixed' ? 'fixed' : 'percentage'}",
  "value": ${discountTypePreference === 'fixed' ? 15000 : 12},
  "minSpend": ${suggestedMinSpend},
  "targetSegment": "${segmentLabel || 'Member Setia'}",
  "recommendedProducts": ${JSON.stringify(defaultTopProducts.slice(0, 3))},
  "brandMessageWhatsApp": "Teks pesan WhatsApp...",
  "brandMessageSMS": "Teks SMS...",
  "brandMessageSocial": "Teks Social Media...",
  "copyExplanation": "Penjelasan strategi copy...",
  "expiryDays": 7
}
`;

    const rawText = await callGeminiSafe(prompt, 0.4);
    if (!rawText) {
      return res.json(generateRuleBasedSegmentPromo());
    }

    const cleanJson = extractJsonFromText(rawText) || JSON.parse(rawText);

    res.json({
      id: `promo-seg-${Date.now()}`,
      title: cleanJson.title || `Promo Spesial ${segmentLabel}`,
      hook: cleanJson.hook || `Belanja hemat di ${storeName}!`,
      voucherCode: (cleanJson.voucherCode || `PROMO${Date.now().toString().slice(-4)}`).toUpperCase().replace(/\s+/g, ''),
      discountType: cleanJson.discountType === 'fixed' ? 'fixed' : 'percentage',
      value: Number(cleanJson.value) || (discountTypePreference === 'fixed' ? 10000 : 10),
      minSpend: Number(cleanJson.minSpend) || suggestedMinSpend,
      targetSegment: cleanJson.targetSegment || segmentLabel || 'Semua Member',
      targetSegmentKey: segmentKey,
      targetCustomerName: specificCustomer?.name,
      targetCustomerPhone: specificCustomer?.phone,
      recommendedProducts: Array.isArray(cleanJson.recommendedProducts) ? cleanJson.recommendedProducts : defaultTopProducts.slice(0, 3),
      brandMessageWhatsApp: cleanJson.brandMessageWhatsApp || '',
      brandMessageSMS: cleanJson.brandMessageSMS || '',
      brandMessageSocial: cleanJson.brandMessageSocial || '',
      copyExplanation: cleanJson.copyExplanation || 'Dibuat secara otomatis oleh Gemini AI berbasis riwayat belanja segmen.',
      expiryDays: Number(cleanJson.expiryDays) || 7,
      isAiGenerated: true,
      createdAt: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('Error generating segment promo:', err);
    res.json(generateRuleBasedSegmentPromo());
  }
});

// 5. AI Smart Natural Language Query / Retail Assistant Chat
router.post('/api/ai/smart-chat', async (req, res) => {
  const { query, products, transactions, customers } = req.body;

  const generateRuleBasedChatAnswer = () => {
    const lowStock = (products || []).filter((p: any) => p.stock <= p.minStock);
    const qLower = (query || '').toLowerCase();

    if (qLower.includes('stok') || qLower.includes('habis') || qLower.includes('menipis')) {
      return {
        answer: lowStock.length > 0
          ? `Terdapat **${lowStock.length} produk** dengan stok menipis saat ini:\n\n` +
            lowStock.slice(0, 5).map((p: any) => `- **${p.name}**: Sisa ${p.stock} ${p.unit || 'pcs'} (Min: ${p.minStock})`).join('\n') +
            (lowStock.length > 5 ? `\n- *dan ${lowStock.length - 5} produk lainnya...*` : '') +
            `\n\nDisarankan segera membuat Purchase Order (PO) ke supplier terkait.`
          : `Semua stok produk saat ini dalam kondisi aman dan mencukupi di atas batas minimum.`,
        suggestedActions: ['Buat PO Supplier', 'Cek Stok Gudang', 'Lihat Rekomendasi Restock'],
        isAiGenerated: false,
      };
    }

    if (qLower.includes('penjualan') || qLower.includes('omzet') || qLower.includes('transaksi') || qLower.includes('hari ini')) {
      const totalRev = (transactions || []).reduce((s: number, t: any) => s + (t.finalTotal || 0), 0);
      return {
        answer: `Ringkasan Penjualan:\n\n- **Total Transaksi**: ${transactions?.length || 0} transaksi\n- **Total Omzet**: Rp ${totalRev.toLocaleString('id-ID')}\n- **Jumlah Pelanggan Terdaftar**: ${customers?.length || 0} orang`,
        suggestedActions: ['Lihat Laporan Penjualan', 'Cek Performa Kasir', 'Buat Promo Baru'],
        isAiGenerated: false,
      };
    }

    return {
      answer: `Halo! Saya Gemini Retail Copilot. Toko Anda saat ini mengelola **${products?.length || 0} produk** aktif dan **${customers?.length || 0} pelanggan**. Silakan ajukan pertanyaan seputar stok menipis, tren penjualan, atau ide promosi toko ritel Anda.`,
      suggestedActions: ['Produk apa yang stoknya menipis?', 'Bagaimana tren penjualan hari ini?', 'Buat promo akhir pekan untuk sembako'],
      isAiGenerated: false,
    };
  };

  try {
    const prompt = `Anda adalah "Gemini Retail AI Copilot", asisten kecerdasan buatan terintegrasi untuk kasir dan store manager toko ritel modern Ulilmart.
Konteks Toko:
- Total Produk: ${products?.length || 0} item (Kategori: Sembako, Minuman, Snack, Makanan Instan, Produk Segar, Perawatan Tubuh, Pembersih Rumah, Roti).
- Total Member: ${customers?.length || 0} pelanggan
- Ringkasan 5 Produk Teratas: ${JSON.stringify((products || []).slice(0, 8).map((p: any) => ({ name: p.name, price: p.price, stock: p.stock, barcode: p.barcode, aisle: p.aisle })))}
- Produk Stok Menipis: ${JSON.stringify((products || []).filter((p: any) => p.stock <= p.minStock).map((p: any) => p.name))}

Pertanyaan User/Kasir:
"${query}"

Instruksi:
Jawab dengan ramah, lugas, profesional dalam Bahasa Indonesia, berikan angka / rekomendasi spesifik yang relevan dengan toko ritel modern. Format jawaban dengan markdown rapi.
Kembalikan JSON:
{
  "answer": "Jawaban lengkap dan terstruktur.",
  "suggestedActions": ["Saran aksi cepat 1", "Saran aksi cepat 2", "Saran aksi cepat 3"]
}
`;

    const rawText = await callGeminiSafe(prompt, 0.3);
    if (!rawText) {
      return res.json(generateRuleBasedChatAnswer());
    }

    const parsed = JSON.parse(rawText);
    res.json({ ...parsed, isAiGenerated: true });
  } catch {
    res.json(generateRuleBasedChatAnswer());
  }
});

// Helper for server-side heuristic category mapping fallback
function serverHeuristicMapCategory(productName: string, categoriesList: any[] = []): {
  categoryId: string;
  categoryName: string;
  confidence: number;
  reasoning: string;
  suggestedBrand?: string;
  suggestedUnit?: string;
} {
  const n = (productName || '').toLowerCase().trim();
  const getCatName = (id: string, fallback: string) => {
    const f = categoriesList.find((c) => c.id === id);
    return f ? f.name : fallback;
  };

  // Instant keyword detection
  if (n.includes('indomie') || n.includes('mie ') || n.includes('mi ') || n.includes('sedaap goreng') || n.includes('sarimi') || n.includes('pop mie') || n.includes('sarden') || n.includes('kornet') || n.includes('bihun')) {
    return {
      categoryId: 'instant',
      categoryName: getCatName('instant', 'Makanan Instan'),
      confidence: 0.95,
      reasoning: 'Kategori makanan instan & olahan siap saji.',
      suggestedUnit: 'bungkus',
    };
  }
  if (n.includes('beras') || n.includes('minyak') || n.includes('bimoli') || n.includes('filma') || n.includes('sunco') || n.includes('sania') || n.includes('gula') || n.includes('tepung') || n.includes('telur') || n.includes('garam') || n.includes('bango') || n.includes('kecap') || n.includes('santan') || n.includes('royco') || n.includes('masako') || n.includes('blue band')) {
    return {
      categoryId: 'groceries',
      categoryName: getCatName('groceries', 'Sembako & Bahan Pokok'),
      confidence: 0.95,
      reasoning: 'Kebutuhan pokok dapur dan sembako rumah tangga.',
      suggestedUnit: 'pcs',
    };
  }
  if (n.includes('aqua') || n.includes('le minerale') || n.includes('cleo') || n.includes('susu') || n.includes('ultra milk') || n.includes('frisian flag') || n.includes('dancow') || n.includes('kopi') || n.includes('kapal api') || n.includes('good day') || n.includes('teh') || n.includes('pucuk') || n.includes('sosro') || n.includes('pocari') || n.includes('floridina') || n.includes('buavita') || n.includes('coca cola') || n.includes('sprite')) {
    return {
      categoryId: 'beverages',
      categoryName: getCatName('beverages', 'Minuman & Susu'),
      confidence: 0.95,
      reasoning: 'Produk minuman cair, air mineral, teh, kopi, dan susu kemasan.',
      suggestedUnit: 'botol',
    };
  }
  if (n.includes('roti') || n.includes('sari roti') || n.includes('aoka') || n.includes('selai') || n.includes('morin') || n.includes('ceres') || n.includes('meses') || n.includes('donat')) {
    return {
      categoryId: 'bakery_ready',
      categoryName: getCatName('bakery_ready', 'Roti & Selai'),
      confidence: 0.94,
      reasoning: 'Produk roti tawar/manis dan olesan sarapan.',
      suggestedUnit: 'bungkus',
    };
  }
  if (n.includes('nugget') || n.includes('sosis') || n.includes('bakso') || n.includes('fiesta') || n.includes('champ') || n.includes('kanzler') || n.includes('cedea') || n.includes('dimsum') || n.includes('kentang beku') || n.includes('keju') || n.includes('yoghurt')) {
    return {
      categoryId: 'fresh',
      categoryName: getCatName('fresh', 'Frozen Food'),
      confidence: 0.94,
      reasoning: 'Olahan makanan beku dingin (frozen food) dan produk segar.',
      suggestedUnit: 'pak',
    };
  }
  if (n.includes('deterjen') || n.includes('rinso') || n.includes('daia') || n.includes('so klin') || n.includes('molto') || n.includes('downy') || n.includes('sunlight') || n.includes('mama lemon') || n.includes('super pell') || n.includes('wipol') || n.includes('bayclin') || n.includes('baygon') || n.includes('hit ') || n.includes('tisu') || n.includes('paseo') || n.includes('nice')) {
    return {
      categoryId: 'home_care',
      categoryName: getCatName('home_care', 'Kebutuhan Rumah'),
      confidence: 0.95,
      reasoning: 'Produk pembersih rumah, sabun cuci, pewangi, dan tisu.',
      suggestedUnit: 'pcs',
    };
  }
  if (n.includes('sabun mandi') || n.includes('lifebuoy') || n.includes('dettol') || n.includes('biore') || n.includes('lux') || n.includes('sampo') || n.includes('shampoo') || n.includes('pantene') || n.includes('clear') || n.includes('sunsilk') || n.includes('zinc') || n.includes('pepsodent') || n.includes('ciptadent') || n.includes('sikat gigi') || n.includes('rexona') || n.includes('nivea') || n.includes('wardah') || n.includes('garnier') || n.includes('pembalut') || n.includes('popok') || n.includes('zwitsal')) {
    return {
      categoryId: 'personal_care',
      categoryName: getCatName('personal_care', 'Perawatan Tubuh'),
      confidence: 0.95,
      reasoning: 'Produk kebersihan tubuh, sabun, sampo, pasta gigi, atau perawatan diri.',
      suggestedUnit: 'pcs',
    };
  }
  if (n.includes('rokok') || n.includes('sampoerna') || n.includes('a mild') || n.includes('dji sam soe') || n.includes('234') || n.includes('gudang garam') || n.includes('surya') || n.includes('djarum') || n.includes('marlboro') || n.includes('esse') || n.includes('tembakau') || n.includes('korek')) {
    return {
      categoryId: 'tobacco',
      categoryName: getCatName('tobacco', 'Rokok & Tembakau'),
      confidence: 0.96,
      reasoning: 'Produk tembakau, rokok kretek/filter, atau pemantik.',
      suggestedUnit: 'bungkus',
    };
  }
  if (n.includes('buku') || n.includes('pulpen') || n.includes('pensil') || n.includes('spidol') || n.includes('baterai') || n.includes('panadol') || n.includes('bodrex') || n.includes('tolak angin') || n.includes('promag') || n.includes('minyak kayu putih') || n.includes('cap lang') || n.includes('hansaplast') || n.includes('koyo')) {
    return {
      categoryId: 'atk_meds',
      categoryName: getCatName('atk_meds', 'ATK, Obat & Lainnya'),
      confidence: 0.93,
      reasoning: 'Alat tulis kantor, perlengkapan, baterai, atau obat-obatan warung.',
      suggestedUnit: 'pcs',
    };
  }
  if (n.includes('snack') || n.includes('biskuit') || n.includes('wafer') || n.includes('keripik') || n.includes('chitato') || n.includes('tango') || n.includes('nabati') || n.includes('roma') || n.includes('oreo') || n.includes('silverqueen') || n.includes('kitkat') || n.includes('permen') || n.includes('kacang')) {
    return {
      categoryId: 'snacks',
      categoryName: getCatName('snacks', 'Snack & Biskuit'),
      confidence: 0.94,
      reasoning: 'Makanan ringan, biskuit, wafer, cokelat, atau permen.',
      suggestedUnit: 'bungkus',
    };
  }

  return {
    categoryId: 'groceries',
    categoryName: getCatName('groceries', 'Sembako & Bahan Pokok'),
    confidence: 0.5,
    reasoning: 'Dipetakan secara umum ke kategori Sembako & Bahan Pokok.',
    suggestedUnit: 'pcs',
  };
}

// 6. AI Product Category Auto-Mapping Endpoint
router.post('/api/ai/map-category', async (req, res) => {
  const { productName, brand, categories: userCategories } = req.body;
  if (!productName || typeof productName !== 'string' || !productName.trim()) {
    return res.status(400).json({ success: false, message: 'Nama produk wajib diisi' });
  }

  const name = productName.trim();
  const categoriesList = Array.isArray(userCategories) && userCategories.length > 0
    ? userCategories.filter((c: any) => c.id !== 'all')
    : [
        { id: 'groceries', name: 'Sembako & Bahan Pokok', desc: 'Beras, minyak goreng, gula, tepung, telur, garam, bumbu dapur, kecap, santan' },
        { id: 'beverages', name: 'Minuman & Susu', desc: 'Susu UHT, jus, teh kemasan, kopi, air mineral, minuman berenergi, soda, sirup' },
        { id: 'snacks', name: 'Snack & Biskuit', desc: 'Keripik, wafer, biskuit, cokelat, permen, kacang, camilan ringan' },
        { id: 'instant', name: 'Makanan Instan', desc: 'Mie instan, sarden, kornet kaleng, bubur instan, cup noodle' },
        { id: 'fresh', name: 'Frozen Food', desc: 'Nugget, sosis, bakso, dimsum, kentang beku, daging beku, olahan ikan beku' },
        { id: 'personal_care', name: 'Perawatan Tubuh', desc: 'Sabun mandi, sampo, pasta gigi, sikat gigi, deodorant, lotion, skincare, bedak' },
        { id: 'home_care', name: 'Kebutuhan Rumah', desc: 'Deterjen, sabun cuci piring, pembersih lantai, pewangi pakaian, kamper, obat nyamuk' },
        { id: 'atk_meds', name: 'ATK, Obat & Lainnya', desc: 'Buku, pulpen, baterai, plester luka, paracetamol, tolak angin, obat warung' },
        { id: 'tobacco', name: 'Rokok & Tembakau', desc: 'Rokok kretek, filter, cerutu, tembakau, korek api' },
        { id: 'bakery_ready', name: 'Roti & Selai', desc: 'Roti tawar, roti manis, selai, meses, donat, pastry' },
      ];

  // Try Gemini AI first
  try {
    const prompt = `Anda adalah sistem AI klasifikasi & pemetaan kategori produk ritel & minimarket Indonesia (FMCG POS).
Tugas Anda: Memetakan nama produk berikut ke dalam SATU ID Kategori yang PALING COCOK dari daftar kategori toko agar manajemen inventaris tertata rapi & sistematis.

Nama Produk: "${name}"
${brand ? `Brand: "${brand}"` : ''}

Daftar Kategori yang Tersedia:
${categoriesList.map((c: any) => `- ID: "${c.id}" | Nama: "${c.name}"${c.desc || c.description ? ` (${c.desc || c.description})` : ''}`).join('\n')}

Panduan Pemetaan Penting:
1. "categoryId" HARUS persis salah satu ID dari daftar di atas.
2. Kenali kebiasaan konsumen & penempatan rak ritel Indonesia (misal: "Mie Sedaap" = instant, "Kecap Sedaap" = groceries, "Aqua/Susu Ultra" = beverages, "Rinso/Sunlight" = home_care, "Biore/Lifebuoy" = personal_care, "Sari Roti" = bakery_ready, "Marlboro" = tobacco, "Fiesta Nugget" = fresh).
3. Ekstrak nama Brand dan Satuan kemasan standar bila terindikasi dari nama produk.

Kembalikan respon dalam format JSON murni:
{
  "categoryId": "ID_kategori_terpilih",
  "categoryName": "Nama_kategori_terpilih",
  "confidence": 0.95,
  "reasoning": "Penjelasan ringkas 1 kalimat dalam bahasa Indonesia.",
  "suggestedBrand": "Nama brand jika teridentifikasi dari nama",
  "suggestedUnit": "Satuan lazim: pcs / botol / pouch / bungkus / kaleng / dus / sachet / pak / sak"
}
`;

    const rawText = await callGeminiSafe(prompt, 0.1);
    if (rawText) {
      const parsed = extractJsonFromText(rawText) || JSON.parse(rawText);
      if (parsed && parsed.categoryId) {
        const found = categoriesList.find((c: any) => c.id === parsed.categoryId);
        return res.json({
          success: true,
          data: {
            categoryId: found ? found.id : parsed.categoryId,
            categoryName: found ? found.name : (parsed.categoryName || parsed.categoryId),
            confidence: Number(parsed.confidence) || 0.95,
            reasoning: parsed.reasoning || `Dipetakan ke ${found?.name || parsed.categoryId} oleh Gemini AI.`,
            suggestedBrand: parsed.suggestedBrand || '',
            suggestedUnit: parsed.suggestedUnit || 'pcs',
            source: 'gemini-ai',
          },
        });
      }
    }
  } catch (err: any) {
    console.warn('AI Category mapping error, using heuristic fallback:', err?.message);
  }

  // Heuristic rule-based fallback
  const fallback = serverHeuristicMapCategory(name, categoriesList);
  return res.json({
    success: true,
    data: {
      ...fallback,
      source: 'heuristic-engine',
    },
  });
});

// 7. Batch AI Category Mapping for Bulk Inventory
router.post('/api/ai/batch-map-categories', async (req, res) => {
  const { items, categories: userCategories } = req.body;
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ success: false, message: 'Daftar produk tidak boleh kosong' });
  }

  const categoriesList = Array.isArray(userCategories) && userCategories.length > 0
    ? userCategories.filter((c: any) => c.id !== 'all')
    : [];

  const validItems = items.slice(0, 50); // limit to 50 items per batch for optimal latency

  // Fast Gemini AI batch prompt
  try {
    const prompt = `Anda adalah sistem AI pemetaan kategori inventaris toko ritel Indonesia.
Petakan setiap produk berikut ke dalam kategori yang paling tepat dari daftar kategori yang tersedia.

Daftar Kategori:
${categoriesList.map((c: any) => `- ID: "${c.id}" (${c.name})`).join('\n')}

Daftar Produk:
${validItems.map((p: any, i: number) => `${i + 1}. [ID: "${p.id}"] "${p.name}" (Kategori saat ini: "${p.currentCategoryId || '-'}")`).join('\n')}

Kembalikan format JSON murni:
{
  "mappings": [
    {
      "id": "ID_produk",
      "categoryId": "ID_kategori_terpilih",
      "categoryName": "Nama_kategori",
      "confidence": 0.95,
      "reasoning": "Alasan singkat pemetaan"
    }
  ]
}
`;

    const rawText = await callGeminiSafe(prompt, 0.1);
    if (rawText) {
      const parsed = extractJsonFromText(rawText) || JSON.parse(rawText);
      if (parsed && Array.isArray(parsed.mappings)) {
        return res.json({
          success: true,
          mappings: parsed.mappings,
          source: 'gemini-ai',
        });
      }
    }
  } catch (err: any) {
    console.warn('Batch AI mapping error, using fallback:', err?.message);
  }

  // Fallback heuristic for batch
  const mappings = validItems.map((p: any) => {
    const mapped = serverHeuristicMapCategory(p.name, categoriesList);
    return {
      id: p.id,
      categoryId: mapped.categoryId,
      categoryName: mapped.categoryName,
      confidence: mapped.confidence,
      reasoning: mapped.reasoning,
      previousCategoryId: p.currentCategoryId,
    };
  });

  return res.json({
    success: true,
    mappings,
    source: 'heuristic-engine',
  });
});


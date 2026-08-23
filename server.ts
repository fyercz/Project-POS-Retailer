import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

// Lazy initialization of Gemini Client
let geminiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!geminiClient) {
    const apiKey = process.env.GEMINI_API_KEY || '';
    geminiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return geminiClient;
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', hasGeminiKey: Boolean(process.env.GEMINI_API_KEY) });
});

// 1. AI Cart Upsell & Cross-Sell Recommender for Modern Retail
app.post('/api/ai/upsell-recommendations', async (req, res) => {
  try {
    const { cartItems, allProducts, customerTier, storeName } = req.body;

    if (!process.env.GEMINI_API_KEY) {
      // Fallback smart rule-based recommendation if API key is not yet set
      const cartProductIds = new Set((cartItems || []).map((item: any) => item.product.id));
      const available = (allProducts || []).filter((p: any) => !cartProductIds.has(p.id) && p.stock > 0);
      const suggestions = available.slice(0, 3).map((p: any) => ({
        product: p,
        reason: `Item terlaris yang cocok dibeli bersama produk keranjang Anda.`,
        urgency: 'Promo Hari Ini',
        discountOffer: 'Hemat 10%',
      }));
      return res.json({ suggestions, isAiGenerated: false, note: 'Simulasi Offline (Tambahkan GEMINI_API_KEY untuk hasil AI mendalam)' });
    }

    const ai = getGeminiClient();
    const prompt = `Anda adalah Asisten AI Kasir & Merchandising Pintar untuk toko ritel modern "${storeName || 'NexaMart'}".
Diberikan daftar item dalam keranjang belanja pelanggan saat ini:
Keranjang: ${JSON.stringify(cartItems?.map((i: any) => ({ name: i.product.name, qty: i.quantity, price: i.totalPrice })) || [])}
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

    const response = await ai.models.generateContent({
      model: 'gemini-3.7-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.3,
      },
    });

    let rawText = response.text || '[]';
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

    res.json({ suggestions: formattedSuggestions, isAiGenerated: true });
  } catch (error: any) {
    console.error('Error in upsell recommendations:', error);
    res.status(500).json({ error: error.message || 'Gagal menghasilkan rekomendasi' });
  }
});

// 2. AI Retail Restock & Inventory Demand Forecasting
app.post('/api/ai/inventory-forecast', async (req, res) => {
  try {
    const { products, recentTransactions, storeSettings } = req.body;

    if (!process.env.GEMINI_API_KEY) {
      // Offline fallback
      const lowItems = (products || []).filter((p: any) => p.stock <= p.minStock);
      const suggestions = lowItems.slice(0, 4).map((p: any) => ({
        productId: p.id,
        productName: p.name,
        currentStock: p.stock,
        recommendedOrderQty: (p.minStock * 3) - p.stock,
        urgency: p.stock === 0 ? 'KRITIS (Habis)' : 'TINGGI (Menipis)',
        estimatedDaysLeft: p.stock === 0 ? 0 : 2,
        actionAdvice: `Segera lakukan Purchase Order (PO) ke distributor untuk menjaga stok ${p.name}.`,
      }));
      return res.json({
        forecasts: suggestions,
        summary: `Terdapat ${lowItems.length} produk yang mendekati batas minimum stok dan memerlukan restock segera.`,
        isAiGenerated: false,
      });
    }

    const ai = getGeminiClient();
    const prompt = `Anda adalah AI Supply Chain & Inventory Strategist untuk toko ritel modern "${storeSettings?.storeName || 'NexaMart'}".
Data Produk Toko (Stok, Min Stock, Kategori, Harga Beli, Harga Jual, Expired Date, Aisle/Rak):
${JSON.stringify((products || []).map((p: any) => ({
  id: p.id,
  name: p.name,
  category: p.categoryId,
  stock: p.stock,
  minStock: p.minStock,
  unit: p.unit,
  costPrice: p.costPrice,
  price: p.price,
  expiryDate: p.expiryDate,
  aisle: p.aisle,
})))}

Data Transaksi Terakhir (${recentTransactions?.length || 0} transaksi):
${JSON.stringify((recentTransactions || []).slice(0, 20).map((t: any) => ({
  invoice: t.invoiceNumber,
  items: t.items?.map((i: any) => ({ name: i.product.name, qty: i.quantity })),
  total: t.finalTotal,
  date: t.createdAt,
})))}

Tugas:
1. Analisis produk yang menipis (stock <= minStock), produk fast-moving FMCG, dan produk yang mendekati tanggal kadaluarsa (FEFO).
2. Buat prediksi kebutuhan restock (Purchase Order) serta saran manajemen rak/diskon untuk item yang lambat bergerak.
3. Kembalikan JSON dengan struktur:
{
  "summary": "Ringkasan eksekutif kondisi inventaris toko ritel saat ini dalam 2 kalimat profesional.",
  "healthScore": 88, // Nilai kesehatan stok 0-100
  "forecasts": [
    {
      "productId": "id_produk",
      "productName": "Nama Produk",
      "currentStock": 5,
      "recommendedOrderQty": 30,
      "urgency": "KRITIS" | "TINGGI" | "SEDANG" | "OPTIMAL",
      "estimatedDaysLeft": 2,
      "actionAdvice": "Saran tindakan spesifik (misal: 'Pesan 3 karton sebelum weekend, penjualan tinggi di jam pulang kantor')"
    }
  ],
  "deadstockOrExpiryAlerts": [
    {
      "productName": "Nama Produk",
      "issue": "Mendekati Expired / Perputaran Lambat",
      "suggestedPromotion": "Beri diskon Flash Sale 20% di rak depan (Lorong 1A) untuk mempercepat perputaran."
    }
  ]
}
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.7-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.2,
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    res.json({ ...parsed, isAiGenerated: true });
  } catch (error: any) {
    console.error('Error in inventory forecast:', error);
    res.status(500).json({ error: error.message || 'Gagal memproses prediksi inventaris' });
  }
});

// 3. AI Retail Business & Sales Intelligence (Z-Report Executive Insights)
app.post('/api/ai/daily-insights', async (req, res) => {
  try {
    const { transactions, products, settings } = req.body;

    if (!process.env.GEMINI_API_KEY) {
      return res.json({
        executiveSummary: `Performa toko stabil dengan ${transactions?.length || 0} transaksi berhasil. Kategori Makanan & Minuman menjadi kontributor omzet tertinggi hari ini.`,
        peakPerformanceTime: '12:00 - 14:00 & 18:00 - 20:00',
        topGrowthCategory: 'Minuman & Susu UHT',
        actionableTips: [
          'Tingkatkan stok produk minuman dingin menjelang siang hari.',
          'Dorong promosi voucher pada member tier Silver untuk meningkatkan belanja rata-rata per transaksi.',
          'Posisikan snack impulsif di dekat meja kasir untuk meningkatkan nilai keranjang belanja.'
        ],
        isAiGenerated: false,
      });
    }

    const ai = getGeminiClient();
    const totalRev = (transactions || []).reduce((s: number, t: any) => s + (t.finalTotal || 0), 0);
    const completedTx = (transactions || []).filter((t: any) => t.status === 'completed');

    const prompt = `Anda adalah Direktur Operasional & Konsultan AI Ritel Modern untuk "${settings?.storeName || 'NexaMart'}".
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

    const response = await ai.models.generateContent({
      model: 'gemini-3.7-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.3,
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    res.json({ ...parsed, isAiGenerated: true });
  } catch (error: any) {
    console.error('Error in daily insights:', error);
    res.status(500).json({ error: error.message || 'Gagal membuat ringkasan analitik' });
  }
});

// 4. AI Retail Promo & Campaign Creator
app.post('/api/ai/generate-promo', async (req, res) => {
  try {
    const { campaignTheme, targetCategory, products, settings } = req.body;

    if (!process.env.GEMINI_API_KEY) {
      return res.json({
        title: 'Promo JSM Super Hemat NexaMart',
        tagline: 'Belanja Kebutuhan Mingguan Makin Murah & Berlimpah!',
        voucherCode: 'JSMHEMAT15',
        discountType: 'percentage',
        value: 15,
        minSpend: 50000,
        bundleItems: (products || []).slice(0, 2).map((p: any) => p.name),
        description: 'Diskon 15% untuk pembelanjaan minimal Rp 50.000 berlaku sepanjang akhir pekan.',
        isAiGenerated: false,
      });
    }

    const ai = getGeminiClient();
    const prompt = `Anda adalah AI Marketing Ritel Kreatif untuk supermarket/minimarket "${settings?.storeName || 'NexaMart'}".
Tema Kampanye: ${campaignTheme || 'Promo Spesial Ritel Modern'}
Target Kategori: ${targetCategory || 'Semua Kategori'}
Daftar Produk: ${JSON.stringify((products || []).slice(0, 15).map((p: any) => ({ name: p.name, category: p.categoryId, price: p.price })))}

Tugas:
Buat ide promo ritel modern yang sangat menarik bagi konsumen (misal Promo JSM, Beli 2 Gratis 1, Sarapan Cepat, atau Tebus Murah).
Kembalikan JSON:
{
  "title": "Nama Promo yang catchy (misal: 'Promo JSM Kilat: Sarapan Sehat')",
  "tagline": "Slogan promosi menarik untuk banner kasir / struk belanja",
  "voucherCode": "KODE_VOUCHER_KAPITAL",
  "discountType": "percentage" | "fixed",
  "value": 15, // persentase atau nominal potongan
  "minSpend": 50000,
  "bundleItems": ["Nama Produk 1", "Nama Produk 2"],
  "description": "Penjelasan detail mekanisme promo untuk kasir & pembeli"
}
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.7-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.4,
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    res.json({ ...parsed, isAiGenerated: true });
  } catch (error: any) {
    console.error('Error in promo generator:', error);
    res.status(500).json({ error: error.message || 'Gagal membuat promo' });
  }
});

// 5. AI Smart Natural Language Query / Retail Assistant Chat
app.post('/api/ai/smart-chat', async (req, res) => {
  try {
    const { query, products, transactions, customers } = req.body;

    if (!process.env.GEMINI_API_KEY) {
      return res.json({
        answer: `Halo! Saya Asisten AI Gemini NexaMart Ritel. Anda bertanya: "${query}". Untuk mengaktifkan respon cerdas berbasis real-time AI, pastikan GEMINI_API_KEY telah terhubung di Settings > Secrets. Saat ini terdapat ${products?.length || 0} produk aktif dan ${customers?.length || 0} member terdaftar.`,
        suggestedActions: ['Lihat Produk Menipis', 'Cek Transaksi Terakhir', 'Buat Promo Baru'],
        isAiGenerated: false,
      });
    }

    const ai = getGeminiClient();
    const prompt = `Anda adalah "Gemini Retail AI Copilot", asisten kecerdasan buatan terintegrasi untuk kasir dan store manager toko ritel modern NexaMart.
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

    const response = await ai.models.generateContent({
      model: 'gemini-3.7-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.3,
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    res.json({ ...parsed, isAiGenerated: true });
  } catch (error: any) {
    console.error('Error in smart chat:', error);
    res.status(500).json({ error: error.message || 'Gagal memproses pertanyaan AI' });
  }
});

// Vite Middleware for development & Static Serving for production
async function setupViteOrStatic() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`NexaMart Retail Server running on http://0.0.0.0:${PORT}`);
  });
}

setupViteOrStatic();

import React, { useState, useMemo } from 'react';
import {
  Sparkles,
  Copy,
  Check,
  Share2,
  Ticket,
  Users,
  ShoppingBag,
  TrendingUp,
  MessageCircle,
  Smartphone,
  Instagram,
  RefreshCw,
  Crown,
  HeartHandshake,
  Clock,
  Tag,
  Calendar,
  DollarSign,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  UserCheck,
  Send,
} from 'lucide-react';
import { usePOS } from '../../../context/POSContext';
import {
  Customer,
  AISegmentPromoResult,
  CustomerSegmentKey,
  Voucher,
} from '../../../types';
import { formatCurrency } from '../../../utils/formatters';

export const MarketingPromoSection: React.FC = () => {
  const {
    customers,
    transactions,
    settings,
    addVoucher,
    selectedMarketingCustomer,
    setSelectedMarketingCustomer,
  } = usePOS();

  // Selected Segment State
  const [selectedSegment, setSelectedSegment] = useState<CustomerSegmentKey>(
    selectedMarketingCustomer ? 'individual' : 'dormant'
  );
  const [selectedIndividualId, setSelectedIndividualId] = useState<string>(
    selectedMarketingCustomer ? selectedMarketingCustomer.id : customers[0]?.id || ''
  );

  // Campaign Options
  const [campaignObjective, setCampaignObjective] = useState<string>('reengagement');
  const [brandTone, setBrandTone] = useState<string>('warm_friendly');
  const [discountTypePreference, setDiscountTypePreference] = useState<'percentage' | 'fixed'>('percentage');
  const [customInstructions, setCustomInstructions] = useState<string>('');

  // AI Generation State
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [activeChannelTab, setActiveChannelTab] = useState<'whatsapp' | 'sms' | 'social'>('whatsapp');
  const [currentPromo, setCurrentPromo] = useState<AISegmentPromoResult | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [activatedVoucherCode, setActivatedVoucherCode] = useState<string | null>(null);
  const [savedPromos, setSavedPromos] = useState<AISegmentPromoResult[]>([]);
  const [showRecipientModal, setShowRecipientModal] = useState<boolean>(false);

  // Derive Individual Customer
  const currentIndividualCustomer = useMemo(() => {
    return customers.find((c) => c.id === selectedIndividualId) || customers[0] || null;
  }, [customers, selectedIndividualId]);

  // Aggregate Purchase History for all customers / segments
  const segmentAnalytics = useMemo(() => {
    // Map customer ID to their purchased products from transactions
    const customerPurchasedProducts: Record<string, { name: string; count: number }[]> = {};
    const customerTotalSpend: Record<string, number> = {};
    const customerTxCount: Record<string, number> = {};

    transactions.forEach((tx) => {
      const custId = tx.customer?.id;
      if (!custId) return;

      if (!customerTotalSpend[custId]) customerTotalSpend[custId] = 0;
      customerTotalSpend[custId] += tx.finalTotal || 0;

      if (!customerTxCount[custId]) customerTxCount[custId] = 0;
      customerTxCount[custId] += 1;

      if (!customerPurchasedProducts[custId]) customerPurchasedProducts[custId] = [];

      tx.items?.forEach((item) => {
        const pName = item.product?.name || 'Produk Retail';
        const existing = customerPurchasedProducts[custId].find((p) => p.name === pName);
        if (existing) {
          existing.count += item.quantity || 1;
        } else {
          customerPurchasedProducts[custId].push({ name: pName, count: item.quantity || 1 });
        }
      });
    });

    // Helper to calculate segment stats
    const computeStats = (memberList: Customer[]) => {
      const count = memberList.length;
      if (count === 0) {
        return {
          customerCount: 0,
          totalSpent: 0,
          averageSpend: 50000,
          topProducts: ['Beras Pandan Wangi 5kg', 'Minyak Goreng 2L', 'Kopi Kapal Api', 'Indomie Goreng'],
          favoriteCategories: ['Sembako & Kebutuhan Harian'],
          daysSinceLastVisitAvg: 14,
        };
      }

      const totalSpent = memberList.reduce((acc, c) => acc + (c.totalSpent || 0), 0);
      const totalOrders = memberList.reduce((acc, c) => acc + Math.max(1, c.ordersCount || 1), 0);
      const averageSpend = Math.round(totalSpent / Math.max(1, totalOrders));

      // Aggregate top products across this segment
      const productMap: Record<string, number> = {};
      memberList.forEach((c) => {
        const prods = customerPurchasedProducts[c.id] || [];
        prods.forEach((p) => {
          productMap[p.name] = (productMap[p.name] || 0) + p.count;
        });

        // Also check customer notes or points history for clues
        c.pointsHistory?.forEach((ph) => {
          if (ph.description?.includes('Sembako')) productMap['Beras & Minyak Sembako'] = (productMap['Beras & Minyak Sembako'] || 0) + 2;
          if (ph.description?.includes('Snack')) productMap['Biskuit & Snack Harian'] = (productMap['Biskuit & Snack Harian'] || 0) + 2;
          if (ph.description?.includes('Minuman')) productMap['Kopi & Minuman Dingin'] = (productMap['Kopi & Minuman Dingin'] || 0) + 2;
        });
      });

      const topProducts = Object.entries(productMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name]) => name);

      if (topProducts.length === 0) {
        topProducts.push('Beras Pandan Wangi 5kg', 'Minyak Goreng 2L', 'Gula Pasir 1kg', 'Kopi Kapal Api');
      }

      return {
        customerCount: count,
        totalSpent,
        averageSpend: Math.max(35000, averageSpend),
        topProducts,
        favoriteCategories: ['Sembako', 'Minuman & Snack', 'Perawatan Rumah'],
        daysSinceLastVisitAvg: 18,
      };
    };

    // Segment 1: VIP & High Spenders
    const vipList = customers.filter(
      (c) => c.tier === 'Platinum' || c.tier === 'Gold' || c.totalSpent >= 400000 || c.ordersCount >= 10
    );

    // Segment 2: Dormant / Need Win-back
    const dormantList = customers.filter(
      (c) => c.ordersCount <= 4 || c.tier === 'Bronze' || (c.pointsHistory && c.pointsHistory.length <= 2)
    );

    // Segment 3: Frequent Shoppers
    const frequentList = customers.filter(
      (c) => c.ordersCount >= 3 && (c.tier === 'Silver' || c.tier === 'Gold')
    );

    // Segment 4: New Members
    const newList = customers.filter(
      (c) => c.ordersCount <= 2 || c.tier === 'Regular' || c.tier === 'Bronze'
    );

    // Segment 5: Deal Seekers
    const dealSeekerList = customers.filter(
      (c) => (c.pointsHistory && c.pointsHistory.some((ph) => ph.type === 'redeemed')) || (c.points || 0) > 100
    );

    // Individual Customer Stats
    const individualStats = currentIndividualCustomer
      ? (() => {
          const prods = (customerPurchasedProducts[currentIndividualCustomer.id] || []).map((p) => p.name);
          const topProds = prods.length > 0 ? prods.slice(0, 5) : ['Beras Pandan Wangi 5kg', 'Minyak Goreng 2L', 'Kopi Kapal Api'];
          const avg = Math.round((currentIndividualCustomer.totalSpent || 50000) / Math.max(1, currentIndividualCustomer.ordersCount || 1));
          return {
            customerCount: 1,
            totalSpent: currentIndividualCustomer.totalSpent || 0,
            averageSpend: Math.max(25000, avg),
            topProducts: topProds,
            favoriteCategories: ['Kebutuhan Rutin Pelanggan'],
            daysSinceLastVisitAvg: 12,
          };
        })()
      : computeStats(customers.slice(0, 1));

    return {
      vip: {
        key: 'vip' as const,
        label: 'VIP & High Spender (Sultan)',
        badge: 'Tier Platinum & Gold',
        icon: Crown,
        description: 'Pelanggan dengan loyalitas dan total belanja tertinggi di toko.',
        color: 'from-amber-500 to-yellow-600',
        members: vipList.length > 0 ? vipList : customers.slice(0, 2),
        stats: computeStats(vipList.length > 0 ? vipList : customers.slice(0, 2)),
      },
      dormant: {
        key: 'dormant' as const,
        label: 'Dormant (Kangen Belanja)',
        badge: 'Perlu Re-engagement',
        icon: Clock,
        description: 'Pelanggan yang sudah lama tidak berbelanja atau frekuensinya menurun.',
        color: 'from-rose-500 to-pink-600',
        members: dormantList.length > 0 ? dormantList : customers.slice(2, 4),
        stats: computeStats(dormantList.length > 0 ? dormantList : customers.slice(2, 4)),
      },
      frequent: {
        key: 'frequent' as const,
        label: 'Pelanggan Harian & Rutin',
        badge: 'Belanja Sembako Mingguan',
        icon: ShoppingBag,
        description: 'Konsumen dengan frekuensi kunjungan stabil membeli kebutuhan pokok.',
        color: 'from-emerald-500 to-teal-600',
        members: frequentList.length > 0 ? frequentList : customers.slice(0, 3),
        stats: computeStats(frequentList.length > 0 ? frequentList : customers.slice(0, 3)),
      },
      new_members: {
        key: 'new_members' as const,
        label: 'Member Baru (First-Time)',
        badge: 'Baru 1-2 Kali Belanja',
        icon: UserCheck,
        description: 'Member baru yang membutuhkan dorongan untuk belanja kedua & seterusnya.',
        color: 'from-blue-500 to-cyan-600',
        members: newList.length > 0 ? newList : customers.slice(-2),
        stats: computeStats(newList.length > 0 ? newList : customers.slice(-2)),
      },
      deal_seekers: {
        key: 'deal_seekers' as const,
        label: 'Pemburu Diskon & Poin',
        badge: 'Sensitif Promo & Voucher',
        icon: Tag,
        description: 'Konsumen yang aktif menukarkan poin dan responsif terhadap kupon diskon.',
        color: 'from-purple-500 to-indigo-600',
        members: dealSeekerList.length > 0 ? dealSeekerList : customers,
        stats: computeStats(dealSeekerList.length > 0 ? dealSeekerList : customers),
      },
      individual: {
        key: 'individual' as const,
        label: 'Pelanggan Spesifik (1-on-1)',
        badge: currentIndividualCustomer?.name || 'Pilih Member',
        icon: Users,
        description: 'Pesan promosi ultra-personal untuk 1 pelanggan pilihan dengan riwayat belanja aslinya.',
        color: 'from-violet-500 to-purple-600',
        members: currentIndividualCustomer ? [currentIndividualCustomer] : [],
        stats: individualStats,
      },
    };
  }, [customers, transactions, currentIndividualCustomer]);

  // Current active segment data
  const currentSegmentData = segmentAnalytics[selectedSegment];

  // Handle Generate Promo using Gemini API
  const handleGeneratePromo = async () => {
    setIsGenerating(true);
    setActivatedVoucherCode(null);

    const payload = {
      segmentKey: selectedSegment,
      segmentLabel: currentSegmentData.label,
      segmentStats: currentSegmentData.stats,
      specificCustomer:
        selectedSegment === 'individual' && currentIndividualCustomer
          ? {
              id: currentIndividualCustomer.id,
              name: currentIndividualCustomer.name,
              phone: currentIndividualCustomer.phone,
              tier: currentIndividualCustomer.tier,
              totalSpent: currentIndividualCustomer.totalSpent,
              ordersCount: currentIndividualCustomer.ordersCount,
              points: currentIndividualCustomer.points,
              recentItems: currentSegmentData.stats.topProducts,
            }
          : undefined,
      campaignObjective,
      brandTone,
      discountTypePreference,
      storeSettings: {
        storeName: settings.storeName || 'Ulilmart Ritel Modern',
        branchName: settings.branchName || 'Cabang Utama',
        phone: settings.phone || '0812-3456-7890',
        currency: settings.currency || 'IDR',
      },
      customInstructions: customInstructions.trim(),
    };

    try {
      const response = await fetch('/api/ai/generate-segment-promo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error('Gagal menghubungi server AI');
      }

      const result: AISegmentPromoResult = await response.json();
      setCurrentPromo(result);
      setSavedPromos((prev) => [result, ...prev.slice(0, 9)]);
    } catch (err) {
      console.error('Error generating promo:', err);
      // Fallback local promo generator
      const fallbackResult: AISegmentPromoResult = {
        id: `promo-local-${Date.now()}`,
        title: `Promo Spesial ${currentSegmentData.label}`,
        hook: `Belanja hemat produk kebutuhan favoritmu di ${settings.storeName || 'Ulilmart'}!`,
        voucherCode: `HEMAT${Math.floor(10 + Math.random() * 89)}`,
        discountType: discountTypePreference,
        value: discountTypePreference === 'percentage' ? 12 : 15000,
        minSpend: Math.max(40000, currentSegmentData.stats.averageSpend),
        targetSegment: currentSegmentData.label,
        targetSegmentKey: selectedSegment,
        targetCustomerName: currentIndividualCustomer?.name,
        targetCustomerPhone: currentIndividualCustomer?.phone,
        recommendedProducts: currentSegmentData.stats.topProducts.slice(0, 3),
        brandMessageWhatsApp: `Halo Kak *{{nama}}*! 👋\n\nKabar gembira dari *${settings.storeName || 'Ulilmart'}*! Ada voucher diskon spesial *${discountTypePreference === 'percentage' ? '12%' : 'Rp 15.000'}* khusus buat Kakak hari ini.\n\n🎟️ Kode Voucher: *HEMAT12*\n🛒 Min. Belanja: Rp 50.000\n📦 Produk Rekomendasi: ${currentSegmentData.stats.topProducts.slice(0, 2).join(', ')}\n⏳ Berlaku 7 hari ke depan.\n\nYuk mampir ke kasir sekarang dan tunjukkan kupon ini ya! ✨`,
        brandMessageSMS: `Halo {{nama}}! Dptkan diskon belanja di ${settings.storeName || 'Ulilmart'} dgn voucher HEMAT12 (Min. Rp 50rb). Berlaku 7 hari. Tunjukkan di kasir.`,
        brandMessageSocial: `Promo Spesial Pelanggan ${settings.storeName || 'Ulilmart'}! Diskon spesial produk favorit dengan kode voucher *HEMAT12*. Cek kasir hari ini! #PromoUlilmart #DiskonBelanja`,
        copyExplanation: 'Pesan dirancang otomatis menonjolkan produk riwayat belanja.',
        expiryDays: 7,
        isAiGenerated: false,
        createdAt: new Date().toISOString(),
      };
      setCurrentPromo(fallbackResult);
      setSavedPromos((prev) => [fallbackResult, ...prev.slice(0, 9)]);
    } finally {
      setIsGenerating(false);
    }
  };

  // 1-Click Activate Voucher in POS
  const handleActivateVoucherInPOS = (promo: AISegmentPromoResult) => {
    const voucher: Voucher = {
      code: promo.voucherCode,
      discountType: promo.discountType,
      value: promo.value,
      minSpend: promo.minSpend,
      description: `${promo.title} (${promo.targetSegment})`,
    };

    addVoucher(voucher);
    setActivatedVoucherCode(promo.voucherCode);
  };

  // Copy to clipboard helper
  const handleCopyToClipboard = (text: string, fieldKey: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldKey);
    setTimeout(() => setCopiedField(null), 2500);
  };

  // Generate WhatsApp Direct Link for customer
  const getWhatsAppDirectLink = (phone: string | undefined, message: string, custName: string) => {
    const cleanPhone = (phone || '').replace(/[^0-9]/g, '');
    const formattedPhone = cleanPhone.startsWith('0')
      ? `62${cleanPhone.slice(1)}`
      : cleanPhone.startsWith('62')
      ? cleanPhone
      : `62${cleanPhone}`;
    const personalizedText = message.replace(/\{\{nama\}\}/g, custName || 'Sahabat');
    return `https://wa.me/${formattedPhone}?text=${encodeURIComponent(personalizedText)}`;
  };

  return (
    <div className="space-y-6 pb-12">
      {/* SECTION HEADER BANNER */}
      <div className="p-5 rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 text-white shadow-md relative overflow-hidden border border-emerald-500/30">
        <div className="absolute right-0 top-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>Gemini AI Retail Marketing &amp; Promo Strategist</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
              <span>Pusat Pemasaran &amp; Segmentasi Pelanggan</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Analisis riwayat transaksi pelanggan secara otomatis untuk merancang pesan promo yang{' '}
              <strong className="text-emerald-300">catchy, branded</strong>, dan siap dikirim ke WhatsApp, SMS, maupun media sosial.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              id="btn-generate-promo"
              type="button"
              disabled={isGenerating}
              onClick={handleGeneratePromo}
              className="px-5 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-400 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-sm flex items-center gap-2 shadow-lg shadow-emerald-500/25 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                  <span>Merancang Promo AI...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-slate-950 fill-slate-950" />
                  <span>Generate Promo</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* SEGMENT SELECTOR GRID */}
      <div>
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              1. Pilih Target Segmen Pelanggan (Berdasarkan Riwayat Belanja)
            </h3>
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            Total {customers.length} Member Terdaftar
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {(
            [
              'vip',
              'dormant',
              'frequent',
              'new_members',
              'deal_seekers',
              'individual',
            ] as CustomerSegmentKey[]
          ).map((key) => {
            const seg = segmentAnalytics[key];
            const isSelected = selectedSegment === key;
            const IconComponent = seg.icon;

            return (
              <button
                key={key}
                type="button"
                onClick={() => {
                  setSelectedSegment(key);
                  if (key !== 'individual') {
                    setSelectedMarketingCustomer(null);
                  }
                }}
                className={`p-3 rounded-2xl border text-left flex flex-col justify-between transition-all cursor-pointer relative overflow-hidden ${
                  isSelected
                    ? 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/40 shadow-sm ring-2 ring-emerald-500/40'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div
                      className={`w-7 h-7 rounded-xl bg-gradient-to-br ${seg.color} text-white flex items-center justify-center shadow-2xs`}
                    >
                      <IconComponent className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      {seg.stats.customerCount} Member
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 line-clamp-1">
                    {seg.label}
                  </h4>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                    {seg.badge}
                  </p>
                </div>

                {isSelected && (
                  <div className="mt-2 pt-1 border-t border-emerald-200 dark:border-emerald-800/60 flex items-center justify-between text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                    <span>Terpilih</span>
                    <Check className="w-3 h-3" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* INDIVIDUAL CUSTOMER SELECTOR (IF INDIVIDUAL SELECTED) */}
      {selectedSegment === 'individual' && (
        <div className="p-4 rounded-2xl border border-violet-200 dark:border-violet-900/50 bg-violet-50/50 dark:bg-violet-950/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-full bg-violet-600 text-white font-bold flex items-center justify-center shrink-0">
              {currentIndividualCustomer?.name?.charAt(0) || 'M'}
            </div>
            <div className="min-w-0">
              <label className="text-[11px] font-bold text-violet-900 dark:text-violet-300 block">
                Pilih Member Spesifik untuk Penawaran 1-on-1:
              </label>
              <select
                value={selectedIndividualId}
                onChange={(e) => {
                  setSelectedIndividualId(e.target.value);
                  const cust = customers.find((c) => c.id === e.target.value) || null;
                  setSelectedMarketingCustomer(cust);
                }}
                className="mt-0.5 px-3 py-1.5 rounded-xl border border-violet-300 dark:border-violet-700 bg-white dark:bg-slate-900 text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-500"
              >
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.tier}) - {c.phone} | {c.ordersCount}x Belanja
                  </option>
                ))}
              </select>
            </div>
          </div>

          {currentIndividualCustomer && (
            <div className="flex items-center gap-2 text-xs text-violet-800 dark:text-violet-300 font-medium">
              <span className="px-2.5 py-1 rounded-lg bg-violet-200/60 dark:bg-violet-900/60 font-bold">
                Total Belanja: {formatCurrency(currentIndividualCustomer.totalSpent || 0, settings.currency)}
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-violet-200/60 dark:bg-violet-900/60 font-bold">
                {currentIndividualCustomer.points} Poin
              </span>
            </div>
          )}
        </div>
      )}

      {/* SECTION 2 & 3 IN TWO-COLUMN LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* LEFT COLUMN: SEGMENT INSIGHTS & CAMPAIGN CONTROLS */}
        <div className="lg:col-span-5 space-y-4">
          {/* SEGMENT PURCHASE HISTORY INSIGHTS CARD */}
          <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Profil Riwayat Belanja Segmen
              </span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300">
                {currentSegmentData.label}
              </span>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300">
              {currentSegmentData.description}
            </p>

            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">
                  Rata-rata Basket Belanja
                </span>
                <span className="text-xs font-bold text-slate-900 dark:text-slate-100 font-mono">
                  {formatCurrency(currentSegmentData.stats.averageSpend, settings.currency)}
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">
                  Total Omzet Segmen Ini
                </span>
                <span className="text-xs font-bold text-slate-900 dark:text-slate-100 font-mono">
                  {formatCurrency(currentSegmentData.stats.totalSpent, settings.currency)}
                </span>
              </div>
            </div>

            {/* TOP PURCHASED PRODUCTS FROM HISTORY */}
            <div className="pt-2">
              <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 mb-2">
                <ShoppingBag className="w-3.5 h-3.5 text-emerald-500" />
                <span>Produk Terlaris Riwayat Belanja (FMCG Favorit):</span>
              </span>
              <div className="flex flex-wrap gap-1.5">
                {currentSegmentData.stats.topProducts.map((p, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60"
                  >
                    {p}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* CAMPAIGN TUNING OPTIONS */}
          <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3.5 shadow-2xs">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
              <span>2. Kustomisasi Parameter Kampanye</span>
            </h4>

            {/* Objective */}
            <div>
              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Tujuan Kampanye:
              </label>
              <select
                value={campaignObjective}
                onChange={(e) => setCampaignObjective(e.target.value)}
                className="w-full px-3 py-1.5 rounded-xl text-xs border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium"
              >
                <option value="reengagement">Re-engagement / Kangen Belanja (Ajak Kembali)</option>
                <option value="reward_vip">Reward Loyalitas VIP (Apresiasi Eksklusif)</option>
                <option value="basket_builder">Peningkatan Nilai Keranjang (Upsell Bundling)</option>
                <option value="flash_sale">Flash Sale Akhir Pekan (Urgensi Terbatas)</option>
                <option value="new_member_welcome">Selamat Datang Belanja Kedua (Member Baru)</option>
              </select>
            </div>

            {/* Tone */}
            <div>
              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Gaya Bahasa &amp; Karakter Brand:
              </label>
              <select
                value={brandTone}
                onChange={(e) => setBrandTone(e.target.value)}
                className="w-full px-3 py-1.5 rounded-xl text-xs border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium"
              >
                <option value="warm_friendly">Ramah, Hangat &amp; Akrab (Khas Kasir Tetangga)</option>
                <option value="exclusive_vip">Eksklusif, Elegan &amp; Istimewa (Khusus VIP/Sultan)</option>
                <option value="energetic_urgent">Ceria, Enerjik &amp; Antusias (Flash Sale)</option>
                <option value="casual_relatable">Santai, Kasual &amp; Relatable</option>
              </select>
            </div>

            {/* Discount Type */}
            <div>
              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Format Penawaran Diskon:
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setDiscountTypePreference('percentage')}
                  className={`py-1.5 px-3 rounded-xl text-xs font-bold border transition cursor-pointer ${
                    discountTypePreference === 'percentage'
                      ? 'bg-emerald-500 text-slate-950 border-emerald-500 shadow-xs'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  Persentase (%)
                </button>
                <button
                  type="button"
                  onClick={() => setDiscountTypePreference('fixed')}
                  className={`py-1.5 px-3 rounded-xl text-xs font-bold border transition cursor-pointer ${
                    discountTypePreference === 'fixed'
                      ? 'bg-emerald-500 text-slate-950 border-emerald-500 shadow-xs'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  Potongan Nominal (Rp)
                </button>
              </div>
            </div>

            {/* Custom Notes */}
            <div>
              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Instruksi Khusus / Tema Tambahan (Opsional):
              </label>
              <input
                type="text"
                value={customInstructions}
                onChange={(e) => setCustomInstructions(e.target.value)}
                placeholder="Misal: Promo Gajian JSM, Gratis Kopi Botol, dll."
                className="w-full px-3 py-1.5 rounded-xl text-xs border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              />
            </div>

            {/* ACTION BUTTON */}
            <button
              id="btn-generate-promo-sidebar"
              type="button"
              disabled={isGenerating}
              onClick={handleGeneratePromo}
              className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-emerald-500/20 transition cursor-pointer disabled:opacity-50"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Gemini Sedang Berpikir...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Generate Promo untuk Segmen Ini</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* RIGHT COLUMN: GENERATED PROMO DISPLAY OR EMPTY STATE */}
        <div className="lg:col-span-7">
          {isGenerating ? (
            <div className="p-8 rounded-3xl border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/40 dark:bg-emerald-950/20 text-center flex flex-col items-center justify-center min-h-[420px] space-y-4">
              <div className="relative">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-lg animate-pulse">
                  <Sparkles className="w-8 h-8 animate-spin" />
                </div>
              </div>
              <div className="space-y-1 max-w-sm">
                <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Gemini AI Menganalisis Riwayat Belanja...
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Mengevaluasi produk FMCG favorit ({currentSegmentData.stats.topProducts.slice(0, 2).join(', ')}) dan meracik copy promosi bernada brand {brandTone}.
                </p>
              </div>
            </div>
          ) : currentPromo ? (
            <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs space-y-4">
              {/* Promo Card Header */}
              <div className="p-5 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-white/20 uppercase tracking-wider text-white">
                      Target: {currentPromo.targetSegment}
                    </span>
                    {currentPromo.isAiGenerated && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-400 text-slate-950 flex items-center gap-1">
                        <Sparkles className="w-3 h-3" /> Gemini 3.8 Flash
                      </span>
                    )}
                  </div>
                  <h3 className="text-base sm:text-lg font-black tracking-tight">{currentPromo.title}</h3>
                  <p className="text-xs text-emerald-100 font-medium italic">"{currentPromo.hook}"</p>
                </div>

                <div className="shrink-0 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleActivateVoucherInPOS(currentPromo)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-md ${
                      activatedVoucherCode === currentPromo.voucherCode
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-400'
                        : 'bg-white text-slate-950 hover:bg-emerald-50'
                    }`}
                  >
                    <Ticket className="w-4 h-4" />
                    <span>
                      {activatedVoucherCode === currentPromo.voucherCode
                        ? 'Telah Aktif di Kasir'
                        : 'Aktifkan Voucher di Kasir'}
                    </span>
                  </button>
                </div>
              </div>

              {/* VOUCHER TICKET BADGE */}
              <div className="px-5">
                <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/20 border border-amber-300 dark:border-amber-800/60 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500 text-white font-black flex items-center justify-center text-sm shadow-xs">
                      %
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-amber-800 dark:text-amber-400 block">
                        Kupon Diskon POS
                      </span>
                      <span className="text-sm font-black font-mono tracking-wider text-slate-900 dark:text-white">
                        {currentPromo.voucherCode}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Nilai Diskon</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                        {currentPromo.discountType === 'percentage'
                          ? `${currentPromo.value}%`
                          : formatCurrency(currentPromo.value, settings.currency)}
                      </span>
                    </div>

                    <div className="border-l border-amber-200 dark:border-amber-800 pl-3">
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Min. Belanja</span>
                      <span className="font-bold text-slate-900 dark:text-slate-100 font-mono">
                        {formatCurrency(currentPromo.minSpend, settings.currency)}
                      </span>
                    </div>

                    <div className="border-l border-amber-200 dark:border-amber-800 pl-3">
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Masa Berlaku</span>
                      <span className="font-bold text-slate-900 dark:text-slate-100">
                        {currentPromo.expiryDays} Hari
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* CHANNEL TABS: WHATSAPP, SMS, SOCIAL */}
              <div className="px-5">
                <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
                  <button
                    type="button"
                    onClick={() => setActiveChannelTab('whatsapp')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                      activeChannelTab === 'whatsapp'
                        ? 'bg-emerald-500 text-slate-950'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>WhatsApp / Chat Broadcast</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveChannelTab('sms')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                      activeChannelTab === 'sms'
                        ? 'bg-emerald-500 text-slate-950'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                    <span>SMS / Push Notif</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveChannelTab('social')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                      activeChannelTab === 'social'
                        ? 'bg-emerald-500 text-slate-950'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Instagram className="w-3.5 h-3.5" />
                    <span>Story / Media Sosial</span>
                  </button>
                </div>

                {/* TAB CONTENT */}
                <div className="mt-3">
                  {activeChannelTab === 'whatsapp' && (
                    <div className="space-y-3">
                      <div className="p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/50 font-mono text-xs whitespace-pre-line text-slate-800 dark:text-slate-200 leading-relaxed">
                        {currentPromo.brandMessageWhatsApp}
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">
                          Placeholder <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">{'{{nama}}'}</code> otomatis diganti dengan nama pelanggan.
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              handleCopyToClipboard(currentPromo.brandMessageWhatsApp, 'wa')
                            }
                            className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 cursor-pointer hover:bg-slate-50"
                          >
                            {copiedField === 'wa' ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-500" />
                                <span>Tersalin!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" />
                                <span>Salin Pesan WA</span>
                              </>
                            )}
                          </button>

                          {selectedSegment === 'individual' && currentIndividualCustomer?.phone ? (
                            <a
                              href={getWhatsAppDirectLink(
                                currentIndividualCustomer.phone,
                                currentPromo.brandMessageWhatsApp,
                                currentIndividualCustomer.name
                              )}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                            >
                              <Send className="w-3.5 h-3.5" />
                              <span>Kirim ke {currentIndividualCustomer.name}</span>
                            </a>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setShowRecipientModal(true)}
                              className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                            >
                              <Send className="w-3.5 h-3.5" />
                              <span>Kirim WA ke Member ({currentSegmentData.members.length})</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {activeChannelTab === 'sms' && (
                    <div className="space-y-3">
                      <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 font-mono text-xs whitespace-pre-line text-slate-800 dark:text-slate-200 leading-relaxed">
                        {currentPromo.brandMessageSMS}
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-slate-500 dark:text-slate-400">
                          Karakter: {currentPromo.brandMessageSMS.length} / 160
                        </span>

                        <button
                          type="button"
                          onClick={() => handleCopyToClipboard(currentPromo.brandMessageSMS, 'sms')}
                          className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 cursor-pointer hover:bg-slate-50"
                        >
                          {copiedField === 'sms' ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-500" />
                              <span>Tersalin!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>Salin Pesan SMS</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  {activeChannelTab === 'social' && (
                    <div className="space-y-3">
                      <div className="p-4 rounded-2xl bg-gradient-to-br from-pink-50 to-purple-50 dark:from-pink-950/20 dark:to-purple-950/20 border border-pink-200 dark:border-pink-900/40 text-xs whitespace-pre-line text-slate-800 dark:text-slate-200 leading-relaxed">
                        {currentPromo.brandMessageSocial}
                      </div>

                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() =>
                            handleCopyToClipboard(currentPromo.brandMessageSocial, 'social')
                          }
                          className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 cursor-pointer hover:bg-slate-50"
                        >
                          {copiedField === 'social' ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-500" />
                              <span>Tersalin!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>Salin Caption Medsos</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* FOOTER EXPLANATION */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-400 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-slate-900 dark:text-slate-200">
                    Alasan Strategis Gemini AI:{' '}
                  </span>
                  {currentPromo.copyExplanation}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-8 rounded-3xl border border-dashed border-slate-300 dark:border-slate-700 text-center flex flex-col items-center justify-center min-h-[420px] space-y-3 bg-slate-50/50 dark:bg-slate-900/50">
              <div className="w-14 h-14 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-xs">
                <Sparkles className="w-7 h-7" />
              </div>
              <div className="space-y-1 max-w-sm">
                <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Belum Ada Promo yang Dibuat
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Pilih segmen pelanggan di atas dan klik tombol{' '}
                  <strong className="text-emerald-600 dark:text-emerald-400">"Generate Promo"</strong> untuk merancang pesan diskon berbasis riwayat belanja.
                </p>
              </div>
              <button
                type="button"
                onClick={handleGeneratePromo}
                className="mt-2 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Sparkles className="w-4 h-4" />
                <span>Mulai Rancang Promo Sekarang</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* RECIPIENT BROADCAST MODAL */}
      {showRecipientModal && currentPromo && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Kirim Pesan WhatsApp Promo
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Segmen: {currentSegmentData.label} ({currentSegmentData.members.length} member)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowRecipientModal(false)}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                Tutup
              </button>
            </div>

            <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
              {currentSegmentData.members.map((m) => (
                <div
                  key={m.id}
                  className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs"
                >
                  <div>
                    <span className="font-bold text-slate-900 dark:text-slate-100 block">{m.name}</span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                      {m.phone} ({m.tier})
                    </span>
                  </div>

                  <a
                    href={getWhatsAppDirectLink(
                      m.phone,
                      currentPromo.brandMessageWhatsApp,
                      m.name
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold flex items-center gap-1 shadow-2xs"
                  >
                    <Send className="w-3 h-3" />
                    <span>Kirim WA</span>
                  </a>
                </div>
              ))}
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setShowRecipientModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300"
              >
                Selesai
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

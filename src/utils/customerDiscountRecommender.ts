import { Customer, CartItem, Transaction, CustomerDiscountSuggestion } from '../types';

/**
 * Evaluates a customer's loyalty tier, tenure, and purchase history against current cart items
 * to produce personalized discount recommendations.
 */
export function generateCustomerDiscountSuggestions(
  customer: Customer | null | undefined,
  cart: CartItem[],
  subtotal: number,
  transactions: Transaction[] = []
): CustomerDiscountSuggestion[] {
  if (!customer) {
    return [];
  }

  const suggestions: CustomerDiscountSuggestion[] = [];

  // 1. Analyze historical transactions for this customer
  const customerTxList = transactions.filter((tx) => {
    if (tx.status === 'void') return false;
    if (tx.customer?.id && tx.customer.id === customer.id) return true;
    if (customer.phone && tx.customer?.phone && tx.customer.phone === customer.phone) return true;
    return false;
  });

  const totalHistoricalOrders = Math.max(customer.ordersCount || 0, customerTxList.length);
  const totalHistoricalSpent = Math.max(
    customer.totalSpent || 0,
    customerTxList.reduce((sum, tx) => sum + (Number(tx.finalTotal) || 0), 0)
  );

  // Map frequency of products previously purchased by this customer
  const productFrequencyMap: Record<string, { count: number; name: string; lastPrice: number }> = {};
  for (const tx of customerTxList) {
    for (const itm of tx.items || []) {
      const pId = itm.product?.id || (itm as any).productId;
      const pName = itm.product?.name || (itm as any).productName || 'Produk';
      const price = itm.unitPrice || itm.product?.price || 0;
      if (pId) {
        if (!productFrequencyMap[pId]) {
          productFrequencyMap[pId] = { count: 0, name: pName, lastPrice: price };
        }
        productFrequencyMap[pId].count += itm.quantity || 1;
      }
    }
  }

  // Calculate days since last visit
  let lastPurchaseDate: Date | null = null;
  if (customerTxList.length > 0) {
    const validTimestamps = customerTxList
      .map((t) => new Date(t.createdAt).getTime())
      .filter((ts) => !isNaN(ts));
    if (validTimestamps.length > 0) {
      lastPurchaseDate = new Date(Math.max(...validTimestamps));
    }
  }

  // Fallback to points history if no transactions in current local store
  if (!lastPurchaseDate && customer.pointsHistory && customer.pointsHistory.length > 0) {
    const validTimestamps = customer.pointsHistory
      .map((p) => new Date(p.date).getTime())
      .filter((ts) => !isNaN(ts));
    if (validTimestamps.length > 0) {
      lastPurchaseDate = new Date(Math.max(...validTimestamps));
    }
  }

  const now = new Date();
  const daysSinceLastPurchase = lastPurchaseDate
    ? Math.floor((now.getTime() - lastPurchaseDate.getTime()) / (1000 * 60 * 60 * 24))
    : null;

  // -------------------------------------------------------------
  // RULE 1: Loyal Customer Status & Tier Privilege
  // -------------------------------------------------------------
  const tier = customer.tier || 'Regular';

  if (tier === 'Platinum') {
    const minSpend = 50000;
    const isApplicable = subtotal >= minSpend;
    const amount = Math.min(50000, Math.round((subtotal * 10) / 100));
    suggestions.push({
      id: 'disc-tier-platinum',
      title: 'Diskon Eksklusif Platinum (10%)',
      type: 'percentage',
      value: 10,
      amount: isApplicable ? amount : Math.round((subtotal * 10) / 100),
      badge: '👑 Platinum VIP',
      reason: `Hak istimewa member kasta tertinggi Platinum. Potongan 10% untuk transaksi mulai Rp ${minSpend.toLocaleString('id-ID')}.`,
      targetType: 'cart',
      minSpend,
      isApplicable,
      unmetSpendAmount: Math.max(0, minSpend - subtotal),
    });
  } else if (tier === 'Gold') {
    const minSpend = 40000;
    const isApplicable = subtotal >= minSpend;
    const amount = Math.min(35000, Math.round((subtotal * 7) / 100));
    suggestions.push({
      id: 'disc-tier-gold',
      title: 'Diskon Spesial Member Gold (7%)',
      type: 'percentage',
      value: 7,
      amount: isApplicable ? amount : Math.round((subtotal * 7) / 100),
      badge: '⭐ Member Gold',
      reason: `Hak istimewa pelanggan loyal Gold (Total belanja historis: Rp ${totalHistoricalSpent.toLocaleString('id-ID')}).`,
      targetType: 'cart',
      minSpend,
      isApplicable,
      unmetSpendAmount: Math.max(0, minSpend - subtotal),
    });
  } else if (tier === 'Silver') {
    const minSpend = 25000;
    const isApplicable = subtotal >= minSpend;
    const amount = Math.min(25000, Math.round((subtotal * 5) / 100));
    suggestions.push({
      id: 'disc-tier-silver',
      title: 'Apresiasi Member Silver (5%)',
      type: 'percentage',
      value: 5,
      amount: isApplicable ? amount : Math.round((subtotal * 5) / 100),
      badge: '🥈 Member Silver',
      reason: `Apresiasi pelanggan setia Silver dengan potongan 5% di atas Rp ${minSpend.toLocaleString('id-ID')}.`,
      targetType: 'cart',
      minSpend,
      isApplicable,
      unmetSpendAmount: Math.max(0, minSpend - subtotal),
    });
  } else {
    // Bronze or Regular Member
    const minSpend = 30000;
    const isApplicable = subtotal >= minSpend;
    const amount = Math.min(10000, Math.round((subtotal * 3) / 100));
    suggestions.push({
      id: 'disc-tier-regular',
      title: 'Diskon Belanja Member (3%)',
      type: 'percentage',
      value: 3,
      amount: isApplicable ? amount : Math.round((subtotal * 3) / 100),
      badge: '🥉 Member Setia',
      reason: `Diskon apresiasi member terdaftar Ulilmart untuk transaksi mulai Rp ${minSpend.toLocaleString('id-ID')}.`,
      targetType: 'cart',
      minSpend,
      isApplicable,
      unmetSpendAmount: Math.max(0, minSpend - subtotal),
    });
  }

  // -------------------------------------------------------------
  // RULE 2: Repeat Purchase / Favorite Item in Current Cart
  // -------------------------------------------------------------
  // Check if any cart item matches an item previously purchased >= 2 times
  let topFavoriteCartItem: CartItem | null = null;
  let topFavoritePurchaseCount = 0;

  for (const item of cart) {
    const freq = productFrequencyMap[item.product.id];
    if (freq && freq.count >= 2 && freq.count > topFavoritePurchaseCount) {
      topFavoriteCartItem = item;
      topFavoritePurchaseCount = freq.count;
    }
  }

  if (topFavoriteCartItem) {
    const discountVal = 10; // 10% discount on the favorite item
    const itemSubtotal = topFavoriteCartItem.totalPrice;
    const amount = Math.round((itemSubtotal * discountVal) / 100);

    suggestions.push({
      id: `disc-fav-${topFavoriteCartItem.product.id}`,
      title: `Diskon 10% ${topFavoriteCartItem.product.name}`,
      type: 'percentage',
      value: discountVal,
      amount,
      badge: '❤️ Produk Langganan',
      reason: `Pelanggan telah membeli "${topFavoriteCartItem.product.name}" sebanyak ${topFavoritePurchaseCount}x sebelumnya.`,
      targetType: 'item',
      targetProductId: topFavoriteCartItem.product.id,
      targetProductName: topFavoriteCartItem.product.name,
      isApplicable: amount > 0,
      unmetSpendAmount: 0,
    });
  }

  // -------------------------------------------------------------
  // RULE 3: Order Count Milestones & Visit Loyalty
  // -------------------------------------------------------------
  if (totalHistoricalOrders <= 1) {
    // New Member Welcome Discount
    const minSpend = 20000;
    const isApplicable = subtotal >= minSpend;
    const amount = Math.min(15000, Math.round((subtotal * 10) / 100));
    suggestions.push({
      id: 'disc-new-member',
      title: 'Diskon Sambutan Member Baru (10%)',
      type: 'percentage',
      value: 10,
      amount: isApplicable ? amount : Math.round((subtotal * 10) / 100),
      badge: '🎉 Member Baru',
      reason: `Selamat datang! Diskon sambutan khusus transaksi awal member terdaftar.`,
      targetType: 'cart',
      minSpend,
      isApplicable,
      unmetSpendAmount: Math.max(0, minSpend - subtotal),
    });
  } else if (totalHistoricalOrders >= 10) {
    // 10+ Orders Milestone Reward
    const minSpend = 50000;
    const fixedReward = 15000;
    const isApplicable = subtotal >= minSpend;
    suggestions.push({
      id: 'disc-milestone-10',
      title: 'Voucher Apresiasi 10+ Kunjungan (Rp 15.000)',
      type: 'fixed',
      value: fixedReward,
      amount: fixedReward,
      badge: `🏆 Milestone (${totalHistoricalOrders}x Order)`,
      reason: `Pelanggan telah berbelanja ${totalHistoricalOrders} kali di toko. Nikmati potongan Rp 15.000 pada nota ini.`,
      targetType: 'cart',
      minSpend,
      isApplicable,
      unmetSpendAmount: Math.max(0, minSpend - subtotal),
    });
  } else if (totalHistoricalOrders >= 5) {
    // 5+ Orders Frequent Shopper Perk
    const minSpend = 35000;
    const fixedReward = 8000;
    const isApplicable = subtotal >= minSpend;
    suggestions.push({
      id: 'disc-milestone-5',
      title: 'Voucher Pelanggan Rutin (Rp 8.000)',
      type: 'fixed',
      value: fixedReward,
      amount: fixedReward,
      badge: `✨ ${totalHistoricalOrders}x Kunjungan`,
      reason: `Apresiasi pelanggan yang telah berbelanja ${totalHistoricalOrders}x di Ulilmart.`,
      targetType: 'cart',
      minSpend,
      isApplicable,
      unmetSpendAmount: Math.max(0, minSpend - subtotal),
    });
  }

  // -------------------------------------------------------------
  // RULE 4: Lifetime Big Spender Reward
  // -------------------------------------------------------------
  if (totalHistoricalSpent >= 500000) {
    const minSpend = 75000;
    const fixedVal = 20000;
    const isApplicable = subtotal >= minSpend;
    suggestions.push({
      id: 'disc-big-spender',
      title: 'Reward Top Spender Toko (Rp 20.000)',
      type: 'fixed',
      value: fixedVal,
      amount: fixedVal,
      badge: '💎 High Spender',
      reason: `Total akumulasi belanja member mencapai Rp ${totalHistoricalSpent.toLocaleString('id-ID')}.`,
      targetType: 'cart',
      minSpend,
      isApplicable,
      unmetSpendAmount: Math.max(0, minSpend - subtotal),
    });
  }

  // -------------------------------------------------------------
  // RULE 5: Welcome Back / Lapsed Customer Retention
  // -------------------------------------------------------------
  if (daysSinceLastPurchase !== null && daysSinceLastPurchase >= 14) {
    const minSpend = 35000;
    const isApplicable = subtotal >= minSpend;
    const amount = Math.min(20000, Math.round((subtotal * 8) / 100));
    suggestions.push({
      id: 'disc-welcome-back',
      title: 'Diskon Kangen Belanja (8%)',
      type: 'percentage',
      value: 8,
      amount: isApplicable ? amount : Math.round((subtotal * 8) / 100),
      badge: '👋 Rindu Belanja',
      reason: `Kunjungan kembali setelah ${daysSinceLastPurchase} hari sejak transaksi terakhir.`,
      targetType: 'cart',
      minSpend,
      isApplicable,
      unmetSpendAmount: Math.max(0, minSpend - subtotal),
    });
  }

  // Sort suggestions: applicable first, then highest projected savings
  return suggestions.sort((a, b) => {
    if (a.isApplicable && !b.isApplicable) return -1;
    if (!a.isApplicable && b.isApplicable) return 1;
    return b.amount - a.amount;
  });
}

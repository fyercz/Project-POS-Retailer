/**
 * Utility functions for handling Payment Terms (Syarat Pembayaran):
 * - Term of Payment (TOP / Tempo 7, 14, 30, 45, 60 hari)
 * - Konsinyasi (Titip Jual)
 * - Tunai / Cash (Lunas)
 */

export type PaymentTermsCategory = 'cash' | 'tempo' | 'consignment';

export interface PaymentTermsInfo {
  category: PaymentTermsCategory;
  rawTerms: string;
  badgeLabel: string;
  description: string;
  dueDate: Date | null;
  dueDateFormatted: string;
  daysRemaining: number | null;
  statusBadgeText: string;
  urgency: 'cash' | 'consignment' | 'safe' | 'warning' | 'urgent' | 'overdue';
  badgeClasses: {
    bg: string;
    border: string;
    text: string;
    iconColor: string;
  };
}

export function parsePaymentTermsInfo(createdAtStr: string, paymentTerms: string = 'Tunai / Cash'): PaymentTermsInfo {
  const termsLower = (paymentTerms || '').toLowerCase();
  const isConsignment = termsLower.includes('konsinyasi') || termsLower.includes('titip');

  if (isConsignment) {
    return {
      category: 'consignment',
      rawTerms: paymentTerms,
      badgeLabel: 'Konsinyasi / Titip Jual',
      description: 'Barang titipan pihak ketiga. Kepemilikan fisik di toko; pembayaran diselesaikan secara berkala sesuai jumlah barang yang laku terjual di kasir.',
      dueDate: null,
      dueDateFormatted: 'Sesuai Penjualan',
      daysRemaining: null,
      statusBadgeText: 'Konsinyasi (Titip Jual)',
      urgency: 'consignment',
      badgeClasses: {
        bg: 'bg-purple-50 dark:bg-purple-950/50',
        border: 'border-purple-200 dark:border-purple-800',
        text: 'text-purple-700 dark:text-purple-300',
        iconColor: 'text-purple-600 dark:text-purple-400',
      },
    };
  }

  // Check for days: Tempo 7 Hari, Tempo 14 Hari, Tempo 30 Hari, Tempo 45 Hari, Tempo 60 Hari
  const match = termsLower.match(/(\d+)\s*hari/);
  const isTempo = termsLower.includes('tempo') || termsLower.includes('kredit') || Boolean(match);

  if (!isTempo || !match) {
    return {
      category: 'cash',
      rawTerms: paymentTerms,
      badgeLabel: 'Tunai / Cash (Lunas)',
      description: 'Pembayaran tunai lunas seketika saat penerimaan barang dari supplier.',
      dueDate: null,
      dueDateFormatted: 'Lunas Langsung',
      daysRemaining: null,
      statusBadgeText: 'Lunas Tunai',
      urgency: 'cash',
      badgeClasses: {
        bg: 'bg-emerald-50 dark:bg-emerald-950/50',
        border: 'border-emerald-200 dark:border-emerald-800',
        text: 'text-emerald-700 dark:text-emerald-300',
        iconColor: 'text-emerald-600 dark:text-emerald-400',
      },
    };
  }

  const days = parseInt(match[1], 10);
  const createdDate = new Date(createdAtStr);
  const validCreatedTime = isNaN(createdDate.getTime()) ? Date.now() : createdDate.getTime();
  const dueDateTime = validCreatedTime + days * 24 * 60 * 60 * 1000;
  const dueDate = new Date(dueDateTime);

  const now = new Date();
  // Strip hours for day-level difference
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const dueMidnight = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate()).getTime();
  const diffDays = Math.round((dueMidnight - todayMidnight) / (24 * 60 * 60 * 1000));

  const dueDateFormatted = dueDate.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  let urgency: 'safe' | 'warning' | 'urgent' | 'overdue' = 'safe';
  let statusBadgeText = `Jatuh tempo dlm ${diffDays} hari`;
  let badgeClasses = {
    bg: 'bg-blue-50 dark:bg-blue-950/50',
    border: 'border-blue-200 dark:border-blue-800',
    text: 'text-blue-700 dark:text-blue-300',
    iconColor: 'text-blue-600 dark:text-blue-400',
  };

  if (diffDays < 0) {
    urgency = 'overdue';
    statusBadgeText = `Lewat tempo ${Math.abs(diffDays)} hari`;
    badgeClasses = {
      bg: 'bg-rose-50 dark:bg-rose-950/50',
      border: 'border-rose-300 dark:border-rose-800',
      text: 'text-rose-700 dark:text-rose-300',
      iconColor: 'text-rose-600 dark:text-rose-400',
    };
  } else if (diffDays === 0) {
    urgency = 'urgent';
    statusBadgeText = 'Jatuh tempo hari ini';
    badgeClasses = {
      bg: 'bg-amber-100 dark:bg-amber-950/60',
      border: 'border-amber-300 dark:border-amber-700',
      text: 'text-amber-800 dark:text-amber-200',
      iconColor: 'text-amber-600 dark:text-amber-400',
    };
  } else if (diffDays <= 3) {
    urgency = 'urgent';
    statusBadgeText = `Mendesak (${diffDays} hari lagi)`;
    badgeClasses = {
      bg: 'bg-amber-50 dark:bg-amber-950/50',
      border: 'border-amber-200 dark:border-amber-800',
      text: 'text-amber-700 dark:text-amber-300',
      iconColor: 'text-amber-600 dark:text-amber-400',
    };
  } else if (diffDays <= 7) {
    urgency = 'warning';
    statusBadgeText = `Jatuh tempo ${diffDays} hari`;
    badgeClasses = {
      bg: 'bg-amber-50 dark:bg-amber-950/50',
      border: 'border-amber-200 dark:border-amber-800',
      text: 'text-amber-700 dark:text-amber-300',
      iconColor: 'text-amber-600 dark:text-amber-400',
    };
  }

  return {
    category: 'tempo',
    rawTerms: paymentTerms,
    badgeLabel: `Tempo TOP ${days} Hari`,
    description: `Faktur kredit berjangka (Term of Payment ${days} hari). Jatuh tempo pelunasan pada ${dueDateFormatted}. Masuk buku utang dagang lancar sampai diselesaikan.`,
    dueDate,
    dueDateFormatted,
    daysRemaining: diffDays,
    statusBadgeText,
    urgency,
    badgeClasses,
  };
}

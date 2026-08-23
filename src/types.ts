export type ThemeMode = 'dark' | 'light';

export type CurrencyType = 'IDR' | 'USD';

export type OrderType = 'sale' | 'takeaway' | 'delivery' | 'dine_in';

export interface ProductCategory {
  id: string;
  name: string;
  iconName: string;
  description?: string;
  color?: string;
}

export interface Product {
  id: string;
  name: string;
  brand?: string;
  sku: string;
  barcode: string;
  categoryId: string;
  price: number;
  costPrice: number;
  stock: number;
  minStock: number;
  unit: string;
  image: string;
  aisle?: string; // e.g., 'Lorong 2 - Rak B3'
  expiryDate?: string; // e.g., '2026-11-20'
  batchNumber?: string;
  isPopular?: boolean;
  promoBadge?: string;
  description?: string;
  options?: {
    name: string;
    choices: { name: string; extraPrice: number }[];
  }[];
}

export interface SelectedOption {
  groupName: string;
  choiceName: string;
  extraPrice: number;
}

export interface CartItem {
  id: string; // unique item id in cart (product.id + options hash)
  product: Product;
  quantity: number;
  selectedOptions: SelectedOption[];
  notes?: string;
  itemDiscountPercent?: number;
  unitPrice: number;
  totalPrice: number;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  tier: 'Regular';
  points: number;
  totalSpent: number;
  ordersCount: number;
}

export interface Voucher {
  code: string;
  discountType: 'percentage' | 'fixed';
  value: number;
  minSpend: number;
  maxDiscount?: number;
  description: string;
}

export interface HeldOrder {
  id: string;
  referenceNumber: string;
  customer?: Customer;
  tableNumber?: string;
  orderType: OrderType;
  items: CartItem[];
  createdAt: string;
  subtotal: number;
  note?: string;
}

export type PaymentMethod = 'cash' | 'qris' | 'card' | 'transfer';

export interface PaymentDetails {
  method: PaymentMethod;
  amountTendered: number;
  change: number;
  cardLast4?: string;
  bankName?: string;
  referenceCode?: string;
}

export interface Transaction {
  id: string;
  invoiceNumber: string;
  orderType: OrderType;
  tableNumber?: string;
  customer?: Customer;
  items: CartItem[];
  subtotal: number;
  taxAmount: number;
  serviceChargeAmount: number;
  discountAmount: number;
  voucherCode?: string;
  pointsUsed?: number;
  pointsDiscount?: number;
  pointsEarned: number;
  finalTotal: number;
  payment: PaymentDetails;
  cashierName: string;
  branchName: string;
  createdAt: string;
  status: 'completed' | 'refunded' | 'void';
  returnedAmount?: number;
  returnReason?: string;
  returnedAt?: string;
}

export interface SalesReturnItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalRefund: number;
  reason: string;
  restockToInventory: boolean;
}

export interface SalesReturn {
  id: string;
  returnNumber: string; // e.g., 'RET-SALES-100234'
  transactionId: string;
  invoiceNumber: string;
  customerName?: string;
  items: SalesReturnItem[];
  totalRefundAmount: number;
  refundMethod: 'cash' | 'transfer' | 'store_credit';
  note?: string;
  cashierName: string;
  createdAt: string;
}

export interface PurchaseReturnItem {
  productId: string;
  productName: string;
  quantity: number;
  costPrice: number;
  totalAmount: number;
  expiryDate?: string;
}

export interface PurchaseReturn {
  id: string;
  returnNumber: string; // e.g., 'RET-SUP-100456'
  supplierName: string;
  referenceInvoice?: string;
  reason: string; // 'Barang Rusak / Bad Stock' | 'Kadaluarsa / Near Expired (FEFO)' | 'Salah Kirim / Tidak Sesuai' | 'Kelebihan Qty'
  items: PurchaseReturnItem[];
  totalAmount: number;
  status: 'completed' | 'pending';
  createdAt: string;
  processedBy: string;
  notes?: string;
}

export interface SupplierPurchaseItem {
  productId: string;
  productName: string;
  quantity: number;
  costPrice: number;
  subtotal: number;
  expiryDate?: string;
}

export interface SupplierPurchase {
  id: string;
  invoiceNumber: string;
  supplierName: string;
  paymentTerms: string;
  items: SupplierPurchaseItem[];
  grossAmount: number;
  discountType: 'nominal' | 'percentage';
  discountRate: number;
  discountAmount: number;
  dppAmount: number;
  ppnRate: number; // e.g. 0, 11, 12
  ppnAmount: number;
  finalTotal: number;
  createdAt: string;
  receivedBy: string;
  notes?: string;
}

export interface StoreSettings {
  storeName: string;
  branchName: string;
  address: string;
  phone: string;
  receiptFooterMessage: string;
  taxRatePercent: number; // e.g. 11%
  serviceChargePercent: number; // e.g. 0% for retail
  currency: CurrencyType;
  enableThermal58mm: boolean;
  pointsRatio: number; // 1 point per 10,000 IDR
}

// Gemini AI Retail Interfaces
export interface AIUpsellSuggestion {
  product: Product;
  reason: string;
  urgency: string;
  discountOffer?: string;
}

export interface AIForecastItem {
  productId: string;
  productName: string;
  currentStock: number;
  recommendedOrderQty: number;
  urgency: 'KRITIS' | 'TINGGI' | 'SEDANG' | 'OPTIMAL' | string;
  estimatedDaysLeft: number;
  actionAdvice: string;
}

export interface AIDailyInsights {
  executiveSummary: string;
  peakPerformanceTime?: string;
  topGrowthCategory?: string;
  marginAnalysis?: string;
  actionableTips?: string[];
  isAiGenerated?: boolean;
}

export interface AIPromoResult {
  title: string;
  tagline: string;
  voucherCode: string;
  discountType: 'percentage' | 'fixed';
  value: number;
  minSpend: number;
  bundleItems?: string[];
  description: string;
  isAiGenerated?: boolean;
}


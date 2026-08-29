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

export interface WholesaleUnit {
  id: string;
  name: string; // e.g. 'Dus', 'Slop', 'Lusin', 'Karton', 'Renceng', 'Bal', 'Pak', 'Kodi'
  multiplier: number; // e.g. 40 pcs (Indomie/dus), 10 bungkus (Rokok/slop), 12 pcs (Minyak 1L/karton atau Lusin), 6 pcs (Minyak 2L/karton)
  price: number; // Harga jual grosir untuk 1 satuan ini
  costPrice?: number; // Modal grosir (default: costPrice * multiplier)
  barcode?: string; // Barcode karton/slop
  minOrderQty?: number;
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
  wholesaleUnits?: WholesaleUnit[];
  image?: string;
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
  id: string; // unique item id in cart (product.id + selectedUnit + options hash)
  product: Product;
  quantity: number;
  selectedUnit?: WholesaleUnit; // Satuan grosir jika dipilih (Dus/Slop/Lusin/Karton/Renceng/Pcs)
  selectedOptions: SelectedOption[];
  notes?: string;
  itemDiscountPercent?: number;
  unitPrice: number;
  totalPrice: number;
  profitMarginPercent?: number; // Persentase profit margin barang
  isPointsEligible?: boolean; // True jika profit margin barang >= 15% (syarat perolehan poin)
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
  pointsEligibleSpend?: number; // Total belanja dari barang yang memenuhi syarat profit >= 15%
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
  referenceInvoiceNumber?: string;
  reason: string; // 'Barang Rusak / Bad Stock' | 'Kadaluarsa / Near Expired (FEFO)' | 'Salah Kirim / Tidak Sesuai' | 'Kelebihan Qty'
  items: PurchaseReturnItem[];
  totalAmount: number;
  status?: 'completed' | 'pending';
  createdAt: string;
  processedBy?: string;
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

export interface Supplier {
  id: string;
  name: string;
  contactPerson?: string;
  phone: string;
  email?: string;
  address?: string;
  category?: string; // e.g. 'Distributor Makanan & Minuman', 'Sembako', 'Personal Care'
  paymentTerms?: string; // 'Tunai / Cash', 'Tempo 14 Hari', 'Tempo 30 Hari'
  leadTimeDays?: number;
  isActive: boolean;
  notes?: string;
  createdAt: string;
}

export interface SupplierPurchase {
  id: string;
  invoiceNumber: string;
  supplierName: string;
  paymentTerms: string;
  items: SupplierPurchaseItem[];
  subtotal?: number;
  grossAmount?: number;
  discountType?: 'nominal' | 'percentage';
  discountRate?: number;
  discountAmount?: number;
  dppAmount?: number;
  ppnRate?: number; // e.g. 0, 11, 12
  ppnAmount?: number;
  totalAmount: number;
  finalTotal?: number;
  createdAt: string;
  receivedBy?: string;
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
  minProfitPercentForPoints: number; // e.g. 15% minimal profit margin barang untuk menghasilkan poin
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

// Multi-Employee & Shift Management Interfaces
export type EmployeeRole = 'cashier' | 'supervisor' | 'inventory' | 'owner';

export interface Employee {
  id: string;
  employeeCode: string; // e.g. 'EMP-01'
  name: string;
  role: EmployeeRole;
  roleTitle: string; // e.g. 'Kasir 01', 'Kepala Toko / Supervisor', 'Staf Gudang & FEFO', 'Pemilik / Owner'
  pin: string; // 4-digit PIN e.g. '1234'
  avatar: string; // Initials e.g. 'AR'
  avatarColor: string; // Tailwind color e.g. 'bg-emerald-600'
  phone?: string;
  email?: string;
  isActive: boolean;
  assignedShift: string; // 'Shift Pagi (07:00 - 15:00)', 'Shift Siang (14:30 - 22:30)', 'Full Day'
  registeredAt: string;
}

export interface ShiftSummary {
  id: string;
  employeeId: string;
  employeeName: string;
  role: EmployeeRole;
  startTime: string;
  endTime?: string;
  startingCash: number; // Kas Modal Awal
  totalSales: number;
  totalTransactions: number;
  cashSales: number;
  nonCashSales: number;
  actualCashEnding?: number;
  difference?: number;
  status: 'active' | 'closed';
  notes?: string;
}

// AI Invoice & Receipt Scanner Interfaces
export interface AIInvoiceScannedItem {
  matchedProductId?: string;
  productName: string;
  quantity: number;
  costPrice: number;
  subtotal: number;
  expiryDate?: string;
  confidence: number;
}

export interface AIInvoiceScanResult {
  supplierName?: string;
  invoiceNumber?: string;
  date?: string;
  items: AIInvoiceScannedItem[];
  grossAmount?: number;
  discountAmount?: number;
  ppnAmount?: number;
  finalTotal?: number;
  notes?: string;
  isAiGenerated: boolean;
}

// AI Visual Stock Opname Interfaces
export interface AIStockOpnameDetectedItem {
  productId: string;
  productName: string;
  systemStock: number;
  detectedCount: number;
  difference: number;
  condition?: 'Baik / Utuh' | 'Kemasan Rusak' | 'Salah Penempatan Rak' | 'Kadaluarsa';
  shelfLocation?: string;
  confidence: number;
}

export interface AIStockOpnameResult {
  sessionTitle: string;
  scannedType: 'shelf_image' | 'video_stream' | 'barcode_burst';
  items: AIStockOpnameDetectedItem[];
  totalDiscrepancy: number;
  aiObservations: string[];
  suggestedStockUpdates: { productId: string; newStock: number; note: string }[];
  isAiGenerated: boolean;
}

export interface StockOpnameHistory {
  id: string;
  auditNumber: string;
  createdAt: string;
  auditedBy: string;
  mode: 'visual_ai' | 'barcode_burst' | 'manual';
  items: AIStockOpnameDetectedItem[];
  notes?: string;
}


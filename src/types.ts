export type ThemeMode = 'dark' | 'light';

export type CurrencyType = 'IDR';

export type OrderType = 'sale' | 'takeaway' | 'delivery' | 'dine_in';

export type ViewType = 'pos' | 'transactions' | 'inventory' | 'reports' | 'customers';

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

export interface PriceHistoryRecord {
  id: string;
  productId: string;
  date: string; // ISO date string e.g. '2026-09-15T08:30:00Z'
  costPrice: number; // Harga Modal (HPP)
  sellingPrice: number; // Harga Jual Retail
  previousCostPrice?: number;
  previousSellingPrice?: number;
  changeType: 'purchase_receiving' | 'manual_update' | 'bulk_adjust' | 'promotion' | 'initial_record';
  sourceReference?: string; // e.g. 'Faktur INV-SUP-2026-001', 'Penyesuaian Manual Kasir', 'Pembaruan Master Data'
  supplierName?: string;
  notes?: string;
  recordedBy?: string;
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
  lastOrderQuantity?: number; // Jumlah kuantitas order/pembelian terakhir (Supplier PO)
  lastOrderDate?: string; // Tanggal order terakhir
  unit: string;
  wholesaleUnits?: WholesaleUnit[];
  image?: string;
  aisle?: string; // e.g., 'Lorong 2 - Rak B3'
  expiryDate?: string; // e.g., '2026-11-20'
  batchNumber?: string;
  isPopular?: boolean;
  promoBadge?: string;
  description?: string;
  priceHistory?: PriceHistoryRecord[];
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

export type MemberTier = 'Bronze' | 'Silver' | 'Gold' | 'Platinum' | 'Regular';

export interface PointHistoryEntry {
  id: string;
  type: 'earned' | 'redeemed' | 'adjusted' | 'bonus';
  points: number; // positive for earned/bonus, negative for redeemed/adjusted down
  balanceAfter: number;
  description: string;
  date: string;
  transactionId?: string;
  invoiceNumber?: string;
  operatorName?: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  tier: MemberTier;
  points: number;
  totalSpent: number;
  ordersCount: number;
  joinedDate?: string;
  notes?: string;
  pointsHistory?: PointHistoryEntry[];
}

export interface Voucher {
  code: string;
  discountType: 'percentage' | 'fixed';
  value: number;
  minSpend: number;
  maxDiscount?: number;
  description: string;
  minProfitMargin?: number;
  projectedMarginPercent?: number;
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
  // Offline & Cloud Background Sync fields
  syncStatus?: 'synced' | 'pending_sync' | 'sync_failed';
  syncedAt?: string;
  offlineCreated?: boolean;
  syncRetryCount?: number;
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
  pointsRatio: number; // 1 point per 10,000 IDR belanja
  pointRedemptionRate?: number; // Nilai 1 poin = Rp X diskon kasir (default 100)
  minRedeemPoints?: number; // Minimal poin untuk dapat ditukarkan di kasir (default 10)
  minProfitPercentForPoints: number; // e.g. 15% minimal profit margin barang untuk menghasilkan poin
  minStockRulePercentage?: number; // Aturan batas minimal stok (default 50 = 50% dari order terakhir)
  autoUpdateMinStockFromOrder?: boolean; // Otomatis perbarui minStock saat terima barang PO (default: true)
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
  minStock?: number;
  recommendedOrderQty: number;
  urgency: 'KRITIS' | 'TINGGI' | 'SEDANG' | 'OPTIMAL' | string;
  estimatedDaysLeft: number;
  actionAdvice: string;
  sku?: string;
  barcode?: string;
  unit?: string;
  category?: string;
  costPrice?: number;
  estimatedSubtotal?: number;
  suggestedSupplier?: string;
}

export interface AIPurchaseOrderPlan {
  summary: string;
  healthScore?: number;
  totalEstimatedBudget?: number;
  totalItemsToRestock?: number;
  forecasts: AIForecastItem[];
  deadstockOrExpiryAlerts?: { productName: string; issue: string; suggestedPromotion: string }[];
  isAiGenerated?: boolean;
  generatedAt?: string;
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
  originalMarginPercent?: number;
  projectedMarginPercent?: number;
  minProfitMargin?: number;
  estimatedProfitAmount?: number;
  marginSafetyStatus?: 'safe' | 'capped' | 'warning';
  ownerSafetyNote?: string;
}

export type CustomerSegmentKey =
  | 'vip'
  | 'dormant'
  | 'frequent'
  | 'new_members'
  | 'deal_seekers'
  | 'staple_fmcg'
  | 'individual';

export interface AISegmentPromoResult {
  id: string;
  title: string;
  hook: string;
  voucherCode: string;
  discountType: 'percentage' | 'fixed';
  value: number;
  minSpend: number;
  targetSegment: string;
  targetSegmentKey?: CustomerSegmentKey;
  targetCustomerName?: string;
  targetCustomerPhone?: string;
  recommendedProducts: string[];
  brandMessageWhatsApp: string;
  brandMessageSMS: string;
  brandMessageSocial: string;
  copyExplanation: string;
  expiryDays: number;
  isAiGenerated: boolean;
  createdAt: string;
}

// Multi-Employee & Shift Management Interfaces
export type EmployeeRole = 'cashier' | 'supervisor' | 'inventory' | 'owner';
export type AppView = 'pos' | 'transactions' | 'inventory' | 'reports' | 'customers';

export interface RolePermissions {
  role: EmployeeRole;
  roleLabel: string;
  allowedViews: AppView[];
  canEditStock: boolean;
  canEditPrices: boolean;
  canVoidTransaction: boolean;
  canApplyCustomDiscount: boolean;
  canViewReports: boolean;
  canManageEmployees: boolean;
  canManageSettings: boolean;
  description: string;
}

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

// Google Search Grounding & Web Citation Interfaces
export interface GroundingSource {
  rank: number; // 1, 2, 3
  title: string;
  uri: string;
  domain: string;
  snippet?: string;
  sourceType: 'Google Web Search' | 'Retail Marketplace' | 'Official Distributor' | 'Katalog FMCG';
}

// Offline PWA & Background Sync interfaces
export interface OfflineSyncState {
  isOnline: boolean;
  isOfflineSimulated: boolean;
  isSyncing: boolean;
  pendingCount: number;
  lastSyncTime: string | null;
  serviceWorkerActive: boolean;
  backgroundSyncSupported: boolean;
}

export interface CloudSyncResult {
  success: boolean;
  syncedCount: number;
  syncedIds: string[];
  serverTime?: string;
  totalCloudTransactions?: number;
  error?: string;
}

// Backup & Restore Point Interfaces
export interface BackupPayload {
  version: string;
  app: string;
  exportedAt: string;
  exportedBy: string;
  storeName: string;
  branchName: string;
  data: {
    products: Product[];
    suppliers?: Supplier[];
    customers?: Customer[];
    transactions?: Transaction[];
    salesReturns?: SalesReturn[];
    purchaseReturns?: PurchaseReturn[];
    supplierPurchases?: SupplierPurchase[];
    settings?: StoreSettings;
    vouchers?: Voucher[];
    employees?: Employee[];
    heldOrders?: HeldOrder[];
    currentShift?: ShiftSummary | null;
  };
  summary: {
    totalProducts: number;
    totalSuppliers: number;
    totalCustomers: number;
    totalTransactions: number;
    totalSalesReturns: number;
    totalSupplierPurchases: number;
    totalEmployees: number;
  };
}

export interface RestorePoint {
  id: string;
  title: string;
  note?: string;
  type: 'manual' | 'auto_pre_restore' | 'auto_pre_reset' | 'scheduled';
  createdAt: string;
  createdBy: string;
  summary: {
    totalProducts: number;
    totalSuppliers: number;
    totalCustomers: number;
    totalTransactions: number;
    totalStockValue?: number;
  };
  payload: BackupPayload;
}

// Multi-Client LAN Server Database Interfaces
export type LANRole = 'HOST' | 'CLIENT' | 'STANDALONE';

export interface LANClient {
  id: string;
  name: string;
  role: 'HOST' | 'CLIENT';
  ip?: string;
  deviceType?: 'desktop' | 'tablet' | 'mobile';
  lastSeen: string;
  isOnline: boolean;
  transactionsCount: number;
  userAgent?: string;
}

export interface LANServerLog {
  id: string;
  timestamp: string;
  level: 'info' | 'success' | 'warn';
  message: string;
}

export interface LANServerStatus {
  isServerRunning: boolean;
  role: 'HOST';
  port: number;
  localIps: string[];
  primaryIp: string;
  recommendedUrl: string;
  webOrigin?: string;
  isCloudEnvironment?: boolean;
  serverUptime: number;
  connectedClients: LANClient[];
  stats: {
    totalProducts: number;
    totalTransactions: number;
    totalCustomers: number;
    totalHeldOrders: number;
    dbSizeKb: number;
    lastUpdated: string;
  };
  recentLogs: LANServerLog[];
}

export interface LANConfig {
  role: LANRole;
  serverUrl: string;
  clientName: string;
  clientId: string;
  autoSync: boolean;
  syncInterval: number; // in seconds
  customHostIp?: string; // Optional user-defined local IP (e.g. 192.168.1.15)
}


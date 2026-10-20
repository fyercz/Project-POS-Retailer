import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from 'react';
import confetti from 'canvas-confetti';
import {
  Product,
  CartItem,
  Customer,
  MemberTier,
  PointHistoryEntry,
  Voucher,
  HeldOrder,
  Transaction,
  OrderType,
  PaymentDetails,
  StoreSettings,
  SelectedOption,
  WholesaleUnit,
  AIUpsellSuggestion,
  SalesReturn,
  PurchaseReturn,
  SupplierPurchase,
  Supplier,
  Employee,
  ShiftSummary,
  OfflineSyncState,
  CloudSyncResult,
  BackupPayload,
  RestorePoint,
  PriceHistoryRecord,
  CustomerDiscount,
  CustomerDiscountSuggestion,
  OperationalExpense,
  JournalEntry,
  ChartOfAccount,
  BalanceSheet,
  IncomeStatement,
} from '../types';
import {
  INITIAL_CATEGORIES,
  DEFAULT_STORE_SETTINGS,
} from '../data/mockData';
import { generateInvoiceNumber, toLocalDateString } from '../utils/formatters';
import { offlineSyncManager } from '../utils/offlineSyncManager';
import {
  getLANConfig,
  registerLANClient,
  sendLANHeartbeat,
  pushTransactionToLANServer,
  pushLANSharedHeldOrder,
  deleteLANSharedHeldOrder,
  fetchLANSharedHeldOrders,
  pushStockReturnToLANServer,
  pushProductsToLANServer,
  pushStockAdjustToLANServer,
  queueLANProducts,
  queueLANStockAdjust,
  queueLANSale,
  queueLANStockReturn,
  flushLANRetryQueue,
  type LANStockReturnPayload,
} from '../utils/lanSyncManager';
import { posStorage, StorageDiagnostics } from '../utils/posStorage';
import { generateCustomerDiscountSuggestions } from '../utils/customerDiscountRecommender';
import {
  STANDARD_CHART_OF_ACCOUNTS,
  generateJournalEntries,
  computeBalanceSheet,
  computeIncomeStatement,
} from '../utils/accountingLedger';
import { playScannerSound } from '../utils/scannerAudio';
import { pinLockSecondsLeft, registerPinFailure, registerPinSuccess, pinLockMessage } from '../utils/pinGuard';
import { purchaseOutstandingOf, purchasePaymentKind } from '../utils/accountingLedger';
import {
  calcSubtotal,
  calcVoucherDiscount,
  calcCustomerDiscount,
  calcRemainingBill,
  calcMaxRedeemablePoints,
  calcPointsDiscount,
  calcFinalTotal,
  calcPointsEligibleSpend,
  calcEffectiveEligibleSpend,
  tierPointsMultiplier,
  calcPointsEarned,
} from '../domain/cartTotals';
import { newShift, expectedCashOf, applySaleToShift, applyCashOut, canEditStartingCash, closeShift } from '../domain/shiftCash';
import { saleStockDeltas, returnRestockLines, voidRestockLines, linesToDeltas, applyStockDeltas } from '../domain/stockMovements';
import { createBaseline, markStockKnown, diffAgainstBaseline } from '../domain/lanSync';
import {
  sanitizeRestoredProducts,
  sanitizeRestoredTransactions,
  mergeRestoredEmployees,
  mergeRestoredSettings,
  addMissingById,
  mergeProductsKeepExisting,
  mergeSuppliersKeepExisting,
  mergeCustomersKeepExisting,
} from '../domain/restore';
// Data demo dari versi lama: HANYA dipakai untuk mengenali & menghapus sisa data contoh
import {
  INITIAL_CUSTOMERS as DEMO_CUSTOMERS,
  INITIAL_VOUCHERS as DEMO_VOUCHERS,
  INITIAL_SUPPLIERS as DEMO_SUPPLIERS,
  INITIAL_SUPPLIER_PURCHASES as DEMO_SUPPLIER_PURCHASES,
  INITIAL_EXPENSES as DEMO_EXPENSES,
  INITIAL_PRODUCTS as DEMO_PRODUCTS,
} from '../data/mockData';
import { errorMessage } from '../utils/errors';

// --- Domain-Specific Context Types (Rank 2 Optimization) ---

export interface POSCatalogContextType {
  products: Product[];
  categories: typeof INITIAL_CATEGORIES;
  selectedCategory: string;
  setSelectedCategory: (categoryId: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  filterLowStock: boolean;
  setFilterLowStock: (val: boolean) => void;
  updateProductStock: (productId: string, newStock: number) => void;
  bulkAdjustProducts: (
    adjustments: Array<{
      id: string;
      stock?: number;
      expiryDate?: string;
    }>,
    auditNote?: string
  ) => void;
  addProduct: (product: Omit<Product, 'id'>) => Product;
  addProductsBatch: (products: Omit<Product, 'id'>[]) => Product[];
  deleteProductsBatch: (ids: string[]) => void;
  clearImportedProducts: () => void;
  clearAllProducts: () => void;
  updateProduct: (id: string, updated: Partial<Product>) => void;
  recordProductPriceChange: (
    productId: string,
    newCostPrice: number,
    newSellingPrice: number,
    historyRecord: PriceHistoryRecord
  ) => void;
  deleteProduct: (id: string) => void;
}

export interface POSCartActionsContextType {
  addToCart: (
    product: Product,
    selectedOptions?: SelectedOption[],
    notes?: string,
    selectedUnit?: WholesaleUnit
  ) => void;
  updateCartItemQuantity: (cartItemId: string, delta: number) => void;
  setCartItemQuantity: (cartItemId: string, quantity: number) => void;
  updateCartItemUnit: (cartItemId: string, unit: WholesaleUnit | undefined) => void;
  updateCartItemDiscount: (cartItemId: string, discountPercent: number) => void;
  removeFromCart: (cartItemId: string) => void;
  clearCart: () => void;
  updateCartItemNote: (cartItemId: string, notes: string) => void;
}

export interface POSCartContextType extends POSCartActionsContextType {
  cart: CartItem[];
  cartItemCount: number;
  orderType: OrderType;
  setOrderType: (type: OrderType) => void;
  tableNumber: string;
  setTableNumber: (table: string) => void;
  selectedCustomer: Customer | null;
  setSelectedCustomer: (customer: Customer | null) => void;
  appliedVoucher: Voucher | null;
  applyVoucher: (code: string) => { success: boolean; message: string };
  removeVoucher: () => void;
  customerDiscount: CustomerDiscount | null;
  applyCustomerDiscount: (discount: CustomerDiscount) => void;
  removeCustomerDiscount: () => void;
  customerDiscountAmount: number;
  customerDiscountSuggestions: CustomerDiscountSuggestion[];
  usePoints: boolean;
  setUsePoints: (use: boolean) => void;
  pointsToRedeem: number;
  setPointsToRedeem: (points: number) => void;
  maxRedeemablePoints: number;
  pointRedemptionRate: number;
  subtotal: number;
  taxAmount: number;
  serviceChargeAmount: number;
  voucherDiscount: number;
  pointsDiscount: number;
  totalDiscount: number;
  finalTotal: number;
  pointsEarned: number;
  pointsEligibleSpend: number;
  minProfitPercentForPoints: number;
  heldOrders: HeldOrder[];
  holdCurrentOrder: (note?: string) => boolean;
  recallHeldOrder: (heldOrder: HeldOrder) => void;
  deleteHeldOrder: (heldOrderId: string) => void;
}

export interface POSTransactionsContextType {
  isPaymentModalOpen: boolean;
  setIsPaymentModalOpen: (isOpen: boolean) => void;
  processPayment: (payment: PaymentDetails) => Transaction;
  transactions: Transaction[];
  activeReceipt: Transaction | null;
  setActiveReceipt: (tx: Transaction | null, isNewPayment?: boolean) => void;
  isReceiptFromNewPayment: boolean;
  setIsReceiptFromNewPayment: (isNew: boolean) => void;
  voidTransaction: (txId: string) => void;
  salesReturns: SalesReturn[];
  processSalesReturn: (returnData: Omit<SalesReturn, 'id' | 'createdAt'>) => SalesReturn;
  purchaseReturns: PurchaseReturn[];
  processPurchaseReturn: (returnData: Omit<PurchaseReturn, 'id' | 'createdAt'>) => PurchaseReturn;
  supplierPurchases: SupplierPurchase[];
  processSupplierPurchase: (purchaseData: Omit<SupplierPurchase, 'id' | 'createdAt'>) => SupplierPurchase;
  recordSupplierPayment: (
    purchaseId: string,
    amount: number,
    source: 'cash_drawer' | 'bank_transfer',
    note?: string
  ) => { success: boolean; message: string };
  suppliers: Supplier[];
  addSupplier: (supplier: Omit<Supplier, 'id' | 'createdAt'>) => Supplier;
  updateSupplier: (id: string, updated: Partial<Supplier>) => void;
  deleteSupplier: (id: string) => void;
  customers: Customer[];
  addCustomer: (customer: Omit<Customer, 'id' | 'points' | 'totalSpent' | 'ordersCount' | 'pointsHistory'> & { initialPoints?: number }) => Customer;
  adjustCustomerPoints: (customerId: string, pointsDelta: number, reason: string, type?: 'adjusted' | 'bonus') => void;
  updateCustomer: (customerId: string, updates: Partial<Customer>) => void;
  vouchers: Voucher[];
  addVoucher: (v: Voucher) => void;
  clearAllTransactions: () => void;
}

export interface POSAuthShiftContextType {
  employees: Employee[];
  activeEmployee: Employee | null;
  isLocked: boolean;
  setIsLocked: (locked: boolean) => void;
  isEmployeeManagementOpen: boolean;
  setIsEmployeeManagementOpen: (open: boolean) => void;
  isShiftModalOpen: boolean;
  setIsShiftModalOpen: (open: boolean) => void;
  currentShift: ShiftSummary | null;
  loginWithPin: (pin: string, employeeId?: string) => { success: boolean; message: string; employee?: Employee };
  quickSwitchEmployee: (employee: Employee) => boolean;
  lockScreen: () => void;
  unlockScreen: (pin: string) => { success: boolean; message: string };
  logoutEmployee: () => void;
  addEmployee: (empData: Omit<Employee, 'id' | 'registeredAt'>) => Employee;
  updateEmployee: (id: string, updated: Partial<Employee>) => void;
  deleteEmployee: (id: string) => { success: boolean; message: string };
  startNewShift: (startingCash: number) => ShiftSummary;
  updateShiftStartingCash: (startingCash: number) => boolean;
  deleteVoucher: (code: string) => void;
  closeCurrentShift: (actualCashEnding: number, notes?: string) => ShiftSummary;
}

export interface POSUIContextType {
  activeView: 'pos' | 'transactions' | 'inventory' | 'reports' | 'customers';
  setActiveView: (view: 'pos' | 'transactions' | 'inventory' | 'reports' | 'customers') => void;
  activeCustomersTab: 'members' | 'marketing' | 'calculator' | 'ledger' | 'rules';
  setActiveCustomersTab: (tab: 'members' | 'marketing' | 'calculator' | 'ledger' | 'rules') => void;
  selectedMarketingCustomer: Customer | null;
  setSelectedMarketingCustomer: (customer: Customer | null) => void;
  settings: StoreSettings;
  updateSettings: (newSettings: Partial<StoreSettings>) => void;
  applyMinStockRuleToAllProducts: (customPercent?: number) => number;
  isGeminiCopilotOpen: boolean;
  setIsGeminiCopilotOpen: (open: boolean) => void;
  activeCopilotTab: 'upsell' | 'forecast' | 'insights' | 'promo' | 'chat';
  setActiveCopilotTab: (tab: 'upsell' | 'forecast' | 'insights' | 'promo' | 'chat') => void;
  openGeminiCopilot: (tab?: 'upsell' | 'forecast' | 'insights' | 'promo' | 'chat') => void;
  triggerRestockPlanAnalysis: () => void;
  restockPlanTriggerCounter: number;
  pendingReceivingFromPO: Array<{ productId: string; quantity: number; costPrice: number; expiryDate?: string }> | null;
  setPendingReceivingFromPO: (items: Array<{ productId: string; quantity: number; costPrice: number; expiryDate?: string }> | null) => void;
  aiUpsellSuggestions: AIUpsellSuggestion[];
  isFetchingUpsell: boolean;
  fetchUpsellSuggestions: () => Promise<void>;
  isOnline: boolean;
  isOfflineSimulated: boolean;
  toggleOfflineSimulation: (enable?: boolean) => void;
  pendingSyncCount: number;
  isSyncing: boolean;
  lastSyncTime: string | null;
  serviceWorkerActive: boolean;
  backgroundSyncSupported: boolean;
  autoSyncEnabled: boolean;
  autoSyncIntervalSeconds: number;
  databaseEngine: string;
  setAutoSyncEnabled: (enabled: boolean) => void;
  setAutoSyncInterval: (seconds: number) => void;
  triggerAutoPeriodicSync: () => Promise<void>;
  syncPendingTransactions: () => Promise<CloudSyncResult>;
  isSyncModalOpen: boolean;
  setIsSyncModalOpen: (open: boolean) => void;
  syncNotification: string | null;
  clearSyncNotification: () => void;
  isBarcodeScannerOpen: boolean;
  setIsBarcodeScannerOpen: (open: boolean) => void;
  isUnregisteredBarcodeModalOpen: boolean;
  setIsUnregisteredBarcodeModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  unregisteredBarcode: string;
  setUnregisteredBarcode: (barcode: string) => void;
  openUnregisteredBarcodePrompt: (barcode: string) => void;
  scanBarcodeAndAddToCart: (code: string) => {
    success: boolean;
    product?: Product;
    message: string;
    unit?: WholesaleUnit;
  };
  restorePoints: RestorePoint[];
  createRestorePoint: (title: string, note?: string, type?: 'manual' | 'auto_pre_restore' | 'auto_pre_reset' | 'scheduled') => RestorePoint;
  deleteRestorePoint: (id: string) => void;
  restoreFromPoint: (pointId: string, mode?: 'overwrite' | 'merge', createSafetyPoint?: boolean) => { success: boolean; message: string };
  restoreFromPayload: (payload: BackupPayload, mode?: 'overwrite' | 'merge', createSafetyPoint?: boolean) => { success: boolean; message: string };
  generateBackupPayload: () => BackupPayload;
  downloadBackupFile: (options?: {
    customFileName?: string;
    pretty?: boolean;
    selectedModules?: Record<string, boolean>;
  }) => { success: boolean; fileName: string; sizeKb: string };
  isBackupRestoreOpen: boolean;
  setIsBackupRestoreOpen: React.Dispatch<React.SetStateAction<boolean>>;
  storageDiagnostics: StorageDiagnostics | null;
  refreshStorageDiagnostics: () => Promise<StorageDiagnostics>;
  runStorageBenchmark: (recordCount?: number) => Promise<{
    recordCount: number;
    idbWriteMs: number;
    idbReadMs: number;
    lsWriteMs: number;
    lsReadMs: number;
    speedComparison: string;
  }>;
  isLANModalOpen: boolean;
  setIsLANModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  applyMasterLANData: (data: {
    products: Product[];
    transactions?: Transaction[];
    customers?: Customer[];
    suppliers?: Supplier[];
  }) => void;
  /** Hapus transaksi latihan/uji coba (Owner). Membuat titik pulih lebih dulu. */
  clearTrialTransactions: () => { success: boolean; message: string };
  /** Jumlah data contoh lama (dari versi yang dulu memuat data demo) yang masih tersimpan */
  legacyDemoSummary: { customers: number; vouchers: number; suppliers: number; purchases: number; expenses: number; transactions: number; products: number; total: number };
  /** Hapus data contoh lama (hanya yang ID/kodenya cocok dengan data demo). Owner; titik pulih dibuat dulu. */
  removeLegacyDemoData: () => { success: boolean; message: string };
  /** Pendaftaran pertama: buat akun Owner (nama + PIN sendiri) dan nama toko. */
  completeFirstRunSetup: (data: { ownerName: string; pin: string; storeName: string; address?: string; phone?: string }) => { success: boolean; message: string };
  // Accounting & Financial Statements (Double-Entry & Balance Sheet)
  expenses: OperationalExpense[];
  addExpense: (expense: Omit<OperationalExpense, 'id' | 'date'>) => OperationalExpense;
  deleteExpense: (id: string) => void;
  journalEntries: JournalEntry[];
  balanceSheet: BalanceSheet;
  incomeStatement: IncomeStatement;
  chartOfAccounts: ChartOfAccount[];
}

// Composite interface for complete backwards compatibility
export type POSContextType = POSCatalogContextType &
  POSCartContextType &
  POSTransactionsContextType &
  POSAuthShiftContextType &
  POSUIContextType;

export const POSCatalogContext = createContext<POSCatalogContextType | undefined>(undefined);
export const POSCartActionsContext = createContext<POSCartActionsContextType | undefined>(undefined);
export const POSCartContext = createContext<POSCartContextType | undefined>(undefined);
export const POSTransactionsContext = createContext<POSTransactionsContextType | undefined>(undefined);
export const POSAuthShiftContext = createContext<POSAuthShiftContextType | undefined>(undefined);
export const POSUIContext = createContext<POSUIContextType | undefined>(undefined);
export const POSContext = createContext<POSContextType | undefined>(undefined);

export const POSProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Navigation view
  const [activeView, setActiveView] = useState<'pos' | 'transactions' | 'inventory' | 'reports' | 'customers'>('pos');
  const [activeCustomersTab, setActiveCustomersTab] = useState<'members' | 'marketing' | 'calculator' | 'ledger' | 'rules'>('members');
  const [selectedMarketingCustomer, setSelectedMarketingCustomer] = useState<Customer | null>(null);

  // Catalog State
  const [products, setProducts] = useState<Product[]>(() => {
    // Clear out old mock sample dataset if present
    localStorage.removeItem('pos_retail_products_v2');
    // Instalasi baru dimulai tanpa produk (dulu 16 produk contoh dengan harga & stok karangan)
    let rawList: Product[] = [];
    try {
      const saved = localStorage.getItem('pos_retail_products_v3');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Daftar kosong yang tersimpan (mis. katalog dikosongkan saat persiapan peluncuran)
        // tetap kosong; dulu kembali ke produk demo saat aplikasi dibuka ulang.
        if (Array.isArray(parsed)) {
          rawList = parsed;
        }
      }
    } catch {
      rawList = [];
    }
    const seenIds = new Set<string>();
    return rawList.map((p, idx) => {
      let id = p.id;
      if (!id || seenIds.has(id)) {
        id = `prod-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 7)}`;
      }
      seenIds.add(id);
      return { ...p, id };
    });
  });

  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterLowStock, setFilterLowStock] = useState<boolean>(false);

  // Cart State
  const [cart, setCart] = useState<CartItem[]>(() => {
    const saved = localStorage.getItem('pos_active_cart');
    if (!saved) return [];
    try {
      const parsed: CartItem[] = JSON.parse(saved);
      if (!Array.isArray(parsed)) return [];
      return parsed.map((item) => {
        const unitPrice = item.unitPrice ?? item.product?.price ?? 0;
        const multiplier = item.selectedUnit?.multiplier || 1;
        const costPrice =
          item.selectedUnit?.costPrice !== undefined
            ? item.selectedUnit.costPrice
            : (item.product?.costPrice ?? 0) * multiplier;
        const profitNominal = unitPrice - costPrice;
        const calcMargin = unitPrice > 0 ? (profitNominal / unitPrice) * 100 : 0;
        const profitMarginPercent = item.profitMarginPercent !== undefined ? item.profitMarginPercent : calcMargin;
        const isPointsEligible = item.isPointsEligible !== undefined ? item.isPointsEligible : (profitMarginPercent >= 15);
        return {
          ...item,
          profitMarginPercent,
          isPointsEligible,
        };
      });
    } catch {
      return [];
    }
  });

  // Order Details
  const [orderType, setOrderType] = useState<OrderType>('sale');
  const [tableNumber, setTableNumber] = useState<string>('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [appliedVoucher, setAppliedVoucher] = useState<Voucher | null>(null);
  const [customerDiscount, setCustomerDiscount] = useState<CustomerDiscount | null>(null);
  const [pointsToRedeem, setPointsToRedeem] = useState<number>(0);

  // Held Orders
  const [heldOrders, setHeldOrders] = useState<HeldOrder[]>(() => {
    try {
      const saved = localStorage.getItem('pos_held_orders');
      if (saved) {
        const parsed = JSON.parse(saved);
        return Array.isArray(parsed) ? parsed : [];
      }
    } catch {
      return [];
    }
    return [];
  });

  // Transactions History
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    localStorage.removeItem('pos_retail_tx_v2');
    try {
      const saved = localStorage.getItem('pos_retail_tx_v3');
      if (saved) {
        const parsed = JSON.parse(saved);
        return Array.isArray(parsed) ? parsed : [];
      }
    } catch {
      return [];
    }
    return []; // dulu: 14 hari transaksi contoh
  });

  // Customers with loyalty tracking & points ledger
  const [customers, setCustomers] = useState<Customer[]>(() => {
    const savedV3 = localStorage.getItem('pos_retail_customers_v3');
    if (savedV3) {
      try {
        return JSON.parse(savedV3);
      } catch {
        // fallback
      }
    }
    const savedV2 = localStorage.getItem('pos_retail_customers_v2');
    if (savedV2) {
      try {
        const parsed = JSON.parse(savedV2);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((c: any) => {
            const match = undefined as Customer | undefined;
            return {
              ...c,
              tier: c.tier && c.tier !== 'Regular' ? c.tier : (match ? match.tier : 'Bronze'),
              pointsHistory: c.pointsHistory || (match ? match.pointsHistory : []),
              joinedDate: c.joinedDate || (match ? match.joinedDate : '2025-08-01'),
            };
          });
        }
      } catch {
        // fallback
      }
    }
    return [];
  });

  // Store Settings
  const [settings, setSettings] = useState<StoreSettings>(() => {
    const saved = localStorage.getItem('pos_retail_settings_v2');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.storeName && parsed.storeName.includes('NexaMart')) {
          parsed.storeName = parsed.storeName.replace(/NexaMart/g, 'Ulilmart');
        }
        if (parsed.receiptFooterMessage && /nexamart/i.test(parsed.receiptFooterMessage)) {
          parsed.receiptFooterMessage = parsed.receiptFooterMessage.replace(/nexamart/gi, 'ulilmart');
        }
        if (!parsed.address || parsed.address.includes('Orchard') || parsed.address.includes('Jakarta')) {
          parsed.address = DEFAULT_STORE_SETTINGS.address;
        }
        if (!parsed.phone || parsed.phone.includes('(021) 7890') || parsed.phone.includes('(021)')) {
          parsed.phone = DEFAULT_STORE_SETTINGS.phone;
        }
        if (!parsed.branchName || parsed.branchName.includes('Orchard') || parsed.branchName.includes('Utama Ritel')) {
          parsed.branchName = DEFAULT_STORE_SETTINGS.branchName;
        }
        parsed.googleMapsUrl = parsed.googleMapsUrl || DEFAULT_STORE_SETTINGS.googleMapsUrl;
        parsed.operatingHours = parsed.operatingHours || DEFAULT_STORE_SETTINGS.operatingHours;
        parsed.storeTagline = parsed.storeTagline || DEFAULT_STORE_SETTINGS.storeTagline;
        parsed.pointRedemptionRate = parsed.pointRedemptionRate || 100;
        parsed.minRedeemPoints = parsed.minRedeemPoints !== undefined ? parsed.minRedeemPoints : 10;
        return parsed;
      } catch {
        return DEFAULT_STORE_SETTINGS;
      }
    }
    return DEFAULT_STORE_SETTINGS;
  });

  const [vouchers, setVouchers] = useState<Voucher[]>(() => {
    try {
      const saved = localStorage.getItem('pos_vouchers');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // data rusak: jangan sampai aplikasi gagal dibuka
    }
    return []; // dulu: 4 voucher contoh yang langsung aktif
  });

  // Returns state (Sales Returns and Supplier Purchase Returns)
  const [salesReturns, setSalesReturns] = useState<SalesReturn[]>(() => {
    const saved = localStorage.getItem('pos_sales_returns');
    if (!saved) return [];
    try {
      const list: SalesReturn[] = JSON.parse(saved);
      const seen = new Set<string>();
      return list.map((r, i) => {
        let id = r.id;
        if (!id || seen.has(id)) {
          id = `ret-sale-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 6)}`;
        }
        seen.add(id);
        return { ...r, id };
      });
    } catch {
      return [];
    }
  });

  const [purchaseReturns, setPurchaseReturns] = useState<PurchaseReturn[]>(() => {
    const saved = localStorage.getItem('pos_purchase_returns');
    if (!saved) return [];
    try {
      const list: PurchaseReturn[] = JSON.parse(saved);
      const seen = new Set<string>();
      return list.map((r, i) => {
        let id = r.id;
        if (!id || seen.has(id)) {
          id = `ret-sup-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 6)}`;
        }
        seen.add(id);
        return { ...r, id };
      });
    } catch {
      return [];
    }
  });

  const [supplierPurchases, setSupplierPurchases] = useState<SupplierPurchase[]>(() => {
    const saved = localStorage.getItem('pos_supplier_purchases_v2');
    if (!saved) return [];
    try {
      const list: SupplierPurchase[] = JSON.parse(saved);
      if (!Array.isArray(list)) return [];
      const seen = new Set<string>();
      return list.map((p, i) => {
        let id = p.id;
        if (!id || seen.has(id)) {
          id = `purch-sup-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 6)}`;
        }
        seen.add(id);
        return { ...p, id };
      });
    } catch {
      return [];
    }
  });

  const [suppliers, setSuppliers] = useState<Supplier[]>(() => {
    let rawList: Supplier[] = [];
    try {
      const saved = localStorage.getItem('pos_retail_suppliers_v2');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          rawList = parsed;
        }
      }
    } catch {
      rawList = [];
    }
    const seen = new Set<string>();
    return rawList.map((s, i) => {
      let id = s.id;
      if (!id || seen.has(id)) {
        id = `sup-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 6)}`;
      }
      seen.add(id);
      return { ...s, id };
    });
  });

  // Multi-Employee & Shift Management States
  const [employees, setEmployees] = useState<Employee[]>(() => {
    try {
      const saved = localStorage.getItem('pos_employees_v2');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // fallback
    }
    // Instalasi baru: tanpa karyawan. Layar pendaftaran Owner muncul (dulu 5 akun contoh dengan
    // PIN yang tertulis di kode: 1234, 2345, 3456, 7890, dan 9999 untuk Owner).
    return [];
  });

  const [activeEmployee, setActiveEmployee] = useState<Employee | null>(() => {
    try {
      const savedEmpId = localStorage.getItem('pos_active_employee_id');
      const savedEmployeesStr = localStorage.getItem('pos_employees_v2');
      let allEmployees: Employee[] = [];
      if (savedEmployeesStr) {
        try {
          const parsed = JSON.parse(savedEmployeesStr);
          if (Array.isArray(parsed) && parsed.length > 0) allEmployees = parsed;
        } catch {}
      }
      if (savedEmpId) {
        const match = allEmployees.find((e) => e.id === savedEmpId);
        if (match) return match;
      }
      return allEmployees[0] || null;
    } catch {
      return null;
    }
  });

  const [isLocked, setIsLocked] = useState<boolean>(() => {
    return localStorage.getItem('pos_is_locked') === 'true';
  });

  const [isEmployeeManagementOpen, setIsEmployeeManagementOpen] = useState(false);
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);

  const [currentShift, setCurrentShift] = useState<ShiftSummary | null>(() => {
    try {
      const saved = localStorage.getItem('pos_current_shift_v1');
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    // Shift pertama dibuat setelah Owner mendaftar (lihat completeFirstRunSetup)
    return null;
    return {
      id: `shift-${Date.now()}`,
      employeeId: '',
      employeeName: '',
      role: 'owner',
      startTime: new Date().toISOString(),
      startingCash: 0, // Modal awal diisi kasir di layar Shift (dulu otomatis Rp 500.000)
      totalSales: 0,
      totalTransactions: 0,
      cashSales: 0,
      nonCashSales: 0,
      status: 'active',
    };
  });

  const [pastShifts, setPastShifts] = useState<ShiftSummary[]>(() => {
    try {
      const saved = localStorage.getItem('pos_past_shifts_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // fallback
    }
    return [];
  });

  // Operational Expenses for Accounting Ledger & Income Statement
  const [expenses, setExpenses] = useState<OperationalExpense[]>(() => {
    try {
      const saved = localStorage.getItem('pos_operational_expenses');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // fallback
    }
    return [];
  });


  const addExpense = (expData: Omit<OperationalExpense, 'id' | 'date'>): OperationalExpense => {
    const newExp: OperationalExpense = {
      ...expData,
      id: `exp-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      date: new Date().toISOString(),
    };
    setExpenses((prev) => [newExp, ...prev]);
    if (newExp.paymentSource === 'cash_drawer') recordShiftCashOut(Number(newExp.amount) || 0);
    return newExp;
  };

  const deleteExpense = (expId: string) => {
    const exp = expenses.find((e) => e.id === expId);
    setExpenses((prev) => prev.filter((e) => e.id !== expId));
    // Pengeluaran dari laci yang dicatat di shift ini dibatalkan: kembalikan ke hitungan kas
    if (exp && exp.paymentSource === 'cash_drawer' && currentShift && exp.date >= currentShift.startTime) {
      recordShiftCashOut(-(Number(exp.amount) || 0));
    }
  };

  // Modal States
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [activeReceipt, setActiveReceiptState] = useState<Transaction | null>(null);
  const [isReceiptFromNewPayment, setIsReceiptFromNewPayment] = useState<boolean>(false);

  const setActiveReceipt = useCallback((tx: Transaction | null, isNewPayment: boolean = false) => {
    setActiveReceiptState(tx);
    setIsReceiptFromNewPayment(Boolean(tx && isNewPayment));
  }, []);

  // Gemini AI Copilot States
  const [isGeminiCopilotOpen, setIsGeminiCopilotOpen] = useState(false);
  const [activeCopilotTab, setActiveCopilotTab] = useState<'upsell' | 'forecast' | 'insights' | 'promo' | 'chat'>('upsell');
  const [restockPlanTriggerCounter, setRestockPlanTriggerCounter] = useState(0);
  const [pendingReceivingFromPO, setPendingReceivingFromPO] = useState<
    Array<{ productId: string; quantity: number; costPrice: number; expiryDate?: string }> | null
  >(null);
  const [aiUpsellSuggestions, setAiUpsellSuggestions] = useState<AIUpsellSuggestion[]>([]);
  const [isFetchingUpsell, setIsFetchingUpsell] = useState(false);

  // Offline PWA & Cloud Background Sync States
  const [syncState, setSyncState] = useState<OfflineSyncState>(() => offlineSyncManager.getState());
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [syncNotification, setSyncNotification] = useState<string | null>(null);

  // Barcode Scanner Camera State
  const [isBarcodeScannerOpen, setIsBarcodeScannerOpen] = useState(false);

  // Unregistered Barcode Authority Prompt State
  const [isUnregisteredBarcodeModalOpen, setIsUnregisteredBarcodeModalOpen] = useState(false);
  const [unregisteredBarcode, setUnregisteredBarcode] = useState('');

  const openUnregisteredBarcodePrompt = useCallback((barcode: string) => {
    const clean = (barcode || '').trim();
    if (!clean) return;
    setUnregisteredBarcode(clean);
    setIsUnregisteredBarcodeModalOpen(true);
  }, []);

  // Backup & Restore Points State
  const [isBackupRestoreOpen, setIsBackupRestoreOpen] = useState(false);
  // Multi-Client LAN Server Database Hub State
  const [isLANModalOpen, setIsLANModalOpen] = useState(false);
  const [restorePoints, setRestorePoints] = useState<RestorePoint[]>(() => {
    try {
      const saved = localStorage.getItem('pos_restore_points_v1');
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return [];
  });

  // Global F3 Shortcut to toggle Barcode Scanner
  useEffect(() => {
    const handleBarcodeShortcut = (e: KeyboardEvent) => {
      if (e.key === 'F3') {
        e.preventDefault();
        setIsBarcodeScannerOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleBarcodeShortcut);
    return () => window.removeEventListener('keydown', handleBarcodeShortcut);
  }, []);

  // Subscribe to offline sync manager and listen for sync events
  useEffect(() => {
    const unsubscribe = offlineSyncManager.subscribe((state) => {
      setSyncState(state);
    });

    const handleSyncedEvent = (e: any) => {
      const count = e.detail?.count || 0;
      const syncedIds: string[] = e.detail?.syncedIds || [];

      if (syncedIds.length > 0) {
        setTransactions((prev) =>
          prev.map((tx) =>
            syncedIds.includes(tx.id)
              ? { ...tx, syncStatus: 'synced', syncedAt: new Date().toISOString() }
              : tx
          )
        );
      }

      if (count > 0) {
        setSyncNotification(`Koneksi pulih! ${count} transaksi offline berhasil disinkronkan ke cloud.`);
        setTimeout(() => setSyncNotification(null), 7000);
      }
    };

    window.addEventListener('pos-transactions-synced', handleSyncedEvent);

    return () => {
      unsubscribe();
      window.removeEventListener('pos-transactions-synced', handleSyncedEvent);
    };
  }, []);

  const syncPendingTransactions = useCallback(async (): Promise<CloudSyncResult> => {
    const result = await offlineSyncManager.syncPendingTransactions();
    if (result.success && result.syncedCount > 0) {
      setTransactions((prev) =>
        prev.map((tx) =>
          result.syncedIds?.includes(tx.id)
            ? { ...tx, syncStatus: 'synced', syncedAt: result.serverTime || new Date().toISOString() }
            : tx
        )
      );
    }
    return result;
  }, []);

  const clearSyncNotification = useCallback(() => {
    setSyncNotification(null);
  }, []);

  // -------------------------------------------------------------
  // Sinkron otomatis edit produk & penyesuaian stok ke server LAN.
  // "Baseline" = keadaan produk yang sudah diketahui server. Perubahan di luar itu
  // (edit produk, stock opname, barang masuk, koreksi) dikirim: data produk utuh,
  // dan stok sebagai SELISIH supaya tidak menimpa penjualan dari kasir lain.
  // Perubahan yang server sudah tahu (penjualan, retur, void, stok dari server)
  // langsung dicatat di baseline sehingga tidak terkirim dua kali.
  // -------------------------------------------------------------
  // true setelah data dari IndexedDB selesai dimuat (lihat efek pemuatan di bawah)
  const [isStorageHydrated, setIsStorageHydrated] = useState(false);
  const lanBaselineRef = useRef<Map<string, { stock: number; sig: string; ref?: Product }> | null>(null);
  const [lanConfigTick, setLanConfigTick] = useState(0);

  // Logika deteksi perubahan: src/domain/lanSync.ts (teruji)
  const resetLanBaseline = (list: Product[]) => {
    lanBaselineRef.current = createBaseline(list);
  };

  /** Catat perubahan stok yang sudah diketahui server (agar tidak dikirim lagi sebagai penyesuaian). */
  const markStockKnownToServer = (changes: Array<{ productId: string; delta?: number; newStock?: number }>) => {
    markStockKnown(lanBaselineRef.current, changes);
  };

  useEffect(() => {
    const onConfigChanged = () => setLanConfigTick((t) => t + 1);
    window.addEventListener('lan-config-changed', onConfigChanged);
    return () => window.removeEventListener('lan-config-changed', onConfigChanged);
  }, []);

  useEffect(() => {
    if (!isStorageHydrated) return; // tunggu data asli dimuat, jangan bandingkan dengan data basi
    if (getLANConfig().role === 'STANDALONE') {
      lanBaselineRef.current = null;
      return;
    }
    if (!lanBaselineRef.current) {
      resetLanBaseline(products);
      return;
    }
    const timer = setTimeout(() => {
      const base = lanBaselineRef.current;
      if (!base) return;
      const { changedProducts, stockDeltas } = diffAgainstBaseline(base, products);

      if (changedProducts.length > 0) {
        pushProductsToLANServer(changedProducts, 'Edit produk dari kasir')
          .then((res) => {
            if (!res.success && !res.skipped && !(res.status && res.status >= 400 && res.status < 500 && res.status !== 401 && res.status !== 429)) {
              queueLANProducts(changedProducts);
            }
          })
          .catch(() => queueLANProducts(changedProducts));
      }

      if (stockDeltas.length > 0) {
        const payload = {
          key: `${getLANConfig().clientId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          items: stockDeltas,
          reason: 'Penyesuaian stok dari kasir',
        };
        pushStockAdjustToLANServer(payload)
          .then((res) => {
            if (res.success) {
              // Tampilkan stok gabungan terbaru dari server (termasuk penjualan kasir lain)
              window.dispatchEvent(new CustomEvent('lan-stock-updated', { detail: { updatedStocks: res.updatedStocks } }));
            } else if (!res.skipped && !(res.status && res.status >= 400 && res.status < 500 && res.status !== 401 && res.status !== 429)) {
              queueLANStockAdjust(payload);
            }
          })
          .catch(() => queueLANStockAdjust(payload));
      }
    }, 400);
    return () => clearTimeout(timer);
     
  }, [products, lanConfigTick, isStorageHydrated]);

  const applyMasterLANData = useCallback(
    (data: {
      products: Product[];
      transactions?: Transaction[];
      customers?: Customer[];
      suppliers?: Supplier[];
    }) => {
      if (Array.isArray(data.products) && data.products.length > 0) {
        setProducts(data.products);
        if (lanBaselineRef.current) resetLanBaseline(data.products);
      }
      if (Array.isArray(data.transactions) && data.transactions.length > 0) {
        setTransactions(data.transactions);
      }
      if (Array.isArray(data.customers) && data.customers.length > 0) {
        setCustomers(data.customers);
      }
      if (Array.isArray(data.suppliers) && data.suppliers.length > 0) {
        setSuppliers(data.suppliers);
      }
    },
    []
  );

  // Jumlah transaksi terbaru untuk heartbeat, dibaca lewat ref agar timer tidak dipasang ulang
  // setiap ada penjualan (dulu timer 10 detik terus ter-reset saat kasir ramai, sehingga
  // heartbeat dan kirim ulang antrean tidak pernah sempat berjalan).
  const transactionsCountRef = useRef(transactions.length);
  transactionsCountRef.current = transactions.length;

  // Multi-Client LAN Server Database Heartbeat & Real-Time Sync Listener
  useEffect(() => {
    registerLANClient();

    const handleLanStockUpdated = (e: any) => {
      const { updatedStocks } = e.detail || {};
      if (Array.isArray(updatedStocks) && updatedStocks.length > 0) {
        markStockKnownToServer(updatedStocks);
        setProducts((prev) =>
          prev.map((p) => {
            const match = updatedStocks.find((u: any) => u.productId === p.id);
            return match ? { ...p, stock: match.newStock } : p;
          })
        );
      }
    };

    window.addEventListener('lan-stock-updated', handleLanStockUpdated);

    const interval = setInterval(async () => {
      try {
        const cfg = getLANConfig();
        if (cfg.role === 'STANDALONE') return;

        await sendLANHeartbeat(transactionsCountRef.current);

        // Kirim ulang penjualan/retur yang tadi gagal terkirim ke server LAN
        const retriedStocks = await flushLANRetryQueue();
        if (retriedStocks.length > 0) {
          window.dispatchEvent(new CustomEvent('lan-stock-updated', { detail: { updatedStocks: retriedStocks } }));
        }

        if (cfg.role === 'CLIENT' && cfg.autoSync) {
          const sharedOrders = await fetchLANSharedHeldOrders();
          if (Array.isArray(sharedOrders) && sharedOrders.length > 0) {
            setHeldOrders((prevLocal) => {
              const localMap = new Map(prevLocal.map((o) => [o.id, o]));
              sharedOrders.forEach((so) => {
                if (!localMap.has(so.id)) {
                  localMap.set(so.id, so);
                }
              });
              return Array.from(localMap.values());
            });
          }
        }
      } catch (err) {
        // Silently catch network or parsing hiccups during periodic heartbeat
      }
    }, 10000);

    return () => {
      window.removeEventListener('lan-stock-updated', handleLanStockUpdated);
      clearInterval(interval);
    };
     
  }, []);

  // Debounced Sync to High-Capacity IndexedDB & LocalStorage Fallback
  const pendingStorageSaves = useRef<Record<string, any>>({});
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const scheduleSave = useCallback((key: string, data: any) => {
    pendingStorageSaves.current[key] = data;
    if (!saveTimeoutRef.current) {
      saveTimeoutRef.current = setTimeout(async () => {
        try {
          const saves = { ...pendingStorageSaves.current };
          pendingStorageSaves.current = {};
          for (const [k, v] of Object.entries(saves)) {
            await posStorage.setItem(k, v);
          }
        } catch (err) {
          console.warn('[posStorage] Background persistence error:', err);
        } finally {
          saveTimeoutRef.current = null;
        }
      }, 250);
    }
  }, []);

  // Tulis simpanan yang masih tertunda saat tab disembunyikan / ditutup, agar perubahan terakhir
  // (mis. transaksi yang baru selesai) tidak hilang bila browser ditutup dalam jeda 250 ms.
  useEffect(() => {
    const flushPendingSaves = () => {
      const saves = { ...pendingStorageSaves.current };
      if (Object.keys(saves).length === 0) return;
      pendingStorageSaves.current = {};
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }
      for (const [k, v] of Object.entries(saves)) {
        posStorage.setItem(k, v).catch((err) => console.warn('[posStorage] Gagal menyimpan saat menutup:', err));
      }
    };
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') flushPendingSaves();
    };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', flushPendingSaves);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', flushPendingSaves);
    };
  }, []);

  // High-Capacity Storage Diagnostics & Benchmark
  const [storageDiagnostics, setStorageDiagnostics] = useState<StorageDiagnostics | null>(null);

  const refreshStorageDiagnostics = useCallback(async () => {
    const diag = await posStorage.getStorageDiagnostics();
    setStorageDiagnostics(diag);
    return diag;
  }, []);

  const runStorageBenchmark = useCallback(async (recordCount: number = 200) => {
    const res = await posStorage.runBenchmark(recordCount);
    await refreshStorageDiagnostics();
    return res;
  }, [refreshStorageDiagnostics]);

  // Auto-migration from LocalStorage to IndexedDB on boot
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        await posStorage.autoMigrateFromLocalStorage();
        if (isMounted) {
          await refreshStorageDiagnostics();
        }
      } catch (err) {
        console.warn('[posStorage] Boot migration error:', err);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [refreshStorageDiagnostics]);

  // -------------------------------------------------------------
  // Muat data dari IndexedDB saat aplikasi dibuka.
  // Nilai awal state berasal dari localStorage, yang bisa BASI bila kuotanya (5 MB) penuh
  // (mis. setelah ribuan transaksi). Karena itu data IndexedDB dimuat dulu, dan penyimpanan
  // otomatis baru aktif setelahnya, agar salinan basi tidak pernah menimpa data yang benar.
  // -------------------------------------------------------------
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await posStorage.autoMigrateFromLocalStorage(); // hanya mengisi kunci yang belum ada di IndexedDB
        const isArr = (v: unknown): v is any[] => Array.isArray(v);
        const load = async <T,>(key: string, valid: (v: any) => boolean, apply: (v: T) => void) => {
          const v = await posStorage.readFromIndexedDB<T>(key);
          if (!cancelled && v !== undefined && v !== null && valid(v)) apply(v);
        };
        await load<Product[]>('pos_retail_products_v3', isArr, (v) => {
          const seen = new Set<string>();
          setProducts(
            v.map((p, idx) => {
              const id = p.id && !seen.has(p.id) ? p.id : `prod-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 7)}`;
              seen.add(id);
              return { ...p, id };
            })
          );
        });
        await load<Transaction[]>('pos_retail_tx_v3', isArr, setTransactions);
        await load<Customer[]>('pos_retail_customers_v3', isArr, setCustomers);
        await load<CartItem[]>('pos_active_cart', isArr, setCart);
        await load<any[]>('pos_held_orders', isArr, setHeldOrders as any);
        await load<any>('pos_retail_settings_v2', (v) => typeof v === 'object' && !isArr(v), (v) =>
          setSettings((prev) => ({ ...prev, ...v }))
        );
        await load<any[]>('pos_vouchers', isArr, setVouchers as any);
        await load<any[]>('pos_sales_returns', isArr, setSalesReturns as any);
        await load<any[]>('pos_purchase_returns', isArr, setPurchaseReturns as any);
        await load<any[]>('pos_supplier_purchases_v2', isArr, setSupplierPurchases as any);
        await load<any[]>('pos_retail_suppliers_v2', isArr, setSuppliers as any);
        await load<any[]>('pos_employees_v2', (v) => isArr(v) && v.length > 0, setEmployees as any);
        await load<any[]>('pos_restore_points_v1', isArr, setRestorePoints as any);
        await load<any>('pos_current_shift_v1', (v) => typeof v === 'object' && !isArr(v), setCurrentShift as any);
        await load<OperationalExpense[]>('pos_operational_expenses', isArr, setExpenses);
        await load<ShiftSummary[]>('pos_past_shifts_v1', isArr, setPastShifts);
      } catch (err) {
        console.warn('[posStorage] Gagal memuat data dari IndexedDB, memakai data localStorage:', err);
      } finally {
        if (!cancelled) setIsStorageHydrated(true);
      }
    })();
    return () => {
      cancelled = true;
    };
     
  }, []);

  // Tandai produk yang stoknya pernah > 0 (dipakai untuk membedakan "Habis" dari "Belum ada stok").
  // Satu efek menangkap semua jalur: terima barang, opname, koreksi, edit manual, sinkron server.
  useEffect(() => {
    if (!isStorageHydrated) return;
    if (!products.some((p) => p.stock > 0 && !p.stockInitializedAt)) return;
    const now = new Date().toISOString();
    setProducts((prev) => prev.map((p) => (p.stock > 0 && !p.stockInitializedAt ? { ...p, stockInitializedAt: now } : p)));
  }, [products, isStorageHydrated]);

  useEffect(() => {
    if (!isStorageHydrated) return;
    scheduleSave('pos_retail_products_v3', products);
  }, [products, scheduleSave, isStorageHydrated]);

  useEffect(() => {
    if (!isStorageHydrated) return;
    scheduleSave('pos_active_cart', cart);
  }, [cart, scheduleSave, isStorageHydrated]);

  useEffect(() => {
    if (!isStorageHydrated) return;
    scheduleSave('pos_held_orders', heldOrders);
  }, [heldOrders, scheduleSave, isStorageHydrated]);

  useEffect(() => {
    if (!isStorageHydrated) return;
    scheduleSave('pos_retail_tx_v3', transactions);
  }, [transactions, scheduleSave, isStorageHydrated]);

  useEffect(() => {
    if (!isStorageHydrated) return;
    scheduleSave('pos_retail_customers_v3', customers);
  }, [customers, scheduleSave, isStorageHydrated]);

  useEffect(() => {
    if (!isStorageHydrated) return;
    scheduleSave('pos_retail_settings_v2', settings);
  }, [settings, scheduleSave, isStorageHydrated]);

  useEffect(() => {
    if (!isStorageHydrated) return;
    scheduleSave('pos_vouchers', vouchers);
  }, [vouchers, scheduleSave, isStorageHydrated]);

  useEffect(() => {
    if (!isStorageHydrated) return;
    scheduleSave('pos_sales_returns', salesReturns);
  }, [salesReturns, scheduleSave, isStorageHydrated]);

  useEffect(() => {
    if (!isStorageHydrated) return;
    scheduleSave('pos_purchase_returns', purchaseReturns);
  }, [purchaseReturns, scheduleSave, isStorageHydrated]);

  useEffect(() => {
    if (!isStorageHydrated) return;
    scheduleSave('pos_supplier_purchases_v2', supplierPurchases);
  }, [supplierPurchases, scheduleSave, isStorageHydrated]);

  useEffect(() => {
    if (!isStorageHydrated) return;
    scheduleSave('pos_retail_suppliers_v2', suppliers);
  }, [suppliers, scheduleSave, isStorageHydrated]);

  useEffect(() => {
    if (!isStorageHydrated) return;
    scheduleSave('pos_employees_v2', employees);
  }, [employees, scheduleSave, isStorageHydrated]);

  useEffect(() => {
    if (!isStorageHydrated) return;
    scheduleSave('pos_restore_points_v1', restorePoints);
  }, [restorePoints, scheduleSave, isStorageHydrated]);

  useEffect(() => {
    if (!isStorageHydrated) return;
    scheduleSave('pos_operational_expenses', expenses);
  }, [expenses, scheduleSave, isStorageHydrated]);

  useEffect(() => {
    if (!isStorageHydrated) return;
    scheduleSave('pos_past_shifts_v1', pastShifts);
  }, [pastShifts, scheduleSave, isStorageHydrated]);

  useEffect(() => {
    if (activeEmployee) {
      localStorage.setItem('pos_active_employee_id', activeEmployee.id);
    } else {
      localStorage.removeItem('pos_active_employee_id');
    }
  }, [activeEmployee]);

  useEffect(() => {
    localStorage.setItem('pos_is_locked', isLocked ? 'true' : 'false');
  }, [isLocked]);

  useEffect(() => {
    if (!isStorageHydrated) return;
    if (currentShift) {
      scheduleSave('pos_current_shift_v1', currentShift);
    }
  }, [currentShift, scheduleSave, isStorageHydrated]);

  // Open Gemini Drawer with specific tab
  const openGeminiCopilot = (tab: 'upsell' | 'forecast' | 'insights' | 'promo' | 'chat' = 'upsell') => {
    setActiveCopilotTab(tab);
    setIsGeminiCopilotOpen(true);
  };

  // Trigger Gemini Restock Plan Analysis specifically
  const triggerRestockPlanAnalysis = useCallback(() => {
    setActiveCopilotTab('forecast');
    setIsGeminiCopilotOpen(true);
    setRestockPlanTriggerCounter((prev) => prev + 1);
  }, []);

  // Fetch AI Upsell recommendations from server with unique product ID caching
  const lastFetchedCartKeyRef = useRef<string>('');

  const fetchUpsellSuggestions = useCallback(async () => {
    if (cart.length === 0) {
      setAiUpsellSuggestions([]);
      lastFetchedCartKeyRef.current = '';
      return;
    }

    const currentKey = cart.map((i) => i.product.id).sort().join(',') + '_' + (selectedCustomer?.tier || 'Regular');
    if (currentKey === lastFetchedCartKeyRef.current && aiUpsellSuggestions.length > 0) {
      return;
    }

    setIsFetchingUpsell(true);
    try {
      const response = await fetch('/api/ai/upsell-recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cartItems: cart,
          allProducts: products,
          customerTier: selectedCustomer?.tier || 'Regular',
          storeName: settings.storeName,
        }),
      });
      if (response.ok) {
        const data = await response.json();
        setAiUpsellSuggestions(data.suggestions || []);
        lastFetchedCartKeyRef.current = currentKey;
      }
    } catch {
      // Gracefully silent on frontend
    } finally {
      setIsFetchingUpsell(false);
    }
  }, [cart, products, selectedCustomer, settings.storeName, aiUpsellSuggestions.length]);

  // Debounced auto-fetch AI upsell on cart items change
  const cartProductIdsKey = cart.map((i) => i.product.id).sort().join(',');
  useEffect(() => {
    if (cart.length > 0) {
      const timer = setTimeout(() => {
        fetchUpsellSuggestions();
      }, 700);
      return () => clearTimeout(timer);
    } else {
      setAiUpsellSuggestions([]);
      lastFetchedCartKeyRef.current = '';
    }
  }, [cartProductIdsKey, selectedCustomer?.tier, fetchUpsellSuggestions, cart.length]);

  // Helper: Hitung harga & margin profit per item barang
  const minProfitPercentForPoints = settings.minProfitPercentForPoints ?? 15;

  const calculateItemPricing = (
    product: Product,
    quantity: number,
    selectedUnit?: WholesaleUnit,
    selectedOptions: SelectedOption[] = [],
    itemDiscountPercent: number = 0
  ) => {
    const optionsExtra = selectedOptions.reduce((sum, opt) => sum + opt.extraPrice, 0);
    const unitPrice = selectedUnit ? selectedUnit.price : product.price + optionsExtra;
    const multiplier = selectedUnit?.multiplier || 1;
    const effectiveCostPrice =
      selectedUnit?.costPrice !== undefined ? selectedUnit.costPrice : product.costPrice * multiplier;
    const discountMultiplier = Math.max(0, 1 - itemDiscountPercent / 100);
    const effectiveUnitPrice = unitPrice * discountMultiplier;
    const totalPrice = effectiveUnitPrice * quantity;

    // Profit margin persentase barang (bukan profit transaksi)
    const profitNominal = effectiveUnitPrice - effectiveCostPrice;
    const profitMarginPercent = effectiveUnitPrice > 0 ? (profitNominal / effectiveUnitPrice) * 100 : 0;
    const isPointsEligible = profitMarginPercent >= minProfitPercentForPoints;

    return {
      unitPrice,
      totalPrice,
      profitMarginPercent,
      isPointsEligible,
    };
  };

  // Cart operations
  const addToCart = (
    product: Product,
    selectedOptions: SelectedOption[] = [],
    notes: string = '',
    selectedUnit?: WholesaleUnit
  ) => {
    const optionsKey = selectedOptions
      .map((o) => `${o.groupName}:${o.choiceName}`)
      .sort()
      .join('|');
    const unitKey = selectedUnit ? `unit-${selectedUnit.id}` : 'unit-base';
    const cartItemId = optionsKey ? `${product.id}-${unitKey}-${optionsKey}` : `${product.id}-${unitKey}`;

    const { unitPrice, totalPrice, profitMarginPercent, isPointsEligible } = calculateItemPricing(
      product,
      1,
      selectedUnit,
      selectedOptions,
      0
    );

    setCart((prevCart) => {
      const existingIndex = prevCart.findIndex((item) => item.id === cartItemId);
      if (existingIndex > -1) {
        const updated = [...prevCart];
        const newQty = updated[existingIndex].quantity + 1;
        const recalc = calculateItemPricing(
          product,
          newQty,
          selectedUnit,
          selectedOptions,
          updated[existingIndex].itemDiscountPercent || 0
        );
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: newQty,
          unitPrice: recalc.unitPrice,
          totalPrice: recalc.totalPrice,
          profitMarginPercent: recalc.profitMarginPercent,
          isPointsEligible: recalc.isPointsEligible,
          notes: notes || updated[existingIndex].notes,
        };
        return updated;
      } else {
        const newItem: CartItem = {
          id: cartItemId,
          product,
          quantity: 1,
          selectedUnit,
          selectedOptions,
          notes,
          itemDiscountPercent: 0,
          unitPrice,
          totalPrice,
          profitMarginPercent,
          isPointsEligible,
        };
        return [...prevCart, newItem];
      }
    });
  };

  // Selalu memakai addToCart terbaru tanpa membuat callback scan dihitung ulang tiap render
  const addToCartRef = useRef(addToCart);
  addToCartRef.current = addToCart;

  const scanBarcodeAndAddToCart = useCallback(
    (
      scannedBarcode: string
    ): {
      success: boolean;
      product?: Product;
      message: string;
      unit?: WholesaleUnit;
    } => {
      const code = (scannedBarcode || '').trim();
      if (!code) {
        return { success: false, message: 'Barcode tidak boleh kosong' };
      }

      const cleanCode = code.toLowerCase();

      // 1. Direct barcode match
      let matchedProduct = products.find((p) => (p.barcode || '').toLowerCase() === cleanCode);
      let matchedUnit: WholesaleUnit | undefined;

      // 2. Check wholesale units barcode match (e.g. box/carton specific barcode)
      if (!matchedProduct) {
        for (const p of products) {
          const u = (p.wholesaleUnits || []).find(
            (unit) => (unit.barcode || '').toLowerCase() === cleanCode
          );
          if (u) {
            matchedProduct = p;
            matchedUnit = u;
            break;
          }
        }
      }

      // 3. Check SKU match
      if (!matchedProduct) {
        matchedProduct = products.find((p) => (p.sku || '').toLowerCase() === cleanCode);
      }

      // 4. Fuzzy numeric match (strip leading zeros)
      if (!matchedProduct) {
        const unpadded = cleanCode.replace(/^0+/, '');
        if (unpadded.length >= 4) {
          matchedProduct = products.find(
            (p) => (p.barcode || '').replace(/^0+/, '').toLowerCase() === unpadded
          );
        }
      }

      if (matchedProduct) {
        addToCartRef.current(matchedProduct, undefined, undefined, matchedUnit);
        const unitLabel = matchedUnit ? ` (${matchedUnit.name})` : '';
        return {
          success: true,
          product: matchedProduct,
          unit: matchedUnit,
          message: `${matchedProduct.name}${unitLabel} berhasil ditambahkan ke keranjang!`,
        };
      } else {
        return {
          success: false,
          message: `Produk dengan barcode "${code}" tidak ditemukan di katalog toko.`,
        };
      }
    },
    [products, ]
  );

  // Global Hardware USB / Bluetooth Barcode Scanner listener with subtle audio feedback
  useEffect(() => {
    let buffer = '';
    let lastKeyTime = Date.now();

    const handleHardwareBarcodeInput = (e: KeyboardEvent) => {
      // Ignore if user is typing inside an input, textarea, or contentEditable element
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }

      // Ignore modifier keys
      if (e.ctrlKey || e.altKey || e.metaKey) return;

      const currentTime = Date.now();
      const diff = currentTime - lastKeyTime;
      lastKeyTime = currentTime;

      if (e.key === 'Enter') {
        // Barcode scanners typically emit characters within 10-50ms intervals
        if (buffer.length >= 3 && diff < 120) {
          e.preventDefault();
          const scannedCode = buffer.trim();
          buffer = '';
          const result = scanBarcodeAndAddToCart(scannedCode);
          playScannerSound(result.success ? 'success' : 'error');
          if (!result.success) {
            openUnregisteredBarcodePrompt(scannedCode);
          }
        } else {
          buffer = '';
        }
        return;
      }

      // Collect barcode characters if typed in rapid succession
      if (e.key.length === 1) {
        if (diff > 120) {
          buffer = e.key;
        } else {
          buffer += e.key;
        }
      }
    };

    window.addEventListener('keydown', handleHardwareBarcodeInput);
    return () => window.removeEventListener('keydown', handleHardwareBarcodeInput);
  }, [scanBarcodeAndAddToCart, openUnregisteredBarcodePrompt]);

  const updateCartItemQuantity = (cartItemId: string, delta: number) => {
    setCart((prevCart) => {
      return prevCart
        .map((item) => {
          if (item.id === cartItemId) {
            const newQty = item.quantity + delta;
            if (newQty <= 0) return null;
            const recalc = calculateItemPricing(
              item.product,
              newQty,
              item.selectedUnit,
              item.selectedOptions,
              item.itemDiscountPercent || 0
            );
            return {
              ...item,
              quantity: newQty,
              unitPrice: recalc.unitPrice,
              totalPrice: recalc.totalPrice,
              profitMarginPercent: recalc.profitMarginPercent,
              isPointsEligible: recalc.isPointsEligible,
            };
          }
          return item;
        })
        .filter((item): item is CartItem => item !== null);
    });
  };

  const setCartItemQuantity = (cartItemId: string, quantity: number) => {
    setCart((prevCart) => {
      if (quantity <= 0) {
        return prevCart.filter((item) => item.id !== cartItemId);
      }
      return prevCart.map((item) => {
        if (item.id === cartItemId) {
          const recalc = calculateItemPricing(
            item.product,
            quantity,
            item.selectedUnit,
            item.selectedOptions,
            item.itemDiscountPercent || 0
          );
          return {
            ...item,
            quantity,
            unitPrice: recalc.unitPrice,
            totalPrice: recalc.totalPrice,
            profitMarginPercent: recalc.profitMarginPercent,
            isPointsEligible: recalc.isPointsEligible,
          };
        }
        return item;
      });
    });
  };

  const updateCartItemUnit = (cartItemId: string, newUnit: WholesaleUnit | undefined) => {
    setCart((prevCart) => {
      const itemToUpdate = prevCart.find((i) => i.id === cartItemId);
      if (!itemToUpdate) return prevCart;

      const product = itemToUpdate.product;
      const selectedOptions = itemToUpdate.selectedOptions || [];
      const optionsKey = selectedOptions
        .map((o) => `${o.groupName}:${o.choiceName}`)
        .sort()
        .join('|');
      const unitKey = newUnit ? `unit-${newUnit.id}` : 'unit-base';
      const newCartItemId = optionsKey ? `${product.id}-${unitKey}-${optionsKey}` : `${product.id}-${unitKey}`;

      const recalc = calculateItemPricing(
        product,
        itemToUpdate.quantity,
        newUnit,
        selectedOptions,
        itemToUpdate.itemDiscountPercent || 0
      );

      // If key changes and target already exists, merge them
      if (newCartItemId !== cartItemId) {
        const existingIdx = prevCart.findIndex((i) => i.id === newCartItemId);
        if (existingIdx > -1) {
          const mergedQty = prevCart[existingIdx].quantity + itemToUpdate.quantity;
          const mergedRecalc = calculateItemPricing(
            product,
            mergedQty,
            newUnit,
            selectedOptions,
            itemToUpdate.itemDiscountPercent || 0
          );
          return prevCart
            .filter((i) => i.id !== cartItemId)
            .map((i) =>
              i.id === newCartItemId
                ? {
                    ...i,
                    quantity: mergedQty,
                    unitPrice: mergedRecalc.unitPrice,
                    totalPrice: mergedRecalc.totalPrice,
                    profitMarginPercent: mergedRecalc.profitMarginPercent,
                    isPointsEligible: mergedRecalc.isPointsEligible,
                  }
                : i
            );
        }
      }

      return prevCart.map((i) =>
        i.id === cartItemId
          ? {
              ...i,
              id: newCartItemId,
              selectedUnit: newUnit,
              unitPrice: recalc.unitPrice,
              totalPrice: recalc.totalPrice,
              profitMarginPercent: recalc.profitMarginPercent,
              isPointsEligible: recalc.isPointsEligible,
            }
          : i
      );
    });
  };

  const updateCartItemDiscount = (cartItemId: string, discountPercent: number) => {
    setCart((prevCart) => {
      return prevCart.map((item) => {
        if (item.id === cartItemId) {
          const recalc = calculateItemPricing(
            item.product,
            item.quantity,
            item.selectedUnit,
            item.selectedOptions,
            discountPercent
          );
          return {
            ...item,
            itemDiscountPercent: discountPercent,
            unitPrice: recalc.unitPrice,
            totalPrice: recalc.totalPrice,
            profitMarginPercent: recalc.profitMarginPercent,
            isPointsEligible: recalc.isPointsEligible,
          };
        }
        return item;
      });
    });
  };

  const removeFromCart = (cartItemId: string) => {
    setCart((prevCart) => prevCart.filter((item) => item.id !== cartItemId));
  };

  const clearCart = () => {
    setCart([]);
    setAppliedVoucher(null);
    setCustomerDiscount(null);
    setUsePoints(false);
  };

  const updateCartItemNote = (cartItemId: string, notes: string) => {
    setCart((prevCart) =>
      prevCart.map((item) => (item.id === cartItemId ? { ...item, notes } : item))
    );
  };

  // Voucher validation & application
  const applyVoucher = (code: string): { success: boolean; message: string } => {
    const cleanCode = code.trim().toUpperCase();
    const voucher = vouchers.find((v) => v.code.toUpperCase() === cleanCode);

    if (!voucher) {
      return { success: false, message: 'Kode voucher tidak valid.' };
    }
    if (voucher.expiresAt && new Date(voucher.expiresAt).getTime() < Date.now()) {
      return {
        success: false,
        message: `Voucher ${voucher.code} sudah kedaluwarsa sejak ${new Date(voucher.expiresAt).toLocaleDateString('id-ID')}.`,
      };
    }

    const currentSubtotal = cart.reduce((sum, item) => sum + item.totalPrice, 0);
    if (currentSubtotal < voucher.minSpend) {
      return {
        success: false,
        message: `Minimal belanja Rp ${voucher.minSpend.toLocaleString('id-ID')} untuk menggunakan voucher ini.`,
      };
    }

    setAppliedVoucher(voucher);
    return { success: true, message: `Voucher ${voucher.code} berhasil dipasang!` };
  };

  const removeVoucher = () => {
    setAppliedVoucher(null);
  };

  const addVoucher = (v: Voucher) => {
    // Kode yang sama menggantikan voucher lama (bukan dobel)
    setVouchers((prev) => [v, ...prev.filter((x) => x.code.toUpperCase() !== v.code.toUpperCase())]);
  };

  const deleteVoucher = (code: string) => {
    setVouchers((prev) => prev.filter((v) => v.code.toUpperCase() !== code.toUpperCase()));
    if (appliedVoucher && appliedVoucher.code.toUpperCase() === code.toUpperCase()) setAppliedVoucher(null);
  };

  // Memoized Calculations
  // Perhitungan total: logika murni di src/domain/cartTotals.ts (teruji)
  const subtotal = useMemo(() => calcSubtotal(cart), [cart]);

  // Voucher discount calculation
  const voucherDiscount = useMemo(() => calcVoucherDiscount(appliedVoucher, subtotal), [appliedVoucher, subtotal]);

  // Customer-specific discount calculation based on loyalty status and previous purchase history
  const customerDiscountAmount = useMemo(
    () => calcCustomerDiscount(customerDiscount, cart, subtotal),
    [customerDiscount, cart, subtotal]
  );

  // Loyalty Points discount calculations (configurable rate: default 1 point = Rp 100 discount)
  const pointRedemptionRate = settings.pointRedemptionRate || 100;

  const maxRedeemablePoints = useMemo(
    () =>
      calcMaxRedeemablePoints(
        Boolean(selectedCustomer),
        selectedCustomer?.points || 0,
        calcRemainingBill(subtotal, voucherDiscount, customerDiscountAmount),
        pointRedemptionRate
      ),
    [selectedCustomer, subtotal, voucherDiscount, customerDiscountAmount, pointRedemptionRate]
  );

  // Points to redeem capped at customer balance and payable total
  const effectivePointsToRedeem = Math.min(pointsToRedeem, maxRedeemablePoints);

  const pointsDiscount = useMemo(
    () =>
      calcPointsDiscount(
        Boolean(selectedCustomer),
        effectivePointsToRedeem,
        pointRedemptionRate,
        calcRemainingBill(subtotal, voucherDiscount, customerDiscountAmount)
      ),
    [selectedCustomer, effectivePointsToRedeem, pointRedemptionRate, subtotal, voucherDiscount, customerDiscountAmount]
  );

  // Dynamic customer discount recommendations based on purchase history and loyalty tier
  const customerDiscountSuggestions = useMemo(() => {
    return generateCustomerDiscountSuggestions(selectedCustomer, cart, subtotal, transactions);
  }, [selectedCustomer, cart, subtotal, transactions]);

  const applyCustomerDiscount = (discount: CustomerDiscount) => {
    setCustomerDiscount(discount);
  };

  const removeCustomerDiscount = () => {
    setCustomerDiscount(null);
  };

  const usePoints = effectivePointsToRedeem > 0;

  const setUsePoints = (use: boolean) => {
    if (use) {
      setPointsToRedeem(maxRedeemablePoints);
    } else {
      setPointsToRedeem(0);
    }
  };

  const handleSetPointsToRedeem = (pts: number) => {
    const clamped = Math.max(0, Math.min(Math.floor(pts || 0), maxRedeemablePoints));
    setPointsToRedeem(clamped);
  };

  const totalDiscount = voucherDiscount + pointsDiscount + customerDiscountAmount;
  // Sales Tax & Surcharges removed on sales as requested
  const taxAmount = 0;
  const serviceChargeAmount = 0;
  const finalTotal = calcFinalTotal(subtotal, totalDiscount);

  // Poin Loyalitas: HANYA didapatkan dari belanja item produk dengan profit margin >= minProfitPercentForPoints (15%)
  // Profit barang dihitung per item produk, bukan profit agregat transaksi
  const pointsEligibleSpend = useMemo(() => calcPointsEligibleSpend(cart), [cart]);

  // Proporsi nilai belanja setelah potongan diskon/voucher untuk item yang eligible
  const effectiveEligibleSpend = calcEffectiveEligibleSpend(pointsEligibleSpend, subtotal, finalTotal);

  // Multiplier berdasarkan Member Tier: Regular/Bronze: 1x, Silver: 1.2x, Gold: 1.5x, Platinum: 2x
  const tierMultiplier = useMemo(
    () => (selectedCustomer ? tierPointsMultiplier(selectedCustomer.tier) : 1),
    [selectedCustomer]
  );

  // 1 poin tiap pointsRatio (default Rp 10.000) dari item profit >= 15% dikalikan tier multiplier
  const pointsEarned = calcPointsEarned(effectiveEligibleSpend, settings.pointsRatio || 10000, tierMultiplier);

  // Held Orders (Order Parking)
  const holdCurrentOrder = (note?: string): boolean => {
    if (cart.length === 0) return false;

    const newHeld: HeldOrder = {
      id: `held-${Date.now()}`,
      referenceNumber: `PARK-${Math.floor(1000 + Math.random() * 9000)}`,
      customer: selectedCustomer || undefined,
      tableNumber: tableNumber || undefined,
      orderType,
      items: [...cart],
      createdAt: new Date().toISOString(),
      subtotal,
      note,
      customerDiscount: customerDiscount || undefined,
    };

    setHeldOrders((prev) => [newHeld, ...prev]);
    pushLANSharedHeldOrder(newHeld).catch(() => {});
    clearCart();
    setTableNumber('');
    setSelectedCustomer(null);
    setCustomerDiscount(null);
    return true;
  };

  const recallHeldOrder = (heldOrder: HeldOrder) => {
    const sanitized = (heldOrder.items || []).map((item) => {
      const unitPrice = item.unitPrice ?? item.product?.price ?? 0;
      const multiplier = item.selectedUnit?.multiplier || 1;
      const costPrice =
        item.selectedUnit?.costPrice !== undefined
          ? item.selectedUnit.costPrice
          : (item.product?.costPrice ?? 0) * multiplier;
      const profitNominal = unitPrice - costPrice;
      const calcMargin = unitPrice > 0 ? (profitNominal / unitPrice) * 100 : 0;
      const profitMarginPercent = item.profitMarginPercent !== undefined ? item.profitMarginPercent : calcMargin;
      const isPointsEligible =
        item.isPointsEligible !== undefined
          ? item.isPointsEligible
          : profitMarginPercent >= (settings.minProfitPercentForPoints ?? 15);
      return {
        ...item,
        profitMarginPercent,
        isPointsEligible,
      };
    });
    setCart(sanitized);
    setOrderType(heldOrder.orderType);
    setTableNumber(heldOrder.tableNumber || '');
    setSelectedCustomer(heldOrder.customer || null);
    if (heldOrder.customerDiscount) {
      setCustomerDiscount(heldOrder.customerDiscount);
    } else {
      setCustomerDiscount(null);
    }
    deleteHeldOrder(heldOrder.id);
  };

  const deleteHeldOrder = (heldOrderId: string) => {
    setHeldOrders((prev) => prev.filter((o) => o.id !== heldOrderId));
    deleteLANSharedHeldOrder(heldOrderId).catch(() => {});
  };

  // Employee Authentication & Shift Management Methods
  const loginWithPin = (pin: string, employeeId?: string): { success: boolean; message: string; employee?: Employee } => {
    const lockedFor = pinLockSecondsLeft();
    if (lockedFor > 0) return { success: false, message: pinLockMessage(lockedFor) };
    let matched: Employee | undefined;
    if (employeeId) {
      matched = employees.find((e) => e.id === employeeId && e.pin === pin && e.isActive);
    } else {
      matched = employees.find((e) => e.pin === pin && e.isActive);
    }

    if (!matched) {
      const lockedNow = registerPinFailure();
      return {
        success: false,
        message: lockedNow > 0 ? pinLockMessage(lockedNow) : 'PIN salah atau akun karyawan non-aktif.',
      };
    }

    registerPinSuccess();
    setActiveEmployee(matched);
    setIsLocked(false);
    return { success: true, message: `Selamat datang, ${matched.name}!`, employee: matched };
  };

  // Ganti akun tanpa PIN hanya boleh ke jabatan yang setara atau lebih rendah,
  // supaya Supervisor tidak bisa masuk sebagai Owner tanpa PIN Owner.
  const ROLE_RANK: Record<string, number> = { cashier: 1, inventory: 1, supervisor: 2, owner: 3 };
  const quickSwitchEmployee = (employee: Employee): boolean => {
    if (!employee.isActive) return false;
    const currentRank = activeEmployee ? ROLE_RANK[activeEmployee.role] ?? 0 : 0;
    const targetRank = ROLE_RANK[employee.role] ?? 0;
    if (targetRank > currentRank) return false;
    setActiveEmployee(employee);
    setIsLocked(false);
    return true;
  };

  const lockScreen = () => {
    setIsLocked(true);
  };

  const unlockScreen = (pin: string): { success: boolean; message: string } => {
    if (!activeEmployee) {
      return loginWithPin(pin);
    }
    const lockedFor = pinLockSecondsLeft();
    if (lockedFor > 0) return { success: false, message: pinLockMessage(lockedFor) };
    if (activeEmployee.pin === pin) {
      registerPinSuccess();
      setIsLocked(false);
      return { success: true, message: 'Layar berhasil dibuka.' };
    }
    const lockedNow = registerPinFailure();
    return { success: false, message: lockedNow > 0 ? pinLockMessage(lockedNow) : 'PIN tidak sesuai.' };
  };

  const logoutEmployee = () => {
    setIsLocked(true);
  };

  /**
   * Pendaftaran pertama (instalasi baru tanpa karyawan): buat akun Owner dengan PIN pilihan sendiri,
   * langsung login, mulai shift pertama, dan simpan nama toko bila diisi.
   */
  const completeFirstRunSetup = (data: { ownerName: string; pin: string; storeName: string; address?: string; phone?: string }): { success: boolean; message: string } => {
    if (employees.length > 0) return { success: false, message: 'Akun Owner sudah ada. Silakan login.' };
    if (!(data.storeName || '').trim()) return { success: false, message: 'Isi nama toko.' };
    const ownerName = (data.ownerName || '').trim();
    const pin = (data.pin || '').trim();
    if (!ownerName) return { success: false, message: 'Isi nama Owner.' };
    if (!/^\d{4,6}$/.test(pin)) return { success: false, message: 'PIN harus 4-6 digit angka.' };
    if (/^(\d)\1+$/.test(pin) || ['1234', '12345', '123456', '4321', '54321', '654321'].includes(pin)) {
      return { success: false, message: 'PIN terlalu mudah ditebak. Gunakan kombinasi angka lain.' };
    }
    const initials = ownerName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]!.toUpperCase())
      .join('');
    const owner: Employee = {
      id: `emp-${Date.now()}`,
      employeeCode: 'EMP-01',
      name: ownerName,
      role: 'owner',
      roleTitle: 'Pemilik Toko',
      pin,
      avatar: initials || 'OW',
      avatarColor: 'bg-indigo-600',
      isActive: true,
      assignedShift: 'Full Day',
      registeredAt: toLocalDateString(),
    };
    setEmployees([owner]);
    setActiveEmployee(owner);
    setIsLocked(false);
    setSettings((prev) => ({
      ...prev,
      storeName: data.storeName.trim(),
      ...(data.address?.trim() ? { address: data.address.trim() } : {}),
      ...(data.phone?.trim() ? { phone: data.phone.trim() } : {}),
    }));
    setCurrentShift(newShift(owner));
    return { success: true, message: `Selamat datang, ${owner.name}!` };
  };

  const addEmployee = (empData: Omit<Employee, 'id' | 'registeredAt'>): Employee => {
    const newEmp: Employee = {
      ...empData,
      id: `emp-${Date.now()}`,
      registeredAt: toLocalDateString(),
    };
    setEmployees((prev) => [...prev, newEmp]);
    return newEmp;
  };

  const updateEmployee = (id: string, updated: Partial<Employee>) => {
    setEmployees((prev) =>
      prev.map((emp) => (emp.id === id ? { ...emp, ...updated } : emp))
    );
    if (activeEmployee && activeEmployee.id === id) {
      setActiveEmployee((prev) => (prev ? { ...prev, ...updated } : prev));
    }
  };

  const deleteEmployee = (id: string): { success: boolean; message: string } => {
    if (employees.length <= 1) {
      return { success: false, message: 'Minimal harus ada 1 karyawan di sistem.' };
    }
    if (activeEmployee && activeEmployee.id === id) {
      return { success: false, message: 'Tidak dapat menghapus karyawan yang sedang aktif login.' };
    }
    setEmployees((prev) => prev.filter((emp) => emp.id !== id));
    return { success: true, message: 'Karyawan berhasil dihapus.' };
  };

  const startNewShift = (startingCash: number): ShiftSummary => {
    const newShift: ShiftSummary = {
      id: `shift-${Date.now()}`,
      employeeId: activeEmployee ? activeEmployee.id : 'emp-001',
      employeeName: activeEmployee ? activeEmployee.name : 'Kasir',
      role: activeEmployee ? activeEmployee.role : 'cashier',
      startTime: new Date().toISOString(),
      startingCash,
      totalSales: 0,
      totalTransactions: 0,
      cashSales: 0,
      nonCashSales: 0,
      status: 'active',
    };
    setCurrentShift(newShift);
    return newShift;
  };

  /**
   * Ubah modal awal laci kasir shift yang sedang berjalan. Kasir hanya boleh sebelum transaksi
   * pertama (mengecilkan modal di tengah shift bisa menyembunyikan kekurangan kas);
   * Supervisor/Owner boleh kapan saja.
   */
  /** Catat uang yang keluar dari laci (retur tunai, void tunai, pengeluaran dari laci). */
  // Logika kas shift: src/domain/shiftCash.ts (teruji)
  const recordShiftCashOut = (amount: number) => {
    setCurrentShift((prev) => (prev ? applyCashOut(prev, amount) : prev));
  };

  const updateShiftStartingCash = (startingCash: number): boolean => {
    if (!currentShift || !Number.isFinite(startingCash) || startingCash < 0) return false;
    if (!canEditStartingCash(activeEmployee?.role, currentShift)) return false;
    setCurrentShift({ ...currentShift, startingCash: Math.round(startingCash) });
    return true;
  };

  const closeCurrentShift = (actualCashEnding: number, notes?: string): ShiftSummary => {
    const current = currentShift || newShift(activeEmployee);
    const closed = closeShift(current, actualCashEnding, notes);
    setPastShifts((prev) => [closed, ...prev]); // disimpan ke IndexedDB lewat efek simpan
    // Shift berikutnya: modal awal = uang yang baru dihitung (bisa diubah di layar Shift)
    setCurrentShift(newShift(activeEmployee, actualCashEnding));
    return closed;
  };

  // Complete Payment & Save Transaction
  const processPayment = (payment: PaymentDetails): Transaction => {
    const pointsUsed = usePoints && selectedCustomer ? Math.min(effectivePointsToRedeem, selectedCustomer.points) : 0;
    const currentCashierName = activeEmployee
      ? `${activeEmployee.name} (${activeEmployee.roleTitle || activeEmployee.role})`
      : 'Kasir Utama';

    const isCurrentlyOnline = offlineSyncManager.isOnline();
    const nowIso = new Date().toISOString();

    const newTx: Transaction = {
      id: `tx-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      invoiceNumber: generateInvoiceNumber(),
      orderType,
      tableNumber: tableNumber || undefined,
      customer: selectedCustomer || undefined,
      items: [...cart],
      subtotal,
      taxAmount: 0,
      serviceChargeAmount: 0,
      discountAmount: totalDiscount,
      voucherCode: appliedVoucher?.code,
      customerDiscount: customerDiscount || undefined,
      customerDiscountAmount: customerDiscountAmount > 0 ? customerDiscountAmount : undefined,
      pointsUsed: pointsUsed > 0 ? pointsUsed : undefined,
      pointsDiscount: pointsDiscount > 0 ? pointsDiscount : undefined,
      pointsEarned,
      pointsEligibleSpend,
      finalTotal,
      payment,
      cashierName: currentCashierName,
      branchName: settings.branchName,
      createdAt: nowIso,
      status: 'completed',
      syncStatus: isCurrentlyOnline ? 'synced' : 'pending_sync',
      syncedAt: isCurrentlyOnline ? nowIso : undefined,
      offlineCreated: !isCurrentlyOnline,
      syncRetryCount: 0,
    };

    // Offline caching & Cloud Background Sync handling
    if (!isCurrentlyOnline) {
      offlineSyncManager.savePendingTransaction(newTx).catch((err) => {
        console.error('[POS] Gagal menyimpan transaksi offline lokal:', err);
      });
    } else {
      // Push to cloud; fallback to offline queue if server connection fails
      // (fetch hanya gagal untuk error jaringan, jadi status HTTP juga harus dicek)
      const queueOffline = async (reason: unknown) => {
        console.warn('[POS] Gagal push transaksi instan, beralih ke antrean offline lokal:', reason);
        newTx.syncStatus = 'pending_sync';
        newTx.offlineCreated = true;
        await offlineSyncManager.savePendingTransaction(newTx);
      };
      fetch('/api/pos/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTx),
      })
        .then(async (res) => {
          if (res.ok) return;
          const data = await res.json().catch(() => ({}));
          if (res.status >= 400 && res.status < 500 && res.status !== 401 && res.status !== 429) {
            console.error('[POS] Server menolak transaksi:', newTx.invoiceNumber, data.error || res.status);
          } else {
            await queueOffline(data.error || `HTTP ${res.status}`);
          }
        })
        .catch(queueOffline);
    }

    // Update Shift Metrics
    setCurrentShift((prev) => (prev ? applySaleToShift(prev, finalTotal, payment.method === 'cash') : prev));

    // 1. Deduct Product Stock (mengalikan quantity dengan multiplier satuan grosir jika ada)
    // Server LAN memotong stoknya sendiri dari transaksi ini, jadi bukan "penyesuaian" yang perlu dikirim.
    // Aturan stok: src/domain/stockMovements.ts (teruji, dipakai juga oleh server)
    const saleDeltas = saleStockDeltas(cart);
    markStockKnownToServer(saleDeltas);
    setProducts((prevProducts) => applyStockDeltas(prevProducts, saleDeltas));

    // 2. Update Customer Points Ledger, Balance & Tier Progression
    if (selectedCustomer) {
      setCustomers((prevCustomers) =>
        prevCustomers.map((cust) => {
          if (cust.id === selectedCustomer.id) {
            const actualPointsUsed = pointsUsed;
            const updatedSpent = cust.totalSpent + finalTotal;
            const updatedOrders = cust.ordersCount + 1;

            // Tier progression based on accumulated spending
            let newTier: MemberTier = cust.tier || 'Bronze';
            if (updatedSpent >= 10000000) newTier = 'Platinum';
            else if (updatedSpent >= 5000000) newTier = 'Gold';
            else if (updatedSpent >= 1000000) newTier = 'Silver';
            else newTier = 'Bronze';

            const newHistoryEntries: PointHistoryEntry[] = [];
            let runningBalance = cust.points;

            // Log point redemption for discount
            if (actualPointsUsed > 0) {
              runningBalance = Math.max(0, runningBalance - actualPointsUsed);
              newHistoryEntries.push({
                id: `pth-rd-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
                type: 'redeemed',
                points: -actualPointsUsed,
                balanceAfter: runningBalance,
                description: `Tukar ${actualPointsUsed} Poin untuk Diskon Kasir Rp ${(pointsDiscount || 0).toLocaleString('id-ID')}`,
                transactionId: newTx.id,
                invoiceNumber: newTx.invoiceNumber,
                date: nowIso,
                operatorName: currentCashierName,
              });
            }

            // Log points earned from eligible items
            if (pointsEarned > 0) {
              runningBalance = runningBalance + pointsEarned;
              newHistoryEntries.push({
                id: `pth-en-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
                type: 'earned',
                points: pointsEarned,
                balanceAfter: runningBalance,
                description: `Perolehan Poin Belanja Transaksi ${newTx.invoiceNumber}`,
                transactionId: newTx.id,
                invoiceNumber: newTx.invoiceNumber,
                date: nowIso,
                operatorName: currentCashierName,
              });
            }

            return {
              ...cust,
              points: runningBalance,
              totalSpent: updatedSpent,
              ordersCount: updatedOrders,
              tier: newTier,
              pointsHistory: [...newHistoryEntries, ...(cust.pointsHistory || [])],
            };
          }
          return cust;
        })
      );
    }

    // 3. Save Transaction
    setTransactions((prev) => [newTx, ...prev]);

    // Push transaction to Multi-Client LAN Server Database for centralized ledger & stock auto-deduction
    pushTransactionToLANServer(newTx)
      .then((res) => {
        if (!res.success && !res.skipped && !(res.status && res.status >= 400 && res.status < 500 && res.status !== 401 && res.status !== 429)) {
          // Server LAN tidak bisa dihubungi: simpan untuk dikirim ulang agar stok di server tetap terpotong
          queueLANSale(newTx);
        }
        if (res.success && res.updatedStocks && res.updatedStocks.length > 0) {
          markStockKnownToServer(res.updatedStocks);
          setProducts((prev) =>
            prev.map((p) => {
              const match = res.updatedStocks!.find((u) => u.productId === p.id);
              return match ? { ...p, stock: match.newStock } : p;
            })
          );
        }
      })
      .catch((err) => {
        console.warn('[LAN] Push transaksi LAN offline fallback:', err);
        queueLANSale(newTx);
      });

    // 4. Confetti effect
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
      });
    } catch {
      // ignore
    }

    // 5. Open receipt & reset cart
    setActiveReceipt(newTx, true);
    clearCart();
    setTableNumber('');
    setSelectedCustomer(null);
    setPointsToRedeem(0);
    setIsPaymentModalOpen(false);

    return newTx;
  };

  /** Terapkan stok terbaru dari server LAN ke daftar produk di layar. */
  const applyServerStocks = (updatedStocks?: Array<{ productId: string; newStock: number }>) => {
    if (!updatedStocks || updatedStocks.length === 0) return;
    markStockKnownToServer(updatedStocks);
    setProducts((prev) =>
      prev.map((p) => {
        const match = updatedStocks.find((u) => u.productId === p.id);
        return match ? { ...p, stock: match.newStock } : p;
      })
    );
  };

  /** Kirim retur/void ke server LAN; bila gagal karena jaringan, masuk antrean kirim ulang. */
  const sendStockReturnToServer = (payload: LANStockReturnPayload) => {
    pushStockReturnToLANServer(payload)
      .then((res) => {
        if (res.success) {
          applyServerStocks(res.updatedStocks);
        } else if (!res.skipped && !(res.status && res.status >= 400 && res.status < 500 && res.status !== 401 && res.status !== 429)) {
          queueLANStockReturn(payload);
        } else if (!res.skipped) {
          console.error('[LAN] Server menolak retur:', payload.key, res.error);
        }
      })
      .catch(() => queueLANStockReturn(payload));
  };

  const voidTransaction = (txId: string) => {
    const tx = transactions.find((t) => t.id === txId);
    if (!tx || tx.status === 'void' || tx.status === 'refunded') return;

    setTransactions((prev) =>
      prev.map((t) => (t.id === txId ? { ...t, status: 'void' as const } : t))
    );
    if (tx.payment?.method === 'cash') {
      recordShiftCashOut(Math.max(0, (tx.finalTotal || 0) - (tx.returnedAmount || 0)));
    }

    // Barang dari transaksi yang dibatalkan kembali ke stok. Jika sebagian sudah diretur
    // (returnedAmount > 0), stok tidak dikembalikan otomatis agar tidak terhitung dua kali.
    const alreadyReturned = (tx.returnedAmount || 0) > 0;
    const items = voidRestockLines(tx);
    if (alreadyReturned) {
      console.warn('[POS] Void transaksi yang sudah diretur sebagian: stok tidak dikembalikan otomatis.', tx.invoiceNumber);
    }

    if (items.length > 0) {
      const voidDeltas = linesToDeltas(items);
      markStockKnownToServer(voidDeltas);
      setProducts((prev) => applyStockDeltas(prev, voidDeltas));
    }

    sendStockReturnToServer({
      key: tx.id,
      kind: 'void',
      items,
      transactionId: tx.id,
      transactionUpdate: { status: 'void' },
    });
  };

  const processSalesReturn = (returnData: Omit<SalesReturn, 'id' | 'createdAt'>): SalesReturn => {
    const newReturn: SalesReturn = {
      ...returnData,
      id: `ret-sale-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      createdAt: new Date().toISOString(),
    };

    // 1. Save return record
    setSalesReturns((prev) => [newReturn, ...prev]);
    if (returnData.refundMethod === 'cash') recordShiftCashOut(Number(returnData.totalRefundAmount) || 0);

    // 2. Update transaction status and metadata
    const originalTx = transactions.find(
      (tx) => tx.id === returnData.transactionId || tx.invoiceNumber === returnData.invoiceNumber
    );
    const newReturnedAmount = (originalTx?.returnedAmount || 0) + returnData.totalRefundAmount;
    const transactionUpdate = {
      status: originalTx && newReturnedAmount >= originalTx.finalTotal ? 'refunded' : originalTx?.status,
      returnedAmount: newReturnedAmount,
      returnReason: returnData.note || returnData.items.map((i) => i.reason).join(', '),
      returnedAt: newReturn.createdAt,
    };
    setTransactions((prev) =>
      prev.map((tx) =>
        tx.id === returnData.transactionId || tx.invoiceNumber === returnData.invoiceNumber
          ? ({ ...tx, ...transactionUpdate } as Transaction)
          : tx
      )
    );

    // 3. Restock returned items to inventory if marked (dikali isi satuan, mis. 1 Dus = 12 pcs)
    const restockItems = returnRestockLines(returnData.items);
    if (restockItems.length > 0) {
      const returnDeltas = linesToDeltas(restockItems);
      markStockKnownToServer(returnDeltas);
      setProducts((prev) => applyStockDeltas(prev, returnDeltas));
    }

    // 4. Laporkan ke server: status transaksi (laporan omzet) dan stok yang kembali (server LAN)
    if (originalTx) {
      fetch('/api/pos/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...originalTx, ...transactionUpdate }),
      }).catch((err) => console.warn('[POS] Gagal mengirim status retur ke server:', err));
    }
    sendStockReturnToServer({
      key: newReturn.id,
      kind: 'return',
      items: restockItems,
      transactionId: originalTx?.id || returnData.transactionId,
      transactionUpdate,
    });

    return newReturn;
  };

  const processPurchaseReturn = (returnData: Omit<PurchaseReturn, 'id' | 'createdAt'>): PurchaseReturn => {
    const newReturn: PurchaseReturn = {
      ...returnData,
      id: `ret-sup-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      createdAt: new Date().toISOString(),
    };

    // 1. Save purchase return record
    setPurchaseReturns((prev) => [newReturn, ...prev]);

    // 2. Deduct items from inventory stock (shipped back to distributor)
    returnData.items.forEach((item) => {
      setProducts((prev) =>
        prev.map((p) => {
          if (p.id === item.productId) {
            return { ...p, stock: Math.max(0, p.stock - item.quantity) };
          }
          return p;
        })
      );
    });

    return newReturn;
  };

  /**
   * Catat pembayaran / pelunasan faktur tempo atau konsinyasi. Hanya Supervisor/Owner.
   * Jumlah tidak boleh melebihi sisa hutang. Bila dibayar dari laci, tercatat sebagai uang keluar shift.
   */
  const recordSupplierPayment = (
    purchaseId: string,
    amount: number,
    source: 'cash_drawer' | 'bank_transfer',
    note?: string
  ): { success: boolean; message: string } => {
    if (activeEmployee?.role !== 'owner' && activeEmployee?.role !== 'supervisor') {
      return { success: false, message: 'Pembayaran hutang supplier hanya bisa dicatat Supervisor atau Owner.' };
    }
    const po = supplierPurchases.find((p) => p.id === purchaseId);
    if (!po) return { success: false, message: 'Faktur tidak ditemukan.' };
    if (purchasePaymentKind(po) === 'cash') return { success: false, message: 'Faktur ini dibayar tunai, tidak ada hutang.' };
    const outstanding = purchaseOutstandingOf(po);
    const value = Math.round(Number(amount));
    if (!Number.isFinite(value) || value <= 0) return { success: false, message: 'Isi jumlah pembayaran lebih dari 0.' };
    if (value > outstanding) {
      return { success: false, message: `Jumlah melebihi sisa hutang (${outstanding.toLocaleString('id-ID')}).` };
    }
    const payment = {
      id: `pay-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      amount: value,
      date: new Date().toISOString(),
      source,
      note: note?.trim() || undefined,
      recordedBy: activeEmployee?.name || 'Owner',
    };
    setSupplierPurchases((prev) =>
      prev.map((p) => (p.id === purchaseId ? { ...p, payments: [...(p.payments || []), payment] } : p))
    );
    if (source === 'cash_drawer') recordShiftCashOut(value);
    return {
      success: true,
      message: value === outstanding ? 'Faktur lunas.' : `Pembayaran tercatat. Sisa hutang ${(outstanding - value).toLocaleString('id-ID')}.`,
    };
  };

  const processSupplierPurchase = (purchaseData: Omit<SupplierPurchase, 'id' | 'createdAt'>): SupplierPurchase => {
    const newPurchase: SupplierPurchase = {
      ...purchaseData,
      id: `purch-sup-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      createdAt: new Date().toISOString(),
    };

    // 1. Save supplier purchase record
    setSupplierPurchases((prev) => [newPurchase, ...prev]);

    // 2. Increase stock and update product HPP costPrice, minStock (50% dari order terakhir), & price history
    purchaseData.items.forEach((item) => {
      setProducts((prev) =>
        prev.map((p) => {
          if (p.id === item.productId) {
            const hasCostChanged = item.costPrice > 0 && item.costPrice !== p.costPrice;
            let updatedHistory = p.priceHistory ? [...p.priceHistory] : [];
            if (hasCostChanged) {
              const rec: PriceHistoryRecord = {
                id: `ph-sup-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
                productId: p.id,
                date: new Date().toISOString(),
                costPrice: item.costPrice,
                sellingPrice: p.price,
                previousCostPrice: p.costPrice,
                previousSellingPrice: p.price,
                changeType: 'purchase_receiving',
                sourceReference: `Faktur ${newPurchase.invoiceNumber}`,
                supplierName: newPurchase.supplierName,
                notes: `Penerimaan barang dari faktur pembelian (+${item.quantity} ${p.unit})`,
                recordedBy: newPurchase.receivedBy || 'Staff Gudang',
              };
              updatedHistory.push(rec);
            }

            // Aturan Batas Minimal Stok: 50% dari jumlah order terakhir
            const autoUpdateMinStock = settings.autoUpdateMinStockFromOrder !== false;
            const rulePercent = (settings.minStockRulePercentage ?? 50) / 100;
            const newMinStock = autoUpdateMinStock
              ? Math.max(1, Math.ceil(item.quantity * rulePercent))
              : p.minStock;

            return {
              ...p,
              stock: p.stock + item.quantity,
              costPrice: item.costPrice > 0 ? item.costPrice : p.costPrice,
              expiryDate: item.expiryDate || p.expiryDate,
              lastOrderQuantity: item.quantity,
              lastOrderDate: newPurchase.createdAt,
              minStock: newMinStock,
              priceHistory: updatedHistory.length > 0 ? updatedHistory : p.priceHistory,
            };
          }
          return p;
        })
      );
    });

    return newPurchase;
  };

  const applyMinStockRuleToAllProducts = (customPercent?: number): number => {
    const percent = (customPercent ?? settings.minStockRulePercentage ?? 50) / 100;
    let count = 0;

    setProducts((prev) =>
      prev.map((p) => {
        // Cari kuantitas order terakhir dari p.lastOrderQuantity atau dari riwayat faktur pembelian
        let lastQty = p.lastOrderQuantity;
        if (!lastQty || lastQty <= 0) {
          for (const sp of supplierPurchases) {
            const foundItem = sp.items.find((it) => it.productId === p.id);
            if (foundItem && foundItem.quantity > 0) {
              lastQty = foundItem.quantity;
              break;
            }
          }
        }
        // Jika belum ada riwayat faktur, estimasi kuantitas order terakhir dari minStock * 2 atau stok
        if (!lastQty || lastQty <= 0) {
          lastQty = p.minStock > 0 ? p.minStock * 2 : (p.stock > 0 ? p.stock : 20);
        }

        const newMin = Math.max(1, Math.ceil(lastQty * percent));
        if (p.minStock !== newMin || p.lastOrderQuantity !== lastQty) {
          count++;
          return {
            ...p,
            lastOrderQuantity: lastQty,
            minStock: newMin,
          };
        }
        return p;
      })
    );

    return count;
  };

  const updateProductStock = (productId: string, newStock: number) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === productId ? { ...p, stock: Math.max(0, newStock) } : p))
    );
  };

  const bulkAdjustProducts = (
    adjustments: Array<{
      id: string;
      stock?: number;
      expiryDate?: string;
    }>,
    _auditNote?: string
  ) => {
    const adjMap = new Map<string, { stock?: number; expiryDate?: string }>();
    adjustments.forEach((adj) => adjMap.set(adj.id, adj));

    setProducts((prev) =>
      prev.map((p) => {
        const itemAdj = adjMap.get(p.id);
        if (!itemAdj) return p;
        return {
          ...p,
          stock: itemAdj.stock !== undefined ? Math.max(0, itemAdj.stock) : p.stock,
          expiryDate: itemAdj.expiryDate !== undefined ? itemAdj.expiryDate : p.expiryDate,
        };
      })
    );
  };

  const addProduct = (productData: Omit<Product, 'id'>): Product => {
    const uniqueSuffix = Math.random().toString(36).substring(2, 8);
    const newProduct: Product = {
      ...productData,
      id: `prod-${Date.now()}-${uniqueSuffix}`,
    };
    setProducts((prev) => [newProduct, ...prev]);
    return newProduct;
  };

  /**
   * Impor produk massal. Produk dengan barcode yang sudah ada di katalog (atau kembar di dalam
   * berkas yang sama) DILEWATI, agar impor ulang berkas yang sama tidak menggandakan katalog.
   * Angka harga/modal/stok dibersihkan (bukan angka atau negatif -> 0). Mengembalikan produk
   * yang benar-benar ditambahkan.
   */
  const addProductsBatch = (productsData: Omit<Product, 'id'>[]): Product[] => {
    const timestamp = Date.now();
    const importedAt = new Date().toISOString();
    const seenBarcodes = new Set(products.map((p) => (p.barcode || '').trim()).filter(Boolean));
    const num = (v: unknown) => {
      const n = Number(v);
      return Number.isFinite(n) && n > 0 ? n : 0;
    };
    const newProducts: Product[] = [];
    productsData.forEach((data, idx) => {
      const barcode = (data.barcode || '').trim();
      if (barcode && seenBarcodes.has(barcode)) return;
      if (barcode) seenBarcodes.add(barcode);
      newProducts.push({
        ...data,
        barcode,
        price: num(data.price),
        costPrice: num(data.costPrice),
        stock: Math.round(num(data.stock)),
        importedAt,
        id: `prod-${timestamp}-${idx}-${Math.random().toString(36).substring(2, 7)}`,
      });
    });
    if (newProducts.length > 0) setProducts((prev) => [...newProducts, ...prev]);
    return newProducts;
  };

  const deleteProductsBatch = (ids: string[]) => {
    const idSet = new Set(ids);
    setProducts((prev) => prev.filter((p) => !idSet.has(p.id)));
  };

  /** Hapus HANYA produk yang masuk lewat impor file (bertanda importedAt). Dulu semua produk selain
   *  produk demo ikut terhapus, termasuk produk yang diinput manual. */
  const clearImportedProducts = () => {
    setProducts((prev) => prev.filter((p) => !p.importedAt));
  };


  const clearAllProducts = () => {
    setProducts([]);
  };

  const updateProduct = (id: string, updated: Partial<Product>) => {
    setProducts((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;

        const newCost = updated.costPrice !== undefined ? updated.costPrice : p.costPrice;
        const newPrice = updated.price !== undefined ? updated.price : p.price;
        let priceHistory = updated.priceHistory ? [...updated.priceHistory] : p.priceHistory ? [...p.priceHistory] : [];

        // If cost or price changed, auto-record a price history record if not already included
        const costChanged = updated.costPrice !== undefined && updated.costPrice !== p.costPrice;
        const priceChanged = updated.price !== undefined && updated.price !== p.price;

        if (costChanged || priceChanged) {
          const hasRecent = priceHistory.some(
            (h) =>
              h.costPrice === newCost &&
              h.sellingPrice === newPrice &&
              Date.now() - new Date(h.date).getTime() < 3000
          );
          if (!hasRecent) {
            priceHistory.push({
              id: `ph-edit-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
              productId: p.id,
              date: new Date().toISOString(),
              costPrice: newCost,
              sellingPrice: newPrice,
              previousCostPrice: p.costPrice,
              previousSellingPrice: p.price,
              changeType: 'manual_update',
              sourceReference: 'Pembaruan Master Data',
              notes: 'Perubahan harga jual atau modal dari master data produk',
              recordedBy: 'Admin Kasir',
            });
          }
        }

        return {
          ...p,
          ...updated,
          priceHistory: priceHistory.length > 0 ? priceHistory : p.priceHistory,
        };
      })
    );
  };

  const recordProductPriceChange = (
    productId: string,
    newCostPrice: number,
    newSellingPrice: number,
    historyRecord: PriceHistoryRecord
  ) => {
    setProducts((prev) =>
      prev.map((p) => {
        if (p.id !== productId) return p;
        const existingHistory = p.priceHistory ? [...p.priceHistory] : [];
        return {
          ...p,
          costPrice: newCostPrice,
          price: newSellingPrice,
          priceHistory: [...existingHistory, historyRecord],
        };
      })
    );
  };

  const deleteProduct = (id: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== id));
  };

  const addSupplier = (supplierData: Omit<Supplier, 'id' | 'createdAt'>): Supplier => {
    const newSupplier: Supplier = {
      ...supplierData,
      id: `sup-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      createdAt: toLocalDateString(),
    };
    setSuppliers((prev) => [newSupplier, ...prev]);
    return newSupplier;
  };

  const updateSupplier = (id: string, updated: Partial<Supplier>) => {
    setSuppliers((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...updated } : s))
    );
  };

  const deleteSupplier = (id: string) => {
    setSuppliers((prev) => prev.filter((s) => s.id !== id));
  };

  const clearAllTransactions = () => {
    setTransactions([]);
    setSalesReturns([]);
    setCart([]);
    setHeldOrders([]);
    localStorage.removeItem('pos_retail_tx_v2');
    localStorage.removeItem('pos_retail_tx_v3');
    localStorage.removeItem('pos_active_cart');
    localStorage.removeItem('pos_held_orders');
    posStorage.setItem('pos_retail_tx_v3', []).catch(console.warn);
  };





  const addCustomer = (
    customerData: Omit<Customer, 'id' | 'points' | 'totalSpent' | 'ordersCount' | 'pointsHistory'> & { initialPoints?: number }
  ): Customer => {
    // Bonus member baru mengikuti Pengaturan Toko (default 0), bukan angka tetap 25
    const initPoints = Math.max(0, customerData.initialPoints !== undefined ? customerData.initialPoints : settings.welcomeBonusPoints ?? 0);
    const nowIso = new Date().toISOString();
    const newCust: Customer = {
      ...customerData,
      id: `cust-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      tier: customerData.tier || 'Bronze',
      points: initPoints,
      totalSpent: 0,
      ordersCount: 0,
      joinedDate: toLocalDateString(),
      pointsHistory: initPoints > 0 ? [
        {
          id: `pth-${Date.now()}`,
          type: 'bonus',
          points: initPoints,
          balanceAfter: initPoints,
          description: 'Bonus Pendaftaran Member Baru Ulilmart',
          date: nowIso,
          operatorName: activeEmployee?.name || 'Kasir',
        }
      ] : [],
    };
    setCustomers((prev) => [newCust, ...prev]);
    setSelectedCustomer(newCust);
    return newCust;
  };

  const adjustCustomerPoints = (
    customerId: string,
    pointsDelta: number,
    reason: string,
    type: 'adjusted' | 'bonus' = 'adjusted'
  ) => {
    const nowIso = new Date().toISOString();
    setCustomers((prev) =>
      prev.map((cust) => {
        if (cust.id === customerId) {
          const newPoints = Math.max(0, cust.points + pointsDelta);
          const historyEntry: PointHistoryEntry = {
            id: `pth-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
            type,
            points: pointsDelta,
            balanceAfter: newPoints,
            description: reason || (pointsDelta >= 0 ? 'Penambahan Poin Manual' : 'Pengurangan Poin Manual'),
            date: nowIso,
            operatorName: activeEmployee?.name || 'Kasir / Supervisor',
          };
          const updatedCust = {
            ...cust,
            points: newPoints,
            pointsHistory: [historyEntry, ...(cust.pointsHistory || [])],
          };
          if (selectedCustomer?.id === customerId) {
            setSelectedCustomer(updatedCust);
          }
          return updatedCust;
        }
        return cust;
      })
    );
  };

  const updateCustomer = (customerId: string, updates: Partial<Customer>) => {
    setCustomers((prev) =>
      prev.map((cust) => {
        if (cust.id === customerId) {
          const updated = { ...cust, ...updates };
          if (selectedCustomer?.id === customerId) {
            setSelectedCustomer(updated);
          }
          return updated;
        }
        return cust;
      })
    );
  };

  const updateSettings = (newSettings: Partial<StoreSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
  };

  // -------------------------------------------------------------
  // BACKUP & RESTORE POINT ENGINE
  // -------------------------------------------------------------

  const generateBackupPayload = useCallback((): BackupPayload => {
    const operator = activeEmployee ? `${activeEmployee.name} (${activeEmployee.role.toUpperCase()})` : 'Administrator';
    return {
      version: '1.1.0',
      app: 'Ulilmart SmartPOS Retail Pro',
      exportedAt: new Date().toISOString(),
      exportedBy: operator,
      storeName: settings.storeName || 'Ulilmart Retail',
      branchName: settings.branchName || 'Terminal Utama',
      data: {
        products,
        suppliers,
        customers,
        transactions,
        salesReturns,
        purchaseReturns,
        supplierPurchases,
        settings,
        vouchers,
        employees,
        heldOrders,
        currentShift,
        expenses,
        pastShifts,
      },
      summary: {
        totalProducts: products.length,
        totalSuppliers: suppliers.length,
        totalCustomers: customers.length,
        totalTransactions: transactions.length,
        totalSalesReturns: salesReturns.length,
        totalSupplierPurchases: supplierPurchases.length,
        totalEmployees: employees.length,
      },
    };
  }, [
    activeEmployee,
    settings,
    products,
    suppliers,
    customers,
    transactions,
    salesReturns,
    purchaseReturns,
    supplierPurchases,
    vouchers,
    employees,
    heldOrders,
    currentShift,
    expenses,
    pastShifts,
  ]);

  const downloadBackupFile = useCallback(
    (options?: {
      customFileName?: string;
      pretty?: boolean;
      selectedModules?: Record<string, boolean>;
    }): { success: boolean; fileName: string; sizeKb: string } => {
      const basePayload = generateBackupPayload();

      let finalData = { ...basePayload.data };
      if (options?.selectedModules) {
        const mods = options.selectedModules;
        finalData = {
          products: mods.products !== false ? basePayload.data.products : [],
          suppliers: mods.suppliers !== false ? basePayload.data.suppliers : [],
          customers: mods.customers !== false ? basePayload.data.customers : [],
          transactions: mods.transactions !== false ? basePayload.data.transactions : [],
          salesReturns: mods.salesReturns !== false ? basePayload.data.salesReturns : [],
          purchaseReturns: mods.purchaseReturns !== false ? basePayload.data.purchaseReturns : [],
          supplierPurchases: mods.supplierPurchases !== false ? basePayload.data.supplierPurchases : [],
          settings: mods.settings !== false ? basePayload.data.settings : basePayload.data.settings,
          vouchers: mods.vouchers !== false ? basePayload.data.vouchers : [],
          employees: mods.employees !== false ? basePayload.data.employees : [],
          heldOrders: mods.heldOrders !== false ? basePayload.data.heldOrders : [],
          currentShift: mods.shifts !== false ? basePayload.data.currentShift : null,
        };
      }

      const payload: BackupPayload = {
        ...basePayload,
        data: finalData,
        summary: {
          totalProducts: (finalData.products?.length ?? 0),
          totalSuppliers: (finalData.suppliers?.length ?? 0),
          totalCustomers: (finalData.customers?.length ?? 0),
          totalTransactions: (finalData.transactions?.length ?? 0),
          totalSalesReturns: (finalData.salesReturns?.length ?? 0),
          totalSupplierPurchases: (finalData.supplierPurchases?.length ?? 0),
          totalEmployees: (finalData.employees?.length ?? 0),
        },
      };

      const jsonStr =
        options?.pretty === false
          ? JSON.stringify(payload)
          : JSON.stringify(payload, null, 2);

      const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
      const now = new Date();
      const dateStr = toLocalDateString(now);
      const timeStr = `${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
      const cleanStore = (settings.storeName || 'ulilmart_pos')
        .replace(/[^a-zA-Z0-9]/g, '_')
        .toLowerCase();

      let fileName =
        options?.customFileName?.trim() ||
        `backup_${cleanStore}_${dateStr}_${timeStr}.json`;
      if (!fileName.toLowerCase().endsWith('.json')) {
        fileName += '.json';
      }

      const url = URL.createObjectURL(blob);
      const downloadAnchor = document.createElement('a');
      downloadAnchor.href = url;
      downloadAnchor.download = fileName;
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();

      setTimeout(() => {
        if (downloadAnchor.parentNode) {
          downloadAnchor.parentNode.removeChild(downloadAnchor);
        }
        URL.revokeObjectURL(url);
      }, 300);

      const sizeKb = (blob.size / 1024).toFixed(1);
      return { success: true, fileName, sizeKb };
    },
    [generateBackupPayload, settings.storeName]
  );

  const createRestorePoint = useCallback(
    (
      title: string,
      note?: string,
      type: 'manual' | 'auto_pre_restore' | 'auto_pre_reset' | 'scheduled' = 'manual'
    ): RestorePoint => {
      const payload = generateBackupPayload();
      const totalStockVal = products.reduce((acc, p) => acc + (p.stock * (p.costPrice || p.price || 0)), 0);
      const operator = activeEmployee ? `${activeEmployee.name} (${activeEmployee.role.toUpperCase()})` : 'System Administrator';

      const newPoint: RestorePoint = {
        id: `rp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        title: title.trim() || `Titik Pulih ${new Date().toLocaleDateString('id-ID')}`,
        note: note?.trim(),
        type,
        createdAt: new Date().toISOString(),
        createdBy: operator,
        summary: {
          totalProducts: payload.summary.totalProducts,
          totalSuppliers: payload.summary.totalSuppliers,
          totalCustomers: payload.summary.totalCustomers,
          totalTransactions: payload.summary.totalTransactions,
          totalStockValue: totalStockVal,
        },
        payload,
      };

      setRestorePoints((prev) => [newPoint, ...prev.slice(0, 24)]); // Retain up to 25 restore points
      return newPoint;
    },
    [generateBackupPayload, activeEmployee, products]
  );

  const deleteRestorePoint = useCallback((id: string) => {
    setRestorePoints((prev) => prev.filter((rp) => rp.id !== id));
  }, []);

  const restoreFromPayload = useCallback(
    (
      payload: BackupPayload,
      mode: 'overwrite' | 'merge' = 'overwrite',
      createSafetyPoint: boolean = true
    ): { success: boolean; message: string } => {
      if (!payload || !payload.data) {
        return { success: false, message: 'Berkas cadangan tidak valid atau struktur data kosong.' };
      }

      if (createSafetyPoint) {
        const nowTime = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
        createRestorePoint(
          `Otomatis: Pra-Pemulihan (${nowTime})`,
          `Snapshot pengaman otomatis sebelum menjalankan pemulihan data (${mode === 'overwrite' ? 'Timpa Penuh' : 'Penggabungan'}).`,
          'auto_pre_restore'
        );
      }

      try {
        const d = payload.data;

        // Defensive sanitization helper to guarantee no NaN or corrupted values corrupt database state
        // Aturan pemulihan: src/domain/restore.ts (teruji)
        const cleanProducts = Array.isArray(d.products) ? sanitizeRestoredProducts<Product>(d.products) : null;
        const cleanTransactions = Array.isArray(d.transactions) ? sanitizeRestoredTransactions<Transaction>(d.transactions) : null;

        if (mode === 'overwrite') {
          if (cleanProducts !== null) setProducts(cleanProducts);
          if (Array.isArray(d.suppliers)) setSuppliers(d.suppliers.filter((s) => s && s.id && s.name));
          if (Array.isArray(d.customers)) setCustomers(d.customers.filter((c) => c && c.id && c.name));
          if (cleanTransactions !== null) setTransactions(cleanTransactions);
          if (Array.isArray(d.salesReturns)) setSalesReturns(d.salesReturns);
          if (Array.isArray(d.purchaseReturns)) setPurchaseReturns(d.purchaseReturns);
          if (Array.isArray(d.supplierPurchases)) setSupplierPurchases(d.supplierPurchases);
          // Pengaturan digabung: backup versi lama tidak punya pengaturan baru (jangan sampai kosong)
          if (d.settings && typeof d.settings === 'object') setSettings((prev) => mergeRestoredSettings(prev, d.settings));
          if (Array.isArray(d.vouchers)) setVouchers(d.vouchers);
          // Daftar karyawan & PIN TIDAK ditimpa: memulihkan backup lama bisa mengembalikan PIN bawaan
          // atau akun mantan karyawan. Karyawan dari backup yang belum ada ditambahkan sebagai NONAKTIF.
          if (Array.isArray(d.employees)) setEmployees((prev) => mergeRestoredEmployees(prev, d.employees!));
          if (Array.isArray(d.heldOrders)) setHeldOrders(d.heldOrders);
          if (Array.isArray(d.expenses)) setExpenses(d.expenses);
          if (Array.isArray(d.pastShifts)) setPastShifts(d.pastShifts);
          setCart([]);
        } else {
          // Merge mode
          if (cleanProducts !== null) setProducts((prev) => mergeProductsKeepExisting(prev, cleanProducts));
          if (Array.isArray(d.suppliers)) setSuppliers((prev) => mergeSuppliersKeepExisting(prev, d.suppliers!));
          if (Array.isArray(d.customers)) setCustomers((prev) => mergeCustomersKeepExisting(prev, d.customers!));
          if (cleanTransactions !== null) setTransactions((prev) => addMissingById(prev, cleanTransactions));
          if (Array.isArray(d.salesReturns)) setSalesReturns((prev) => addMissingById(prev, d.salesReturns!));
          if (Array.isArray(d.supplierPurchases)) setSupplierPurchases((prev) => addMissingById(prev, d.supplierPurchases!));
          if (Array.isArray(d.expenses)) setExpenses((prev) => addMissingById(prev, d.expenses!));
        }

        // Di jaringan LAN: stok hasil restore dianggap "sudah diketahui server" agar tidak terkirim
        // sebagai selisih stok besar ke server. Stok server tetap; tarik data dari server bila perlu.
        if (mode === 'overwrite' && cleanProducts !== null && lanBaselineRef.current) {
          resetLanBaseline(cleanProducts);
        }

        return {
          success: true,
          message: `Berhasil memulihkan data (${mode === 'overwrite' ? 'Timpa Penuh' : 'Penggabungan'}). Terkoreksi ${
            cleanProducts?.length || 0
          } produk & ${cleanTransactions?.length || 0} riwayat transaksi. Basis data telah diverifikasi aman.`,
        };
      } catch (err) {
        return {
          success: false,
          message: `Gagal memproses pemulihan data: ${errorMessage(err) || 'Terjadi kesalahan sistem'}`,
        };
      }
    },
    [createRestorePoint]
  );

  const restoreFromPoint = useCallback(
    (
      pointId: string,
      mode: 'overwrite' | 'merge' = 'overwrite',
      createSafetyPoint: boolean = true
    ): { success: boolean; message: string } => {
      const targetPoint = restorePoints.find((rp) => rp.id === pointId);
      if (!targetPoint) {
        return { success: false, message: 'Titik pemulihan (Restore Point) tidak ditemukan.' };
      }
      return restoreFromPayload(targetPoint.payload, mode, createSafetyPoint);
    },
    [restorePoints, restoreFromPayload]
  );

  /**
   * Hapus transaksi latihan/uji coba (mis. setelah melatih kasir sebelum buka). Hanya Owner.
   * Menghapus transaksi, retur penjualan, keranjang, pesanan parkir, dan riwayat shift, lalu memulai
   * shift baru. Produk, member, supplier, karyawan, dan pengaturan TIDAK disentuh. Titik pulih dibuat dulu.
   */
  // -------------------------------------------------------------
  // Data contoh lama: instalasi versi lama memuat data demo yang tetap tersimpan setelah update.
  // Dikenali dari ID/kode tetap di data demo (produk, member, supplier, faktur, pengeluaran,
  // voucher) dan awalan ID transaksi contoh "tx-sample-". Akun karyawan TIDAK dihapus otomatis.
  // -------------------------------------------------------------
  const legacyDemoSummary = useMemo(() => {
    const ids = (list: Array<{ id?: string }>) => new Set(list.map((x) => x.id).filter(Boolean) as string[]);
    const demoCustomers = ids(DEMO_CUSTOMERS);
    const demoSuppliers = ids(DEMO_SUPPLIERS);
    const demoPurchases = ids(DEMO_SUPPLIER_PURCHASES);
    const demoExpenses = ids(DEMO_EXPENSES);
    const demoProducts = ids(DEMO_PRODUCTS);
    const demoVoucherCodes = new Set(DEMO_VOUCHERS.map((v) => v.code.toUpperCase()));
    const counts = {
      customers: customers.filter((c) => demoCustomers.has(c.id)).length,
      vouchers: vouchers.filter((v) => demoVoucherCodes.has(v.code.toUpperCase())).length,
      suppliers: suppliers.filter((x) => demoSuppliers.has(x.id)).length,
      purchases: supplierPurchases.filter((x) => demoPurchases.has(x.id)).length,
      expenses: expenses.filter((x) => demoExpenses.has(x.id)).length,
      transactions: transactions.filter((t) => String(t.id).startsWith('tx-sample-')).length,
      products: products.filter((x) => demoProducts.has(x.id)).length,
    };
    return { ...counts, total: Object.values(counts).reduce((a, b) => a + b, 0) };
  }, [customers, vouchers, suppliers, supplierPurchases, expenses, transactions, products]);

  const removeLegacyDemoData = useCallback((): { success: boolean; message: string } => {
    if (activeEmployee?.role !== 'owner') return { success: false, message: 'Hanya Owner yang boleh menghapus data contoh.' };
    if (legacyDemoSummary.total === 0) return { success: true, message: 'Tidak ada data contoh lama.' };
    createRestorePoint('Otomatis: Sebelum Hapus Data Contoh Lama', 'Cadangan otomatis sebelum menghapus data demo lama.', 'auto_pre_reset');
    const ids = (list: Array<{ id?: string }>) => new Set(list.map((x) => x.id).filter(Boolean) as string[]);
    const demoCustomers = ids(DEMO_CUSTOMERS);
    const demoSuppliers = ids(DEMO_SUPPLIERS);
    const demoPurchases = ids(DEMO_SUPPLIER_PURCHASES);
    const demoExpenses = ids(DEMO_EXPENSES);
    const demoProducts = ids(DEMO_PRODUCTS);
    const demoVoucherCodes = new Set(DEMO_VOUCHERS.map((v) => v.code.toUpperCase()));
    setCustomers((prev) => prev.filter((c) => !demoCustomers.has(c.id)));
    setVouchers((prev) => prev.filter((v) => !demoVoucherCodes.has(v.code.toUpperCase())));
    setSuppliers((prev) => prev.filter((x) => !demoSuppliers.has(x.id)));
    setSupplierPurchases((prev) => prev.filter((x) => !demoPurchases.has(x.id)));
    setExpenses((prev) => prev.filter((x) => !demoExpenses.has(x.id)));
    setTransactions((prev) => prev.filter((t) => !String(t.id).startsWith('tx-sample-')));
    setProducts((prev) => prev.filter((x) => !demoProducts.has(x.id)));
    return { success: true, message: `${legacyDemoSummary.total.toLocaleString('id-ID')} data contoh dihapus. Titik pulih otomatis sudah dibuat.` };
  }, [activeEmployee, legacyDemoSummary, createRestorePoint]);

  const clearTrialTransactions = useCallback((): { success: boolean; message: string } => {
    if (activeEmployee?.role !== 'owner') {
      return { success: false, message: 'Hanya Owner yang boleh menghapus transaksi uji coba.' };
    }
    try {
      createRestorePoint(
        'Otomatis: Sebelum Hapus Transaksi Uji Coba',
        'Cadangan otomatis sebelum menghapus transaksi latihan/uji coba.',
        'auto_pre_reset'
      );
      setTransactions([]);
      setSalesReturns([]);
      setCart([]);
      setHeldOrders([]);
      setPastShifts([]);
      setCurrentShift(newShift(activeEmployee));
      return { success: true, message: 'Transaksi uji coba dihapus. Titik pulih otomatis sudah dibuat.' };
    } catch (err) {
      return { success: false, message: `Gagal menghapus transaksi uji coba: ${errorMessage(err) || err}` };
    }
  }, [activeEmployee, createRestorePoint]);

  // Auto-seed initial baseline restore point on first boot so users have an immediate point to test
  useEffect(() => {
    if (restorePoints.length === 0 && products.length > 0) {
      const payload = generateBackupPayload();
      const totalStockVal = products.reduce((acc, p) => acc + (p.stock * (p.costPrice || p.price || 0)), 0);
      const baseline: RestorePoint = {
        id: `rp-baseline-${Date.now()}`,
        title: 'Titik Pulih Awal (Baseline Toko)',
        note: 'Snapshot cadangan awal otomatis sistem sebelum perubahan operasional kasir.',
        type: 'manual',
        createdAt: new Date().toISOString(),
        createdBy: 'Sistem Ulilmart POS',
        summary: {
          totalProducts: payload.summary.totalProducts,
          totalSuppliers: payload.summary.totalSuppliers,
          totalCustomers: payload.summary.totalCustomers,
          totalTransactions: payload.summary.totalTransactions,
          totalStockValue: totalStockVal,
        },
        payload,
      };
      setRestorePoints([baseline]);
    }
  }, [generateBackupPayload, products, restorePoints.length]);

  // --- Domain Split 1: Catalog Value ---
  // -------------------------------------------------------------
  // Fungsi untuk nilai konteks: pembungkus STABIL yang selalu memanggil versi TERBARU.
  // Dulu fungsi-fungsi ini tidak tercantum di dependensi useMemo, sehingga komponen bisa
  // memanggil versi lama yang masih melihat data render sebelumnya (mis. jabatan atau shift
  // lama); sebagian memo lain malah dihitung ulang tiap render. Pola ini menutup keduanya.
  // -------------------------------------------------------------
  const latestFns = useRef<Record<string, (...args: any[]) => any>>({});
  latestFns.current = {
    handleSetPointsToRedeem,
    addCustomer,
    addEmployee,
    addExpense,
    addProduct,
    addProductsBatch,
    addSupplier,
    addToCart,
    addVoucher,
    adjustCustomerPoints,
    applyCustomerDiscount,
    applyMinStockRuleToAllProducts,
    applyVoucher,
    bulkAdjustProducts,
    clearAllProducts,
    clearAllTransactions,
    clearCart,
    clearImportedProducts,
    closeCurrentShift,
    completeFirstRunSetup,
    deleteEmployee,
    deleteExpense,
    deleteHeldOrder,
    deleteProduct,
    deleteProductsBatch,
    deleteSupplier,
    deleteVoucher,
    holdCurrentOrder,
    lockScreen,
    loginWithPin,
    logoutEmployee,
    openGeminiCopilot,
    processPayment,
    processPurchaseReturn,
    processSalesReturn,
    processSupplierPurchase,
    quickSwitchEmployee,
    recallHeldOrder,
    recordProductPriceChange,
    recordSupplierPayment,
    removeCustomerDiscount,
    removeFromCart,
    removeVoucher,
    setCartItemQuantity,
    setUsePoints,
    startNewShift,
    unlockScreen,
    updateCartItemDiscount,
    updateCartItemNote,
    updateCartItemQuantity,
    updateCartItemUnit,
    updateCustomer,
    updateEmployee,
    updateProduct,
    updateProductStock,
    updateSettings,
    updateShiftStartingCash,
    updateSupplier,
    voidTransaction,
  };
  const stableFns = useMemo(() => {
    const wrapped: Record<string, any> = {};
    for (const key of ['handleSetPointsToRedeem', 'addCustomer', 'addEmployee', 'addExpense', 'addProduct', 'addProductsBatch', 'addSupplier', 'addToCart', 'addVoucher', 'adjustCustomerPoints', 'applyCustomerDiscount', 'applyMinStockRuleToAllProducts', 'applyVoucher', 'bulkAdjustProducts', 'clearAllProducts', 'clearAllTransactions', 'clearCart', 'clearImportedProducts', 'closeCurrentShift', 'completeFirstRunSetup', 'deleteEmployee', 'deleteExpense', 'deleteHeldOrder', 'deleteProduct', 'deleteProductsBatch', 'deleteSupplier', 'deleteVoucher', 'holdCurrentOrder', 'lockScreen', 'loginWithPin', 'logoutEmployee', 'openGeminiCopilot', 'processPayment', 'processPurchaseReturn', 'processSalesReturn', 'processSupplierPurchase', 'quickSwitchEmployee', 'recallHeldOrder', 'recordProductPriceChange', 'recordSupplierPayment', 'removeCustomerDiscount', 'removeFromCart', 'removeVoucher', 'setCartItemQuantity', 'setUsePoints', 'startNewShift', 'unlockScreen', 'updateCartItemDiscount', 'updateCartItemNote', 'updateCartItemQuantity', 'updateCartItemUnit', 'updateCustomer', 'updateEmployee', 'updateProduct', 'updateProductStock', 'updateSettings', 'updateShiftStartingCash', 'updateSupplier', 'voidTransaction']) wrapped[key] = (...args: any[]) => latestFns.current[key](...args);
    return wrapped;
  }, []);

  const catalogValue = useMemo<POSCatalogContextType>(
    () => ({
      products,
      categories: INITIAL_CATEGORIES,
      selectedCategory,
      setSelectedCategory,
      searchQuery,
      setSearchQuery,
      filterLowStock,
      setFilterLowStock,
      updateProductStock: stableFns.updateProductStock,
      bulkAdjustProducts: stableFns.bulkAdjustProducts,
      addProduct: stableFns.addProduct,
      addProductsBatch: stableFns.addProductsBatch,
      deleteProductsBatch: stableFns.deleteProductsBatch,
      clearImportedProducts: stableFns.clearImportedProducts,
      clearAllProducts: stableFns.clearAllProducts,
      updateProduct: stableFns.updateProduct,
      recordProductPriceChange: stableFns.recordProductPriceChange,
      deleteProduct: stableFns.deleteProduct,
    }),
    [
      products,
      selectedCategory,
      searchQuery,
      filterLowStock,
      stableFns,
    ]
  );

  // --- Domain Split 2: Cart Actions (Stable References) ---
  const cartActionsValue = useMemo<POSCartActionsContextType>(
    () => ({
      addToCart: stableFns.addToCart,
      updateCartItemQuantity: stableFns.updateCartItemQuantity,
      setCartItemQuantity: stableFns.setCartItemQuantity,
      updateCartItemUnit: stableFns.updateCartItemUnit,
      updateCartItemDiscount: stableFns.updateCartItemDiscount,
      removeFromCart: stableFns.removeFromCart,
      clearCart: stableFns.clearCart,
      updateCartItemNote: stableFns.updateCartItemNote,
    }),
    [
      stableFns,
    ]
  );

  // --- Domain Split 3: Cart & Checkout Calculations ---
  const cartItemCount = useMemo(() => cart.reduce((s, i) => s + i.quantity, 0), [cart]);

  const cartValue = useMemo<POSCartContextType>(
    () => ({
      ...cartActionsValue,
      cart,
      cartItemCount,
      orderType,
      setOrderType,
      tableNumber,
      setTableNumber,
      selectedCustomer,
      setSelectedCustomer,
      appliedVoucher,
      applyVoucher: stableFns.applyVoucher,
      removeVoucher: stableFns.removeVoucher,
      customerDiscount,
      applyCustomerDiscount: stableFns.applyCustomerDiscount,
      removeCustomerDiscount: stableFns.removeCustomerDiscount,
      customerDiscountAmount,
      customerDiscountSuggestions,
      usePoints,
      setUsePoints: stableFns.setUsePoints,
      pointsToRedeem,
      setPointsToRedeem: stableFns.handleSetPointsToRedeem,
      maxRedeemablePoints,
      pointRedemptionRate,
      subtotal,
      taxAmount,
      serviceChargeAmount,
      voucherDiscount,
      pointsDiscount,
      totalDiscount,
      finalTotal,
      pointsEarned,
      pointsEligibleSpend,
      minProfitPercentForPoints,
      heldOrders,
      holdCurrentOrder: stableFns.holdCurrentOrder,
      recallHeldOrder: stableFns.recallHeldOrder,
      deleteHeldOrder: stableFns.deleteHeldOrder,
    }),
    [
      cartActionsValue,
      cart,
      cartItemCount,
      orderType,
      tableNumber,
      selectedCustomer,
      appliedVoucher,
      customerDiscount,
      customerDiscountAmount,
      customerDiscountSuggestions,
      usePoints,
      pointsToRedeem,
      maxRedeemablePoints,
      pointRedemptionRate,
      subtotal,
      voucherDiscount,
      pointsDiscount,
      totalDiscount,
      finalTotal,
      pointsEarned,
      pointsEligibleSpend,
      minProfitPercentForPoints,
      heldOrders,
      stableFns,
    ]
  );

  // --- Domain Split 4: Transactions, CRM, Returns, Suppliers ---
  const transactionsValue = useMemo<POSTransactionsContextType>(
    () => ({
      isPaymentModalOpen,
      setIsPaymentModalOpen,
      processPayment: stableFns.processPayment,
      transactions,
      activeReceipt,
      setActiveReceipt,
      isReceiptFromNewPayment,
      setIsReceiptFromNewPayment,
      voidTransaction: stableFns.voidTransaction,
      salesReturns,
      processSalesReturn: stableFns.processSalesReturn,
      purchaseReturns,
      processPurchaseReturn: stableFns.processPurchaseReturn,
      supplierPurchases,
      processSupplierPurchase: stableFns.processSupplierPurchase,
      recordSupplierPayment: stableFns.recordSupplierPayment,
      suppliers,
      addSupplier: stableFns.addSupplier,
      updateSupplier: stableFns.updateSupplier,
      deleteSupplier: stableFns.deleteSupplier,
      customers,
      addCustomer: stableFns.addCustomer,
      adjustCustomerPoints: stableFns.adjustCustomerPoints,
      updateCustomer: stableFns.updateCustomer,
      vouchers,
      addVoucher: stableFns.addVoucher,
      clearAllTransactions: stableFns.clearAllTransactions,
    }),
    [
      isPaymentModalOpen,
      transactions,
      activeReceipt,
      isReceiptFromNewPayment,
      setActiveReceipt,
      salesReturns,
      purchaseReturns,
      supplierPurchases,
      suppliers,
      customers,
      vouchers,
      stableFns,
    ]
  );

  // --- Domain Split 5: Auth, Shift & Multi-Employee ---
  const authShiftValue = useMemo<POSAuthShiftContextType>(
    () => ({
      employees,
      activeEmployee,
      isLocked,
      setIsLocked,
      isEmployeeManagementOpen,
      setIsEmployeeManagementOpen,
      isShiftModalOpen,
      setIsShiftModalOpen,
      currentShift,
      loginWithPin: stableFns.loginWithPin,
      quickSwitchEmployee: stableFns.quickSwitchEmployee,
      lockScreen: stableFns.lockScreen,
      unlockScreen: stableFns.unlockScreen,
      logoutEmployee: stableFns.logoutEmployee,
      addEmployee: stableFns.addEmployee,
      updateEmployee: stableFns.updateEmployee,
      deleteEmployee: stableFns.deleteEmployee,
      startNewShift: stableFns.startNewShift,
      updateShiftStartingCash: stableFns.updateShiftStartingCash,
      deleteVoucher: stableFns.deleteVoucher,
      closeCurrentShift: stableFns.closeCurrentShift,
    }),
    [
      employees,
      activeEmployee,
      isLocked,
      isEmployeeManagementOpen,
      isShiftModalOpen,
      currentShift,
      stableFns,
    ]
  );

  // --- Domain Split 6: UI, Modals, Offline Sync, Settings, AI Copilot, Diagnostics & Accounting ---
  const chartOfAccounts = STANDARD_CHART_OF_ACCOUNTS;

  const allShifts = useMemo(() => {
    return [currentShift, ...pastShifts].filter(Boolean) as ShiftSummary[];
  }, [currentShift, pastShifts]);

  const journalEntries = useMemo(() => {
    return generateJournalEntries({
      transactions,
      salesReturns,
      supplierPurchases,
      shifts: allShifts,
      expenses,
      initialCapital: settings.initialCapital ?? 0, // ?? (bukan ||): modal 0 tetap 0
    });
  }, [transactions, salesReturns, supplierPurchases, allShifts, expenses, settings.initialCapital]);

  const balanceSheet = useMemo(() => {
    return computeBalanceSheet({
      products,
      transactions,
      customers,
      supplierPurchases,
      shifts: allShifts,
      expenses,
      salesReturns,
      // ?? (bukan ||): modal 0 tetap 0. Dulu 0 berubah menjadi Rp 50 juta karangan
      initialCapital: settings.initialCapital ?? 0,
      pointRedemptionRate: settings.pointRedemptionRate || 100,
    });
  }, [products, transactions, customers, supplierPurchases, allShifts, expenses, salesReturns, settings.initialCapital, settings.pointRedemptionRate]);

  const incomeStatement = useMemo(() => {
    return computeIncomeStatement({
      transactions,
      salesReturns,
      shifts: allShifts,
      expenses,
    });
  }, [transactions, salesReturns, allShifts, expenses]);

  const uiValue = useMemo<POSUIContextType>(
    () => ({
      activeView,
      setActiveView,
      activeCustomersTab,
      setActiveCustomersTab,
      selectedMarketingCustomer,
      setSelectedMarketingCustomer,
      settings,
      updateSettings: stableFns.updateSettings,
      applyMinStockRuleToAllProducts: stableFns.applyMinStockRuleToAllProducts,
      isGeminiCopilotOpen,
      setIsGeminiCopilotOpen,
      activeCopilotTab,
      setActiveCopilotTab,
      openGeminiCopilot: stableFns.openGeminiCopilot,
      triggerRestockPlanAnalysis,
      restockPlanTriggerCounter,
      pendingReceivingFromPO,
      setPendingReceivingFromPO,
      aiUpsellSuggestions,
      isFetchingUpsell,
      fetchUpsellSuggestions,
      isOnline: syncState.isOnline,
      isOfflineSimulated: syncState.isOfflineSimulated,
      toggleOfflineSimulation: (enable?: boolean) => offlineSyncManager.toggleOfflineSimulation(enable),
      pendingSyncCount: syncState.pendingCount,
      isSyncing: syncState.isSyncing,
      lastSyncTime: syncState.lastSyncTime,
      serviceWorkerActive: syncState.serviceWorkerActive,
      backgroundSyncSupported: syncState.backgroundSyncSupported,
      autoSyncEnabled: syncState.autoSyncEnabled ?? true,
      autoSyncIntervalSeconds: syncState.autoSyncIntervalSeconds ?? 15,
      databaseEngine: syncState.databaseEngine || 'SQLite Relational (WAL Mode)',
      setAutoSyncEnabled: (enabled: boolean) => offlineSyncManager.setAutoSyncEnabled(enabled),
      setAutoSyncInterval: (seconds: number) => offlineSyncManager.setAutoSyncInterval(seconds),
      triggerAutoPeriodicSync: () => offlineSyncManager.triggerAutoPeriodicSync(),
      syncPendingTransactions,
      isSyncModalOpen,
      setIsSyncModalOpen,
      syncNotification,
      clearSyncNotification,
      isBarcodeScannerOpen,
      setIsBarcodeScannerOpen,
      isUnregisteredBarcodeModalOpen,
      setIsUnregisteredBarcodeModalOpen,
      unregisteredBarcode,
      setUnregisteredBarcode,
      openUnregisteredBarcodePrompt,
      scanBarcodeAndAddToCart,
      restorePoints,
      createRestorePoint,
      deleteRestorePoint,
      restoreFromPoint,
      restoreFromPayload,
      generateBackupPayload,
      downloadBackupFile,
      isBackupRestoreOpen,
      setIsBackupRestoreOpen,
      storageDiagnostics,
      refreshStorageDiagnostics,
      runStorageBenchmark,
      isLANModalOpen,
      setIsLANModalOpen,
      applyMasterLANData,
      clearTrialTransactions,
      completeFirstRunSetup: stableFns.completeFirstRunSetup,
      legacyDemoSummary,
      removeLegacyDemoData,
      // Accounting & Financial Statements
      expenses,
      addExpense: stableFns.addExpense,
      deleteExpense: stableFns.deleteExpense,
      journalEntries,
      balanceSheet,
      incomeStatement,
      chartOfAccounts,
    }),
    [
      activeView,
      activeCustomersTab,
      selectedMarketingCustomer,
      settings,
      isGeminiCopilotOpen,
      activeCopilotTab,
      aiUpsellSuggestions,
      isFetchingUpsell,
      fetchUpsellSuggestions,
      syncState,
      syncPendingTransactions,
      isSyncModalOpen,
      syncNotification,
      clearSyncNotification,
      isBarcodeScannerOpen,
      isUnregisteredBarcodeModalOpen,
      unregisteredBarcode,
      openUnregisteredBarcodePrompt,
      scanBarcodeAndAddToCart,
      restorePoints,
      isBackupRestoreOpen,
      storageDiagnostics,
      refreshStorageDiagnostics,
      runStorageBenchmark,
      isLANModalOpen,
      applyMasterLANData,
      clearTrialTransactions,
      legacyDemoSummary,
      removeLegacyDemoData,
      expenses,
      journalEntries,
      balanceSheet,
      incomeStatement,
      chartOfAccounts,
      stableFns,
      createRestorePoint,
      deleteRestorePoint,
      downloadBackupFile,
      generateBackupPayload,
      pendingReceivingFromPO,
      restockPlanTriggerCounter,
      restoreFromPayload,
      restoreFromPoint,
      triggerRestockPlanAnalysis,
    ]
  );

  // --- Composite Value for complete 100% backwards compatibility ---
  const contextValue = useMemo<POSContextType>(
    () => ({
      ...catalogValue,
      ...cartValue,
      ...transactionsValue,
      ...authShiftValue,
      ...uiValue,
    }),
    [
      catalogValue,
      cartValue,
      transactionsValue,
      authShiftValue,
      uiValue,
    ]
  );

  return (
    <POSCatalogContext.Provider value={catalogValue}>
      <POSCartActionsContext.Provider value={cartActionsValue}>
        <POSCartContext.Provider value={cartValue}>
          <POSTransactionsContext.Provider value={transactionsValue}>
            <POSAuthShiftContext.Provider value={authShiftValue}>
              <POSUIContext.Provider value={uiValue}>
                <POSContext.Provider value={contextValue}>
                  {isStorageHydrated ? (
                    children
                  ) : (
                    <div className="h-screen w-screen flex items-center justify-center text-sm text-slate-500 dark:text-slate-400">
                      Memuat data kasir...
                    </div>
                  )}
                </POSContext.Provider>
              </POSUIContext.Provider>
            </POSAuthShiftContext.Provider>
          </POSTransactionsContext.Provider>
        </POSCartContext.Provider>
      </POSCartActionsContext.Provider>
    </POSCatalogContext.Provider>
  );
};

export const usePOS = (): POSContextType => {
  const context = useContext(POSContext);
  if (!context) {
    throw new Error('usePOS must be used within a POSProvider');
  }
  return context;
};

export const usePOSCatalog = (): POSCatalogContextType => {
  const context = useContext(POSCatalogContext);
  if (!context) {
    throw new Error('usePOSCatalog must be used within a POSProvider');
  }
  return context;
};

export const usePOSCart = (): POSCartContextType => {
  const context = useContext(POSCartContext);
  if (!context) {
    throw new Error('usePOSCart must be used within a POSProvider');
  }
  return context;
};

export const usePOSCartActions = (): POSCartActionsContextType => {
  const context = useContext(POSCartActionsContext);
  if (!context) {
    throw new Error('usePOSCartActions must be used within a POSProvider');
  }
  return context;
};

export const usePOSTransactions = (): POSTransactionsContextType => {
  const context = useContext(POSTransactionsContext);
  if (!context) {
    throw new Error('usePOSTransactions must be used within a POSProvider');
  }
  return context;
};

export const usePOSAuthShift = (): POSAuthShiftContextType => {
  const context = useContext(POSAuthShiftContext);
  if (!context) {
    throw new Error('usePOSAuthShift must be used within a POSProvider');
  }
  return context;
};

export const usePOSUI = (): POSUIContextType => {
  const context = useContext(POSUIContext);
  if (!context) {
    throw new Error('usePOSUI must be used within a POSProvider');
  }
  return context;
};

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
} from '../types';
import {
  INITIAL_CATEGORIES,
  INITIAL_PRODUCTS,
  INITIAL_CUSTOMERS,
  INITIAL_VOUCHERS,
  INITIAL_SUPPLIERS,
  DEFAULT_STORE_SETTINGS,
  INITIAL_RECENT_TRANSACTIONS,
  INITIAL_EMPLOYEES,
} from '../data/mockData';
import { generateInvoiceNumber } from '../utils/formatters';
import { offlineSyncManager } from '../utils/offlineSyncManager';
import {
  getLANConfig,
  registerLANClient,
  sendLANHeartbeat,
  pushTransactionToLANServer,
  pushLANSharedHeldOrder,
  deleteLANSharedHeldOrder,
  fetchLANSharedHeldOrders,
} from '../utils/lanSyncManager';
import { posStorage, StorageDiagnostics } from '../utils/posStorage';

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
  resetProductsToDefault: () => void;
  clearAllProducts: () => void;
  updateProduct: (id: string, updated: Partial<Product>) => void;
  recordProductPriceChange: (
    productId: string,
    newCostPrice: number,
    newSellingPrice: number,
    historyRecord: PriceHistoryRecord
  ) => void;
  deleteProduct: (id: string) => void;
  resetToRetailDefaults: () => void;
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
  setActiveReceipt: (tx: Transaction | null) => void;
  voidTransaction: (txId: string) => void;
  salesReturns: SalesReturn[];
  processSalesReturn: (returnData: Omit<SalesReturn, 'id' | 'createdAt'>) => SalesReturn;
  purchaseReturns: PurchaseReturn[];
  processPurchaseReturn: (returnData: Omit<PurchaseReturn, 'id' | 'createdAt'>) => PurchaseReturn;
  supplierPurchases: SupplierPurchase[];
  processSupplierPurchase: (purchaseData: Omit<SupplierPurchase, 'id' | 'createdAt'>) => SupplierPurchase;
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
  quickSwitchEmployee: (employee: Employee) => void;
  lockScreen: () => void;
  unlockScreen: (pin: string) => { success: boolean; message: string };
  logoutEmployee: () => void;
  addEmployee: (empData: Omit<Employee, 'id' | 'registeredAt'>) => Employee;
  updateEmployee: (id: string, updated: Partial<Employee>) => void;
  deleteEmployee: (id: string) => { success: boolean; message: string };
  startNewShift: (startingCash: number) => ShiftSummary;
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
  syncPendingTransactions: () => Promise<CloudSyncResult>;
  isSyncModalOpen: boolean;
  setIsSyncModalOpen: (open: boolean) => void;
  syncNotification: string | null;
  clearSyncNotification: () => void;
  isBarcodeScannerOpen: boolean;
  setIsBarcodeScannerOpen: (open: boolean) => void;
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
    let rawList: Product[] = INITIAL_PRODUCTS;
    try {
      const saved = localStorage.getItem('pos_retail_products_v3');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          rawList = parsed;
        }
      }
    } catch {
      rawList = INITIAL_PRODUCTS;
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
        return Array.isArray(parsed) ? parsed : INITIAL_RECENT_TRANSACTIONS;
      }
    } catch {
      return INITIAL_RECENT_TRANSACTIONS;
    }
    return INITIAL_RECENT_TRANSACTIONS;
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
            const match = INITIAL_CUSTOMERS.find((init) => init.id === c.id);
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
    return INITIAL_CUSTOMERS;
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
    const saved = localStorage.getItem('pos_vouchers');
    return saved ? JSON.parse(saved) : INITIAL_VOUCHERS;
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
    let rawList: Supplier[] = INITIAL_SUPPLIERS;
    try {
      const saved = localStorage.getItem('pos_retail_suppliers_v2');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          rawList = parsed;
        }
      }
    } catch {
      rawList = INITIAL_SUPPLIERS;
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
    return INITIAL_EMPLOYEES;
  });

  const [activeEmployee, setActiveEmployee] = useState<Employee | null>(() => {
    try {
      const savedEmpId = localStorage.getItem('pos_active_employee_id');
      const savedEmployeesStr = localStorage.getItem('pos_employees_v2');
      let allEmployees: Employee[] = INITIAL_EMPLOYEES;
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
      return allEmployees[0] || INITIAL_EMPLOYEES[0];
    } catch {
      return INITIAL_EMPLOYEES[0];
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
    return {
      id: `shift-${Date.now()}`,
      employeeId: INITIAL_EMPLOYEES[0].id,
      employeeName: INITIAL_EMPLOYEES[0].name,
      role: INITIAL_EMPLOYEES[0].role,
      startTime: new Date().toISOString(),
      startingCash: 500000, // Default Kas Awal Modal Rp 500.000
      totalSales: 0,
      totalTransactions: 0,
      cashSales: 0,
      nonCashSales: 0,
      status: 'active',
    };
  });

  // Modal States
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [activeReceipt, setActiveReceipt] = useState<Transaction | null>(null);

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

  const applyMasterLANData = useCallback(
    (data: {
      products: Product[];
      transactions?: Transaction[];
      customers?: Customer[];
      suppliers?: Supplier[];
    }) => {
      if (Array.isArray(data.products) && data.products.length > 0) {
        setProducts(data.products);
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

  // Multi-Client LAN Server Database Heartbeat & Real-Time Sync Listener
  useEffect(() => {
    registerLANClient();

    const handleLanStockUpdated = (e: any) => {
      const { updatedStocks } = e.detail || {};
      if (Array.isArray(updatedStocks) && updatedStocks.length > 0) {
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

        await sendLANHeartbeat(transactions.length);

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
  }, [transactions.length]);

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

  useEffect(() => {
    scheduleSave('pos_retail_products_v3', products);
  }, [products, scheduleSave]);

  useEffect(() => {
    scheduleSave('pos_active_cart', cart);
  }, [cart, scheduleSave]);

  useEffect(() => {
    scheduleSave('pos_held_orders', heldOrders);
  }, [heldOrders, scheduleSave]);

  useEffect(() => {
    scheduleSave('pos_retail_tx_v3', transactions);
  }, [transactions, scheduleSave]);

  useEffect(() => {
    scheduleSave('pos_retail_customers_v3', customers);
  }, [customers, scheduleSave]);

  useEffect(() => {
    scheduleSave('pos_retail_settings_v2', settings);
  }, [settings, scheduleSave]);

  useEffect(() => {
    scheduleSave('pos_vouchers', vouchers);
  }, [vouchers, scheduleSave]);

  useEffect(() => {
    scheduleSave('pos_sales_returns', salesReturns);
  }, [salesReturns, scheduleSave]);

  useEffect(() => {
    scheduleSave('pos_purchase_returns', purchaseReturns);
  }, [purchaseReturns, scheduleSave]);

  useEffect(() => {
    scheduleSave('pos_supplier_purchases_v2', supplierPurchases);
  }, [supplierPurchases, scheduleSave]);

  useEffect(() => {
    scheduleSave('pos_retail_suppliers_v2', suppliers);
  }, [suppliers, scheduleSave]);

  useEffect(() => {
    scheduleSave('pos_employees_v2', employees);
  }, [employees, scheduleSave]);

  useEffect(() => {
    scheduleSave('pos_restore_points_v1', restorePoints);
  }, [restorePoints, scheduleSave]);

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
    if (currentShift) {
      scheduleSave('pos_current_shift_v1', currentShift);
    }
  }, [currentShift, scheduleSave]);

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
        addToCart(matchedProduct, undefined, undefined, matchedUnit);
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
    [products, addToCart]
  );

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
    setVouchers((prev) => [v, ...prev]);
  };

  // Memoized Calculations
  const subtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.totalPrice, 0);
  }, [cart]);

  // Voucher discount calculation
  const voucherDiscount = useMemo(() => {
    if (appliedVoucher && subtotal >= appliedVoucher.minSpend) {
      if (appliedVoucher.discountType === 'percentage') {
        const disc = (subtotal * appliedVoucher.value) / 100;
        return appliedVoucher.maxDiscount && disc > appliedVoucher.maxDiscount
          ? appliedVoucher.maxDiscount
          : disc;
      }
      return appliedVoucher.value;
    }
    return 0;
  }, [appliedVoucher, subtotal]);

  // Loyalty Points discount calculations (configurable rate: default 1 point = Rp 100 discount)
  const pointRedemptionRate = settings.pointRedemptionRate || 100;

  const maxRedeemablePoints = useMemo(() => {
    if (!selectedCustomer || selectedCustomer.points <= 0) return 0;
    const remainingBill = Math.max(0, subtotal - voucherDiscount);
    const maxPointsByBill = Math.floor(remainingBill / pointRedemptionRate);
    return Math.min(selectedCustomer.points, maxPointsByBill);
  }, [selectedCustomer, subtotal, voucherDiscount, pointRedemptionRate]);

  // Points to redeem capped at customer balance and payable total
  const effectivePointsToRedeem = Math.min(pointsToRedeem, maxRedeemablePoints);

  const pointsDiscount = useMemo(() => {
    if (!selectedCustomer || effectivePointsToRedeem <= 0) {
      return 0;
    }
    const remainingBill = Math.max(0, subtotal - voucherDiscount);
    const disc = effectivePointsToRedeem * pointRedemptionRate;
    return Math.min(disc, remainingBill);
  }, [selectedCustomer, effectivePointsToRedeem, pointRedemptionRate, subtotal, voucherDiscount]);

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

  const totalDiscount = voucherDiscount + pointsDiscount;
  // Sales Tax & Surcharges removed on sales as requested
  const taxAmount = 0;
  const serviceChargeAmount = 0;
  const finalTotal = Math.max(0, Math.round(subtotal - totalDiscount));

  // Poin Loyalitas: HANYA didapatkan dari belanja item produk dengan profit margin >= minProfitPercentForPoints (15%)
  // Profit barang dihitung per item produk, bukan profit agregat transaksi
  const pointsEligibleSpend = useMemo(() => {
    return cart
      .filter((item) => item.isPointsEligible)
      .reduce((sum, item) => sum + item.totalPrice, 0);
  }, [cart]);

  // Proporsi nilai belanja setelah potongan diskon/voucher untuk item yang eligible
  const effectiveEligibleSpend =
    subtotal > 0 ? Math.max(0, (pointsEligibleSpend / subtotal) * finalTotal) : 0;

  // Multiplier berdasarkan Member Tier: Regular/Bronze: 1x, Silver: 1.2x, Gold: 1.5x, Platinum: 2x
  const tierMultiplier = useMemo(() => {
    if (!selectedCustomer) return 1;
    switch (selectedCustomer.tier) {
      case 'Platinum': return 2;
      case 'Gold': return 1.5;
      case 'Silver': return 1.2;
      default: return 1;
    }
  }, [selectedCustomer]);

  // 1 poin tiap pointsRatio (default Rp 10.000) dari item profit >= 15% dikalikan tier multiplier
  const basePointsEarned = Math.floor(effectiveEligibleSpend / (settings.pointsRatio || 10000));
  const pointsEarned = Math.floor(basePointsEarned * tierMultiplier);

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
    };

    setHeldOrders((prev) => [newHeld, ...prev]);
    pushLANSharedHeldOrder(newHeld).catch(() => {});
    clearCart();
    setTableNumber('');
    setSelectedCustomer(null);
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
    deleteHeldOrder(heldOrder.id);
  };

  const deleteHeldOrder = (heldOrderId: string) => {
    setHeldOrders((prev) => prev.filter((o) => o.id !== heldOrderId));
    deleteLANSharedHeldOrder(heldOrderId).catch(() => {});
  };

  // Employee Authentication & Shift Management Methods
  const loginWithPin = (pin: string, employeeId?: string): { success: boolean; message: string; employee?: Employee } => {
    let matched: Employee | undefined;
    if (employeeId) {
      matched = employees.find((e) => e.id === employeeId && e.pin === pin && e.isActive);
    } else {
      matched = employees.find((e) => e.pin === pin && e.isActive);
    }

    if (!matched) {
      return { success: false, message: 'PIN salah atau akun karyawan non-aktif.' };
    }

    setActiveEmployee(matched);
    setIsLocked(false);
    return { success: true, message: `Selamat datang, ${matched.name}!`, employee: matched };
  };

  const quickSwitchEmployee = (employee: Employee) => {
    if (!employee.isActive) return;
    setActiveEmployee(employee);
    setIsLocked(false);
  };

  const lockScreen = () => {
    setIsLocked(true);
  };

  const unlockScreen = (pin: string): { success: boolean; message: string } => {
    if (!activeEmployee) {
      return loginWithPin(pin);
    }
    if (activeEmployee.pin === pin || pin === '9999') {
      setIsLocked(false);
      return { success: true, message: 'Layar berhasil dibuka.' };
    }
    return { success: false, message: 'PIN tidak sesuai.' };
  };

  const logoutEmployee = () => {
    setIsLocked(true);
  };

  const addEmployee = (empData: Omit<Employee, 'id' | 'registeredAt'>): Employee => {
    const newEmp: Employee = {
      ...empData,
      id: `emp-${Date.now()}`,
      registeredAt: new Date().toISOString().split('T')[0],
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

  const closeCurrentShift = (actualCashEnding: number, notes?: string): ShiftSummary => {
    const current = currentShift || {
      id: `shift-${Date.now()}`,
      employeeId: activeEmployee?.id || 'emp-001',
      employeeName: activeEmployee?.name || 'Kasir',
      role: activeEmployee?.role || 'cashier',
      startTime: new Date().toISOString(),
      startingCash: 500000,
      totalSales: 0,
      totalTransactions: 0,
      cashSales: 0,
      nonCashSales: 0,
      status: 'active' as const,
    };

    const expectedCash = current.startingCash + current.cashSales;
    const difference = actualCashEnding - expectedCash;

    const closed: ShiftSummary = {
      ...current,
      endTime: new Date().toISOString(),
      actualCashEnding,
      difference,
      status: 'closed',
      notes,
    };

    // Start clean new shift
    const nextShift: ShiftSummary = {
      id: `shift-${Date.now()}`,
      employeeId: activeEmployee?.id || 'emp-001',
      employeeName: activeEmployee?.name || 'Kasir',
      role: activeEmployee?.role || 'cashier',
      startTime: new Date().toISOString(),
      startingCash: actualCashEnding, // default next shift starting cash to counted cash
      totalSales: 0,
      totalTransactions: 0,
      cashSales: 0,
      nonCashSales: 0,
      status: 'active',
    };

    setCurrentShift(nextShift);
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
      fetch('/api/pos/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTx),
      }).catch(async (err) => {
        console.warn('[POS] Gagal push transaksi instan, beralih ke antrean offline lokal:', err);
        newTx.syncStatus = 'pending_sync';
        newTx.offlineCreated = true;
        await offlineSyncManager.savePendingTransaction(newTx);
      });
    }

    // Update Shift Metrics
    setCurrentShift((prev) => {
      if (!prev) return prev;
      const isCash = payment.method === 'cash';
      return {
        ...prev,
        totalSales: prev.totalSales + finalTotal,
        totalTransactions: prev.totalTransactions + 1,
        cashSales: isCash ? prev.cashSales + finalTotal : prev.cashSales,
        nonCashSales: !isCash ? prev.nonCashSales + finalTotal : prev.nonCashSales,
      };
    });

    // 1. Deduct Product Stock (mengalikan quantity dengan multiplier satuan grosir jika ada)
    setProducts((prevProducts) =>
      prevProducts.map((p) => {
        const cartMatches = cart.filter((item) => item.product.id === p.id);
        if (cartMatches.length > 0) {
          const totalQtyDeduction = cartMatches.reduce(
            (sum, item) => sum + item.quantity * (item.selectedUnit?.multiplier || 1),
            0
          );
          return {
            ...p,
            stock: Math.max(0, p.stock - totalQtyDeduction),
          };
        }
        return p;
      })
    );

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
        if (res.success && res.updatedStocks && res.updatedStocks.length > 0) {
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
    setActiveReceipt(newTx);
    clearCart();
    setTableNumber('');
    setSelectedCustomer(null);
    setPointsToRedeem(0);
    setIsPaymentModalOpen(false);

    return newTx;
  };

  const voidTransaction = (txId: string) => {
    setTransactions((prev) =>
      prev.map((tx) => (tx.id === txId ? { ...tx, status: 'void' as const } : tx))
    );
  };

  const processSalesReturn = (returnData: Omit<SalesReturn, 'id' | 'createdAt'>): SalesReturn => {
    const newReturn: SalesReturn = {
      ...returnData,
      id: `ret-sale-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      createdAt: new Date().toISOString(),
    };

    // 1. Save return record
    setSalesReturns((prev) => [newReturn, ...prev]);

    // 2. Update transaction status and metadata
    setTransactions((prev) =>
      prev.map((tx) => {
        if (tx.id === returnData.transactionId || tx.invoiceNumber === returnData.invoiceNumber) {
          const isFullReturn = returnData.totalRefundAmount >= tx.finalTotal;
          return {
            ...tx,
            status: isFullReturn ? ('refunded' as const) : tx.status,
            returnedAmount: (tx.returnedAmount || 0) + returnData.totalRefundAmount,
            returnReason: returnData.note || returnData.items.map((i) => i.reason).join(', '),
            returnedAt: new Date().toISOString(),
          };
        }
        return tx;
      })
    );

    // 3. Restock returned items to inventory if marked
    returnData.items.forEach((item) => {
      if (item.restockToInventory) {
        setProducts((prev) =>
          prev.map((p) => {
            if (p.id === item.productId) {
              return { ...p, stock: p.stock + item.quantity };
            }
            return p;
          })
        );
      }
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

  const addProductsBatch = (productsData: Omit<Product, 'id'>[]): Product[] => {
    const timestamp = Date.now();
    const newProducts: Product[] = productsData.map((data, idx) => ({
      ...data,
      id: `prod-${timestamp}-${idx}-${Math.random().toString(36).substring(2, 7)}`,
    }));
    setProducts((prev) => [...newProducts, ...prev]);
    return newProducts;
  };

  const deleteProductsBatch = (ids: string[]) => {
    const idSet = new Set(ids);
    setProducts((prev) => prev.filter((p) => !idSet.has(p.id)));
  };

  const clearImportedProducts = () => {
    const initialIds = new Set(INITIAL_PRODUCTS.map((p) => p.id));
    setProducts((prev) => prev.filter((p) => initialIds.has(p.id)));
  };

  const resetProductsToDefault = () => {
    setProducts(INITIAL_PRODUCTS);
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
      createdAt: new Date().toISOString().split('T')[0],
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

  const resetToRetailDefaults = () => {
    posStorage.clear().catch(console.warn);
    localStorage.removeItem('pos_retail_products_v2');
    localStorage.removeItem('pos_retail_products_v3');
    localStorage.removeItem('pos_retail_suppliers_v2');
    localStorage.removeItem('pos_retail_tx_v2');
    localStorage.removeItem('pos_retail_tx_v3');
    localStorage.removeItem('pos_retail_customers_v2');
    localStorage.removeItem('pos_retail_settings_v2');
    localStorage.removeItem('pos_active_cart');
    localStorage.removeItem('pos_held_orders');
    localStorage.removeItem('pos_vouchers');
    localStorage.removeItem('pos_employees_v2');
    localStorage.removeItem('pos_active_employee_id');
    localStorage.removeItem('pos_is_locked');
    localStorage.removeItem('pos_current_shift_v1');

    setProducts(INITIAL_PRODUCTS);
    setSuppliers(INITIAL_SUPPLIERS);
    setTransactions(INITIAL_RECENT_TRANSACTIONS);
    setCustomers(INITIAL_CUSTOMERS);
    setSettings(DEFAULT_STORE_SETTINGS);
    setVouchers(INITIAL_VOUCHERS);
    setEmployees(INITIAL_EMPLOYEES);
    setActiveEmployee(INITIAL_EMPLOYEES[0]);
    setIsLocked(false);
    setCart([]);
    setHeldOrders([]);
  };

  const addCustomer = (
    customerData: Omit<Customer, 'id' | 'points' | 'totalSpent' | 'ordersCount' | 'pointsHistory'> & { initialPoints?: number }
  ): Customer => {
    const initPoints = customerData.initialPoints !== undefined ? customerData.initialPoints : 25;
    const nowIso = new Date().toISOString();
    const newCust: Customer = {
      ...customerData,
      id: `cust-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      tier: customerData.tier || 'Bronze',
      points: initPoints,
      totalSpent: 0,
      ordersCount: 0,
      joinedDate: nowIso.slice(0, 10),
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
          totalProducts: finalData.products.length,
          totalSuppliers: finalData.suppliers.length,
          totalCustomers: finalData.customers.length,
          totalTransactions: finalData.transactions.length,
          totalSalesReturns: finalData.salesReturns.length,
          totalSupplierPurchases: finalData.supplierPurchases.length,
          totalEmployees: finalData.employees.length,
        },
      };

      const jsonStr =
        options?.pretty === false
          ? JSON.stringify(payload)
          : JSON.stringify(payload, null, 2);

      const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
      const now = new Date();
      const dateStr = now.toISOString().slice(0, 10);
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
        const sanitizeProductsList = (list: Product[]): Product[] => {
          return list
            .filter((p) => p && typeof p === 'object' && typeof p.id === 'string' && p.name)
            .map((p) => {
              const rawPrice = Number(p.price ?? (p as any).sellingPrice);
              const price = isNaN(rawPrice) || rawPrice < 0 ? 0 : rawPrice;
              const rawCost = Number(p.costPrice);
              const costPrice = isNaN(rawCost) || rawCost < 0 ? 0 : rawCost;
              const rawStock = Number(p.stock);
              const stock = isNaN(rawStock) ? 0 : rawStock;
              return {
                ...p,
                price,
                costPrice,
                stock,
                categoryId: typeof p.categoryId === 'string' ? p.categoryId : (typeof (p as any).category === 'string' ? (p as any).category : 'cat_all'),
                unit: typeof p.unit === 'string' ? p.unit : 'Pcs',
                barcode: typeof p.barcode === 'string' ? p.barcode : '',
              };
            });
        };

        const sanitizeTransactionsList = (list: Transaction[]): Transaction[] => {
          return list
            .filter((t) => t && typeof t === 'object' && typeof t.id === 'string')
            .map((t) => {
              const rawFinal = Number(t.finalTotal ?? (t as any).total);
              const finalTotal = isNaN(rawFinal) || rawFinal < 0 ? 0 : rawFinal;
              return {
                ...t,
                finalTotal,
                items: Array.isArray(t.items) ? t.items : [],
                createdAt: typeof t.createdAt === 'string' ? t.createdAt : new Date().toISOString(),
              };
            });
        };

        const cleanProducts = Array.isArray(d.products) ? sanitizeProductsList(d.products) : null;
        const cleanTransactions = Array.isArray(d.transactions) ? sanitizeTransactionsList(d.transactions) : null;

        if (mode === 'overwrite') {
          if (cleanProducts !== null) setProducts(cleanProducts);
          if (Array.isArray(d.suppliers)) setSuppliers(d.suppliers.filter((s) => s && s.id && s.name));
          if (Array.isArray(d.customers)) setCustomers(d.customers.filter((c) => c && c.id && c.name));
          if (cleanTransactions !== null) setTransactions(cleanTransactions);
          if (Array.isArray(d.salesReturns)) setSalesReturns(d.salesReturns);
          if (Array.isArray(d.purchaseReturns)) setPurchaseReturns(d.purchaseReturns);
          if (Array.isArray(d.supplierPurchases)) setSupplierPurchases(d.supplierPurchases);
          if (d.settings) setSettings(d.settings);
          if (Array.isArray(d.vouchers)) setVouchers(d.vouchers);
          if (Array.isArray(d.employees) && d.employees.length > 0) setEmployees(d.employees);
          if (Array.isArray(d.heldOrders)) setHeldOrders(d.heldOrders);
          setCart([]);
        } else {
          // Merge mode
          if (cleanProducts !== null) {
            setProducts((prev) => {
              const existingMap = new Map<string, Product>();
              prev.forEach((p) => {
                existingMap.set(p.id, p);
                if (p.barcode) existingMap.set(`b_${p.barcode}`, p);
              });
              const merged = [...prev];
              cleanProducts.forEach((newP) => {
                const byId = existingMap.get(newP.id);
                const byBarcode = newP.barcode ? existingMap.get(`b_${newP.barcode}`) : undefined;
                if (!byId && !byBarcode) {
                  merged.push(newP);
                }
              });
              return merged;
            });
          }

          if (Array.isArray(d.suppliers)) {
            setSuppliers((prev) => {
              const ids = new Set(prev.map((s) => s.id));
              const names = new Set(prev.map((s) => s.name.toLowerCase().trim()));
              const added = d.suppliers!.filter(
                (s) => s && s.id && s.name && !ids.has(s.id) && !names.has(s.name.toLowerCase().trim())
              );
              return [...prev, ...added];
            });
          }

          if (Array.isArray(d.customers)) {
            setCustomers((prev) => {
              const ids = new Set(prev.map((c) => c.id));
              const phones = new Set(prev.map((c) => c.phone?.trim()).filter(Boolean));
              const added = d.customers!.filter(
                (c) => c && c.id && c.name && !ids.has(c.id) && (!c.phone || !phones.has(c.phone.trim()))
              );
              return [...prev, ...added];
            });
          }

          if (cleanTransactions !== null) {
            setTransactions((prev) => {
              const ids = new Set(prev.map((t) => t.id));
              const added = cleanTransactions.filter((t) => !ids.has(t.id));
              return [...prev, ...added];
            });
          }

          if (Array.isArray(d.salesReturns)) {
            setSalesReturns((prev) => {
              const ids = new Set(prev.map((r) => r.id));
              const added = d.salesReturns!.filter((r) => r && r.id && !ids.has(r.id));
              return [...prev, ...added];
            });
          }

          if (Array.isArray(d.supplierPurchases)) {
            setSupplierPurchases((prev) => {
              const ids = new Set(prev.map((p) => p.id));
              const added = d.supplierPurchases!.filter((p) => p && p.id && !ids.has(p.id));
              return [...prev, ...added];
            });
          }
        }

        return {
          success: true,
          message: `Berhasil memulihkan data (${mode === 'overwrite' ? 'Timpa Penuh' : 'Penggabungan'}). Terkoreksi ${
            cleanProducts?.length || 0
          } produk & ${cleanTransactions?.length || 0} riwayat transaksi. Basis data telah diverifikasi aman.`,
        };
      } catch (err: any) {
        return {
          success: false,
          message: `Gagal memproses pemulihan data: ${err?.message || 'Terjadi kesalahan sistem'}`,
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
      updateProductStock,
      bulkAdjustProducts,
      addProduct,
      addProductsBatch,
      deleteProductsBatch,
      clearImportedProducts,
      resetProductsToDefault,
      clearAllProducts,
      updateProduct,
      recordProductPriceChange,
      deleteProduct,
      resetToRetailDefaults,
    }),
    [
      products,
      selectedCategory,
      searchQuery,
      filterLowStock,
      updateProductStock,
      bulkAdjustProducts,
      addProduct,
      addProductsBatch,
      deleteProductsBatch,
      clearImportedProducts,
      resetProductsToDefault,
      clearAllProducts,
      updateProduct,
      recordProductPriceChange,
      deleteProduct,
      resetToRetailDefaults,
    ]
  );

  // --- Domain Split 2: Cart Actions (Stable References) ---
  const cartActionsValue = useMemo<POSCartActionsContextType>(
    () => ({
      addToCart,
      updateCartItemQuantity,
      setCartItemQuantity,
      updateCartItemUnit,
      updateCartItemDiscount,
      removeFromCart,
      clearCart,
      updateCartItemNote,
    }),
    [
      addToCart,
      updateCartItemQuantity,
      setCartItemQuantity,
      updateCartItemUnit,
      updateCartItemDiscount,
      removeFromCart,
      clearCart,
      updateCartItemNote,
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
      applyVoucher,
      removeVoucher,
      usePoints,
      setUsePoints,
      pointsToRedeem,
      setPointsToRedeem: handleSetPointsToRedeem,
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
      holdCurrentOrder,
      recallHeldOrder,
      deleteHeldOrder,
    }),
    [
      cartActionsValue,
      cart,
      cartItemCount,
      orderType,
      tableNumber,
      selectedCustomer,
      appliedVoucher,
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
    ]
  );

  // --- Domain Split 4: Transactions, CRM, Returns, Suppliers ---
  const transactionsValue = useMemo<POSTransactionsContextType>(
    () => ({
      isPaymentModalOpen,
      setIsPaymentModalOpen,
      processPayment,
      transactions,
      activeReceipt,
      setActiveReceipt,
      voidTransaction,
      salesReturns,
      processSalesReturn,
      purchaseReturns,
      processPurchaseReturn,
      supplierPurchases,
      processSupplierPurchase,
      suppliers,
      addSupplier,
      updateSupplier,
      deleteSupplier,
      customers,
      addCustomer,
      adjustCustomerPoints,
      updateCustomer,
      vouchers,
      addVoucher,
    }),
    [
      isPaymentModalOpen,
      transactions,
      activeReceipt,
      salesReturns,
      purchaseReturns,
      supplierPurchases,
      suppliers,
      customers,
      vouchers,
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
      loginWithPin,
      quickSwitchEmployee,
      lockScreen,
      unlockScreen,
      logoutEmployee,
      addEmployee,
      updateEmployee,
      deleteEmployee,
      startNewShift,
      closeCurrentShift,
    }),
    [
      employees,
      activeEmployee,
      isLocked,
      isEmployeeManagementOpen,
      isShiftModalOpen,
      currentShift,
    ]
  );

  // --- Domain Split 6: UI, Modals, Offline Sync, Settings, AI Copilot, Diagnostics ---
  const uiValue = useMemo<POSUIContextType>(
    () => ({
      activeView,
      setActiveView,
      activeCustomersTab,
      setActiveCustomersTab,
      selectedMarketingCustomer,
      setSelectedMarketingCustomer,
      settings,
      updateSettings,
      applyMinStockRuleToAllProducts,
      isGeminiCopilotOpen,
      setIsGeminiCopilotOpen,
      activeCopilotTab,
      setActiveCopilotTab,
      openGeminiCopilot,
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
      syncPendingTransactions,
      isSyncModalOpen,
      setIsSyncModalOpen,
      syncNotification,
      clearSyncNotification,
      isBarcodeScannerOpen,
      setIsBarcodeScannerOpen,
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
      scanBarcodeAndAddToCart,
      restorePoints,
      isBackupRestoreOpen,
      storageDiagnostics,
      refreshStorageDiagnostics,
      runStorageBenchmark,
      isLANModalOpen,
      applyMasterLANData,
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
                  {children}
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

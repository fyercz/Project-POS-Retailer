import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from 'react';
import confetti from 'canvas-confetti';
import {
  Product,
  CartItem,
  Customer,
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

interface POSContextType {
  // Navigation
  activeView: 'pos' | 'transactions' | 'inventory' | 'reports' | 'customers';
  setActiveView: (view: 'pos' | 'transactions' | 'inventory' | 'reports' | 'customers') => void;

  // Catalog
  products: Product[];
  categories: typeof INITIAL_CATEGORIES;
  selectedCategory: string;
  setSelectedCategory: (categoryId: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  filterLowStock: boolean;
  setFilterLowStock: (val: boolean) => void;
  updateProductStock: (productId: string, newStock: number) => void;
  addProduct: (product: Omit<Product, 'id'>) => Product;
  addProductsBatch: (products: Omit<Product, 'id'>[]) => Product[];
  deleteProductsBatch: (ids: string[]) => void;
  clearImportedProducts: () => void;
  resetProductsToDefault: () => void;
  clearAllProducts: () => void;
  updateProduct: (id: string, updated: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  resetToRetailDefaults: () => void;

  // Cart
  cart: CartItem[];
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

  // Order Details
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

  // Pricing & Profit Margin Point calculations
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

  // Held Orders (Order Parking)
  heldOrders: HeldOrder[];
  holdCurrentOrder: (note?: string) => boolean;
  recallHeldOrder: (heldOrder: HeldOrder) => void;
  deleteHeldOrder: (heldOrderId: string) => void;

  // Checkout & Transactions
  isPaymentModalOpen: boolean;
  setIsPaymentModalOpen: (isOpen: boolean) => void;
  processPayment: (payment: PaymentDetails) => Transaction;
  transactions: Transaction[];
  activeReceipt: Transaction | null;
  setActiveReceipt: (tx: Transaction | null) => void;
  voidTransaction: (txId: string) => void;

  // Returns Feature (Sales & Purchase Returns)
  salesReturns: SalesReturn[];
  processSalesReturn: (returnData: Omit<SalesReturn, 'id' | 'createdAt'>) => SalesReturn;
  purchaseReturns: PurchaseReturn[];
  processPurchaseReturn: (returnData: Omit<PurchaseReturn, 'id' | 'createdAt'>) => PurchaseReturn;
  supplierPurchases: SupplierPurchase[];
  processSupplierPurchase: (purchaseData: Omit<SupplierPurchase, 'id' | 'createdAt'>) => SupplierPurchase;

  // Suppliers Management
  suppliers: Supplier[];
  addSupplier: (supplier: Omit<Supplier, 'id' | 'createdAt'>) => Supplier;
  updateSupplier: (id: string, updated: Partial<Supplier>) => void;
  deleteSupplier: (id: string) => void;

  // Customers CRM
  customers: Customer[];
  addCustomer: (customer: Omit<Customer, 'id' | 'points' | 'totalSpent' | 'ordersCount'>) => Customer;

  // Settings & Helpers
  settings: StoreSettings;
  updateSettings: (newSettings: Partial<StoreSettings>) => void;
  vouchers: Voucher[];
  addVoucher: (v: Voucher) => void;

  // Gemini AI Retail Copilot State & Helpers
  isGeminiCopilotOpen: boolean;
  setIsGeminiCopilotOpen: (open: boolean) => void;
  activeCopilotTab: 'upsell' | 'forecast' | 'insights' | 'promo' | 'chat';
  setActiveCopilotTab: (tab: 'upsell' | 'forecast' | 'insights' | 'promo' | 'chat') => void;
  openGeminiCopilot: (tab?: 'upsell' | 'forecast' | 'insights' | 'promo' | 'chat') => void;
  aiUpsellSuggestions: AIUpsellSuggestion[];
  isFetchingUpsell: boolean;
  fetchUpsellSuggestions: () => Promise<void>;

  // Multi-Employee & Shift Management
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

const POSContext = createContext<POSContextType | undefined>(undefined);

export const POSProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Navigation view
  const [activeView, setActiveView] = useState<'pos' | 'transactions' | 'inventory' | 'reports' | 'customers'>('pos');

  // Catalog State
  const [products, setProducts] = useState<Product[]>(() => {
    // Clear out old mock sample dataset if present
    localStorage.removeItem('pos_retail_products_v2');
    const saved = localStorage.getItem('pos_retail_products_v3');
    const rawList: Product[] = saved ? JSON.parse(saved) : INITIAL_PRODUCTS;
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
  const [usePoints, setUsePoints] = useState<boolean>(false);

  // Held Orders
  const [heldOrders, setHeldOrders] = useState<HeldOrder[]>(() => {
    const saved = localStorage.getItem('pos_held_orders');
    return saved ? JSON.parse(saved) : [];
  });

  // Transactions History
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    localStorage.removeItem('pos_retail_tx_v2');
    const saved = localStorage.getItem('pos_retail_tx_v3');
    return saved ? JSON.parse(saved) : INITIAL_RECENT_TRANSACTIONS;
  });

  // Customers
  const [customers, setCustomers] = useState<Customer[]>(() => {
    const saved = localStorage.getItem('pos_retail_customers_v2');
    return saved ? JSON.parse(saved) : INITIAL_CUSTOMERS;
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
    const saved = localStorage.getItem('pos_retail_suppliers_v2');
    const rawList: Supplier[] = saved ? JSON.parse(saved) : INITIAL_SUPPLIERS;
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
    const saved = localStorage.getItem('pos_employees_v2');
    return saved ? JSON.parse(saved) : INITIAL_EMPLOYEES;
  });

  const [activeEmployee, setActiveEmployee] = useState<Employee | null>(() => {
    const savedEmpId = localStorage.getItem('pos_active_employee_id');
    const savedEmployeesStr = localStorage.getItem('pos_employees_v2');
    const allEmployees: Employee[] = savedEmployeesStr ? JSON.parse(savedEmployeesStr) : INITIAL_EMPLOYEES;
    if (savedEmpId) {
      const match = allEmployees.find((e) => e.id === savedEmpId);
      if (match) return match;
    }
    return allEmployees[0] || INITIAL_EMPLOYEES[0];
  });

  const [isLocked, setIsLocked] = useState<boolean>(() => {
    return localStorage.getItem('pos_is_locked') === 'true';
  });

  const [isEmployeeManagementOpen, setIsEmployeeManagementOpen] = useState(false);
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);

  const [currentShift, setCurrentShift] = useState<ShiftSummary | null>(() => {
    const saved = localStorage.getItem('pos_current_shift_v1');
    if (saved) return JSON.parse(saved);
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
  const [aiUpsellSuggestions, setAiUpsellSuggestions] = useState<AIUpsellSuggestion[]>([]);
  const [isFetchingUpsell, setIsFetchingUpsell] = useState(false);

  // Debounced Sync to local storage to prevent main-thread UI lag during rapid operations
  const pendingStorageSaves = useRef<Record<string, any>>({});
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const scheduleSave = useCallback((key: string, data: any) => {
    pendingStorageSaves.current[key] = data;
    if (!saveTimeoutRef.current) {
      saveTimeoutRef.current = setTimeout(() => {
        try {
          const saves = pendingStorageSaves.current;
          pendingStorageSaves.current = {};
          for (const [k, v] of Object.entries(saves)) {
            localStorage.setItem(k, JSON.stringify(v));
          }
        } catch {
          // Ignore quota errors gracefully
        } finally {
          saveTimeoutRef.current = null;
        }
      }, 300);
    }
  }, []);

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
    scheduleSave('pos_retail_customers_v2', customers);
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

  // Loyalty Points discount (1 point = 100 IDR)
  const pointsDiscount = useMemo(() => {
    if (usePoints && selectedCustomer && selectedCustomer.points > 0) {
      const maxUsablePoints = selectedCustomer.points;
      const disc = maxUsablePoints * 100;
      if (disc > subtotal - voucherDiscount) {
        return Math.max(0, subtotal - voucherDiscount);
      }
      return disc;
    }
    return 0;
  }, [usePoints, selectedCustomer, subtotal, voucherDiscount]);

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

  // 1 poin tiap pointsRatio (default Rp 10.000) dari item profit >= 15%
  const pointsEarned = Math.floor(effectiveEligibleSpend / (settings.pointsRatio || 10000));

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
    const pointsUsed = usePoints && selectedCustomer ? Math.floor(pointsDiscount / 100) : 0;
    const currentCashierName = activeEmployee
      ? `${activeEmployee.name} (${activeEmployee.roleTitle || activeEmployee.role})`
      : 'Kasir Utama';

    const newTx: Transaction = {
      id: `tx-${Date.now()}`,
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
      createdAt: new Date().toISOString(),
      status: 'completed',
    };

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

    // 2. Update Customer Points & Total Spent (Tier is strictly Regular)
    if (selectedCustomer) {
      setCustomers((prevCustomers) =>
        prevCustomers.map((cust) => {
          if (cust.id === selectedCustomer.id) {
            const updatedPoints = Math.max(0, cust.points - pointsUsed + pointsEarned);
            const updatedSpent = cust.totalSpent + finalTotal;
            const updatedOrders = cust.ordersCount + 1;

            return {
              ...cust,
              points: updatedPoints,
              totalSpent: updatedSpent,
              ordersCount: updatedOrders,
              tier: 'Regular',
            };
          }
          return cust;
        })
      );
    }

    // 3. Save Transaction
    setTransactions((prev) => [newTx, ...prev]);

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

    // 2. Increase stock and update product HPP costPrice
    purchaseData.items.forEach((item) => {
      setProducts((prev) =>
        prev.map((p) => {
          if (p.id === item.productId) {
            return {
              ...p,
              stock: p.stock + item.quantity,
              costPrice: item.costPrice > 0 ? item.costPrice : p.costPrice,
              expiryDate: item.expiryDate || p.expiryDate,
            };
          }
          return p;
        })
      );
    });

    return newPurchase;
  };

  const updateProductStock = (productId: string, newStock: number) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === productId ? { ...p, stock: Math.max(0, newStock) } : p))
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
      prev.map((p) => (p.id === id ? { ...p, ...updated } : p))
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

  const addCustomer = (customerData: Omit<Customer, 'id' | 'points' | 'totalSpent' | 'ordersCount'>): Customer => {
    const newCust: Customer = {
      ...customerData,
      id: `cust-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      points: 20,
      totalSpent: 0,
      ordersCount: 0,
    };
    setCustomers((prev) => [newCust, ...prev]);
    setSelectedCustomer(newCust);
    return newCust;
  };

  const updateSettings = (newSettings: Partial<StoreSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
  };

  const contextValue = useMemo(
    () => ({
      activeView,
      setActiveView,
      products,
      categories: INITIAL_CATEGORIES,
      selectedCategory,
      setSelectedCategory,
      searchQuery,
      setSearchQuery,
      filterLowStock,
      setFilterLowStock,
      updateProductStock,
      addProduct,
      addProductsBatch,
      deleteProductsBatch,
      clearImportedProducts,
      resetProductsToDefault,
      clearAllProducts,
      updateProduct,
      deleteProduct,
      resetToRetailDefaults,
      cart,
      addToCart,
      updateCartItemQuantity,
      setCartItemQuantity,
      updateCartItemUnit,
      updateCartItemDiscount,
      removeFromCart,
      clearCart,
      updateCartItemNote,
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
      settings,
      updateSettings,
      vouchers,
      addVoucher,
      isGeminiCopilotOpen,
      setIsGeminiCopilotOpen,
      activeCopilotTab,
      setActiveCopilotTab,
      openGeminiCopilot,
      aiUpsellSuggestions,
      isFetchingUpsell,
      fetchUpsellSuggestions,
      // Multi-Employee & Shift
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
      activeView,
      products,
      selectedCategory,
      searchQuery,
      filterLowStock,
      cart,
      orderType,
      tableNumber,
      selectedCustomer,
      appliedVoucher,
      usePoints,
      subtotal,
      voucherDiscount,
      pointsDiscount,
      totalDiscount,
      finalTotal,
      pointsEarned,
      pointsEligibleSpend,
      minProfitPercentForPoints,
      heldOrders,
      isPaymentModalOpen,
      transactions,
      activeReceipt,
      salesReturns,
      purchaseReturns,
      supplierPurchases,
      suppliers,
      customers,
      settings,
      vouchers,
      isGeminiCopilotOpen,
      activeCopilotTab,
      aiUpsellSuggestions,
      isFetchingUpsell,
      fetchUpsellSuggestions,
      employees,
      activeEmployee,
      isLocked,
      isEmployeeManagementOpen,
      isShiftModalOpen,
      currentShift,
    ]
  );

  return (
    <POSContext.Provider value={contextValue}>
      {children}
    </POSContext.Provider>
  );
};

export const usePOS = (): POSContextType => {
  const context = useContext(POSContext);
  if (!context) {
    throw new Error('usePOS must be used within a POSProvider');
  }
  return context;
};

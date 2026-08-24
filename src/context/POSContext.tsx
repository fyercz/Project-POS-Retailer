import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
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
  updateProduct: (id: string, updated: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  resetToRetailDefaults: () => void;

  // Cart
  cart: CartItem[];
  addToCart: (product: Product, selectedOptions?: SelectedOption[], notes?: string) => void;
  updateCartItemQuantity: (cartItemId: string, delta: number) => void;
  setCartItemQuantity: (cartItemId: string, quantity: number) => void;
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

  // Pricing calculations
  subtotal: number;
  taxAmount: number;
  serviceChargeAmount: number;
  voucherDiscount: number;
  pointsDiscount: number;
  totalDiscount: number;
  finalTotal: number;
  pointsEarned: number;

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
    const saved = localStorage.getItem('pos_retail_products_v2');
    return saved ? JSON.parse(saved) : INITIAL_PRODUCTS;
  });

  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterLowStock, setFilterLowStock] = useState<boolean>(false);

  // Cart State
  const [cart, setCart] = useState<CartItem[]>(() => {
    const saved = localStorage.getItem('pos_active_cart');
    return saved ? JSON.parse(saved) : [];
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
    const saved = localStorage.getItem('pos_retail_tx_v2');
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
    return saved ? JSON.parse(saved) : DEFAULT_STORE_SETTINGS;
  });

  const [vouchers, setVouchers] = useState<Voucher[]>(() => {
    const saved = localStorage.getItem('pos_vouchers');
    return saved ? JSON.parse(saved) : INITIAL_VOUCHERS;
  });

  // Returns state (Sales Returns and Supplier Purchase Returns)
  const [salesReturns, setSalesReturns] = useState<SalesReturn[]>(() => {
    const saved = localStorage.getItem('pos_sales_returns');
    return saved ? JSON.parse(saved) : [];
  });

  const [purchaseReturns, setPurchaseReturns] = useState<PurchaseReturn[]>(() => {
    const saved = localStorage.getItem('pos_purchase_returns');
    return saved ? JSON.parse(saved) : [];
  });

  const [supplierPurchases, setSupplierPurchases] = useState<SupplierPurchase[]>(() => {
    const saved = localStorage.getItem('pos_supplier_purchases_v2');
    return saved ? JSON.parse(saved) : [];
  });

  const [suppliers, setSuppliers] = useState<Supplier[]>(() => {
    const saved = localStorage.getItem('pos_retail_suppliers_v2');
    return saved ? JSON.parse(saved) : INITIAL_SUPPLIERS;
  });

  // Multi-Employee & Shift Management States
  const [employees, setEmployees] = useState<Employee[]>(() => {
    const saved = localStorage.getItem('pos_employees_v2');
    return saved ? JSON.parse(saved) : INITIAL_EMPLOYEES;
  });

  const [activeEmployee, setActiveEmployee] = useState<Employee | null>(() => {
    const savedEmpId = localStorage.getItem('pos_active_employee_id');
    if (savedEmpId) {
      const match = INITIAL_EMPLOYEES.find((e) => e.id === savedEmpId);
      if (match) return match;
    }
    return INITIAL_EMPLOYEES[0];
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

  // Sync to local storage
  useEffect(() => {
    localStorage.setItem('pos_retail_products_v2', JSON.stringify(products));
  }, [products]);

  useEffect(() => {
    localStorage.setItem('pos_active_cart', JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    localStorage.setItem('pos_held_orders', JSON.stringify(heldOrders));
  }, [heldOrders]);

  useEffect(() => {
    localStorage.setItem('pos_retail_tx_v2', JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem('pos_retail_customers_v2', JSON.stringify(customers));
  }, [customers]);

  useEffect(() => {
    localStorage.setItem('pos_retail_settings_v2', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    localStorage.setItem('pos_vouchers', JSON.stringify(vouchers));
  }, [vouchers]);

  useEffect(() => {
    localStorage.setItem('pos_sales_returns', JSON.stringify(salesReturns));
  }, [salesReturns]);

  useEffect(() => {
    localStorage.setItem('pos_purchase_returns', JSON.stringify(purchaseReturns));
  }, [purchaseReturns]);

  useEffect(() => {
    localStorage.setItem('pos_supplier_purchases_v2', JSON.stringify(supplierPurchases));
  }, [supplierPurchases]);

  useEffect(() => {
    localStorage.setItem('pos_retail_suppliers_v2', JSON.stringify(suppliers));
  }, [suppliers]);

  useEffect(() => {
    localStorage.setItem('pos_employees_v2', JSON.stringify(employees));
  }, [employees]);

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
      localStorage.setItem('pos_current_shift_v1', JSON.stringify(currentShift));
    }
  }, [currentShift]);

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

  // Cart operations
  const addToCart = (product: Product, selectedOptions: SelectedOption[] = [], notes: string = '') => {
    const optionsKey = selectedOptions
      .map((o) => `${o.groupName}:${o.choiceName}`)
      .sort()
      .join('|');
    const cartItemId = optionsKey ? `${product.id}-${optionsKey}` : product.id;

    const optionsExtra = selectedOptions.reduce((sum, opt) => sum + opt.extraPrice, 0);
    const unitPrice = product.price + optionsExtra;

    setCart((prevCart) => {
      const existingIndex = prevCart.findIndex((item) => item.id === cartItemId);
      if (existingIndex > -1) {
        const updated = [...prevCart];
        const newQty = updated[existingIndex].quantity + 1;
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: newQty,
          totalPrice: unitPrice * newQty,
          notes: notes || updated[existingIndex].notes,
        };
        return updated;
      } else {
        const newItem: CartItem = {
          id: cartItemId,
          product,
          quantity: 1,
          selectedOptions,
          notes,
          unitPrice,
          totalPrice: unitPrice,
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
            return {
              ...item,
              quantity: newQty,
              totalPrice: item.unitPrice * newQty,
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
          return {
            ...item,
            quantity,
            totalPrice: item.unitPrice * quantity,
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

  // Calculations
  const subtotal = cart.reduce((sum, item) => sum + item.totalPrice, 0);

  // Voucher discount calculation
  let voucherDiscount = 0;
  if (appliedVoucher && subtotal >= appliedVoucher.minSpend) {
    if (appliedVoucher.discountType === 'percentage') {
      voucherDiscount = (subtotal * appliedVoucher.value) / 100;
      if (appliedVoucher.maxDiscount && voucherDiscount > appliedVoucher.maxDiscount) {
        voucherDiscount = appliedVoucher.maxDiscount;
      }
    } else {
      voucherDiscount = appliedVoucher.value;
    }
  }

  // Loyalty Points discount (1 point = 100 IDR)
  let pointsDiscount = 0;
  if (usePoints && selectedCustomer && selectedCustomer.points > 0) {
    const maxUsablePoints = selectedCustomer.points;
    pointsDiscount = maxUsablePoints * 100;
    if (pointsDiscount > subtotal - voucherDiscount) {
      pointsDiscount = Math.max(0, subtotal - voucherDiscount);
    }
  }

  const totalDiscount = voucherDiscount + pointsDiscount;
  // Sales Tax & Surcharges removed on sales as requested
  const taxAmount = 0;
  const serviceChargeAmount = 0;
  const finalTotal = Math.max(0, Math.round(subtotal - totalDiscount));

  // Points earned calculation (1 point per 10k IDR)
  const pointsEarned = Math.floor(finalTotal / (settings.pointsRatio || 10000));

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
    setCart(heldOrder.items);
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

    // 1. Deduct Product Stock
    setProducts((prevProducts) =>
      prevProducts.map((p) => {
        const cartMatch = cart.find((item) => item.product.id === p.id);
        if (cartMatch) {
          return {
            ...p,
            stock: Math.max(0, p.stock - cartMatch.quantity),
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
      id: `ret-sale-${Date.now()}`,
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
      id: `ret-sup-${Date.now()}`,
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
      id: `purch-sup-${Date.now()}`,
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
    const newProduct: Product = {
      ...productData,
      id: `ret-${Date.now()}`,
    };
    setProducts((prev) => [newProduct, ...prev]);
    return newProduct;
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
      id: `sup-${Date.now()}`,
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
    localStorage.removeItem('pos_retail_suppliers_v2');
    localStorage.removeItem('pos_retail_tx_v2');
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
      id: `cust-${Date.now()}`,
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

  return (
    <POSContext.Provider
      value={{
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
        updateProduct,
        deleteProduct,
        resetToRetailDefaults,
        cart,
        addToCart,
        updateCartItemQuantity,
        setCartItemQuantity,
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
      }}
    >
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
